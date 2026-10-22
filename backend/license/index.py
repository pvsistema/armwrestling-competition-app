import hmac
import json
import os
import secrets
from datetime import date

import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
    "Access-Control-Max-Age": "86400",
}
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def resp(code: int, body: dict) -> dict:
    return {
        "statusCode": code,
        "headers": {**CORS, "Content-Type": "application/json", "Cache-Control": "no-store"},
        "body": json.dumps(body, ensure_ascii=False, default=str),
    }


def new_key() -> str:
    return "-".join("".join(secrets.choice(ALPHABET) for _ in range(4)) for _ in range(4))


def norm_key(k) -> str:
    return "".join(ch for ch in str(k or "").upper() if ch in ALPHABET)


def fmt_key(k: str) -> str:
    return "-".join(k[i:i + 4] for i in range(0, len(k), 4))


def clip(v, n: int) -> str:
    return str(v or "").strip()[:n]


def parse_date(v):
    if not v:
        return None
    return date.fromisoformat(str(v)[:10])


def lic_state(row) -> str:
    if row["blocked"]:
        return "blocked"
    if row["expires_at"] and row["expires_at"] < date.today():
        return "expired"
    return "ok"


LIC_COLS = "id, key, holder, contact, note, max_devices, expires_at, blocked, created_at"


def as_dict(cur, row):
    return {d[0]: v for d, v in zip(cur.description, row)}


def find_license(cur, key: str):
    cur.execute(f"SELECT {LIC_COLS} FROM licenses WHERE key = %s", (fmt_key(key),))
    r = cur.fetchone()
    return as_dict(cur, r) if r else None


def public_info(lic: dict) -> dict:
    return {"key": lic["key"], "holder": lic["holder"], "expires": lic["expires_at"].isoformat() if lic["expires_at"] else None}


def client_action(cur, action: str, body: dict) -> dict:
    key = norm_key(body.get("key"))
    device = clip(body.get("device"), 64)
    if len(key) != 16 or len(device) < 8:
        return resp(400, {"ok": False, "reason": "bad_request"})
    lic = find_license(cur, key)
    if not lic:
        return resp(200, {"ok": False, "reason": "not_found"})
    st = lic_state(lic)
    if st != "ok":
        return resp(200, {"ok": False, "reason": st})
    cur.execute("SELECT id, active FROM license_devices WHERE license_id = %s AND device_id = %s", (lic["id"], device))
    dev = cur.fetchone()
    if dev and dev[1]:
        cur.execute("UPDATE license_devices SET last_seen = NOW() WHERE id = %s", (dev[0],))
        return resp(200, {"ok": True, **public_info(lic)})
    if action == "check":
        return resp(200, {"ok": False, "reason": "device_released"})
    cur.execute("SELECT COUNT(*) FROM license_devices WHERE license_id = %s AND active", (lic["id"],))
    used = cur.fetchone()[0]
    if used >= lic["max_devices"]:
        return resp(200, {"ok": False, "reason": "limit", "max": lic["max_devices"]})
    name = clip(body.get("name"), 200)
    if dev:
        cur.execute("UPDATE license_devices SET active = TRUE, device_name = %s, activated_at = NOW(), last_seen = NOW() WHERE id = %s", (name, dev[0]))
    else:
        cur.execute("INSERT INTO license_devices (license_id, device_id, device_name) VALUES (%s, %s, %s)", (lic["id"], device, name))
    return resp(200, {"ok": True, **public_info(lic)})


def admin_list(cur) -> dict:
    cur.execute(f"SELECT {LIC_COLS} FROM licenses ORDER BY created_at DESC")
    lics = [as_dict(cur, r) for r in cur.fetchall()]
    cur.execute("SELECT id, license_id, device_id, device_name, activated_at, last_seen FROM license_devices WHERE active ORDER BY activated_at")
    devs = [as_dict(cur, r) for r in cur.fetchall()]
    for lic in lics:
        lic["devices"] = [d for d in devs if d["license_id"] == lic["id"]]
        lic["state"] = lic_state(lic)
    return resp(200, {"licenses": lics})


def admin_action(cur, action: str, body: dict) -> dict:
    if action == "list":
        return admin_list(cur)
    if action == "create":
        key = new_key()
        cur.execute(
            "INSERT INTO licenses (key, holder, contact, note, max_devices, expires_at) VALUES (%s, %s, %s, %s, %s, %s)",
            (key, clip(body.get("holder"), 200), clip(body.get("contact"), 200), clip(body.get("note"), 2000),
             max(1, min(100, int(body.get("max_devices") or 1))), parse_date(body.get("expires"))),
        )
        return resp(200, {"ok": True, "key": key})
    lid = int(body.get("id") or 0)
    if action == "update":
        cur.execute(
            "UPDATE licenses SET holder = %s, contact = %s, note = %s, max_devices = %s, expires_at = %s, blocked = %s WHERE id = %s",
            (clip(body.get("holder"), 200), clip(body.get("contact"), 200), clip(body.get("note"), 2000),
             max(1, min(100, int(body.get("max_devices") or 1))), parse_date(body.get("expires")), bool(body.get("blocked")), lid),
        )
        return resp(200, {"ok": True})
    if action == "release":
        cur.execute("UPDATE license_devices SET active = FALSE WHERE id = %s", (int(body.get("device_id") or 0),))
        return resp(200, {"ok": True})
    if action == "delete":
        cur.execute("DELETE FROM license_devices WHERE license_id = %s", (lid,))
        cur.execute("DELETE FROM licenses WHERE id = %s", (lid,))
        return resp(200, {"ok": True})
    return resp(400, {"error": "unknown action"})


def handler(event: dict, context) -> dict:
    """Ключи активации полной версии: активация и проверка на компьютере пользователя, выдача и управление ключами в админ-панели."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}
    if event.get("httpMethod") != "POST":
        return resp(200, {"service": "license"})
    body = json.loads(event.get("body") or "{}")
    action = str(body.get("action") or "")

    is_admin = action in ("list", "create", "update", "release", "delete", "login")
    if is_admin:
        headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
        pwd = os.environ.get("ADMIN_PASSWORD", "")
        given = headers.get("x-admin-password", "")
        if not pwd or not hmac.compare_digest(pwd.encode(), given.encode()):
            return resp(401, {"error": "Неверный пароль"})
        if action == "login":
            return resp(200, {"ok": True})
    elif action not in ("activate", "check"):
        return resp(400, {"error": "unknown action"})

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with conn.cursor() as cur:
            r = admin_action(cur, action, body) if is_admin else client_action(cur, action, body)
        conn.commit()
        return r
    finally:
        conn.close()
