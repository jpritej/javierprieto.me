#!/usr/bin/env python3
"""Descarga el registro público de ORCID y lo guarda normalizado en data/orcid-cache.json.

Sirve para dos cosas: que la web cargue rápido sin esperar a ORCID y que siga
mostrando las publicaciones si ORCID no responde. El formato es el mismo que
produce assets/js/orcid.js.

Uso:  python3 scripts/fetch_orcid.py 0000-0001-8175-2201
"""
import json
import pathlib
import sys
import urllib.request
from datetime import datetime, timezone

API = "https://pub.orcid.org/v3.0"
OUT = pathlib.Path(__file__).resolve().parents[1] / "data" / "orcid-cache.json"


def dig(node, *path):
    for key in path:
        if node is None:
            return None
        node = node.get(key) if isinstance(node, dict) else None
    return node


def as_year(node):
    try:
        return int(dig(node, "year", "value"))
    except (TypeError, ValueError):
        return None


def work(summary):
    ids = dig(summary, "external-ids", "external-id") or []
    by_type = {i.get("external-id-type"): i.get("external-id-value") for i in ids}
    doi = by_type.get("doi", "")
    return {
        "id": summary.get("put-code"),
        "title": dig(summary, "title", "title", "value") or "",
        "subtitle": dig(summary, "title", "subtitle", "value") or "",
        "year": as_year(summary.get("publication-date")),
        "type": summary.get("type") or "other",
        "venue": dig(summary, "journal-title", "value") or "",
        "doi": doi,
        "url": dig(summary, "url", "value") or (f"https://doi.org/{doi}" if doi else ""),
        "issn": by_type.get("issn", ""),
    }


def affiliation(summary):
    return {
        "org": dig(summary, "organization", "name") or "",
        "city": dig(summary, "organization", "address", "city") or "",
        "country": dig(summary, "organization", "address", "country") or "",
        "role": summary.get("role-title") or "",
        "dept": summary.get("department-name") or "",
        "start": as_year(summary.get("start-date")),
        "end": as_year(summary.get("end-date")),
    }


def summaries(node, key):
    out = []
    for group in (dig(node, "affiliation-group") or []):
        for item in group.get("summaries") or []:
            if item.get(key):
                out.append(item[key])
    return out


def funding(summary):
    return {
        "title": dig(summary, "title", "title", "value") or "",
        "org": dig(summary, "organization", "name") or "",
        "type": summary.get("type") or "",
        "start": as_year(summary.get("start-date")),
        "end": as_year(summary.get("end-date")),
        "url": dig(summary, "url", "value") or "",
    }


def fetch(orcid):
    req = urllib.request.Request(
        f"{API}/{orcid}/record",
        headers={"Accept": "application/json", "User-Agent": "javierprieto.me/1.0"},
    )
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.load(res)


def main():
    orcid = sys.argv[1] if len(sys.argv) > 1 else "0000-0001-8175-2201"
    record = fetch(orcid)
    acts = record.get("activities-summary") or {}

    works = [work((g.get("work-summary") or [{}])[0]) for g in (dig(acts, "works", "group") or [])]
    works = [w for w in works if w["title"]]
    works.sort(key=lambda w: (-(w["year"] or 0), w["title"]))

    fundings = [funding(s) for s in summaries(acts.get("fundings"), "funding-summary")]

    data = {
        "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "orcid": dig(record, "orcid-identifier", "path") or orcid,
        "name": " ".join(filter(None, [
            dig(record, "person", "name", "given-names", "value"),
            dig(record, "person", "name", "family-name", "value"),
        ])),
        "works": works,
        "employments": [affiliation(s) for s in summaries(acts.get("employments"), "employment-summary")],
        "educations": [affiliation(s) for s in summaries(acts.get("educations"), "education-summary")],
        "fundings": fundings,
        "counts": {
            "works": len(works),
            "fundings": len(fundings),
            "peerReviews": len(dig(acts, "peer-reviews", "group") or []),
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{OUT.name}: {len(works)} publicaciones, {len(fundings)} proyectos financiados")


if __name__ == "__main__":
    main()
