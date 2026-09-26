/* Métricas bibliométricas desde OpenAlex (https://api.openalex.org).
   Gratis, sin clave, con CORS abierto y sin bloqueo a la automatización.
   Se identifica con un correo para entrar en el "polite pool" y tener
   mejor tiempo de respuesta. */

const TTL = 1000 * 60 * 60 * 24; // 24 h

export function normalize(author) {
  const s = author.summary_stats || {};
  const years = (author.counts_by_year || [])
    .slice()
    .sort((a, b) => a.year - b.year)
    .map((y) => ({ year: y.year, works: y.works_count || 0, citations: y.cited_by_count || 0 }));
  return {
    fetchedAt: new Date().toISOString(),
    id: author.id || "",
    citations: author.cited_by_count || 0,
    works: author.works_count || 0,
    hIndex: s.h_index || 0,
    i10Index: s.i10_index || 0,
    impact: s["2yr_mean_citedness"] || 0,
    byYear: years
  };
}

/* Se puede consultar por ORCID o por el identificador de autor de OpenAlex
   (A...). El segundo es más fiable si has reclamado el perfil y fusionado
   duplicados, porque apunta al registro exacto. */
function authorUrl(id, mail) {
  const path = /^A\d+$/i.test(id) ? id : `https://orcid.org/${id}`;
  return `https://api.openalex.org/authors/${path}` +
    (mail ? `?mailto=${encodeURIComponent(mail)}` : "");
}

async function fromNetwork(orcid, mail) {
  const url = authorUrl(orcid, mail);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("OpenAlex " + res.status);
  return normalize(await res.json());
}

async function fromSnapshot(base) {
  const res = await fetch(base + "data/openalex-cache.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("sin copia");
  return res.json();
}

/* Enlaces a la versión en abierto, trabajo a trabajo.
   Una sola petición para todo el listado; se indexa por DOI para casarlo
   con lo que ya tenemos de ORCID. */

const WORKS_TTL = 1000 * 60 * 60 * 24;

export function normDoi(doi) {
  return String(doi || "").toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "").trim();
}

export async function loadOpenAccess(orcid, { mail = "", force = false } = {}) {
  const key = "openalex:oa:" + orcid;
  if (!force) {
    try {
      const c = JSON.parse(localStorage.getItem(key) || "null");
      if (c && Date.now() - c.ts < WORKS_TTL) return c.data;
    } catch (_) { /* caché ilegible */ }
  }
  const filter = /^A\d+$/i.test(orcid)
    ? `author.id:${encodeURIComponent(orcid)}`
    : `author.orcid:${encodeURIComponent(orcid)}`;
  const base = "https://api.openalex.org/works" +
    `?filter=${filter}` +
    "&select=doi,open_access,best_oa_location,authorships,publication_year,biblio,primary_location,type" +
    "&per-page=200" +
    (mail ? `&mailto=${encodeURIComponent(mail)}` : "");
  const map = {};
  try {
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(`${base}&page=${page}`, { headers: { Accept: "application/json" } });
      if (!res.ok) break;
      const json = await res.json();
      const results = json.results || [];
      results.forEach((w) => {
        const doi = normDoi(w.doi);
        if (!doi) return;
        const loc = w.best_oa_location || {};
        const url = loc.pdf_url || loc.landing_page_url || (w.open_access || {}).oa_url;
        const b = w.biblio || {};
        map[doi] = {
          url: url || "",
          pdf: Boolean(loc.pdf_url),
          // lo necesario para una cita APA sin pedir cada trabajo por separado
          authors: (w.authorships || []).map((a) => (a.author || {}).display_name).filter(Boolean),
          year: w.publication_year || null,
          venue: ((w.primary_location || {}).source || {}).display_name || "",
          volume: b.volume || "", issue: b.issue || "",
          pages: b.first_page ? (b.last_page && b.last_page !== b.first_page
            ? `${b.first_page}-${b.last_page}` : b.first_page) : ""
        };
      });
      if (results.length < 200) break;
    }
    try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: map })); } catch (_) {}
  } catch (_) { /* sin acceso abierto, la web sigue igual */ }
  return map;
}

export async function load(orcid, { base = "", mail = "", force = false, onData = () => {} } = {}) {
  const key = "openalex:" + orcid;
  if (!force) {
    try {
      const c = JSON.parse(localStorage.getItem(key) || "null");
      if (c && Date.now() - c.ts < TTL) { onData(c.data, "cache"); return c.data; }
    } catch (_) { /* caché ilegible */ }
    try { onData(await fromSnapshot(base), "snapshot"); } catch (_) { /* aún sin copia */ }
  }
  try {
    const fresh = await fromNetwork(orcid, mail);
    try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: fresh })); } catch (_) {}
    onData(fresh, "network");
    return fresh;
  } catch (err) {
    try {
      const snap = await fromSnapshot(base);
      onData(snap, "snapshot");
      return snap;
    } catch (_) {
      onData(null, "error");
      return null;
    }
  }
}
