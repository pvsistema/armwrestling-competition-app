import base64
import hmac
import json
import os
import secrets
import time
from datetime import date

import boto3
import psycopg2
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature

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


OFFLINE_DAYS = 30
_signer = None


def b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def signer(cur):
    """Ключ подписи подтверждений: создаётся один раз и хранится в базе."""
    global _signer
    if _signer:
        return _signer
    cur.execute("SELECT private_pem, public_spki FROM license_signing WHERE id = 1")
    r = cur.fetchone()
    if not r:
        k = ec.generate_private_key(ec.SECP256R1())
        pem = k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
        spki = base64.b64encode(k.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)).decode()
        cur.execute("INSERT INTO license_signing (id, private_pem, public_spki) VALUES (1, %s, %s) ON CONFLICT (id) DO NOTHING", (pem, spki))
        cur.execute("SELECT private_pem, public_spki FROM license_signing WHERE id = 1")
        r = cur.fetchone()
    _signer = (serialization.load_pem_private_key(r[0].encode(), None), r[1])
    return _signer


def make_token(cur, lic: dict, device: str) -> str:
    """Подписанное подтверждение: ключ, компьютер, срок работы без интернета."""
    now = int(time.time() * 1000)
    until = now + OFFLINE_DAYS * 86400000
    if lic["expires_at"]:
        end = int(time.mktime(lic["expires_at"].timetuple()) * 1000) + 86400000
        until = min(until, end)
    payload = json.dumps(
        {"k": lic["key"], "d": device, "h": lic["holder"], "e": lic["expires_at"].isoformat() if lic["expires_at"] else None, "i": now, "x": until},
        ensure_ascii=False, separators=(",", ":"),
    ).encode()
    p = b64u(payload)
    der = signer(cur)[0].sign(p.encode(), ec.ECDSA(hashes.SHA256()))
    rr, ss = decode_dss_signature(der)
    return p + "." + b64u(rr.to_bytes(32, "big") + ss.to_bytes(32, "big"))


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
    if action == "rebind":
        old = clip(body.get("old"), 64)
        cur.execute("SELECT id FROM license_devices WHERE license_id = %s AND device_id = %s AND active", (lic["id"], old))
        od = cur.fetchone()
        if od and old != device:
            if dev:
                cur.execute("UPDATE license_devices SET active = FALSE WHERE id = %s", (od[0],))
                cur.execute("UPDATE license_devices SET active = TRUE, last_seen = NOW() WHERE id = %s", (dev[0],))
            else:
                cur.execute("UPDATE license_devices SET device_id = %s, last_seen = NOW() WHERE id = %s", (device, od[0]))
            return resp(200, {"ok": True, **public_info(lic), "token": make_token(cur, lic, device)})
        action = "check"
    if dev and dev[1]:
        cur.execute("UPDATE license_devices SET last_seen = NOW() WHERE id = %s", (dev[0],))
        return resp(200, {"ok": True, **public_info(lic), "token": make_token(cur, lic, device)})
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
    return resp(200, {"ok": True, **public_info(lic), "token": make_token(cur, lic, device)})


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


PART_MAX = 2 * 1024 * 1024
REL_COLS = "id, version, notes, file_url, file_name, file_size, sha256, parts, mandatory, published, created_at, published_at"


def s3():
    return boto3.client("s3", endpoint_url="https://bucket.poehali.dev",
                        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"], aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"])


def part_key(rid: int, n: int) -> str:
    return f"releases/{rid}/part{n:03d}.bin"


def cdn(key: str) -> str:
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def ver_ok(v: str) -> bool:
    p = v.split(".")
    return 1 <= len(p) <= 4 and all(x.isdigit() and len(x) <= 5 for x in p)


def sign_text(cur, text: str) -> str:
    der = signer(cur)[0].sign(text.encode(), ec.ECDSA(hashes.SHA256()))
    rr, ss = decode_dss_signature(der)
    return b64u(rr.to_bytes(32, "big") + ss.to_bytes(32, "big"))


def release_public(cur, r: dict) -> dict:
    """Описание обновления для программы: части файла и подпись сервера (версия + SHA-256 + размер)."""
    out = {"version": r["version"], "notes": r["notes"], "mandatory": r["mandatory"],
           "published_at": r["published_at"], "file_name": r["file_name"], "size": r["file_size"], "url": r["file_url"]}
    if r["parts"]:
        out["parts"] = [cdn(part_key(r["id"], n)) for n in range(1, r["parts"] + 1)]
        out["sha256"] = r["sha256"]
        out["sig"] = sign_text(cur, f"rukoborec-update|{r['version']}|{r['sha256']}|{r['file_size']}")
    return out


def latest_release(cur) -> dict:
    cur.execute(f"SELECT {REL_COLS} FROM app_releases WHERE published")
    rows = [as_dict(cur, r) for r in cur.fetchall()]
    if not rows:
        return resp(200, {"release": None})
    best = max(rows, key=lambda r: tuple(int(x) for x in r["version"].split(".")) + (0,) * 4)
    return resp(200, {"release": release_public(cur, best)})


def release_action(cur, action: str, body: dict) -> dict:
    rid = int(body.get("id") or 0)
    if action == "rel_list":
        cur.execute(f"SELECT {REL_COLS} FROM app_releases ORDER BY created_at DESC")
        return resp(200, {"releases": [as_dict(cur, r) for r in cur.fetchall()]})
    if action == "rel_create":
        version = clip(body.get("version"), 32)
        if not ver_ok(version):
            return resp(400, {"error": "Номер версии в формате 1.0.1"})
        sha = clip(body.get("sha256"), 64).lower()
        size = max(0, int(body.get("size") or 0))
        url = clip(body.get("url"), 1000)
        if sha and (len(sha) != 64 or not size):
            return resp(400, {"error": "Неверные данные файла"})
        if not sha and not url.startswith("https://"):
            return resp(400, {"error": "Загрузите файл установщика или укажите ссылку https://"})
        cur.execute(
            "INSERT INTO app_releases (version, notes, file_url, file_name, file_size, sha256, mandatory) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (version, clip(body.get("notes"), 5000), url, clip(body.get("file_name"), 255), size, sha, bool(body.get("mandatory"))),
        )
        return resp(200, {"ok": True, "id": cur.fetchone()[0]})
    if action == "rel_part":
        n = int(body.get("n") or 0)
        data = base64.b64decode(str(body.get("data") or ""))
        if not rid or n < 1 or n > 500 or not data or len(data) > PART_MAX:
            return resp(400, {"error": "Неверная часть файла"})
        cur.execute("SELECT published FROM app_releases WHERE id = %s", (rid,))
        r = cur.fetchone()
        if not r or r[0]:
            return resp(400, {"error": "Версия не найдена или уже опубликована"})
        s3().put_object(Bucket="files", Key=part_key(rid, n), Body=data, ContentType="application/octet-stream")
        cur.execute("UPDATE app_releases SET parts = GREATEST(parts, %s) WHERE id = %s", (n, rid))
        return resp(200, {"ok": True})
    if action == "rel_publish":
        cur.execute(f"SELECT {REL_COLS} FROM app_releases WHERE id = %s", (rid,))
        r = cur.fetchone()
        if not r:
            return resp(404, {"error": "Версия не найдена"})
        r = as_dict(cur, r)
        if r["sha256"] and r["parts"] != -(-r["file_size"] // PART_MAX):
            return resp(400, {"error": "Файл загружен не полностью — загрузите версию заново"})
        on = bool(body.get("on", True))
        cur.execute("UPDATE app_releases SET published = %s, published_at = CASE WHEN %s THEN NOW() ELSE published_at END, mandatory = %s, notes = %s WHERE id = %s",
                    (on, on, bool(body.get("mandatory", r["mandatory"])), clip(body.get("notes", r["notes"]), 5000), rid))
        return resp(200, {"ok": True})
    if action == "rel_delete":
        cur.execute("SELECT parts FROM app_releases WHERE id = %s", (rid,))
        r = cur.fetchone()
        if r and r[0]:
            c = s3()
            for n in range(1, r[0] + 1):
                c.delete_object(Bucket="files", Key=part_key(rid, n))
        cur.execute("DELETE FROM app_releases WHERE id = %s", (rid,))
        return resp(200, {"ok": True})
    return resp(400, {"error": "unknown action"})


def handler(event: dict, context) -> dict:
    """Ключи активации и обновления программы: активация и проверка на компьютере, выдача ключей и публикация новых версий в админ-панели."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}
    if event.get("httpMethod") != "POST":
        return resp(200, {"service": "license"})
    body = json.loads(event.get("body") or "{}")
    action = str(body.get("action") or "")

    is_admin = action in ("list", "create", "update", "release", "delete", "login") or action.startswith("rel_")
    if is_admin:
        headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
        pwd = os.environ.get("ADMIN_PASSWORD", "")
        given = headers.get("x-admin-password", "")
        if not pwd or not hmac.compare_digest(pwd.encode(), given.encode()):
            return resp(401, {"error": "Неверный пароль"})
        if action == "login":
            return resp(200, {"ok": True})
    elif action == "pubkey":
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        try:
            with conn.cursor() as cur:
                spki = signer(cur)[1]
            conn.commit()
        finally:
            conn.close()
        return resp(200, {"spki": spki})
    elif action == "latest":
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        try:
            with conn.cursor() as cur:
                r = latest_release(cur)
            conn.commit()
            return r
        finally:
            conn.close()
    elif action not in ("activate", "check", "rebind"):
        return resp(400, {"error": "unknown action"})

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with conn.cursor() as cur:
            if action.startswith("rel_"):
                r = release_action(cur, action, body)
            else:
                r = admin_action(cur, action, body) if is_admin else client_action(cur, action, body)
        conn.commit()
        return r
    finally:
        conn.close()
