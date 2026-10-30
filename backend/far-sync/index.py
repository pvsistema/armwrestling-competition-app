import json
import re
import time
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait

import requests
from bs4 import BeautifulSoup

BASE = "https://baza.armwrestling-ru.ru/index.php"
HEADERS = {"User-Agent": "Mozilla/5.0 (Armsport FAR sync)"}
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}


BUDGET = 3.8
SESSION = requests.Session()
SESSION.mount("https://", requests.adapters.HTTPAdapter(pool_connections=4, pool_maxsize=48))


def get(params: dict, timeout: float = 8) -> BeautifulSoup:
    r = SESSION.get(BASE, params=params, headers=HEADERS, timeout=timeout)
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


def region(club: str, timeout: float = 8) -> list:
    s = get({"page": "passport_far", "club": club}, timeout)
    out = []
    for a in s.find_all("a"):
        m = re.match(r"\[\s*(\d+)\s*\]\s*-\s*(.+)", a.get_text(" ", strip=True))
        if m:
            out.append([m.group(1), re.sub(r"\s+", " ", m.group(2)).strip()])
    return out


def card(num: str, timeout: float = 8) -> list:
    s = get({"page": "edit_competitor", "group": "far", "number": num}, timeout)
    g = lambda n: ((s.find("input", attrs={"name": n}) or {}).get("value") or "").strip()
    sex = {"муж.": "M", "жен.": "F"}.get(g("sex"), "")
    b = g("birthdate_rus")
    name = " ".join(x for x in (g("surname"), g("name"), g("middle_name")) if x)
    return [num, {"name": name, "gender": sex, "rank": g("kwalifikacja"), "birthDate": "" if b.startswith("0000") else b}]


def batch(items: list, fn, threads: int) -> tuple:
    """Обрабатывает сколько успеет за BUDGET секунд; что не успело или упало — возвращается в left."""
    start = time.time()
    done, left = {}, []
    ex = ThreadPoolExecutor(threads)
    futs = {ex.submit(fn, x, 3): x for x in items}
    pending = set(futs)
    while pending:
        rest = BUDGET - (time.time() - start)
        if rest <= 0:
            break
        fin, pending = wait(pending, timeout=rest, return_when=FIRST_COMPLETED)
        for f in fin:
            try:
                done[futs[f]] = f.result()
            except Exception:
                left.append(futs[f])
    left += [futs[f] for f in pending]
    ex.shutdown(wait=False, cancel_futures=True)
    return done, left


def handler(event: dict, context) -> dict:
    """Посредник к базе паспортов ФАР: список регионов, спортсмены пачки регионов, до 200 карточек за вызов (с запасом по времени — неуспевшее возвращается в left)."""
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
    elif action == "regions_batch":
        clubs = [x for x in (q.get("clubs") or "").split(",") if x][:12]
        done, left = batch(clubs, region, 12)
        data = {"lists": done, "left": left}
    elif action == "cards":
        ids = [x for x in (q.get("ids") or "").split(",") if x.isdigit()][:200]
        done, left = batch(ids, lambda n, t: card(n, t)[1], 40)
        data = {"cards": done, "left": left}
    else:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "unknown action"})}
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, ensure_ascii=False)}
