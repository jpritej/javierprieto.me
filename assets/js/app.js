import { state, initLang, setLang, t, L, esc, num, money, fdate, workType, loadSite } from "./store.js?v=21";
import * as orcid from "./orcid.js?v=21";
import * as openalex from "./openalex.js?v=21";
import * as charts from "./charts.js?v=21";
import { icon, topicIcon, ccBadge } from "./icons.js?v=21";
import { videoFacadeHTML, bindVideoFacades } from "./video.js?v=21";
import { exportRows, canExport, stamp } from "./export.js?v=21";

const view = document.getElementById("view");
const ROUTES = ["", "docencia", "proyectos", "publicaciones", "divulgacion", "indicadores"];

let orc = null;            // datos de ORCID
let oa = null;             // métricas de OpenAlex
let orcStatus = "loading";
let filters = { q: "", type: "", year: "" };
let range = null;          // [desde, hasta] en la vista de indicadores
// (la docencia ahora sale directamente del CVN, sin filtro de curso académico)
let cvn = null;            // proyectos, patentes y tesis importados del CVN
let pf = { q: "", kind: "", scope: "", lead: false };  // filtros de proyectos
let dTopic = "";           // filtro de tema en divulgación
let dOpenId = null;        // id de la ficha de divulgación abierta
let sf = { q: "", kind: "" };  // filtros de trabajos dirigidos

const li = (arr, fn) => arr.map(fn).join("");

/** Cifras derivadas de los datos cargados, nunca de un contador escrito a mano. */
function counts() {
  const s = state.site;
  const m = s.metrics || {};
  const sup = cvn ? cvn.supervisions : [];
  const master = sup.filter((w) => /áster/i.test(w.kind)).length;
  return {
    projects: cvn ? cvn.totals.projects : m.projects,
    funding: cvn ? cvn.totals.managed : m.fundingEur,
    theses: cvn && cvn.theses.length ? cvn.theses.length : (s.theses || []).filter((x) => x.student || L(x.title)).length,
    master: sup.length ? master : m.supervisionMaster,
    degree: sup.length ? sup.length - master : m.supervisionDegree,
    patents: (s.patents || []).filter((x) => /patente/i.test(x.type || "")).length || m.patents,
    pubs: orc ? orc.works.length : m.publicationsManual
  };
}
const has = (v) => v != null && String(v).trim() !== "";

function route() {
  const h = (location.hash || "#/").replace(/^#\/?/, "").split("?")[0];
  return ROUTES.includes(h) ? h : "";
}

const link = (href, label, current) =>
  `<a href="#/${href}"${current ? ' aria-current="page"' : ""}>${label}</a>`;

/* ---------- cabecera y pie --------------------------------------------- */

function paintChrome() {
  const r = route();
  const s = state.site;
  document.getElementById("brand").innerHTML =
    `${esc(s.identity.shortName || s.identity.name)} <span>· ${esc(L(s.identity.role))}</span>`;
  document.getElementById("nav").innerHTML =
    link("", t("nav.profile"), r === "") +
    link("docencia", t("nav.teaching"), r === "docencia") +
    link("proyectos", t("nav.projects"), r === "proyectos") +
    link("publicaciones", t("nav.pubs"), r === "publicaciones") +
    link("divulgacion", t("nav.press"), r === "divulgacion") +
    link("indicadores", t("nav.metrics"), r === "indicadores");
  document.querySelectorAll(".lang button").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang)));
  document.getElementById("foot").innerHTML = `
    <span>© ${new Date().getFullYear()} ${esc(s.identity.name)}</span>
    <span>${t("foot.built")}</span>`;
  document.title = `${s.identity.name} · ${L(s.identity.role)}`;
}

/* ---------- redes ------------------------------------------------------- */

function networks(s) {
  const chips = [];
  const email = (s.identity.emailUser && s.identity.emailHost)
    ? `${s.identity.emailUser}@${s.identity.emailHost}` : "";
  if (has(email)) {
    chips.push(`<a class="chip" href="mailto:${esc(email)}">${icon("mail")}<span>${t("hero.contact")}</span></a>`);
  }
  (s.networks || []).filter((n) => has(n.url) && has(n.label)).forEach((n) =>
    chips.push(`<a class="chip" href="${esc(n.url)}" target="_blank" rel="noopener">${icon(n.icon || "web")}<span>${esc(n.label)}</span></a>`));
  if (has(s.identity.cv)) {
    chips.push(`<a class="chip" href="${esc(s.identity.cv)}" target="_blank" rel="noopener">${icon("doc")}<span>${t("cv")}</span></a>`);
  }
  return `<div class="chips">${chips.join("")}</div>`;
}

/* ---------- conteos (siempre sobre las listas, nunca a mano) ------------- */

function countPatents() {
  if (cvn && cvn.patents.length) return cvn.patents.filter((x) => /Patente/i.test(x.type)).length;
  const list = state.site.patents || [];
  return list.filter((x) => /Patente/i.test(x.type || "")).length || (state.site.metrics || {}).patents;
}

function countSupervisions(level) {
  const m = state.site.metrics || {};
  if (!cvn || !cvn.supervisions.length) return level === "master" ? m.supervisionMaster : m.supervisionDegree;
  const isMaster = (w) => /máster|master/i.test(w.kind || "");
  return cvn.supervisions.filter((w) => (level === "master" ? isMaster(w) : !isMaster(w))).length;
}

/* ---------- piezas comunes ---------------------------------------------- */

function section(title, body, count = "") {
  if (!body) return "";
  return `<section>
    <div class="section-head"><h2>${esc(title)}</h2>${count ? `<span class="count">${esc(count)}</span>` : ""}</div>
    ${body}
  </section>`;
}

function kpi(n, label, accent = false, hideIfEmpty = false) {
  if (hideIfEmpty && (!n || String(n).replace(/[^0-9]/g, "") === "0")) return "";
  return `<div class="kpi${accent ? " kpi--accent" : ""}">
    <span class="kpi__n" data-count="${esc(n)}">${n}</span><span class="kpi__l">${esc(label)}</span></div>`;
}

function pubItem(w) {
  const bits = [];
  if (w.venue) bits.push(`<em>${esc(w.venue)}</em>`);
  bits.push(`<span class="badge">${esc(workType(w.type))}</span>`);
  if (w.doi) bits.push(`<a class="badge badge--link" href="https://doi.org/${esc(w.doi)}" target="_blank" rel="noopener">doi:${esc(w.doi)}</a>`);
  else if (w.url) bits.push(`<a class="badge badge--link" href="${esc(w.url)}" target="_blank" rel="noopener">${t("link")}</a>`);
  return `<article class="pub">
    <span class="pub__t">${esc(w.title)}${w.subtitle ? ". " + esc(w.subtitle) : ""}</span>
    <div class="pub__m">${bits.join(" · ")}</div>
  </article>`;
}

function timeline() {
  if (!orc) return "";
  const raw = [...orc.employments, ...orc.educations].filter((a) => a.org);
  if (!raw.length) return "";

  // Varios puestos en la misma institución se agrupan: ORCID los registra uno a uno.
  const mode = (state.site.display || {}).timeline || "latest";
  const groups = new Map();
  raw.forEach((a) => {
    const key = a.org.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  });

  const items = [...groups.values()].map((roles) => {
    roles.sort((a, b) => (b.start || 0) - (a.start || 0));
    const current = roles[0];
    const start = Math.min(...roles.map((r) => r.start || 9999).filter((y) => y < 9999));
    const ends = roles.map((r) => r.end);
    const end = ends.some((e) => !e) ? null : Math.max(...ends);
    return {
      org: current.org,
      dept: current.dept,
      role: current.role,
      previous: roles.slice(1).map((r) => r.role).filter(Boolean),
      start: isFinite(start) ? start : current.start,
      end
    };
  }).sort((a, b) => (b.start || 0) - (a.start || 0));

  return section(t("sec.path"), `<ul class="stack">${li(items, (a) => {
    const span = a.start ? a.start + "–" + (a.end || t("present")) : "";
    const before = mode === "all" && a.previous.length
      ? `<span class="meta">${t("path.before")}: ${a.previous.map(esc).join(", ")}</span>` : "";
    return `<li>
      <strong>${esc(a.role || a.org)}</strong>
      <span class="meta">${[a.role ? a.org : "", a.dept, span].filter(has).map(esc).join(" · ")}</span>
      ${before}
    </li>`;
  })}</ul>`);
}

/* ---------- docencia ----------------------------------------------------- */

function teachItem(x) {
  const range = x.start ? fdate(x.start).replace(/^\d{1,2} de \w+ de /, "") +
    "–" + (x.end ? fdate(x.end).replace(/^\d{1,2} de \w+ de /, "") : t("present")) : "";
  const place = [x.institution, x.city ? x.city.split(",")[0] : ""].filter(has).join(" · ");
  return `<li>
    <strong>${esc(x.course)}</strong>
    ${x.official ? "" : `<span class="badge">${t("t.ownDegree")}</span>`}
    <span class="meta">${[esc(x.degree), place, range].filter(has).join(" · ")}</span>
  </li>`;
}

function teachingSection() {
  const list = cvn ? cvn.teaching : [];
  if (!list.length) return "";
  return section(t("sec.courses"), `<ul class="stack">${li(list, teachItem)}</ul>`, String(list.length));
}

function patentsSection(s) {
  const list = (s.patents || []).filter((x) => L(x.title));
  if (!list.length) return "";
  return section(t("sec.patents"), `<ul class="stack">${li(list, (x) => `
    <li><strong>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(L(x.title))}</a>` : esc(L(x.title))}</strong>
    <span class="meta">${[x.type, x.number, x.year, x.owner].filter(has).map(esc).join(" · ")}</span></li>`)}</ul>`,
    String(list.length));
}

/* ---------- vista: perfil ----------------------------------------------- */

function summaryStrip() {
  const m = state.site.metrics || {};
  const manual = m.citationSource === "manual";
  const cites = manual ? m.citations : (oa ? oa.citations : m.citations);
  const h = manual ? m.hIndex : (oa ? oa.hIndex : m.hIndex);
  const c = counts();
  const cards = [[num(c.pubs), t("m.pubs")], [num(cites), t("m.citations")],
                 [num(h), t("m.h")], [num(c.projects), t("m.projects")]];
  return `<a class="kpis kpis--link" href="#/indicadores" aria-label="${t("nav.metrics")}">
    ${li(cards, ([n, l]) => kpi(n, l, true))}</a>`;
}

function viewProfile() {
  const s = state.site;
  // La portada admite foto, ilustración vectorial (svg, sin marco) o nada.
  const art = s.identity.photo || "";
  const isVector = /\.svg$|retrato-ilustracion/i.test(art);
  const dark = s.identity.photoDark || "";
  const img = `<img src="${esc(art)}" alt="${isVector ? "" : esc(s.identity.name)}"${isVector ? ' role="presentation"' : ""} loading="lazy">`;
  const photo = !art ? ""
    : dark ? `<picture><source srcset="${esc(dark)}" media="(prefers-color-scheme: dark)">${img}</picture>`
    : img;

  const bio = L(s.bio).split(/\n{2,}/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");
  const topics = (s.topics || []).filter((x) => L(x));
  const starred = new Set(s.featuredProjects || []);
  const projects = [
    ...(cvn ? cvn.projects.filter((p) => starred.has(p.id)) : []).map((p) => ({
      title: p.title,
      role: p.lead ? t("p.ip") : p.role,
      funder: p.funder,
      years: [p.start, p.end].filter(Boolean).join("–"),
      amount: p.amountOwn ? money(p.amountOwn) : "",
      url: ""
    })),
    ...(s.projects || []).filter((p) => L(p.title))
  ];
  const service = (s.service || []).filter((x) => L(x.role));
  const recent = orc ? orc.works.slice(0, 6) : [];

  return `
  <div class="hero enter${isVector ? " hero--vector" : ""}">
    <div>
      <h1>${esc(s.identity.name)}</h1>
      <p class="hero__role">${esc(L(s.identity.role))}</p>
      <p class="hero__aff">${[L(s.identity.affiliation), L(s.identity.institution), L(s.identity.group)]
        .filter(has).map(esc).join("<br>")}</p>
      ${networks(s)}
    </div>
    ${photo ? `<figure class="hero__photo${isVector ? " hero__photo--vector" : ""}">${photo}</figure>` : ""}
  </div>
  ${summaryStrip()}

  ${section(t("sec.about"), `<div class="prose" id="bio-text">${bio}</div>
    <p class="more"><button type="button" class="icon-btn" id="copy-bio" title="${t("about.copy")}" aria-label="${t("about.copy")}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>
    </button><span class="copy-msg" id="copy-msg" role="status"></span></p>`)}
  ${topics.length ? section(t("sec.topics"), `<div class="topic-grid" data-reveal>${li(topics, (x) => `
    <div class="topic-card">
      <span class="topic-card__i">${topicIcon(x.icon)}</span>
      <strong>${esc(L(x))}</strong>
      ${has(L({es: x.desc_es, en: x.desc_en})) ? `<p>${esc(L({es: x.desc_es, en: x.desc_en}))}</p>` : ""}
    </div>`)}</div>`) : ""}
  ${timeline()}

  ${featuredSection(s)}


  ${recent.length ? section(t("sec.recent"),
    `<div>${li(recent, pubItem)}</div>
     <p class="more"><a class="btn-more" href="#/publicaciones">${t("sec.allpubs")}
       <span class="btn-more__n">${orc.works.length}</span>
       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"></path></svg>
     </a></p>`) : ""}

  ${patentsSection(s)}

  ${service.length ? section(t("sec.service"), `<ul class="stack">${li(service, (x) => `
    <li class="row-span">
      <span>
        <strong>${esc(L(x.role))}</strong>
        <span class="meta">${esc(L(x.org))}</span>
      </span>
      <span class="row-span__end">
        ${has(x.years) ? `<span class="meta">${esc(x.years)}</span>` : ""}
        ${has(x.url) ? `<a class="badge badge--link" href="${esc(x.url)}" target="_blank" rel="noopener">${t("p.web")}</a>` : ""}
      </span>
    </li>`)}</ul>`) : ""}`;
}



/* ---------- proyectos destacados ---------------------------------------- */

function featuredSection(s) {
  const picked = new Set(s.featured || []);
  const links = s.projectLinks || {};
  const fromCvn = cvn ? cvn.projects.filter((p) => picked.has(p.id))
    .map((p) => ({ ...p, url: links[p.id] || p.url })) : [];
  const manual = (s.projects || []).filter((p) => L(p.title)).map((p) => ({
    title: L(p.title), program: L(p.funder), role: L(p.role),
    start: (p.years || "").slice(0, 4), end: "", amountOwn: 0, url: p.url, manual: true,
    years: p.years, amountText: p.amount
  }));
  const list = [...fromCvn, ...manual];
  if (!list.length) return "";
  const total = cvn ? cvn.projects.length : 0;
  return section(t("sec.projects"), `<ul class="stack">${li(list, (p) => `
    <li><strong>${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a>` : esc(p.title)}</strong>
    <span class="meta">${[p.role === "Coordinador" || p.lead ? t("p.ip") : p.role, p.program || p.funder,
      p.years || [p.start, p.end].filter(has).join("-"),
      p.amountText || (p.amountOwn ? money(p.amountOwn) : "")].filter(has).map(esc).join(" · ")}</span></li>`)}</ul>
    ${total ? `<p class="more"><a class="btn-more" href="#/proyectos">${t("sec.allprojects")}
      <span class="btn-more__n">${total}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"></path></svg>
    </a></p>` : ""}`,
    String(list.length));
}

/* ---------- vista: docencia ---------------------------------------------- */

function supervisionItem(w) {
  const meta = [w.kind, w.university, w.grade].filter(has).map(esc).join(" · ");
  return `<article class="pub">
    <span class="pub__t">${esc(w.title)}</span>
    <div class="pub__m"><em>${esc(w.student)}</em>${meta ? " · " + meta : ""}</div>
  </article>`;
}

function thesesSection() {
  const list = (cvn && cvn.theses.length ? cvn.theses : (state.site.theses || []).map((x) => ({
    title: L(x.title), student: x.student, year: x.year, university: L(x.university), kind: "Tesis Doctoral"
  }))).filter((x) => x.title || x.student);
  if (!list.length) return "";
  return section(t("sec.theses"), `<div>${li(list, (w) => `<article class="pub">
    <span class="pub__t">${esc(w.title)}</span>
    <div class="pub__m"><em>${esc(w.student)}</em> · ${esc(w.year)}${w.university ? " · " + esc(w.university) : ""}${w.international ? ` · <span class="badge">${t("t.intl")}</span>` : ""}</div>
  </article>`)}</div>`, String(list.length));
}

function filteredSupervisions() {
  const list = cvn ? cvn.supervisions : [];
  const q = sf.q.toLowerCase();
  return list.filter((w) =>
    (!sf.kind || w.kind === sf.kind) &&
    (!q || (w.title + " " + w.student).toLowerCase().includes(q)));
}

function supervisionsSection() {
  if (!cvn || !cvn.supervisions.length) return "";
  const kinds = [...new Set(cvn.supervisions.map((w) => w.kind).filter(Boolean))].sort();
  const list = filteredSupervisions();
  const byYear = new Map();
  list.forEach((w) => {
    const k = w.year || "s. f.";
    if (!byYear.has(k)) byYear.set(k, []);
    byYear.get(k).push(w);
  });
  return section(t("sec.supervisions"), `
    <div class="filters">
      <input id="s-q" class="field" type="search" placeholder="${t("s.search")}" value="${esc(sf.q)}" aria-label="${t("s.search")}">
      <select id="s-kind" class="field field--s" aria-label="${t("p.allKinds")}">
        <option value="">${t("p.allKinds")}</option>
        ${li(kinds, (k) => `<option value="${esc(k)}"${sf.kind === k ? " selected" : ""}>${esc(k)}</option>`)}
      </select>
    </div>
    <div id="s-list">${[...byYear.entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0])))
      .map(([y, ws]) => `<div class="pubyear"><div class="pubyear__y">${esc(y)}</div>
      <div>${li(ws, supervisionItem)}</div></div>`).join("")}</div>`,
    `${list.length}`);
}

function viewTeaching() {
  const s = state.site;
  const c = counts();
  const courses = cvn ? cvn.teaching : [];
  const years = new Set();
  courses.forEach((x) => {
    const from = Number((x.start || "").slice(0, 4));
    const to = Number((x.end || new Date().toISOString()).slice(0, 4));
    if (from) for (let y = from; y <= (to || from); y++) years.add(y);
  });
  const subjects = [...new Set(courses.map((x) => x.course).filter(Boolean))];
  const rea = (s.rea || []).filter((x) => x.title);
  return `<section class="enter">
    <div class="section-head"><h2>${t("nav.teaching")}</h2></div>
    <div class="kpis">
      ${kpi(num(years.size), t("d.years"), true)}
      ${kpi(num(subjects.length), t("d.subjects"), true)}
      ${kpi(num(c.theses), t("m.theses"), true, true)}
      ${kpi(num(c.master), t("m.master"), false, true)}
      ${kpi(num(c.degree), t("m.degree"), false, true)}
      ${kpi(num(rea.length), t("d.rea"), false, true)}
    </div>
  </section>
  ${thesesSection()}
  ${reaSection(rea)}
  ${teachingSection()}
  ${supervisionsSection()}`;
}

function reaSection(rea) {
  if (!rea.length) return "";
  return section(t("sec.rea"), `<div class="rea-grid">${li(rea, (x) => `
    <a class="rea-card" href="${esc(x.url)}" target="_blank" rel="noopener">
      <div class="rea-card__img"><img src="${esc(x.photo)}" alt="" loading="lazy"></div>
      <div class="rea-card__body">
        <div class="rea-card__title">${esc(x.title)}</div>
        <div class="rea-card__program">${esc(L(x.program))}</div>
        ${x.authors ? `<div class="rea-card__authors">${t("d.reaWith")} ${esc(x.authors)}</div>` : ""}
        ${ccBadge(esc(x.license || "CC BY"))}
      </div>
    </a>`)}</div>`, String(rea.length));
}

function bindSupervisions() {
  const q = document.getElementById("s-q");
  if (!q) return;
  let timer;
  const repaint = () => {
    const list = filteredSupervisions();
    const byYear = new Map();
    list.forEach((w) => {
      const k = w.year || "s. f.";
      if (!byYear.has(k)) byYear.set(k, []);
      byYear.get(k).push(w);
    });
    document.getElementById("s-list").innerHTML = [...byYear.entries()]
      .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
      .map(([y, ws]) => `<div class="pubyear"><div class="pubyear__y">${esc(y)}</div>
        <div>${li(ws, supervisionItem)}</div></div>`).join("") || `<p class="msg">${t("pubs.empty")}</p>`;
  };
  q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => { sf.q = q.value; repaint(); }, 180); });
  document.getElementById("s-kind").addEventListener("change", (e) => { sf.kind = e.target.value; repaint(); });
}

/* ---------- vista: divulgación -------------------------------------------- */

function topicLabel(key) {
  const t = (state.site.topics || []).find((x) => x.icon === key);
  return t ? L(t) : key;
}

function pressList() {
  return [...(state.site.press || [])].sort((a, b) => (b.date || "0").localeCompare(a.date || "0"));
}

function filteredPress() {
  return pressList().filter((x) => !dTopic || x.topic === dTopic);
}

function pressHeader(x, size = "card") {
  if (x.video) return `<div class="press-media${size === "flyout" ? " press-media--video" : ""}">${videoFacadeHTML(x.video, x.title)}</div>`;
  if (x.photo) return `<div class="press-media"><img src="${esc(x.photo)}" alt="" loading="lazy"></div>`;
  return `<div class="press-media press-media--icon">${topicIcon(x.topic, size === "flyout" ? 72 : 40)}</div>`;
}

function pressCard(x) {
  return `<article class="press-card" data-open="${esc(x.id)}" tabindex="0" role="button"
      aria-label="${esc(x.title)}">
    ${pressHeader(x)}
    <div class="press-card__body">
      <div class="press-card__meta"><span class="press-card__outlet">${esc(x.outlet)}</span>
        ${x.date ? `<span>·</span><span>${esc(fdate(x.date))}${x.dateApprox ? " " + t("press.approx") : ""}</span>` : ""}</div>
      <div class="press-card__title">${esc(x.title)}</div>
      <span class="badge">${esc(topicLabel(x.topic))}</span>
    </div>
  </article>`;
}

function viewPress() {
  const list = filteredPress();
  const topics = [...new Set(pressList().map((x) => x.topic))];
  return `<section class="enter">
    <div class="section-head"><h2>${t("nav.press")}</h2>
      <span class="count">${t("press.count", list.length)}</span></div>
    <div class="filters">
      <button type="button" class="chip-filter${dTopic === "" ? " is-active" : ""}" data-topic="">${t("press.all")}</button>
      ${li(topics, (k) => `<button type="button" class="chip-filter${dTopic === k ? " is-active" : ""}" data-topic="${esc(k)}">${esc(topicLabel(k))}</button>`)}
    </div>
    <div class="press-grid" id="press-grid">${list.map(pressCard).join("") || `<p class="msg">${t("pubs.empty")}</p>`}</div>
  </section>
  <div class="press-flyout" id="press-flyout" hidden>
    <div class="press-flyout__backdrop" data-close></div>
    <div class="press-flyout__panel" role="dialog" aria-modal="true" id="press-flyout-panel"></div>
  </div>`;
}

function pressFlyoutContent(x) {
  const list = filteredPress();
  const i = list.findIndex((p) => p.id === x.id);
  return `
    ${pressHeader(x, "flyout")}
    <button type="button" class="press-flyout__close" data-close aria-label="${t("press.close")}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"></path></svg>
    </button>
    <div class="press-flyout__body">
      <div class="press-card__meta"><span class="press-card__outlet">${esc(x.outlet)}</span>
        ${x.date ? `<span>·</span><span>${esc(fdate(x.date))}${x.dateApprox ? " " + t("press.approx") : ""}</span>` : ""}
        <span class="badge" style="margin-left:auto">${esc(topicLabel(x.topic))}</span></div>
      <h3>${esc(x.title)}</h3>
      ${x.quote ? `<blockquote class="press-quote">${esc(L(x.quote))}</blockquote>` : ""}
      <p class="prose">${esc(L(x.summary))}</p>
      <div class="press-flyout__actions">
        ${x.url ? `<a class="btn" href="${esc(x.url)}" target="_blank" rel="noopener">${t("press.readAt", x.outlet)}</a>` : ""}
        <div class="press-flyout__nav">
          <button type="button" class="btn btn--ghost" data-nav="-1" ${i <= 0 ? "disabled" : ""} aria-label="${t("press.prev")}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"></path></svg>
          </button>
          <button type="button" class="btn btn--ghost" data-nav="1" ${i === -1 || i >= list.length - 1 ? "disabled" : ""} aria-label="${t("press.next")}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>
      </div>
    </div>`;
}

function openPress(id) {
  const x = filteredPress().find((p) => p.id === id) || pressList().find((p) => p.id === id);
  if (!x) return;
  dOpenId = id;
  const flyout = document.getElementById("press-flyout");
  const panel = document.getElementById("press-flyout-panel");
  panel.innerHTML = pressFlyoutContent(x);
  flyout.hidden = false;
  document.body.style.overflow = "hidden";
  bindVideoFacades(panel);
  panel.querySelector("[data-close]")?.addEventListener("click", closePress);
  panel.querySelectorAll("[data-nav]").forEach((b) =>
    b.addEventListener("click", () => stepPress(Number(b.dataset.nav))));
}

function closePress() {
  dOpenId = null;
  const flyout = document.getElementById("press-flyout");
  if (flyout) flyout.hidden = true;
  document.body.style.overflow = "";
}

function stepPress(delta) {
  const list = filteredPress();
  const i = list.findIndex((p) => p.id === dOpenId);
  const next = list[i + delta];
  if (next) openPress(next.id);
}

function bindPress() {
  const grid = document.getElementById("press-grid");
  if (!grid) return;
  bindVideoFacades(grid);
  grid.querySelectorAll("[data-open]").forEach((el) => {
    const go = () => openPress(el.dataset.open);
    el.addEventListener("click", go);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });
  document.querySelectorAll(".chip-filter").forEach((b) =>
    b.addEventListener("click", () => { dTopic = b.dataset.topic; render(); }));
  document.getElementById("press-flyout").addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-close")) closePress();
  });
  if (!window.__pressEscBound) {
    window.__pressEscBound = true;
    document.addEventListener("keydown", pressEscHandler);
  }
}

function pressEscHandler(e) {
  if (e.key === "Escape" && dOpenId) closePress();
}

/* ---------- vista: proyectos --------------------------------------------- */

function projectItem(p) {
  const star = (state.site.featured || []).includes(p.id);
  const web = (state.site.projectLinks || {})[p.id];
  const meta = [
    p.program, p.code, p.funder,
    p.lead ? `<em>${t("p.ip")}</em>` : p.role,
    p.scope,
    p.amountOwn ? money(p.amountOwn) : ""
  ].filter(has).join(" · ");
  return `<article class="pub">
    <span class="pub__t">${star ? '<span class="star" title="destacado">★</span> ' : ""}${esc(p.title)}</span>
    <div class="pub__m"><span class="badge badge--${esc(p.kind)}">${esc(t("p." + p.kind))}</span> ${meta}
      ${web ? `<a class="badge badge--link" href="${esc(web)}" target="_blank" rel="noopener">${t("p.web")}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true" style="vertical-align:-1px"><path d="M7 17L17 7M9 7h8v8"></path></svg></a>` : ""}
    </div>
  </article>`;
}

function filteredProjects() {
  const q = pf.q.toLowerCase();
  return (cvn ? cvn.projects : []).filter((p) =>
    (!pf.kind || p.kind === pf.kind) &&
    (!pf.scope || p.scope === pf.scope) &&
    (!pf.lead || p.lead) &&
    (!q || (p.title + " " + p.program + " " + p.funder).toLowerCase().includes(q)));
}

function viewProjects() {
  if (!cvn) {
    return `<section><div class="section-head"><h2>${t("nav.projects")}</h2></div>
      <p class="msg">${t("pubs.loading")}</p></section>`;
  }
  const list = filteredProjects();
  const scopes = [...new Set(cvn.projects.map((p) => p.scope).filter(Boolean))].sort();
  const byYear = new Map();
  list.forEach((p) => {
    const k = p.start || "s. f.";
    if (!byYear.has(k)) byYear.set(k, []);
    byYear.get(k).push(p);
  });
  const years = [...byYear.keys()].sort().reverse();

  const managed = list.reduce((a, p) => a + (p.amountOwn || 0), 0);
  const budget = list.reduce((a, p) => a + (p.amountTotal || 0), 0);
  const lead = list.filter((p) => p.lead).length;

  return `<section class="enter">
    <div class="section-head"><h2>${t("nav.projects")}</h2>
      <span class="count" id="p-count">${t("p.count", list.length)}</span></div>
    <div class="kpis" id="p-kpis">
      ${kpi(num(list.length), t("nav.projects"), true)}
      ${kpi(num(lead), t("p.asLead"), true)}
      ${kpi(money(managed), t("p.managed"), true)}
      ${kpi(money(budget), t("p.budget"))}
    </div>
    <div class="filters" style="margin-top:1.4rem">
      <input id="p-q" class="field" type="search" placeholder="${t("p.search")}" value="${esc(pf.q)}" aria-label="${t("p.search")}">
      <select id="p-kind" class="field field--s" aria-label="${t("p.allKinds")}">
        <option value="">${t("p.allKinds")}</option>
        ${li(["competitivo", "contrato", "innovacion"], (k) =>
          `<option value="${k}"${pf.kind === k ? " selected" : ""}>${t("p." + k)}</option>`)}
      </select>
      <select id="p-scope" class="field field--s" aria-label="${t("p.allScopes")}">
        <option value="">${t("p.allScopes")}</option>
        ${li(scopes, (x) => `<option value="${esc(x)}"${pf.scope === x ? " selected" : ""}>${esc(x)}</option>`)}
      </select>
      <label class="inline"><input type="checkbox" id="p-lead"${pf.lead ? " checked" : ""}> ${t("p.leadOnly")}</label>
      <button id="p-export" class="btn btn--ghost" type="button">${t("export.xlsx")}</button>
    </div>

    <div class="panels" style="margin-bottom:1.8rem">
      <figure class="panel">
        <figcaption>${t("p.byCount")}</figcaption>
        <div class="panel__box panel__box--s"><canvas id="c-pk"></canvas></div>
      </figure>
      <figure class="panel">
        <figcaption>${t("p.byAmount")}</figcaption>
        <div class="panel__box panel__box--s"><canvas id="c-pa"></canvas></div>
      </figure>
      <figure class="panel panel--full">
        <figcaption>${t("p.byYear")}</figcaption>
        <div class="panel__box"><canvas id="c-py"></canvas></div>
      </figure>
    </div>

    <div id="p-list">${years.map((y) => `<div class="pubyear"><div class="pubyear__y">${esc(y)}</div>
      <div>${li(byYear.get(y), projectItem)}</div></div>`).join("") || `<p class="msg">${t("pubs.empty")}</p>`}</div>
  </section>`;
}

const KINDS = ["competitivo", "contrato", "innovacion"];

function projectCharts(list) {
  const counts = KINDS.map((k) => list.filter((p) => p.kind === k).length);
  const amounts = KINDS.map((k) => list.filter((p) => p.kind === k)
    .reduce((a, p) => a + (p.amountOwn || 0), 0));
  const years = [...new Set(list.map((p) => p.start).filter(Boolean))].sort();
  const stacks = KINDS.map((k) => ({
    label: t("p." + k),
    data: years.map((y) => list.filter((p) => p.start === y && p.kind === k).length)
  }));
  const line = years.map((y) => list.filter((p) => p.start === y)
    .reduce((a, p) => a + (p.amountOwn || 0), 0));
  return { labels: KINDS.map((k) => t("p." + k)), counts, amounts, years, stacks, line };
}

function paintProjectCharts(list) {
  const d = projectCharts(list);
  charts.mountDoughnut("c-pk", d.labels, d.counts);
  charts.mountDoughnut("c-pa", d.labels, d.amounts, true);
  charts.mountStacked("c-py", d.years, d.stacks, d.line, t("p.managed"));
}

function refreshProjects() {
  const list = filteredProjects();
  const byYear = new Map();
  list.forEach((p) => {
    const k = p.start || "s. f.";
    if (!byYear.has(k)) byYear.set(k, []);
    byYear.get(k).push(p);
  });
  const years = [...byYear.keys()].sort().reverse();
  document.getElementById("p-list").innerHTML = years.map((y) =>
    `<div class="pubyear"><div class="pubyear__y">${esc(y)}</div>
     <div>${li(byYear.get(y), projectItem)}</div></div>`).join("") || `<p class="msg">${t("pubs.empty")}</p>`;
  document.getElementById("p-count").textContent = t("p.count", list.length);
  document.getElementById("p-kpis").innerHTML =
    kpi(num(list.length), t("nav.projects"), true) +
    kpi(num(list.filter((p) => p.lead).length), t("p.asLead"), true) +
    kpi(money(list.reduce((a, p) => a + (p.amountOwn || 0), 0)), t("p.managed"), true) +
    kpi(money(list.reduce((a, p) => a + (p.amountTotal || 0), 0)), t("p.budget"));
  paintProjectCharts(list);
}

function bindProjects() {
  const q = document.getElementById("p-q");
  if (!q) return;
  paintProjectCharts(filteredProjects());
  let timer;
  q.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { pf.q = q.value; refreshProjects(); }, 180);
  });
  document.getElementById("p-kind").addEventListener("change", (e) => { pf.kind = e.target.value; refreshProjects(); });
  document.getElementById("p-scope").addEventListener("change", (e) => { pf.scope = e.target.value; refreshProjects(); });
  document.getElementById("p-lead").addEventListener("change", (e) => { pf.lead = e.target.checked; refreshProjects(); });
  const px = document.getElementById("p-export");
  if (px) px.addEventListener("click", () => {
    const links = state.site.projectLinks || {};
    const rows = filteredProjects().map((p) => ({
      title: p.title, kind: t("p." + p.kind), program: p.program || "", code: p.code || "",
      funder: p.funder || "", role: p.lead ? t("p.ip") : (p.role || ""), scope: p.scope || "",
      start: p.start || "", end: p.end || "",
      own: p.amountOwn || 0, total: p.amountTotal || 0, web: links[p.id] || ""
    }));
    const ok = exportRows(rows, [
      ["title", t("x.title")], ["kind", t("x.type")], ["program", t("x.program")],
      ["code", t("x.code")], ["funder", t("x.funder")], ["role", t("x.role")],
      ["scope", t("x.scope")], ["start", t("x.start")], ["end", t("x.end")],
      ["own", t("p.managed") + " (€)"], ["total", t("p.budget") + " (€)"], ["web", t("x.url")]
    ], t("nav.projects"), `proyectos-${stamp()}.xlsx`);
    if (!ok) px.textContent = t("export.fail");
  });
}

/* ---------- vista: publicaciones ---------------------------------------- */

/** Publicaciones que pasan el filtro activo (lo comparten vista y exportación). */
function filteredWorks() {
  if (!orc) return [];
  const q = filters.q.toLowerCase();
  return orc.works.filter((w) =>
    (!filters.type || w.type === filters.type) &&
    (!filters.year || String(w.year) === filters.year) &&
    (!q || (w.title + " " + w.venue).toLowerCase().includes(q)));
}

function viewPubs() {
  if (!orc) {
    return `<section><div class="section-head"><h2>${t("nav.pubs")}</h2></div>
      <p class="msg">${orcStatus === "error" ? t("pubs.offline") : t("pubs.loading")}</p></section>`;
  }
  const types = [...new Set(orc.works.map((w) => w.type))].sort();
  const years = [...new Set(orc.works.map((w) => w.year).filter(Boolean))].sort((a, b) => b - a);
  const list = filteredWorks();

  const byYear = new Map();
  list.forEach((w) => {
    const k = w.year || "s. f.";
    if (!byYear.has(k)) byYear.set(k, []);
    byYear.get(k).push(w);
  });

  const body = list.length
    ? [...byYear.entries()].map(([y, ws]) =>
        `<div class="pubyear"><div class="pubyear__y">${esc(y)}</div><div>${li(ws, pubItem)}</div></div>`).join("")
    : `<p class="msg">${t("pubs.empty")}</p>`;

  return `<section>
    <div class="section-head"><h2>${t("nav.pubs")}</h2><span class="count">${t("pubs.count", list.length)}</span></div>
    <div class="filters">
      <input id="f-q" class="field" type="search" placeholder="${t("pubs.search")}" value="${esc(filters.q)}" aria-label="${t("pubs.search")}">
      <select id="f-type" class="field" aria-label="${t("pubs.allTypes")}">
        <option value="">${t("pubs.allTypes")}</option>
        ${li(types, (x) => `<option value="${esc(x)}"${filters.type === x ? " selected" : ""}>${esc(workType(x))}</option>`)}
      </select>
      <select id="f-year" class="field" aria-label="${t("pubs.allYears")}">
        <option value="">${t("pubs.allYears")}</option>
        ${li(years, (y) => `<option value="${y}"${filters.year === String(y) ? " selected" : ""}>${y}</option>`)}
      </select>
      <button id="f-refresh" class="btn btn--ghost" type="button">${t("pubs.refresh")}</button>
      <button id="f-export" class="btn btn--ghost" type="button">${t("export.xlsx")}</button>
    </div>
    ${pubCharts()}
    ${body}
    <p class="note" style="margin-top:2rem">${t("pubs.source")} ${orc.fetchedAt ? t("pubs.updated", fdate(orc.fetchedAt)) : ""}
    ${orcStatus === "error" ? "<br>" + t("pubs.offline") : ""}</p>
  </section>`;
}

/** Reparto por cuartil JCR y por tipo de producción, ambos del CVN. */
function pubCharts() {
  const pubs = cvn && cvn.publications ? cvn.publications : [];
  if (!pubs.length) return "";
  const withQ = pubs.filter((x) => x.quartile);
  if (!withQ.length) return "";
  return `<div class="panels" style="margin-bottom:1.8rem">
    <figure class="panel">
      <figcaption>${t("pubs.byQuartile")}</figcaption>
      <div class="panel__box panel__box--s"><canvas id="c-quartile"></canvas></div>
    </figure>
    <figure class="panel">
      <figcaption>${t("pubs.byKind")}</figcaption>
      <div class="panel__box panel__box--s"><canvas id="c-pubkind"></canvas></div>
    </figure>
  </div>`;
}

function paintPubCharts() {
  const pubs = cvn && cvn.publications ? cvn.publications : [];
  if (!pubs.length || !document.getElementById("c-quartile")) return;

  const qs = ["Q1", "Q2", "Q3", "Q4"];
  const qv = qs.map((q) => pubs.filter((x) => x.quartile === Number(q[1])).length);
  charts.mountDoughnut("c-quartile", qs.filter((_, i) => qv[i]), qv.filter(Boolean));

  const kinds = new Map();
  pubs.forEach((x) => { if (x.kind) kinds.set(x.kind, (kinds.get(x.kind) || 0) + 1); });
  const top = [...kinds.entries()].sort((a, b) => b[1] - a[1]);
  charts.mountDoughnut("c-pubkind", top.map(([k]) => k), top.map(([, v]) => v));
}

function bindPubs() {
  paintPubCharts();
  const q = document.getElementById("f-q");
  if (!q) return;
  let timer;
  q.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { filters.q = q.value; render({ keepFocus: "f-q" }); }, 180);
  });
  document.getElementById("f-type").addEventListener("change", (e) => { filters.type = e.target.value; render(); });
  document.getElementById("f-year").addEventListener("change", (e) => { filters.year = e.target.value; render(); });
  const xp = document.getElementById("f-export");
  if (xp) xp.addEventListener("click", () => {
    const rows = filteredWorks().map((w) => ({
      year: w.year || "", type: workType(w.type), title: w.title,
      venue: w.venue || "", doi: w.doi || "", url: w.url || ""
    }));
    const ok = exportRows(rows, [
      ["year", t("x.year")], ["type", t("x.type")], ["title", t("x.title")],
      ["venue", t("x.venue")], ["doi", "DOI"], ["url", t("x.url")]
    ], t("nav.pubs"), `publicaciones-${stamp()}.xlsx`);
    if (!ok) xp.textContent = t("export.fail");
  });
  document.getElementById("f-refresh").addEventListener("click", async (e) => {
    e.target.disabled = true;
    await fetchOrcid(true);
    render();
  });
}

/* ---------- vista: indicadores ------------------------------------------ */

function yearSpan() {
  const ys = orc ? orc.works.map((w) => w.year).filter(Boolean) : [];
  const cs = oa ? oa.byYear.map((y) => y.year) : [];
  const all = [...ys, ...cs];
  const now = new Date().getFullYear();
  return all.length ? [Math.min(...all), Math.max(...all, now)] : [now - 10, now];
}

/** Series para los gráficos según el rango activo. */
function chartData() {
  const [from, to] = range;
  const years = [];
  for (let y = from; y <= to; y++) years.push(y);

  const works = orc ? orc.works.filter((w) => w.year >= from && w.year <= to) : [];
  const pubs = years.map((y) => works.filter((w) => w.year === y).length);

  const cite = (oa ? oa.byYear : []).filter((y) => y.year >= from && y.year <= to);
  const types = new Map();
  works.forEach((w) => types.set(w.type, (types.get(w.type) || 0) + 1));
  const top = [...types.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return {
    years,
    pubs,
    citeYears: cite.map((y) => y.year),
    cites: cite.map((y) => y.citations),
    typeLabels: top.map(([k]) => workType(k)),
    typeValues: top.map(([, v]) => v),
    worksInRange: works.length,
    citesInRange: cite.reduce((a, y) => a + y.citations, 0)
  };
}

function viewMetrics() {
  const m = state.site.metrics || {};
  const manual = m.citationSource === "manual";
  const cites = manual ? m.citations : (oa ? oa.citations : m.citations);
  const h = manual ? m.hIndex : (oa ? oa.hIndex : m.hIndex);
  const i10 = manual ? m.i10Index : (oa ? oa.i10Index : m.i10Index);
  const pubs = orc ? orc.works.length : m.publicationsManual;
  const c = counts();
  const src = manual ? "Scholar" : "OpenAlex";
  const [min, max] = yearSpan();
  if (!range) range = [Math.max(min, max - 14), max];

  const years = [];
  for (let y = max; y >= min; y--) years.push(y);
  const d = chartData();

  return `<section class="enter">
    <div class="section-head"><h2>${t("nav.metrics")}</h2></div>
    <div class="kpis">
      ${kpi(num(c.theses), t("m.theses"), true, true)}
      ${kpi(num(c.projects), t("m.projects"), true)}
      ${kpi(money(c.funding), t("m.funding"), true, true)}
      ${kpi(num(c.pubs), t("m.pubs"))}
      ${kpi(num(cites), `${t("m.citations")} · ${src}`)}
      ${kpi(num(h), `${t("m.h")} · ${src}`)}
      ${kpi(num(i10), `${t("m.i10")} · ${src}`)}
      ${kpi(num(c.patents), t("m.patents"), false, true)}
      ${kpi(num(c.master), t("m.master"), false, true)}
      ${kpi(num(c.degree), t("m.degree"), false, true)}
    </div>
  </section>

  <section>
    <div class="section-head">
      <h2>${t("m.evolution")}</h2>
      <span class="count" id="range-out"></span>
    </div>
    <div class="filters">
      <label class="inline" for="r-from">${t("m.from")}</label>
      <select id="r-from" class="field field--s">${li(years, (y) => `<option value="${y}"${y === range[0] ? " selected" : ""}>${y}</option>`)}</select>
      <label class="inline" for="r-to">${t("m.to")}</label>
      <select id="r-to" class="field field--s">${li(years, (y) => `<option value="${y}"${y === range[1] ? " selected" : ""}>${y}</option>`)}</select>
      <button class="btn btn--ghost" type="button" data-span="5">5 ${t("m.years")}</button>
      <button class="btn btn--ghost" type="button" data-span="10">10 ${t("m.years")}</button>
      <button class="btn btn--ghost" type="button" data-span="0">${t("m.all")}</button>
    </div>

    <div class="panels">
      <figure class="panel panel--wide">
        <figcaption>${t("m.byYear")}</figcaption>
        <div class="panel__box"><canvas id="c-pubs"></canvas></div>
      </figure>
      <figure class="panel panel--wide">
        <figcaption>${t("m.citesByYear")}${oa ? "" : ` <span class="note">${t("m.noData")}</span>`}</figcaption>
        <div class="panel__box"><canvas id="c-cites"></canvas></div>
      </figure>
      <figure class="panel">
        <figcaption>${t("m.byType")}</figcaption>
        <div class="panel__box"><canvas id="c-types"></canvas></div>
      </figure>
    </div>
    <p class="note" style="margin-top:1.4rem">${esc(L(m.source))}
      ${oa ? " · OpenAlex " + t("pubs.updated", fdate(oa.fetchedAt)) : ""}</p>
  </section>

  ${cvn ? `<section>
    <div class="section-head"><h2>${t("nav.projects")}</h2>
      <span class="count"><a href="#/proyectos">${t("m.seeAll")}</a></span></div>
    <div class="panels">
      <figure class="panel">
        <figcaption>${t("p.byCount")}</figcaption>
        <div class="panel__box panel__box--s"><canvas id="c-pk"></canvas></div>
      </figure>
      <figure class="panel">
        <figcaption>${t("p.byAmount")}</figcaption>
        <div class="panel__box panel__box--s"><canvas id="c-pa"></canvas></div>
      </figure>
      <figure class="panel panel--full">
        <figcaption>${t("p.byYear")}</figcaption>
        <div class="panel__box"><canvas id="c-py"></canvas></div>
      </figure>
    </div>
  </section>` : ""}

  ${orc && orc.fundings.length ? section(t("m.fundingOrcid"), `<ul class="stack">${li(orc.fundings, (f) => `
    <li><strong>${f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.title)}</a>` : esc(f.title)}</strong>
    <span class="meta">${[f.org, f.start ? f.start + "–" + (f.end || t("present")) : ""].filter(has).map(esc).join(" · ")}</span></li>`)}</ul>`,
    String(orc.fundings.length)) : ""}`;
}

function refreshCounters(d) {
  const out = document.getElementById("range-out");
  if (out) out.textContent = t("m.inRange", d.worksInRange, d.citesInRange);
}

function bindMetrics() {
  const from = document.getElementById("r-from");
  const to = document.getElementById("r-to");
  if (!from) return;
  const d = chartData();
  charts.mount(d);
  refreshCounters(d);
  if (cvn) paintProjectCharts(cvn.projects);

  const apply = (a, b) => {
    range = [Math.min(a, b), Math.max(a, b)];
    from.value = range[0];
    to.value = range[1];
    const next = chartData();
    charts.update(next);
    refreshCounters(next);
  };
  from.addEventListener("change", () => apply(Number(from.value), Number(to.value)));
  to.addEventListener("change", () => apply(Number(from.value), Number(to.value)));
  document.querySelectorAll("[data-span]").forEach((b) =>
    b.addEventListener("click", () => {
      const [min, max] = yearSpan();
      const span = Number(b.dataset.span);
      apply(span ? Math.max(min, max - span + 1) : min, max);
    }));
}

/* ---------- render y arranque -------------------------------------------- */

function render(opts = {}) {
  paintChrome();
  const r = route();
  charts.destroyAll();
  view.innerHTML = r === "publicaciones" ? viewPubs()
    : r === "divulgacion" ? viewPress()
    : r === "docencia" ? viewTeaching()
    : r === "proyectos" ? viewProjects()
    : r === "indicadores" ? viewMetrics()
    : viewProfile();
  if (r === "publicaciones") {
    bindPubs();
    if (opts.keepFocus) {
      const el = document.getElementById(opts.keepFocus);
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }
  }
  if (r === "indicadores") bindMetrics();
  if (r === "docencia") bindSupervisions();
  if (r === "proyectos") bindProjects();
  if (r === "divulgacion") bindPress(); else closePress();
  if (r === "") bindCopyBio();
  closeMobileNav();
  observeReveal();
}

function closeMobileNav() {
  const nav = document.getElementById("nav");
  const btn = document.getElementById("nav-toggle");
  if (!nav || !btn) return;
  nav.classList.remove("is-open");
  btn.setAttribute("aria-expanded", "false");
}

function bindCopyBio() {
  const btn = document.getElementById("copy-bio");
  const src = document.getElementById("bio-text");
  if (!btn || !src) return;
  btn.addEventListener("click", async () => {
    const text = [...src.querySelectorAll("p")].map((p) => p.textContent.trim()).join("\n\n");
    const msg = document.getElementById("copy-msg");
    try {
      await navigator.clipboard.writeText(text);
      if (msg) msg.textContent = t("about.copied");
    } catch (_) {
      if (msg) msg.textContent = t("about.copyFail");
    }
    setTimeout(() => { if (msg) msg.textContent = ""; }, 2200);
  });
}

function bindMobileNav() {
  const btn = document.getElementById("nav-toggle");
  const nav = document.getElementById("nav");
  if (!btn || !nav || btn.dataset.bound) return;
  btn.dataset.bound = "1";
  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(open));
  });
}

/** Anima la entrada de una rejilla de tarjetas una sola vez, al llegar con el scroll. */
function observeReveal() {
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-visible"));
    document.querySelectorAll(".kpi__n[data-count]").forEach((el) => el.removeAttribute("data-count"));
    return;
  }
  document.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((el) => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.2 });
    io.observe(el);
  });
  observeCounters();
}

/** Los números crecen hasta su valor al entrar en pantalla, una sola vez por carga.
    Conserva el formato original (miles, "40,0 M€", "€"...) sustituyendo solo los dígitos. */
function observeCounters() {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = document.querySelectorAll(".kpi__n[data-count]");
  if (!targets.length) return;
  if (reduce) { targets.forEach((el) => el.removeAttribute("data-count")); return; }

  const run = (el) => {
    const final = el.dataset.count;
    el.removeAttribute("data-count");
    const m = final.match(/^([^\d]*)([\d.,\s]+)(.*)$/);
    if (!m) return;
    const digits = m[2];
    const target = Number(digits.replace(/[.\s]/g, "").replace(",", "."));
    if (!isFinite(target) || target === 0) return;
    const decimals = (digits.split(",")[1] || "").length;
    const start = performance.now();
    const dur = 900;
    const step = (now) => {
      const k = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = target * eased;
      const shown = decimals
        ? v.toFixed(decimals).replace(".", ",")
        : num(Math.round(v));
      el.textContent = m[1] + shown + m[3];
      if (k < 1) requestAnimationFrame(step);
      else el.textContent = final;
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && e.target.dataset.count !== undefined) { run(e.target); io.unobserve(e.target); }
    });
  }, { threshold: 0.4 });
  targets.forEach((el) => io.observe(el));
}

async function fetchOrcid(force = false) {
  const id = state.site.profiles?.orcid;
  if (!id) { orcStatus = "error"; return; }
  try {
    await orcid.load(id, {
      force,
      onData: (data, origin) => {
        if (!data) return;
        orc = data;
        orcStatus = origin === "network" ? "ok" : "stale";
        render();
      }
    });
  } catch (_) {
    orcStatus = "error";
    render();
  }
}

async function fetchCvn() {
  try {
    const res = await fetch("data/cvn.json", { cache: "no-cache" });
    if (!res.ok) return;
    cvn = await res.json();
    render();
  } catch (_) { /* la web funciona sin el CVN */ }
}

async function fetchOpenAlex() {
  const id = state.site.profiles?.orcid;
  if (!id) return;
  await openalex.load(id, {
    mail: (state.site.identity?.emailUser && state.site.identity?.emailHost)
      ? `${state.site.identity.emailUser}@${state.site.identity.emailHost}` : "",
    onData: (data) => { if (data) { oa = data; render(); } }
  });
}

async function boot() {
  initLang();
  await loadSite();
  render();
  bindMobileNav();
  document.querySelectorAll(".lang button").forEach((b) =>
    b.addEventListener("click", () => { setLang(b.dataset.lang); render(); }));
  window.addEventListener("hashchange", () => { window.scrollTo(0, 0); range = null; render(); });
  fetchOrcid();
  fetchOpenAlex();
  fetchCvn();
}

boot().catch((err) => {
  view.innerHTML = `<p class="msg msg--warn">No se han podido cargar los datos del sitio (data/site.json).
    Si estás abriendo el fichero con doble clic, arráncalo con un servidor local. Detalle: ${esc(err.message)}</p>`;
});
