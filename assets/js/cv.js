/* CV académico a partir de los mismos datos que alimentan la web.
   Dos salidas, a propósito distintas:
     · LaTeX  -> fichero .tex para retocar y compilar (control fino)
     · PDF    -> vista de impresión del navegador (rápido, sin instalar nada)
   Los textos van aquí y no en store.js porque solo se usan al exportar. */

const T = {
  es: {
    cv: "Currículum académico", gen: "Generado el",
    contact: "Contacto", profile: "Perfil", exp: "Experiencia",
    teaching: "Docencia", theses: "Tesis doctorales dirigidas",
    superv: "Trabajos fin de estudios dirigidos",
    projects: "Proyectos de investigación", projectsLead: "como IP o coordinador",
    pubs: "Producción científica", patents: "Patentes y propiedad industrial",
    editorial: "Actividad editorial y servicio a la comunidad",
    metrics: "Indicadores", present: "actualidad",
    quartiles: "Artículos por cuartil JCR", funding: "Financiación gestionada",
    citations: "Citas", hindex: "Índice h", totalPubs: "Publicaciones",
    ownDegree: "título propio", source: "Fuentes: ORCID, OpenAlex y CVN de FECYT",
    journals: "Artículos en revista", conferences: "Contribuciones a congresos",
    chapters: "Libros y capítulos", otherPubs: "Otras publicaciones", cumLaude: "cum laude"
  },
  en: {
    cv: "Academic CV", gen: "Generated on",
    contact: "Contact", profile: "Profile", exp: "Experience",
    teaching: "Teaching", theses: "Doctoral theses supervised",
    superv: "Final projects supervised",
    projects: "Research projects", projectsLead: "as PI or coordinator",
    pubs: "Research output", patents: "Patents and intellectual property",
    editorial: "Editorial activity and community service",
    metrics: "Indicators", present: "present",
    quartiles: "Articles by JCR quartile", funding: "Funding managed",
    citations: "Citations", hindex: "h-index", totalPubs: "Publications",
    ownDegree: "university-specific degree", source: "Sources: ORCID, OpenAlex and FECYT CVN",
    journals: "Journal articles", conferences: "Conference contributions",
    chapters: "Books and chapters", otherPubs: "Other publications", cumLaude: "cum laude"
  }
};

const pick = (v, lang) => (v && typeof v === "object") ? (v[lang] || v.es || v.en || "") : (v || "");

/* En el CV interesa el identificador, no la marca: "ORCID 0000-...", no "ORCID".
   Y solo los tres perfiles que de verdad se citan en una candidatura. */
function cvNetworks(site) {
  const by = {};
  (site.networks || []).forEach((n) => { by[(n.label || "").toLowerCase()] = n.url; });
  const orcid = (site.profiles || {}).orcid || "";
  const wos = by["web of science"] || "";
  const li = by.linkedin || "";
  const out = [];
  if (orcid) out.push({ label: "ORCID", id: orcid, url: `https://orcid.org/${orcid}` });
  if (wos) out.push({ label: "Web of Science", id: (wos.match(/record\/([^/?#]+)/) || [])[1] || wos, url: wos });
  if (li) out.push({ label: "LinkedIn", id: (li.match(/\/in\/([^/?#]+)/) || [])[1] || li, url: li });
  return out;
}

/** Reúne todo lo que el CV necesita, sea cual sea el formato de salida. */
/* Cita APA a partir de lo que devuelve OpenAlex.
   Aviso: convertir "Javier Prieto Tejedor" en "Prieto Tejedor, J." exige
   adivinar dónde acaba el nombre. Se asume nombre simple y el resto apellidos,
   que acierta en la mayoría de casos españoles pero no en todos. */
function apaAuthor(full) {
  const parts = String(full || "").trim().split(/\s+/);
  if (parts.length < 2) return full || "";
  // Convención española: dos apellidos. Con 4 o más piezas se asume nombre
  // compuesto (Juan Manuel Corchado Rodríguez); con 3, nombre simple.
  const nGiven = parts.length >= 4 ? 2 : 1;
  const given = parts.slice(0, nGiven);
  const surname = parts.slice(nGiven).join(" ");
  return `${surname}, ${given.map((g) => g[0].toUpperCase() + ".").join(" ")}`;
}

function apaAuthors(list) {
  const a = (list || []).map(apaAuthor);
  if (!a.length) return "";
  if (a.length === 1) return a[0];
  if (a.length <= 20) return a.slice(0, -1).join(", ") + ", & " + a[a.length - 1];
  return a.slice(0, 19).join(", ") + ", ... " + a[a.length - 1];
}

export function apaCite(work, meta, esc) {
  const m = meta || {};
  const authors = apaAuthors(m.authors);
  const year = work.year || m.year || "s. f.";
  const title = String(work.title || "").replace(/\.$/, "");
  const venue = m.venue || work.venue || "";
  const vol = m.volume ? `, ${m.volume}${m.issue ? `(${m.issue})` : ""}` : "";
  const pages = m.pages ? `, ${m.pages}` : "";
  return {
    authors: authors ? `${authors} ` : "",
    year: `(${year}). `,
    title: `${title}. `,
    venue, vol, pages,
    doi: work.doi ? `https://doi.org/${work.doi}` : ""
  };
}

export function collect({ site, cvn, orcid, openalex, oaMap = {}, lang = "es" }) {
  const t = T[lang] || T.es;
  const id = site.identity || {};
  const m = site.metrics || {};
  const projects = (cvn && cvn.projects) || [];
  const pubs = (cvn && cvn.publications) || [];
  const works = (orcid && orcid.works) || [];

  const quartiles = [1, 2, 3, 4]
    .map((q) => [q, pubs.filter((p) => p.quartile === q).length])
    .filter(([, n]) => n);

  const kinds = new Map();
  pubs.forEach((p) => { if (p.kind) kinds.set(p.kind, (kinds.get(p.kind) || 0) + 1); });

  return {
    t, lang,
    name: id.name || "",
    role: pick(id.role, lang),
    affiliation: [pick(id.affiliation, lang), pick(id.institution, lang)].filter(Boolean),
    group: pick(id.group, lang),
    email: (id.emailUser && id.emailHost) ? `${id.emailUser}@${id.emailHost}` : "",
    networks: cvNetworks(site),
    bio: pick(site.bio, lang).split(/\n{2,}/).filter(Boolean),
    positions: ((orcid && orcid.employments) || []).filter((e) => e.org),
    teaching: [...((cvn && cvn.teaching) || [])].sort((a, b) => {
      const ea = a.end ? Number(a.end.slice(0, 4)) : Infinity;
      const eb = b.end ? Number(b.end.slice(0, 4)) : Infinity;
      return ea !== eb ? eb - ea : String(a.start || "").localeCompare(String(b.start || ""));
    }),
    theses: (cvn && cvn.theses) || [],
    supervisions: (cvn && cvn.supervisions) || [],
    projects: [...projects].sort((a, b) => String(b.start || "").localeCompare(String(a.start || ""))),
    projectsByYear: groupBy(projects, (p) => p.start || "s. f."),
    projectsLead: projects.filter((p) => p.lead).length,
    funding: projects.reduce((a, p) => a + (p.amountOwn || 0), 0),
    patents: site.patents || [],
    service: [...(site.service || [])].sort((a, b) => {
      const y = (v) => { const m = String(v || "").match(/(\d{4})\s*$/); return m ? Number(m[1]) : Infinity; };
      return y(b.years) - y(a.years);
    }),
    quartiles,
    kinds: [...kinds.entries()].sort((a, b) => b[1] - a[1]),
    pubsTotal: works.length || pubs.length,
    citations: (openalex && openalex.citations) || m.citations || 0,
    hIndex: (openalex && openalex.hIndex) || m.hIndex || 0,
    works,
    oaMap,
    worksByYear: groupByYear(works),
    worksByKind: splitByKind(works, oaMap)
  };
}

function groupBy(list, keyOf) {
  const m = new Map();
  list.forEach((x) => {
    const k = keyOf(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  });
  return [...m.entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0])));
}

/* Un CV académico separa revistas, congresos y capítulos. El tipo sale de
   OpenAlex cuando está, y si no del que trae ORCID. */
function splitByKind(works, oaMap) {
  const groups = { journal: [], conference: [], chapter: [], other: [] };
  works.forEach((w) => {
    const meta = oaMap[String(w.doi || "").toLowerCase()] || {};
    const ty = (meta.type || w.type || "").toLowerCase();
    if (/journal|article/.test(ty) && !/proceedings/.test(ty)) groups.journal.push(w);
    else if (/proceedings|conference/.test(ty)) groups.conference.push(w);
    else if (/book-chapter|chapter|book/.test(ty)) groups.chapter.push(w);
    else groups.other.push(w);
  });
  return groups;
}

function groupByYear(works) {
  const m = new Map();
  works.forEach((w) => {
    const y = w.year || "s. f.";
    if (!m.has(y)) m.set(y, []);
    m.get(y).push(w);
  });
  return [...m.entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0])));
}

/* ------------------------------------------------------------------ LaTeX */

const tex = (s) => String(s ?? "")
  .replace(/\\/g, "\\textbackslash{}")
  .replace(/([&%$#_{}])/g, "\\$1")
  .replace(/~/g, "\\textasciitilde{}")
  .replace(/\^/g, "\\textasciicircum{}");

export function toLatex(d) {
  const { t } = d;
  const years = (a, b) => a ? `${a}--${b || t.present}` : "";
  const svcYears = (x) => x.start ? `${x.start}--${x.end || t.present}`
    : (String(x.years || "").match(/^(\d{4})\s*[-–—]\s*$/) ? `${RegExp.$1}--${t.present}` : (x.years || ""));
  const sec = (title, body) => body ? `\n\\section{${tex(title)}}\n${body}` : "";
  const items = (arr) => arr.length ? `\\begin{itemize}[leftmargin=*,itemsep=2pt,topsep=2pt]\n${arr.join("\n")}\n\\end{itemize}\n` : "";
  const apaItems = (arr) => arr.length ? `\\begin{apalist}\n${arr.join("\n")}\n\\end{apalist}\n` : "";

  const money = (n) => new Intl.NumberFormat("es-ES").format(Math.round(n || 0)) + "~\\euro{}";

  return `% CV académico generado desde javierprieto.me
% ${T.es.gen} ${new Date().toISOString().slice(0, 10)}
\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}
% babel-spanish no está en todas las instalaciones; si falla, comenta esta línea
\\usepackage[${d.lang === "en" ? "english" : "spanish"}]{babel}
\\usepackage[margin=2.2cm]{geometry}
\\usepackage{enumitem,xcolor,titlesec,hyperref,eurosym}
\\usepackage{xurl}  % parte los DOI largos en vez de salirse del margen
\\newenvironment{apalist}{\\begin{list}{}{%
  \\setlength{\\leftmargin}{1.2em}\\setlength{\\itemindent}{-1.2em}%
  \\setlength{\\itemsep}{2pt}\\setlength{\\parsep}{0pt}\\setlength{\\topsep}{2pt}}}{\\end{list}}

\\definecolor{acc}{HTML}{17595F}
\\definecolor{ink}{HTML}{131C24}
\\color{ink}
% enlaces sin recuadro ni azul de navegador: solo el tono del tema
\\definecolor{acc2}{HTML}{3F8F83}
\\hypersetup{colorlinks=true,urlcolor=acc2,linkcolor=acc,citecolor=acc,pdfborder={0 0 0}}
\\titleformat{\\section}{\\large\\bfseries\\color{acc}}{}{0pt}{}[{\\color{acc}\\titlerule[1pt]}]
\\titlespacing{\\section}{0pt}{14pt}{6pt}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}

\\begin{document}

{\\Huge\\bfseries\\color{acc} ${tex(d.name)}}\\\\[4pt]
{\\large ${tex(d.role)}}\\\\[2pt]
${d.affiliation.map(tex).join(" \\\\ ")}${d.group ? ` \\\\ ${tex(d.group)}` : ""}\\\\[4pt]
${[d.email ? `\\href{mailto:${d.email}}{${tex(d.email)}}` : "",
   ...d.networks.map((n) => `${tex(n.label)}: \\href{${n.url}}{${tex(n.id)}}`)].filter(Boolean).join(" \\quad\\textcolor{acc}{|}\\quad ")}

${sec(t.profile, d.bio.map((p) => tex(p)).join("\n\n"))}

${sec(t.metrics, items([
  `\\item ${tex(t.totalPubs)}: ${d.pubsTotal}`,
  `\\item ${tex(t.citations)}: ${d.citations} \\quad ${tex(t.hindex)}: ${d.hIndex}`,
  `\\item ${tex(t.projects)}: ${d.projects.length} (${d.projectsLead} ${tex(t.projectsLead)})`,
  `\\item ${tex(t.funding)}: ${money(d.funding)}`,
  d.quartiles.length ? `\\item ${tex(t.quartiles)}: ${d.quartiles.map(([q, n]) => `Q${q}: ${n}`).join(", ")}` : ""
].filter(Boolean)))}

${sec(t.exp, items(d.positions.map((p) =>
  `\\item \\textbf{${tex(p.role || p.org)}}${p.role ? `, ${tex(p.org)}` : ""}${p.dept ? ` (${tex(p.dept)})` : ""} \\hfill ${years(p.start, p.end)}`)))}

${sec(t.teaching, items(d.teaching.map((c) =>
  `\\item \\textbf{${tex(c.course)}} \\hfill ${(c.start || "").slice(0, 4)}--${(c.end || "").slice(0, 4) || t.present}\\\\ ${tex(c.degree)}${c.official ? "" : ` (${tex(t.ownDegree)})`}`)))}

${sec(t.theses, items(d.theses.map((x) =>
  `\\item \\textbf{${tex(x.title)}}\\\\ ${tex(x.student)}${x.year ? `, ${x.year}` : ""}${x.university ? `. ${tex(x.university)}` : ""}${/cum\\s*laude/i.test(x.grade || "") ? ` \\textit{(${tex(t.cumLaude)})}` : ""}`)))}

${(() => {
  const list = d.projects.filter((p) => p.amountOwn || p.lead);
  if (!list.length) return "";
  return `\\section{${tex(t.projects)}}\n` + groupBy(list, (p) => p.start || "s. f.").map(([y, ps]) =>
    `{\\bfseries\\color{acc} ${tex(y)}}\\nopagebreak\\par\\nopagebreak\n` + items(ps.map((p) =>
      `\\item \\textbf{${tex(p.title)}}${p.lead ? " \\textit{(IP)}" : ""} \\hfill ${years(p.start, p.end)}\\\\ ${tex(p.funder || p.program)}${p.amountOwn ? `. ${money(p.amountOwn)}` : ""}`))
  ).join("\n");
})()}

${sec(t.patents, items(d.patents.map((x) =>
  `\\item \\textbf{${tex(pick(x.title, d.lang))}}${x.number ? ` (${tex(x.number)})` : ""}${x.year ? `, ${x.year}` : ""}. ${tex(x.type)}`)))}

${sec(t.editorial, items(d.service.map((x) =>
  `\\item \\textbf{${tex(pick(x.role, d.lang))}}, ${tex(pick(x.org, d.lang))}${svcYears(x) ? ` \\hfill ${tex(svcYears(x))}` : ""}`)))}

${["journal", "conference", "chapter", "other"].map((k) => {
  const ws = d.worksByKind[k];
  if (!ws.length) return "";
  const label = { journal: t.journals, conference: t.conferences, chapter: t.chapters, other: t.otherPubs }[k];
  return `\\\\section{${tex(label)}}\\n` + groupByYear(ws).map(([y, list]) =>
    `{\\\\bfseries\\\\color{acc} ${tex(y)}}\\\\nopagebreak\\\\par\\\\nopagebreak\\n` + apaItems(list.map((w) => {
      const c = apaCite(w, d.oaMap[String(w.doi || "").toLowerCase()]);
      return `\\\\item ${tex(c.authors)}${tex(c.year)}${tex(c.title)}${
        c.venue ? `\\\\textit{${tex(c.venue)}}${tex(c.vol)}${tex(c.pages)}. ` : ""}${
        c.doi ? `\\\\url{${c.doi}}` : ""}`;
    }))).join("\\n");
}).join("\\n")}

\\vfill
{\\footnotesize\\color{acc} ${tex(t.source)}. ${tex(t.gen)} ${new Date().toISOString().slice(0, 10)}.}

\\end{document}
`;
}

/* -------------------------------------------------------- vista de impresión */

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function toPrintHtml(d) {
  const { t } = d;
  const years = (a, b) => a ? `${a}–${b || t.present}` : "";
  const svcYears = (x) => x.start ? `${x.start}–${x.end || t.present}`
    : (String(x.years || "").match(/^(\d{4})\s*[-–—]\s*$/) ? `${RegExp.$1}–${t.present}` : (x.years || ""));
  const money = (n) => new Intl.NumberFormat("es-ES").format(Math.round(n || 0)) + " €";
  // en la tarjeta la cifra larga rompe el ancho: se abrevia como en la web
  const moneyShort = (n) => n >= 1e6 ? `${Math.round(n / 1e6)} M€`
    : n >= 1e3 ? `${Math.round(n / 1e3)} k€` : money(n);
  const block = (title, rows, extra = "") => rows.length ? `
    <section><h2>${esc(title)}</h2>${extra}<ul>${rows.join("")}</ul></section>` : "";
  const qmax = Math.max(1, ...d.quartiles.map(([, n]) => n));

  return `<!doctype html>
<html lang="${d.lang}"><head><meta charset="utf-8">
<title>${esc(d.name)} · ${esc(t.cv)}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap" rel="stylesheet">
<style>
  :root { --acc:#17595f; --acc2:#3f8f83; --acc3:#7fb5a2; --wash:#e9f1f0;
          --ink:#131c24; --muted:#5c6b76; --line:#dde5e8; }
  * { box-sizing:border-box; }
  body { margin:0; background:#fff; color:var(--ink);
         font-family:"Source Serif 4",Georgia,serif; font-size:10.2pt; line-height:1.5; }

  /* banda superior con el acento del tema */
  header { background:var(--acc); color:#fff; padding:13mm 15mm 9mm;
           margin:-16mm -15mm 8mm; }
  header h1 { font-family:"IBM Plex Sans",sans-serif; font-size:27pt; font-weight:700;
              margin:0 0 3pt; letter-spacing:-.025em; }
  header .role { font-family:"IBM Plex Sans",sans-serif; font-size:11.5pt; font-weight:500;
                 margin:0 0 6pt; opacity:.95; }
  header .aff { font-size:9.6pt; margin:0; opacity:.82; }
  header .ids { font-family:"IBM Plex Sans",sans-serif; font-size:8.6pt; margin:9pt 0 0;
                display:flex; flex-wrap:wrap; gap:5pt 14pt; opacity:.95; }
  header .ids b { font-weight:600; opacity:.7; margin-right:3pt; }
  header a { color:#fff; text-decoration:none; }

  main { padding:0; }

  h2 { font-family:"IBM Plex Sans",sans-serif; font-size:11.5pt; font-weight:600; color:var(--acc);
       margin:13pt 0 5pt; display:flex; align-items:center; gap:7pt; }
  h2::after { content:""; flex:1; height:1.6pt; background:linear-gradient(90deg,var(--acc),var(--acc3)); }
  section { break-inside:auto; }
  ul { margin:0; padding:0; list-style:none; }
  li { padding:3.5pt 0 3.5pt 9pt; position:relative; break-inside:avoid; }
  li::before { content:""; position:absolute; left:0; top:8pt; width:3.5pt; height:3.5pt;
               border-radius:50%; background:var(--acc3); }
  .row { display:flex; gap:10pt; align-items:baseline; }
  .row strong { font-family:"IBM Plex Sans",sans-serif; font-weight:600; }
  .when { margin-left:auto; color:var(--acc); font-family:"IBM Plex Sans",sans-serif;
          font-size:8.6pt; font-weight:500; white-space:nowrap; font-variant-numeric:tabular-nums; }
  .sub { display:block; color:var(--muted); font-size:9.2pt; }
  .tag { display:inline-block; font-family:"IBM Plex Sans",sans-serif; font-size:7.6pt;
         color:var(--acc); background:var(--wash); border-radius:2pt; padding:.5pt 4pt; margin-left:4pt; }

  /* indicadores en tarjetas */
  .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:7pt; margin:2pt 0 8pt; }
  .kpi { background:var(--wash); border-left:2.5pt solid var(--acc); border-radius:2pt; padding:7pt 9pt; }
  .kpi b { display:block; font-family:"IBM Plex Sans",sans-serif; font-size:16pt; font-weight:600;
           color:var(--acc); line-height:1.1; }
  .kpi span { font-size:8.2pt; color:var(--muted); }

  /* barras de cuartil */
  .q { display:flex; gap:9pt; align-items:flex-end; margin:4pt 0 2pt; }
  .q div { text-align:center; font-family:"IBM Plex Sans",sans-serif; font-size:8pt; color:var(--muted); }
  .q i { display:block; width:34pt; background:var(--acc2); border-radius:2pt 2pt 0 0; margin-bottom:3pt; }
  .q b { color:var(--acc); }

  .lead { color:var(--muted); font-size:9.8pt; margin:0 0 4pt; }
  .year { font-family:"IBM Plex Sans",sans-serif; font-weight:600; color:var(--acc);
          font-size:9.4pt; margin:7pt 0 1pt; }
  /* pie repetido en todas las páginas al imprimir */
  .running { position:fixed; bottom:-12mm; left:0; right:0; display:flex;
             justify-content:space-between; font-family:"IBM Plex Sans",sans-serif;
             font-size:8pt; color:var(--muted); border-top:.5pt solid var(--line);
             padding-top:3pt; }
  footer { margin-top:12pt; padding-top:6pt; border-top:.6pt solid var(--line);
           font-size:8.2pt; color:var(--muted); }
  /* margen real en todas las páginas: sin él, a partir de la 2 el texto
     empezaba pegado al borde superior */
  @page { size:A4; margin:16mm 15mm; }
  /* nada de azul de navegador ni subrayados: el DOI va discreto y en el tono
     del tema, como en un CV impreso */
  a { color:inherit; text-decoration:none; }
  .apa { text-indent:-10pt; padding-left:19pt; }
  .apa em { font-style:italic; }
  .apa a { color:var(--acc2); font-size:9pt; word-break:break-all; }
  @media print { header { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
                 .kpi, .q i, li::before, h2::after { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body>

<header>
  <h1>${esc(d.name)}</h1>
  <p class="role">${esc(d.role)}</p>
  <p class="aff">${d.affiliation.map(esc).join(" · ")}${d.group ? " · " + esc(d.group) : ""}</p>
  <div class="ids">
    ${d.email ? `<span><b>Email</b><a href="mailto:${esc(d.email)}">${esc(d.email)}</a></span>` : ""}
    ${d.networks.map((n) => `<span><b>${esc(n.label)}</b><a href="${esc(n.url)}">${esc(n.id)}</a></span>`).join("")}
  </div>
</header>

<div class="running"><span>${esc(d.name)} · ${esc(t.cv)}</span><span>${esc(d.affiliation[1] || d.affiliation[0] || "")}</span></div>

<main>
<section><h2>${esc(t.metrics)}</h2>
  <div class="kpis">
    <div class="kpi"><b>${d.pubsTotal}</b><span>${esc(t.totalPubs)}</span></div>
    <div class="kpi"><b>${d.citations}</b><span>${esc(t.citations)}</span></div>
    <div class="kpi"><b>${d.hIndex}</b><span>${esc(t.hindex)}</span></div>
    <div class="kpi"><b>${moneyShort(d.funding)}</b><span>${esc(t.funding)}</span></div>
  </div>
  ${d.quartiles.length ? `<p class="lead">${esc(t.quartiles)}</p><div class="q">${
    d.quartiles.map(([q, n]) => `<div><i style="height:${Math.round(10 + 26 * n / qmax)}pt"></i><b>${n}</b><br>Q${q}</div>`).join("")}</div>` : ""}
</section>

${d.bio.length ? `<section><h2>${esc(t.profile)}</h2>${
  d.bio.map((p) => `<p style="margin:0 0 4pt">${esc(p)}</p>`).join("")}</section>` : ""}

${block(t.exp, d.positions.map((p) => `<li><div class="row">
  <span><strong>${esc(p.role || p.org)}</strong>${p.role ? `<span class="sub">${esc(p.org)}${p.dept ? " · " + esc(p.dept) : ""}</span>` : ""}</span>
  <span class="when">${years(p.start, p.end)}</span></div></li>`))}

${block(t.teaching, d.teaching.map((c) => `<li><div class="row">
  <span><strong>${esc(c.course)}</strong>${c.official ? "" : `<span class="tag">${esc(t.ownDegree)}</span>`}<span class="sub">${esc(c.degree)}</span></span>
  <span class="when">${(c.start || "").slice(0, 4)}–${(c.end || "").slice(0, 4) || t.present}</span></div></li>`))}

${block(t.theses, d.theses.map((x) => `<li><div class="row">
  <span><strong>${esc(x.title)}</strong>${/cum\s*laude/i.test(x.grade || "") ? `<span class="tag">${esc(t.cumLaude)}</span>` : ""}<span class="sub">${esc(x.student)}${x.university ? " · " + esc(x.university) : ""}</span></span>
  <span class="when">${esc(x.year)}</span></div></li>`))}

${(() => {
  const list = d.projects.filter((p) => p.lead || p.amountOwn);
  if (!list.length) return "";
  return `<section><h2>${esc(t.projects)}</h2>
    <p class="lead">${d.projects.length} ${esc(t.projects.toLowerCase())}, ${d.projectsLead} ${esc(t.projectsLead)}</p>
    ${groupBy(list, (p) => p.start || "s. f.").map(([y, ps]) =>
      `<p class="year">${esc(y)}</p><ul>${ps.map((p) => `<li><div class="row">
        <span><strong>${esc(p.title)}</strong>${p.lead ? `<span class="tag">IP</span>` : ""}<span class="sub">${esc(p.funder || p.program)}${p.amountOwn ? " · " + money(p.amountOwn) : ""}</span></span>
        <span class="when">${years(p.start, p.end)}</span></div></li>`).join("")}</ul>`).join("")}
  </section>`;
})()}

${block(t.patents, d.patents.map((x) => `<li><div class="row">
  <span><strong>${esc(pick(x.title, d.lang))}</strong><span class="sub">${esc(x.type)}${x.number ? " · " + esc(x.number) : ""}</span></span>
  <span class="when">${esc(x.year)}</span></div></li>`))}

${block(t.editorial, d.service.map((x) => `<li><div class="row">
  <span><strong>${esc(pick(x.role, d.lang))}</strong><span class="sub">${esc(pick(x.org, d.lang))}</span></span>
  <span class="when">${esc(svcYears(x))}</span></div></li>`))}

${["journal", "conference", "chapter", "other"].map((k) => {
  const ws = d.worksByKind[k];
  if (!ws.length) return "";
  const label = { journal: t.journals, conference: t.conferences, chapter: t.chapters, other: t.otherPubs }[k];
  return `<section><h2>${esc(label)}</h2>${groupByYear(ws).map(([y, list]) =>
    `<p class="year">${esc(y)}</p><ul>${list.map((w) => {
      const c = apaCite(w, d.oaMap[String(w.doi || "").toLowerCase()]);
      return `<li class="apa">${esc(c.authors)}${esc(c.year)}${esc(c.title)}${
        c.venue ? `<em>${esc(c.venue)}</em>${esc(c.vol)}${esc(c.pages)}. ` : ""}${
        c.doi ? `<a href="${esc(c.doi)}">${esc(c.doi)}</a>` : ""}</li>`;
    }).join("")}</ul>`).join("")}</section>`;
}).join("")}

<footer>${esc(t.source)}. ${esc(t.gen)} ${new Date().toLocaleDateString(d.lang === "en" ? "en-GB" : "es-ES")}.</footer>
</main>
<script>window.addEventListener("load", () => setTimeout(() => window.print(), 500));</script>
</body></html>`;
}

export function download(name, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
