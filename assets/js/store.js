/* Estado compartido: datos del sitio, idioma y textos de interfaz. */

export const LANGS = ["es", "en"];

const UI = {
  es: {
    "nav.profile": "Perfil",
    "nav.pubs": "Publicaciones",
    "nav.projects": "Proyectos",
    "nav.press": "Divulgación",
    "press.all": "Todo",
    "press.count": (n) => `${n} ${n === 1 ? "aparición" : "apariciones"}`,
    "press.approx": "(fecha aproximada)",
    "press.readAt": (m) => `Leer en ${m}`,
    "press.prev": "Anterior",
    "press.next": "Siguiente",
    "press.close": "Cerrar",
    "nav.teaching": "Docencia",
    "sec.courses": "Asignaturas impartidas",
    "sec.supervisions": "Trabajos fin de estudios dirigidos",
    "s.search": "Buscar por título o estudiante",
    "d.years": "Cursos académicos impartiendo",
    "d.subjects": "Asignaturas distintas",
    "d.rea": "Recursos educativos abiertos",
    "d.reaWith": "con",
    "sec.rea": "Recursos educativos abiertos",
    "t.intl": "Mención internacional",
    "p.byCount": "Reparto por número",
    "p.byAmount": "Reparto por importe gestionado",
    "p.byYear": "Proyectos e importe por año de inicio",
    "p.search": "Buscar por título, programa o financiador",
    "p.allKinds": "Todos los tipos",
    "p.competitivo": "Convocatoria competitiva",
    "p.contrato": "Contrato o convenio",
    "p.innovacion": "Innovación docente",
    "p.allScopes": "Todos los ámbitos",
    "p.leadOnly": "Solo como IP o coordinador",
    "p.count": (n) => `${n} proyecto${n === 1 ? "" : "s"}`,
    "p.budget": "Presupuesto total",
    "p.managed": "Importe gestionado",
    "p.asLead": "Como IP o coordinador",
    "p.fundByYear": "Importe gestionado por año de inicio",
    "p.ip": "IP",
    "p.ongoing": "en curso",
    "sec.patents": "Patentes y propiedad industrial",
    "m.master": "Trabajos fin de máster dirigidos",
    "m.degree": "TFG y proyectos fin de carrera",
    "nav.metrics": "Indicadores",
    "nav.admin": "Administrar",
    "hero.contact": "Escribir",
    "sec.about": "Trayectoria",
    "sec.topics": "Líneas de investigación",
    "sec.path": "Formación y puestos",
    "sec.service": "Edición y servicio a la comunidad",
    "sec.teaching": "Docencia",
    "t.year": "Curso académico",
    "t.all": "Todos los cursos",
    "t.count": (n) => `${n} cursos académicos`,
    "t.noCourse": "Docencia en el programa",
    "sec.projects": "Proyectos destacados",
    "sec.theses": "Tesis dirigidas",
    "sec.recent": "Publicaciones recientes",
    "sec.allpubs": "Ver las publicaciones",
    "pubs.search": "Buscar por título, revista o congreso",
    "pubs.allTypes": "Todos los tipos",
    "pubs.allYears": "Todos los años",
    "pubs.count": (n) => `${n} referencia${n === 1 ? "" : "s"}`,
    "pubs.empty": "No hay resultados con esos filtros.",
    "pubs.source": "Listado obtenido de ORCID.",
    "pubs.refresh": "Actualizar desde ORCID",
    "pubs.loading": "Cargando publicaciones de ORCID…",
    "pubs.offline": "No se ha podido contactar con ORCID. Se muestra la última copia guardada.",
    "pubs.updated": (d) => `Actualizado el ${d}`,
    "m.theses": "Tesis doctorales dirigidas",
    "m.projects": "Proyectos de investigación",
    "m.funding": "Financiación captada",
    "m.pubs": "Publicaciones",
    "m.citations": "Citas",
    "m.h": "Índice h",
    "m.i10": "Índice i10",
    "m.patents": "Patentes",
    "m.evolution": "Evolución",
    "m.seeAll": "Ver los proyectos",
    "m.byYear": "Publicaciones por año",
    "m.citesByYear": "Citas recibidas por año",
    "m.byType": "Tipo de publicación",
    "m.from": "Desde",
    "m.to": "Hasta",
    "m.years": "años",
    "m.all": "Todo",
    "m.noData": "sin datos todavía",
    "m.inRange": (p, c) => `${p} publicaciones · ${c} citas en el periodo`,
    "link": "enlace",
    "m.sources": "Fuentes",
    "m.fundingOrcid": "Financiación registrada en ORCID",
    "foot.built": "Datos de ORCID y de registros propios.",
    "cv": "Descargar CV",
    "path.before": "Antes",
    "present": "actualidad"
  },
  en: {
    "nav.profile": "Profile",
    "nav.pubs": "Publications",
    "nav.projects": "Projects",
    "nav.press": "Press",
    "press.all": "All",
    "press.count": (n) => `${n} feature${n === 1 ? "" : "s"}`,
    "press.approx": "(approximate date)",
    "press.readAt": (m) => `Read on ${m}`,
    "press.prev": "Previous",
    "press.next": "Next",
    "press.close": "Close",
    "nav.teaching": "Teaching",
    "sec.courses": "Courses taught",
    "sec.supervisions": "Supervised final projects",
    "s.search": "Search by title or student",
    "d.years": "Academic years teaching",
    "d.subjects": "Distinct courses",
    "d.rea": "Open educational resources",
    "d.reaWith": "with",
    "sec.rea": "Open educational resources",
    "t.intl": "International mention",
    "p.byCount": "Share by number",
    "p.byAmount": "Share by amount managed",
    "p.byYear": "Projects and amount by starting year",
    "p.search": "Search by title, programme or funder",
    "p.allKinds": "All types",
    "p.competitivo": "Competitive call",
    "p.contrato": "Contract or agreement",
    "p.innovacion": "Teaching innovation",
    "p.allScopes": "All scopes",
    "p.leadOnly": "Only as PI or coordinator",
    "p.count": (n) => `${n} project${n === 1 ? "" : "s"}`,
    "p.budget": "Total budget",
    "p.managed": "Amount managed",
    "p.asLead": "As PI or coordinator",
    "p.fundByYear": "Amount managed by starting year",
    "p.ip": "PI",
    "p.ongoing": "ongoing",
    "sec.patents": "Patents and intellectual property",
    "m.master": "Master's theses supervised",
    "m.degree": "Bachelor's theses and final projects",
    "nav.metrics": "Indicators",
    "nav.admin": "Admin",
    "hero.contact": "Email",
    "sec.about": "Background",
    "sec.topics": "Research lines",
    "sec.path": "Education and positions",
    "sec.service": "Editorial and community service",
    "sec.teaching": "Teaching",
    "t.year": "Academic year",
    "t.all": "All years",
    "t.count": (n) => `${n} academic years`,
    "t.noCourse": "Teaching on the programme",
    "sec.projects": "Selected projects",
    "sec.theses": "Supervised theses",
    "sec.recent": "Recent publications",
    "sec.allpubs": "See all publications",
    "pubs.search": "Search by title, journal or conference",
    "pubs.allTypes": "All types",
    "pubs.allYears": "All years",
    "pubs.count": (n) => `${n} record${n === 1 ? "" : "s"}`,
    "pubs.empty": "Nothing matches those filters.",
    "pubs.source": "List retrieved from ORCID.",
    "pubs.refresh": "Refresh from ORCID",
    "pubs.loading": "Loading publications from ORCID…",
    "pubs.offline": "ORCID could not be reached. Showing the last saved copy.",
    "pubs.updated": (d) => `Updated on ${d}`,
    "m.theses": "Doctoral theses supervised",
    "m.projects": "Research projects",
    "m.funding": "Funding secured",
    "m.pubs": "Publications",
    "m.citations": "Citations",
    "m.h": "h-index",
    "m.i10": "i10-index",
    "m.patents": "Patents",
    "m.evolution": "Over time",
    "m.seeAll": "See all projects",
    "m.byYear": "Publications per year",
    "m.citesByYear": "Citations received per year",
    "m.byType": "Publication type",
    "m.from": "From",
    "m.to": "To",
    "m.years": "years",
    "m.all": "All",
    "m.noData": "no data yet",
    "m.inRange": (p, c) => `${p} publications · ${c} citations in the period`,
    "link": "link",
    "m.sources": "Sources",
    "m.fundingOrcid": "Funding recorded in ORCID",
    "foot.built": "Data from ORCID and own records.",
    "cv": "Download CV",
    "path.before": "Previously",
    "present": "present"
  }
};

const WORK_TYPES = {
  es: {
    "journal-article": "Artículo de revista",
    "conference-paper": "Congreso",
    "book-chapter": "Capítulo de libro",
    book: "Libro",
    "edited-book": "Libro editado",
    preprint: "Preprint",
    patent: "Patente",
    dataset: "Conjunto de datos",
    other: "Otros"
  },
  en: {
    "journal-article": "Journal article",
    "conference-paper": "Conference paper",
    "book-chapter": "Book chapter",
    book: "Book",
    "edited-book": "Edited book",
    preprint: "Preprint",
    patent: "Patent",
    dataset: "Dataset",
    other: "Other"
  }
};

export const state = {
  lang: "es",
  site: null
};

export function initLang() {
  const saved = localStorage.getItem("lang");
  const nav = (navigator.language || "es").slice(0, 2).toLowerCase();
  state.lang = LANGS.includes(saved) ? saved : LANGS.includes(nav) ? nav : "es";
  document.documentElement.lang = state.lang;
  return state.lang;
}

export function setLang(lang) {
  if (!LANGS.includes(lang)) return;
  state.lang = lang;
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang;
}

export function t(key, ...args) {
  const v = UI[state.lang][key] ?? UI.es[key] ?? key;
  return typeof v === "function" ? v(...args) : v;
}

export function workType(type) {
  const dict = WORK_TYPES[state.lang] || WORK_TYPES.es;
  return dict[type] || dict.other;
}

/** Devuelve el valor en el idioma activo de un campo {es, en} o de un texto plano. */
export function L(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[state.lang] || value.es || value.en || "";
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

export function num(n) {
  return new Intl.NumberFormat(state.lang === "es" ? "es-ES" : "en-GB").format(n || 0);
}

export function money(n) {
  if (!n) return "0 €";
  const v = Number(n);
  if (v >= 1000000) return (v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1).replace(".", ",") + " M€";
  if (v >= 1000) return num(Math.round(v / 1000)) + " k€";
  return num(v) + " €";
}

export function fdate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(state.lang === "es" ? "es-ES" : "en-GB", {
    day: "numeric", month: "long", year: "numeric"
  });
}

/** Contenido editable: data/site.json más los cambios locales sin publicar. */
export async function loadSite(base = "") {
  const res = await fetch(base + "data/site.json", { cache: "no-cache" });
  const published = await res.json();
  let draft = null;
  try {
    draft = JSON.parse(localStorage.getItem("site:draft") || "null");
  } catch (_) { /* borrador ilegible, se ignora */ }
  state.site = draft && draft.updatedAt >= published.updatedAt ? draft : published;
  state.site.__hasDraft = Boolean(draft);
  return state.site;
}

export function saveDraft(site) {
  localStorage.setItem("site:draft", JSON.stringify(site));
}

export function clearDraft() {
  localStorage.removeItem("site:draft");
}
