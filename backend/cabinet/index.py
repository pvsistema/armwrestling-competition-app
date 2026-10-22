import hashlib
import hmac
import json
import os
import secrets
from datetime import date

import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password, X-Session-Id",
    "Access-Control-Max-Age": "86400",
}
ADMIN = {"reps_list", "rep_create", "rep_update", "rep_delete", "admin_login"}
REP = {"me", "logout", "athletes", "athlete_save", "athletes_bulk", "athlete_delete", "intakes", "entry_submit", "entry_withdraw", "password"}
SECRETARY = {"intake_open", "intake_close", "intake_get"}
MAX_ATHLETES = 500


def resp(code: int, body) -> dict:
    return {
        "statusCode": code,
        "headers": {**CORS, "Content-Type": "application/json", "Cache-Control": "no-store"},
        "body": json.dumps(body, ensure_ascii=False, default=str),
    }


def err(code: int, msg: str) -> dict:
    return resp(code, {"error": msg})


def clip(v, n: int) -> str:
    return str(v or "").strip()[:n]


def hash_pw(pw: str) -> str:
    salt = secrets.token_hex(8)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 120000).hex()
    return f"{salt}${h}"


def check_pw(pw: str, stored: str) -> bool:
    salt, _, h = stored.partition("$")
    calc = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 120000).hex()
    return hmac.compare_digest(calc, h)


def rows(cur):
    return [{d[0]: v for d, v in zip(cur.description, r)} for r in cur.fetchall()]


def one(cur):
    r = cur.fetchone()
    return {d[0]: v for d, v in zip(cur.description, r)} if r else None


# ---------- администратор: учётные записи представителей ----------

def admin_action(cur, action: str, b: dict) -> dict:
    if action == "admin_login":
        return resp(200, {"ok": True})
    if action == "reps_list":
        cur.execute(
            "SELECT r.id, r.login, r.name, r.team, r.phone, r.active, r.created_at, r.last_login, "
            "(SELECT COUNT(*) FROM rep_athletes a WHERE a.rep_id = r.id) AS athletes, "
            "(SELECT COUNT(*) FROM entries e WHERE e.rep_id = r.id) AS entries "
            "FROM reps r ORDER BY r.team, r.name"
        )
        return resp(200, {"reps": rows(cur)})
    if action == "rep_create":
        login = clip(b.get("login"), 60).lower()
        pw = str(b.get("password") or "")
        if len(login) < 3 or len(pw) < 6:
            return err(400, "Логин — от 3 символов, пароль — от 6 символов")
        cur.execute("SELECT 1 FROM reps WHERE login = %s", (login,))
        if cur.fetchone():
            return err(400, "Такой логин уже занят")
        cur.execute(
            "INSERT INTO reps (login, pass_hash, name, team, phone) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (login, hash_pw(pw), clip(b.get("name"), 200), clip(b.get("team"), 200), clip(b.get("phone"), 100)),
        )
        return resp(200, {"ok": True, "id": cur.fetchone()[0]})
    rid = int(b.get("id") or 0)
    if action == "rep_update":
        cur.execute(
            "UPDATE reps SET name = %s, team = %s, phone = %s, active = %s WHERE id = %s",
            (clip(b.get("name"), 200), clip(b.get("team"), 200), clip(b.get("phone"), 100), bool(b.get("active", True)), rid),
        )
        pw = str(b.get("password") or "")
        if pw:
            if len(pw) < 6:
                return err(400, "Пароль — от 6 символов")
            cur.execute("UPDATE reps SET pass_hash = %s WHERE id = %s", (hash_pw(pw), rid))
            cur.execute("DELETE FROM rep_sessions WHERE rep_id = %s", (rid,))
        if not b.get("active", True):
            cur.execute("DELETE FROM rep_sessions WHERE rep_id = %s", (rid,))
        return resp(200, {"ok": True})
    if action == "rep_delete":
        cur.execute("DELETE FROM rep_sessions WHERE rep_id = %s", (rid,))
        cur.execute("DELETE FROM entries WHERE rep_id = %s", (rid,))
        cur.execute("DELETE FROM rep_athletes WHERE rep_id = %s", (rid,))
        cur.execute("DELETE FROM reps WHERE id = %s", (rid,))
        return resp(200, {"ok": True})
    return err(400, "unknown action")


# ---------- представитель ----------

def rep_login(cur, b: dict) -> dict:
    login = clip(b.get("login"), 60).lower()
    cur.execute("SELECT id, pass_hash, active FROM reps WHERE login = %s", (login,))
    r = cur.fetchone()
    if not r or not check_pw(str(b.get("password") or ""), r[1]):
        return err(401, "Неверный логин или пароль")
    if not r[2]:
        return err(403, "Доступ закрыт. Обратитесь к организатору.")
    token = secrets.token_hex(24)
    cur.execute("INSERT INTO rep_sessions (token, rep_id) VALUES (%s, %s)", (token, r[0]))
    cur.execute("UPDATE reps SET last_login = NOW() WHERE id = %s", (r[0],))
    return resp(200, {"ok": True, "token": token})


def intake_view(row: dict) -> dict:
    d = json.loads(row["data"])
    return {"id": row["id"], "open": row["open"], "updated": row["updated_at"], **d}


def rep_action(cur, rep: dict, action: str, b: dict, token: str) -> dict:
    rid = rep["id"]
    if action == "me":
        return resp(200, {"rep": {k: rep[k] for k in ("id", "login", "name", "team", "phone")}})
    if action == "logout":
        cur.execute("DELETE FROM rep_sessions WHERE token = %s", (token,))
        return resp(200, {"ok": True})
    if action == "password":
        cur.execute("SELECT pass_hash FROM reps WHERE id = %s", (rid,))
        if not check_pw(str(b.get("old") or ""), cur.fetchone()[0]):
            return err(400, "Текущий пароль указан неверно")
        new = str(b.get("new") or "")
        if len(new) < 6:
            return err(400, "Новый пароль — от 6 символов")
        cur.execute("UPDATE reps SET pass_hash = %s WHERE id = %s", (hash_pw(new), rid))
        cur.execute("DELETE FROM rep_sessions WHERE rep_id = %s AND token <> %s", (rid, token))
        return resp(200, {"ok": True})
    if action == "athletes":
        cur.execute("SELECT id, data FROM rep_athletes WHERE rep_id = %s ORDER BY id", (rid,))
        return resp(200, {"athletes": [{**json.loads(r[1]), "id": r[0]} for r in cur.fetchall()]})
    if action == "athlete_save":
        a = b.get("athlete") or {}
        if not clip(a.get("name"), 200):
            return err(400, "Укажите ФИО")
        a.pop("id", None)
        data = json.dumps(a, ensure_ascii=False)
        if len(data) > 5000:
            return err(400, "Слишком много данных")
        aid = int(b.get("id") or 0)
        if aid:
            cur.execute("UPDATE rep_athletes SET data = %s, updated_at = NOW() WHERE id = %s AND rep_id = %s", (data, aid, rid))
        else:
            cur.execute("SELECT COUNT(*) FROM rep_athletes WHERE rep_id = %s", (rid,))
            if cur.fetchone()[0] >= MAX_ATHLETES:
                return err(400, f"Не больше {MAX_ATHLETES} спортсменов")
            cur.execute("INSERT INTO rep_athletes (rep_id, data) VALUES (%s, %s) RETURNING id", (rid, data))
            aid = cur.fetchone()[0]
        return resp(200, {"ok": True, "id": aid})
    if action == "athletes_bulk":
        items = b.get("athletes") or []
        if not isinstance(items, list) or not items:
            return err(400, "Список пуст")
        cur.execute("SELECT COUNT(*) FROM rep_athletes WHERE rep_id = %s", (rid,))
        if cur.fetchone()[0] + len(items) > MAX_ATHLETES:
            return err(400, f"Не больше {MAX_ATHLETES} спортсменов")
        added = 0
        for a in items:
            if not isinstance(a, dict) or not clip(a.get("name"), 200):
                continue
            a.pop("id", None)
            data = json.dumps(a, ensure_ascii=False)
            if len(data) > 5000:
                continue
            cur.execute("INSERT INTO rep_athletes (rep_id, data) VALUES (%s, %s)", (rid, data))
            added += 1
        return resp(200, {"ok": True, "added": added})
    if action == "athlete_delete":
        cur.execute("DELETE FROM rep_athletes WHERE id = %s AND rep_id = %s", (int(b.get("id") or 0), rid))
        return resp(200, {"ok": True})
    if action == "intakes":
        cur.execute("SELECT id, data, open, updated_at FROM intakes WHERE open ORDER BY updated_at DESC")
        its = [intake_view(r) for r in rows(cur)]
        cur.execute(
            "SELECT e.intake_id, e.items, e.version, e.submitted_at, e.imported_version, i.open, i.data "
            "FROM entries e JOIN intakes i ON i.id = e.intake_id WHERE e.rep_id = %s ORDER BY e.submitted_at DESC",
            (rid,),
        )
        ents = []
        for r in rows(cur):
            d = json.loads(r["data"])
            ents.append({
                "intake_id": r["intake_id"], "items": json.loads(r["items"]), "version": r["version"],
                "submitted_at": r["submitted_at"], "imported_version": r["imported_version"], "open": r["open"],
                "tournament": d.get("name", ""), "date": d.get("date", ""),
            })
        return resp(200, {"intakes": its, "entries": ents})
    iid = int(b.get("intake_id") or 0)
    cur.execute("SELECT open FROM intakes WHERE id = %s", (iid,))
    r = cur.fetchone()
    if not r:
        return err(404, "Турнир не найден")
    if not r[0]:
        return err(400, "Приём заявок на этот турнир закрыт")
    if action == "entry_submit":
        items = b.get("items") or []
        if not isinstance(items, list) or not items:
            return err(400, "Заявка пуста")
        data = json.dumps(items, ensure_ascii=False)
        if len(data) > 400000:
            return err(400, "Слишком большая заявка")
        cur.execute(
            "INSERT INTO entries (intake_id, rep_id, items) VALUES (%s, %s, %s) "
            "ON CONFLICT (intake_id, rep_id) DO UPDATE SET items = EXCLUDED.items, version = entries.version + 1, submitted_at = NOW() "
            "RETURNING version",
            (iid, rid, data),
        )
        return resp(200, {"ok": True, "version": cur.fetchone()[0]})
    if action == "entry_withdraw":
        cur.execute("DELETE FROM entries WHERE intake_id = %s AND rep_id = %s", (iid, rid))
        return resp(200, {"ok": True})
    return err(400, "unknown action")


# ---------- главный секретарь (программа с полной версией) ----------

def secretary_license(cur, b: dict):
    key = "".join(ch for ch in str(b.get("key") or "").upper() if ch.isalnum())
    key = "-".join(key[i:i + 4] for i in range(0, len(key), 4))
    cur.execute(
        "SELECT l.id, l.blocked, l.expires_at FROM licenses l JOIN license_devices d ON d.license_id = l.id "
        "WHERE l.key = %s AND d.device_id = %s AND d.active",
        (key, clip(b.get("device"), 64)),
    )
    r = cur.fetchone()
    if not r or r[1] or (r[2] and r[2] < date.today()):
        return None
    return r[0]


def secretary_action(cur, action: str, b: dict) -> dict:
    lid = secretary_license(cur, b)
    if not lid:
        return err(403, "Приём заявок доступен в полной версии программы")
    uid = clip(b.get("t_uid"), 80)
    if not uid:
        return err(400, "Нет турнира")
    if action == "intake_open":
        data = json.dumps(b.get("tournament") or {}, ensure_ascii=False)
        cur.execute(
            "INSERT INTO intakes (license_id, t_uid, data, open) VALUES (%s, %s, %s, TRUE) "
            "ON CONFLICT (license_id, t_uid) DO UPDATE SET data = EXCLUDED.data, open = TRUE, updated_at = NOW()",
            (lid, uid, data),
        )
        return resp(200, {"ok": True})
    if action == "intake_close":
        cur.execute("UPDATE intakes SET open = FALSE, updated_at = NOW() WHERE license_id = %s AND t_uid = %s", (lid, uid))
        return resp(200, {"ok": True})
    cur.execute("SELECT id, open FROM intakes WHERE license_id = %s AND t_uid = %s", (lid, uid))
    it = cur.fetchone()
    if not it:
        return resp(200, {"intake": None, "entries": []})
    if b.get("imported"):
        for k, v in (b.get("imported") or {}).items():
            cur.execute("UPDATE entries SET imported_version = %s WHERE intake_id = %s AND rep_id = %s", (int(v), it[0], int(k)))
    cur.execute(
        "SELECT e.rep_id, e.items, e.version, e.submitted_at, e.imported_version, r.name, r.team, r.phone "
        "FROM entries e JOIN reps r ON r.id = e.rep_id WHERE e.intake_id = %s ORDER BY r.team, r.name",
        (it[0],),
    )
    ents = rows(cur)
    for e in ents:
        e["items"] = json.loads(e["items"])
    return resp(200, {"intake": {"id": it[0], "open": it[1]}, "entries": ents})


def handler(event: dict, context) -> dict:
    """Личный кабинет представителей команд: спортсмены, заявки на турниры; приём заявок главным секретарём; управление представителями."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}
    if event.get("httpMethod") != "POST":
        return resp(200, {"service": "cabinet"})
    b = json.loads(event.get("body") or "{}")
    action = str(b.get("action") or "")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}

    if action in ADMIN:
        pwd = os.environ.get("ADMIN_PASSWORD", "")
        if not pwd or not hmac.compare_digest(pwd.encode(), headers.get("x-admin-password", "").encode()):
            return err(401, "Неверный пароль")
    elif action not in REP and action not in SECRETARY and action != "login":
        return err(400, "unknown action")

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with conn.cursor() as cur:
            if action in ADMIN:
                r = admin_action(cur, action, b)
            elif action == "login":
                r = rep_login(cur, b)
            elif action in SECRETARY:
                r = secretary_action(cur, action, b)
            else:
                token = headers.get("x-session-id", "")
                cur.execute(
                    "SELECT r.id, r.login, r.name, r.team, r.phone, r.active FROM rep_sessions s JOIN reps r ON r.id = s.rep_id "
                    "WHERE s.token = %s AND s.created_at > NOW() - INTERVAL '60 days'",
                    (token,),
                )
                rep = one(cur)
                if not rep or not rep["active"]:
                    return err(401, "Войдите заново")
                r = rep_action(cur, rep, action, b, token)
        conn.commit()
        return r
    finally:
        conn.close()
