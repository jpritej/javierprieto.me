#!/usr/bin/env python3
"""Guarda las métricas de OpenAlex en data/openalex-cache.json.

Mismo formato que produce assets/js/openalex.js, para que la web tenga números
al instante y siga mostrándolos si la API no responde.

Uso:  python3 scripts/fetch_openalex.py 0000-0001-8175-2201 javierp@usal.es
"""
import json
import pathlib
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

OUT = pathlib.Path(__file__).resolve().parents[1] / "data" / "openalex-cache.json"


def main():
    orcid = sys.argv[1] if len(sys.argv) > 1 else "0000-0001-8175-2201"
    mail = sys.argv[2] if len(sys.argv) > 2 else "javierp@usal.es"

    url = f"https://api.openalex.org/authors/https://orcid.org/{orcid}"
    if mail:
        url += "?mailto=" + urllib.parse.quote(mail)

    req = urllib.request.Request(url, headers={
        "Accept": "application/json",
        "User-Agent": f"javierprieto.me/1.0 (mailto:{mail})",
    })
    with urllib.request.urlopen(req, timeout=60) as res:
        author = json.load(res)

    stats = author.get("summary_stats") or {}
    years = sorted(
        ({"year": y["year"], "works": y.get("works_count", 0), "citations": y.get("cited_by_count", 0)}
         for y in author.get("counts_by_year") or []),
        key=lambda y: y["year"],
    )

    data = {
        "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "id": author.get("id", ""),
        "citations": author.get("cited_by_count", 0),
        "works": author.get("works_count", 0),
        "hIndex": stats.get("h_index", 0),
        "i10Index": stats.get("i10_index", 0),
        "impact": stats.get("2yr_mean_citedness", 0),
        "byYear": years,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{OUT.name}: {data['citations']} citas, índice h {data['hIndex']}, i10 {data['i10Index']}")


if __name__ == "__main__":
    main()
