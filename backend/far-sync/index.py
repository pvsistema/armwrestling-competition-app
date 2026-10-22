import json
import re
from concurrent.futures import ThreadPoolExecutor

import requests
from bs4 import BeautifulSoup

BASE = "https://baza.armwrestling-ru.ru/index.php"
HEADERS = {"User-Agent": "Mozilla/5.0 (Armsport FAR sync)"}
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}


def get(params: dict) -> BeautifulSoup:
    r = requests.get(BASE, params=params, headers=HEADERS, timeout=8)
    r.raise_for_status()
    r.encoding = "utf-8"
    return BeautifulSoup(r.text, "html.parser")


def regions() -> dict:
    s = get({"page": "passport_far"})
    out, dist = [], ""
    for el in s.find_all(["h2", "a"]):
        if el.name == "h2":
            dist = el.get_text(strip=True)
            continue
        href = el.get("href") or ""
        if href.startswith("?page=passport_far&club="):
            out.append([href.split("club=", 1)[1], dist])
    m = re.search(r"обновлена:\s*([\d.]+\s*[\d:]*)", s.get_text(" ", strip=True))
    return {"updated": m.group(1).strip() if m else "", "regions": out}


def region(club: str) -> list:
    s = get({"page": "passport_far", "club": club})
    out = []
    for a in s.find_all("a"):
        m = re.match(r"\[\s*(\d+)\s*\]\s*-\s*(.+)", a.get_text(" ", strip=True))
        if m:
            out.append([m.group(1), re.sub(r"\s+", " ", m.group(2)).strip()])
    return out


def card(num: str) -> list:
    try:
        s = get({"page": "edit_competitor", "group": "far", "number": num})
    except Exception:
        return [num, None]
    g = lambda n: ((s.find("input", attrs={"name": n}) or {}).get("value") or "").strip()
    sex = {"муж.": "M", "жен.": "F"}.get(g("sex"), "")
    b = g("birthdate_rus")
    name = " ".join(x for x in (g("surname"), g("name"), g("middle_name")) if x)
    return [num, {"name": name, "gender": sex, "rank": g("kwalifikacja"), "birthDate": "" if b.startswith("0000") else b}]


def handler(event: dict, context) -> dict:
    """Посредник к базе паспортов ФАР: список регионов, спортсмены региона, карточки по номерам."""
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "86400",
            },
            "body": "",
        }
    q = event.get("queryStringParameters") or {}
    action = q.get("action", "regions")
    if action == "regions":
        data = regions()
    elif action == "region":
        data = {"club": q.get("club", ""), "list": region(q.get("club", ""))}
    elif action == "cards":
        ids = [x for x in (q.get("ids") or "").split(",") if x.isdigit()][:40]
        with ThreadPoolExecutor(12) as ex:
            data = {"cards": dict(ex.map(card, ids))}
    else:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "unknown action"})}
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, ensure_ascii=False)}
