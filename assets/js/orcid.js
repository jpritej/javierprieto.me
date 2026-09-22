/* Ingesta desde la API pública de ORCID (https://pub.orcid.org/v3.0).
   La API admite CORS, así que se puede llamar directamente desde el navegador.
   Estrategia: pintar primero la copia de data/orcid-cache.json y refrescar en
   segundo plano. Si ORCID falla, la web sigue funcionando con la copia. */

const API = "https://pub.orcid.org/v3.0";
const TTL = 1000 * 60 * 60 * 12; // 12 h

const val = (o, ...path) => path.reduce((a, k) => (a == null ? a : a[k]), o);

function normalizeWork(ws) {
  const ids = val(ws, "external-ids", "external-id") || [];
  const byType = (t) => (ids.find((i) => i["external-id-type"] === t) || {})["external-id-value"];
  const doi = byType("doi");
  return {
    id: ws["put-code"],
    title: val(ws, "title", "title", "value") || "",
    subtitle: val(ws, "title", "subtitle", "value") || "",
    year: Number(val(ws, "publication-date", "year", "value")) || null,
    type: ws.type || "other",
    venue: val(ws, "journal-title", "value") || "",
    doi: doi || "",
    url: val(ws, "url", "value") || (doi ? "https://doi.org/" + doi : ""),
    issn: byType("issn") || ""
  };
}

function normalizeAffiliation(sum) {
  return {
    org: val(sum, "organization", "name") || "",
    city: val(sum, "organization", "address", "city") || "",
    country: val(sum, "organization", "address", "country") || "",
    role: sum["role-title"] || "",
    dept: sum["department-name"] || "",
    start: Number(val(sum, "start-date", "year", "value")) || null,
    end: Number(val(sum, "end-date", "year", "value")) || null
  };
}

function groups(node, key) {
  const g = val(node, "affiliation-group") || [];
  return g.flatMap((x) => (x.summaries || []).map((s) => s[key]).filter(Boolean));
}

export function normalizeRecord(record) {
  const act = record["activities-summary"] || {};
  const works = (val(act, "works", "group") || [])
    .map((g) => normalizeWork((g["work-summary"] || [])[0] || {}))
    .filter((w) => w.title);

  works.sort((a, b) => (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title));

  const fundings = groups(act.fundings, "funding-summary").map((f) => ({
    title: val(f, "title", "title", "value") || "",
    org: val(f, "organization", "name") || "",
    type: f.type || "",
    start: Number(val(f, "start-date", "year", "value")) || null,
    end: Number(val(f, "end-date", "year", "value")) || null,
    url: val(f, "url", "value") || ""
  }));

  return {
    fetchedAt: new Date().toISOString(),
    orcid: val(record, "orcid-identifier", "path") || "",
    name: [val(record, "person", "name", "given-names", "value"),
           val(record, "person", "name", "family-name", "value")].filter(Boolean).join(" "),
    works,
    employments: groups(val(act, "employments"), "employment-summary").map(normalizeAffiliation),
    educations: groups(val(act, "educations"), "education-summary").map(normalizeAffiliation),
    fundings,
    counts: {
      works: works.length,
      fundings: fundings.length,
      peerReviews: (val(act, "peer-reviews", "group") || []).length
    }
  };
}

async function fromNetwork(orcid) {
  const res = await fetch(`${API}/${orcid}/record`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("ORCID " + res.status);
  return normalizeRecord(await res.json());
}

async function fromSnapshot(base) {
  const res = await fetch(base + "data/orcid-cache.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("sin copia");
  const json = await res.json();
  return json.works ? json : normalizeRecord(json);
}

function readCache(orcid) {
  try {
    const c = JSON.parse(localStorage.getItem("orcid:" + orcid) || "null");
    if (c && Date.now() - c.ts < TTL) return c.data;
  } catch (_) { /* caché ilegible */ }
  return null;
}

function writeCache(orcid, data) {
  try {
    localStorage.setItem("orcid:" + orcid, JSON.stringify({ ts: Date.now(), data }));
  } catch (_) { /* cuota llena, no es crítico */ }
}

/**
 * Entrega los datos lo antes posible y avisa cuando llegan los frescos.
 * onData(data, origin) se llama una o dos veces: 'cache' | 'snapshot' | 'network'.
 */
export async function load(orcid, { base = "", force = false, onData = () => {} } = {}) {
  if (!force) {
    const cached = readCache(orcid);
    if (cached) {
      onData(cached, "cache");
      return cached;
    }
    try {
      onData(await fromSnapshot(base), "snapshot");
    } catch (_) { /* no hay copia todavía */ }
  }
  try {
    const fresh = await fromNetwork(orcid);
    writeCache(orcid, fresh);
    onData(fresh, "network");
    return fresh;
  } catch (err) {
    try {
      const snap = await fromSnapshot(base);
      onData(snap, "snapshot");
      return snap;
    } catch (_) {
      onData(null, "error");
      throw err;
    }
  }
}
