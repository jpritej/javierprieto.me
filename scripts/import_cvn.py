#!/usr/bin/env python3
"""Importa un CVN de FECYT (PDF) a los datos de la web.

Escribe data/cvn.json (proyectos, patentes, tesis y totales) y actualiza en
data/site.json las tesis doctorales, las patentes y los indicadores.

Uso:
    python3 scripts/import_cvn.py ruta/al/cvn.pdf

Extrae el texto con `pdftotext` (poppler-utils) si está instalado y, si no, con
pypdf (`pip install pypdf`). Vuelve a ejecutarlo cada vez que actualices el CVN:
sobrescribe lo importado y respeta el resto de data/site.json.
"""
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
from collections import Counter
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

SECTIONS = [
    ("tesis", r"^Dirección de tesis doctorales", r"^Tutorías académicas", "Título del trabajo"),
    ("innovacion", r"^Proyectos de innovación docente", r"^Eventos con intervenciones", "Título del proyecto"),
    ("competitivos", r"^Proyectos de I\+D\+i financiados en convocatorias",
     r"^Contratos, convenios o proyectos", "Nombre del proyecto"),
    ("contratos", r"^Contratos, convenios o proyectos", r"^Resultados$", "Nombre del proyecto"),
    ("patentes", r"^Propiedad industrial e intelectual", r"^Producción científica$",
     "Título propiedad industrial registrada"),
]

SCOPES = ["Unión Europea", "Internacional no UE", "Nacional", "Autonómica", "Local", "Universitaria"]
ME = "Javier Prieto"


def pdf_text(path):
    if shutil.which("pdftotext"):
        with tempfile.NamedTemporaryFile(suffix=".txt") as tmp:
            subprocess.run(["pdftotext", str(path), tmp.name], check=True)
            return pathlib.Path(tmp.name).read_text(encoding="utf-8", errors="replace")
    try:
        from pypdf import PdfReader
    except ImportError:
        sys.exit("Instala poppler-utils (pdftotext) o ejecuta: pip install pypdf")
    return "\n".join(p.extract_text() or "" for p in PdfReader(str(path)).pages)


def clean(text):
    text = text.replace("\f", "\n")
    text = re.sub(r"^[0-9a-f]{32}$", "", text, flags=re.M)   # marca de agua del CVN
    return [l.rstrip() for l in text.split("\n")]


def block(lines, start_pat, end_pat):
    s = next((i for i, l in enumerate(lines) if re.search(start_pat, l)), None)
    if s is None:
        return []
    e = next((i for i in range(s + 1, len(lines)) if re.search(end_pat, lines[i])), len(lines))
    return lines[s:e]


def parse(chunk, headkey):
    """Cada registro empieza por '<headkey>:' y sigue con pares 'campo: valor'."""
    recs, cur, last = [], None, None
    for line in chunk:
        s = line.strip()
        if s.startswith(headkey + ":"):
            if cur:
                recs.append(cur)
            cur, last = {headkey: s[len(headkey) + 1:].strip()}, headkey
            continue
        if cur is None or not s:
            continue
        m = re.match(r"^([A-ZÁÉÍÓÚÑ][^:]{2,70}):\s*(.*)$", s)
        if m:
            key, val = m.group(1).strip(), m.group(2).strip()
            glued = re.match(r"^(.*?)\s+(Tipo de entidad|Duración|Tipo de propiedad industrial):\s*(.*)$", val)
            if glued:
                val = glued.group(1).strip()
                cur.setdefault(glued.group(2), glued.group(3).strip())
            cur.setdefault(key, val)
            last = key
        elif last and not re.fullmatch(r"\d+", s):
            cur[last] = (cur[last] + " " + s).strip()
    if cur:
        recs.append(cur)
    return recs


def money(v):
    m = re.search(r"([\d\.]+)(?:,(\d+))?\s*€", v or "")
    if not m:
        return 0
    return round(float(m.group(1).replace(".", "") + ("." + m.group(2) if m.group(2) else "")))


def years(v):
    found = re.findall(r"\d{2}/\d{2}/(\d{4})", v or "")
    return (found[0] if found else "", found[1] if len(found) > 1 else "")


def scope_of(rec):
    raw = rec.get("Ámbito geográfico", "")
    return next((s for s in SCOPES if raw.startswith(s)), "")


def slug(text):
    base = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return base[:60]


def slug(text):
    base = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return base[:60] or "sin-titulo"


def project(rec, kind):
    start, end = years(rec.get("Fecha de inicio-fin") or rec.get("Fecha de inicio", ""))
    total = money(rec.get("Cuantía total") or rec.get("Importe concedido", ""))
    own = money(rec.get("Cuantía subproyecto", "")) or total
    ip = rec.get("Nombres investigadores principales (IP, Co-IP,...)") or \
        rec.get("Nombre del investigador/a principal (IP)", "")
    title = re.sub(r"\s+", " ", rec.get("Nombre del proyecto") or rec.get("Título del proyecto", ""))
    return {
        "id": rec.get("Cód. según financiadora", "").strip() or slug(title),
        "title": title,
        "kind": kind,
        "program": rec.get("Nombre del programa", ""),
        "code": rec.get("Cód. según financiadora", ""),
        "funder": rec.get("Entidad/es financiadora/s") or rec.get("Entidad financiadora", ""),
        "host": rec.get("Entidad de realización", ""),
        "role": rec.get("Tipo de participación", ""),
        "ip": ip,
        "lead": ME in ip or rec.get("Tipo de participación", "") == "Coordinador",
        "scope": scope_of(rec),
        "start": start,
        "end": end,
        "amountTotal": total,
        "amountOwn": own,
    }


def patent(rec):
    kind = rec.get("Tipo de propiedad industrial") or (
        "Registro de software" if rec.get("Derechos de autor") == "Sí" else "Propiedad industrial")
    return {
        "title": re.sub(r"\s+", " ", rec.get("Título propiedad industrial registrada", "")),
        "type": kind,
        "number": rec.get("Nº de patente") or rec.get("Nº de solicitud", ""),
        "country": rec.get("País de inscripción", ""),
        "date": rec.get("Fecha de registro", ""),
        "year": (re.findall(r"(\d{4})", rec.get("Fecha de registro", "")) or [""])[0],
        "owner": rec.get("Entidad titular de derechos", ""),
        "inventors": rec.get("Inventores/autores/obtentores", ""),
    }


def thesis(rec):
    return {
        "title": re.sub(r"\s+", " ", rec.get("Título del trabajo", "")),
        "kind": rec.get("Tipo de proyecto", ""),
        "student": rec.get("Alumno/a", ""),
        "year": (re.findall(r"(\d{4})", rec.get("Fecha de defensa", "")) or [""])[0],
        "university": rec.get("Entidad de realización", ""),
        "grade": rec.get("Calificación obtenida", ""),
        "international": rec.get("Doctorado Europeo / Internacional", "") == "Sí",
    }


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    lines = clean(pdf_text(pathlib.Path(sys.argv[1])))
    got = {name: parse(block(lines, a, b), head) for name, a, b, head in SECTIONS}

    projects = ([project(r, "competitivo") for r in got["competitivos"]] +
                [project(r, "contrato") for r in got["contratos"]] +
                [project(r, "innovacion") for r in got["innovacion"]])
    projects = [p for p in projects if p["title"]]
    projects.sort(key=lambda p: (p["start"] or "0000", p["title"]), reverse=True)
    seen = Counter()
    for p in projects:
        seen[p["id"]] += 1
        if seen[p["id"]] > 1:
            p["id"] = f"{p['id']}-{seen[p['id']]}"

    patents = [patent(r) for r in got["patentes"] if r.get("Título propiedad industrial registrada")]
    patents.sort(key=lambda p: p["year"], reverse=True)

    works = [thesis(r) for r in got["tesis"] if r.get("Título del trabajo")]

    # trabajos que aún no están en el CVN (por ejemplo, defensas recientes)
    extra_path = DATA / "extra-supervisions.json"
    if extra_path.exists():
        seen = {(w["student"], w["year"]) for w in works}
        for w in json.loads(extra_path.read_text(encoding="utf-8")):
            if (w.get("student"), w.get("year")) not in seen:
                works.append({**{"title": "", "kind": "", "student": "", "year": "",
                                 "university": "", "grade": "", "international": False}, **w})
    phd = [w for w in works if w["kind"] == "Tesis Doctoral"]
    phd.sort(key=lambda w: w["year"], reverse=True)
    master = [w for w in works if "áster" in w["kind"] or "Máster" in w["kind"]]
    degree = [w for w in works if w not in phd and w not in master]
    supervisions = sorted([w for w in works if w not in phd],
                          key=lambda w: (w["year"], w["student"]), reverse=True)

    cvn = {
        "generatedAt": date.today().isoformat(),
        "projects": projects,
        "patents": patents,
        "theses": phd,
        "supervisions": supervisions,
        "supervision": {"phd": len(phd), "master": len(master), "degree": len(degree)},
        "totals": {
            "projects": len(projects),
            "asLead": sum(1 for p in projects if p["lead"]),
            "budgetTotal": sum(p["amountTotal"] for p in projects),
            "managed": sum(p["amountOwn"] for p in projects),
            "byKind": Counter(p["kind"] for p in projects),
        },
    }
    (DATA / "cvn.json").write_text(json.dumps(cvn, ensure_ascii=False, indent=1), encoding="utf-8")

    site = json.loads((DATA / "site.json").read_text(encoding="utf-8"))
    site["theses"] = [{
        "student": w["student"],
        "title": {"es": w["title"], "en": w["title"]},
        "year": w["year"],
        "university": {"es": w["university"], "en": w["university"]},
        "url": "",
    } for w in phd]
    site["patents"] = [{
        "title": {"es": p["title"], "en": p["title"]},
        "type": p["type"],
        "number": p["number"],
        "year": p["year"],
        "owner": p["owner"],
        "url": "",
    } for p in patents]
    m = site.setdefault("metrics", {})
    m["theses"] = len(phd)
    m["patents"] = sum(1 for p in patents if "Patente" in p["type"])
    m["projects"] = len(projects)
    m["fundingEur"] = cvn["totals"]["managed"]
    m["supervisionMaster"] = len(master)
    m["supervisionDegree"] = len(degree)
    site["updatedAt"] = date.today().isoformat()
    (DATA / "site.json").write_text(json.dumps(site, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    t = cvn["totals"]
    print(f"proyectos: {t['projects']} ({dict(t['byKind'])}), como IP o coordinador: {t['asLead']}")
    print(f"presupuesto total: {t['budgetTotal']:,} € · gestionado: {t['managed']:,} €")
    print(f"tesis doctorales: {len(phd)} · TFM: {len(master)} · TFG y PFC: {len(degree)}")
    print(f"propiedad industrial: {len(patents)} registros, {m['patents']} patentes de invención")


if __name__ == "__main__":
    main()
