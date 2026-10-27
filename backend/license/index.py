import base64
import hmac
import json
import os
import secrets
import time
from datetime import date

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
    elif action == "pubkey":
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        try:
            with conn.cursor() as cur:
                spki = signer(cur)[1]
            conn.commit()
        finally:
            conn.close()
        return resp(200, {"spki": spki})
    elif action not in ("activate", "check", "rebind"):
        return resp(400, {"error": "unknown action"})

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with conn.cursor() as cur:
            r = admin_action(cur, action, body) if is_admin else client_action(cur, action, body)
        conn.commit()
        return r
    finally:
        conn.close()
