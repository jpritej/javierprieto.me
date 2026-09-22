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

async function fromNetwork(orcid, mail) {
  const url = `https://api.openalex.org/authors/https://orcid.org/${orcid}` +
    (mail ? `?mailto=${encodeURIComponent(mail)}` : "");
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("OpenAlex " + res.status);
  return normalize(await res.json());
}

async function fromSnapshot(base) {
  const res = await fetch(base + "data/openalex-cache.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("sin copia");
  return res.json();
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
