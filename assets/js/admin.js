import { loadSite, saveDraft, clearDraft, esc, state } from "./store.js?v=17";
import { ICON_KEYS } from "./icons.js?v=17";

/* ------------------------------------------------------------------ esquema */

const T = { text: "text", url: "url", num: "number", area: "textarea", date: "date", pass: "password" };

const SCHEMA = [
  {
    legend: "Identidad",
    path: "identity",
    fields: [
      { k: "name", l: "Nombre completo" },
      { k: "shortName", l: "Nombre corto (cabecera)" },
      { k: "role.es", l: "Cargo (ES)" },
      { k: "role.en", l: "Cargo (EN)" },
      { k: "affiliation.es", l: "Afiliación (ES)", wide: true },
      { k: "affiliation.en", l: "Afiliación (EN)", wide: true },
      { k: "group.es", l: "Grupo e institutos (ES)" },
      { k: "group.en", l: "Grupo e institutos (EN)" },
      { k: "emailUser", l: "Correo, antes de la @" },
      { k: "emailHost", l: "Correo, dominio después de la @" },
      { k: "cv", l: "Enlace al CV en PDF", t: T.url },
      { k: "photo", l: "Foto", t: "photo", wide: true }
    ]
  },
  {
    legend: "Biografía",
    path: "bio",
    fields: [
      { k: "es", l: "Biografía en castellano (separa párrafos con una línea en blanco)", t: T.area, wide: true },
      { k: "en", l: "Biography in English", t: T.area, wide: true }
    ]
  },
  {
    legend: "Líneas de investigación",
    path: "topics",
    repeat: true,
    label: (it) => it.es || "Nueva línea",
    item: [
      { k: "es", l: "Título (ES)" }, { k: "en", l: "Título (EN)" },
      { k: "icon", l: "Icono", t: "select", options: [
        { value: "ia", label: "IA explicable" },
        { value: "blockchain", label: "Blockchain" },
        { value: "iot", label: "IoT / chip" },
        { value: "quantum", label: "Comunicaciones y cuántica" },
        { value: "metaverse", label: "Metaverso / RV" },
        { value: "ehealth", label: "eHealth / escáner" } ] },
      { k: "desc_es", l: "Frase corta (ES)", wide: true },
      { k: "desc_en", l: "Frase corta (EN)", wide: true }
    ]
  },
  {
    legend: "Identificadores para la ingesta automática",
    path: "profiles",
    fields: [
      { k: "orcid", l: "ORCID iD (solo el número)", note:
        "De aquí salen publicaciones y trayectoria (ORCID) y citas, índice h e i10 (OpenAlex)." }
    ]
  },
  {
    legend: "Presentación",
    path: "display",
    fields: [
      { k: "timeline", l: "Trayectoria", t: "select", options: [
        { value: "latest", label: "Solo el puesto actual de cada institución" },
        { value: "all", label: "Puesto actual y, debajo, los anteriores" } ], wide: true, note:
        "Los puestos vienen de ORCID. Si un cargo aparece mal escrito, se corrige en orcid.org y la web se actualiza sola." }
    ]
  },
  {
    legend: "Redes y perfiles enlazados",
    path: "networks",
    repeat: true,
    label: (it) => it.label || "Nueva red",
    item: [
      { k: "label", l: "Nombre visible" },
      { k: "icon", l: "Icono", t: "select", options: ICON_KEYS.map((k) => ({ value: k, label: k })) },
      { k: "url", l: "Enlace", t: T.url, wide: true }
    ]
  },
  {
    legend: "Indicadores",
    path: "metrics",
    fields: [
      { k: "theses", l: "Tesis dirigidas", t: T.num },
      { k: "projects", l: "Proyectos de investigación", t: T.num },
      { k: "fundingEur", l: "Financiación captada (€)", t: T.num },
      { k: "patents", l: "Patentes", t: T.num },
      { k: "citationSource", l: "Fuente de citas, h e i10", t: "select", options: [
        { value: "openalex", label: "OpenAlex (automático)" },
        { value: "manual", label: "Manual, copiado de Google Scholar" } ] },
      { k: "citations", l: "Citas (Scholar, si la fuente es manual)", t: T.num },
      { k: "hIndex", l: "Índice h", t: T.num },
      { k: "i10Index", l: "Índice i10", t: T.num },
      { k: "supervisionMaster", l: "TFM dirigidos", t: T.num },
      { k: "supervisionDegree", l: "TFG y proyectos fin de carrera", t: T.num },
      { k: "publicationsManual", l: "Publicaciones (si falla ORCID)", t: T.num },
      { k: "scholarUpdatedAt", l: "Fecha de los datos de Scholar", t: T.date },
      { k: "source.es", l: "Nota de fuentes (ES)", wide: true },
      { k: "source.en", l: "Nota de fuentes (EN)", wide: true }
    ]
  },
  {
    legend: "Proyectos destacados en la portada",
    path: "featured",
    fields: [
      { k: "__pick", l: "Marca con la estrella los que quieras enseñar", t: "featured", wide: true, note:
        "La lista sale de data/cvn.json. Los proyectos que no estén en el CVN se añaden abajo, a mano." }
    ]
  },
  {
    legend: "Proyectos añadidos a mano",
    path: "projects",
    repeat: true,
    label: (it) => (it.title && it.title.es) || "Nuevo proyecto",
    item: [
      { k: "title.es", l: "Título (ES)" }, { k: "title.en", l: "Título (EN)" },
      { k: "role.es", l: "Rol (ES)" }, { k: "role.en", l: "Rol (EN)" },
      { k: "funder.es", l: "Financiador (ES)" }, { k: "funder.en", l: "Financiador (EN)" },
      { k: "years", l: "Años (2024-2027)" }, { k: "amount", l: "Importe (texto libre)" },
      { k: "url", l: "Enlace", t: T.url, wide: true }
    ]
  },
  {
    legend: "Tesis dirigidas (se rellenan solas al importar el CVN)",
    path: "theses",
    repeat: true,
    label: (it) => it.student || "Nueva tesis",
    item: [
      { k: "student", l: "Doctorando" }, { k: "year", l: "Año" },
      { k: "title.es", l: "Título (ES)", wide: true }, { k: "title.en", l: "Título (EN)", wide: true },
      { k: "university.es", l: "Universidad (ES)" }, { k: "university.en", l: "Universidad (EN)" },
      { k: "url", l: "Enlace", t: T.url, wide: true }
    ]
  },
  {
    legend: "Webs de proyectos",
    path: "projectLinks",
    fields: [
      { k: "__links", l: "Busca el proyecto y pega su web", t: "projectlinks", wide: true, note:
        "Se guardan aparte, indexados por el identificador del proyecto, así que reimportar el CVN no los borra." }
    ]
  },
  {
    legend: "Recursos educativos abiertos (REA)",
    path: "rea",
    repeat: true,
    label: (it) => it.title || "Nuevo REA",
    item: [
      { k: "title", l: "Título (tal como está en OER Commons)", wide: true },
      { k: "url", l: "Enlace en OER Commons", t: T.url, wide: true },
      { k: "program.es", l: "Titulación e institución (ES)" },
      { k: "program.en", l: "Programme and institution (EN)" },
      { k: "authors", l: "Coautores (aparte de ti), separados por comas" },
      { k: "license", l: "Licencia (tal como aparece en la portada)" },
      { k: "photo", l: "Portada (ruta del fichero, por ejemplo assets/img/rea/mi-rea.jpg)", wide: true, note:
        "Este campo no sube el fichero: solo apunta a él. Para cambiar la imagen, sube el fichero al repositorio (en assets/img/rea/) y pon aquí su ruta." }
    ]
  },
  {
    legend: "Divulgación y medios",
    path: "press",
    repeat: true,
    label: (it) => it.title || "Nueva aparición",
    item: [
      { k: "title", l: "Titular (tal como lo publicó el medio)", wide: true },
      { k: "outlet", l: "Medio" },
      { k: "date", l: "Fecha", t: T.date },
      { k: "url", l: "Enlace (vacío si no hay hemeroteca disponible)", t: T.url, wide: true },
      { k: "topic", l: "Tema", t: "select", options: [
        { value: "ia", label: "IA explicable" },
        { value: "blockchain", label: "Blockchain y ciberseguridad" },
        { value: "iot", label: "IoT y edge computing" },
        { value: "quantum", label: "Comunicaciones y computación cuántica" },
        { value: "metaverse", label: "Metaverso y tecnología educativa" },
        { value: "ehealth", label: "eHealth y radiómica" } ] },
      { k: "video", l: "ID de vídeo de YouTube (solo si hay vídeo, sin el resto de la URL)" },
      { k: "photo", l: "Foto propia (ruta), si no hay vídeo" },
      { k: "summary.es", l: "Tu resumen, nunca el texto del medio (ES)", t: T.area, wide: true },
      { k: "summary.en", l: "Your own summary (EN)", t: T.area, wide: true }
    ]
  },
  {
    legend: "Patentes y propiedad industrial",
    path: "patents",
    repeat: true,
    label: (it) => (it.title && it.title.es) || "Nueva patente",
    item: [
      { k: "title.es", l: "Título (ES)", wide: true },
      { k: "title.en", l: "Título (EN)", wide: true },
      { k: "type", l: "Tipo (Patente de invención, Registro de software...)" },
      { k: "number", l: "Número" },
      { k: "year", l: "Año" },
      { k: "owner", l: "Entidad titular" },
      { k: "url", l: "Enlace", t: T.url, wide: true }
    ]
  },
  {
    legend: "Docencia (viene del CVN, no se edita aquí)",
    path: "__teachingNote",
    fields: [
      { k: "__note", l: "", t: "note", wide: true, note:
        "La lista de asignaturas, fechas y titulaciones sale de la sección «Formación académica " +
        "impartida» de tu CVN. Para corregir o añadir algo, actualiza el CVN en orcid.org o en FECYT " +
        "y reimporta con scripts/import_cvn.py; no se edita a mano en esta página." }
    ]
  },
  {
    legend: "Edición y servicio a la comunidad",
    path: "service",
    repeat: true,
    label: (it) => (it.role && it.role.es) || "Nuevo cargo",
    item: [
      { k: "role.es", l: "Cargo (ES)" }, { k: "role.en", l: "Role (EN)" },
      { k: "org.es", l: "Organización (ES)" }, { k: "org.en", l: "Organisation (EN)" },
      { k: "years", l: "Años" }
    ]
  },
  {
    legend: "Publicación en GitHub",
    path: "settings",
    fields: [
      { k: "repo", l: "Repositorio (usuario/repo)" },
      { k: "branch", l: "Rama" },
      { k: "__token", l: "Token de acceso (no se guarda en el repositorio)", t: T.pass, wide: true, note:
        "Token fino de GitHub con permiso de escritura de contenido solo en este repositorio. Se guarda en la sesión del navegador y se borra al cerrar la pestaña." }
    ]
  }
];

/* ------------------------------------------------------- acceso por rutas */

const get = (obj, path) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj);

function set(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((a, k) => (a[k] = a[k] ?? {}), obj);
  target[last] = value;
}

/* ------------------------------------------------------------- formulario */

let site = null;
let photoData = null; // { dataUrl, base64, mime }
let cvnProjects = [];
let starred = new Set();
let starQuery = "";

function fieldHTML(path, f, value) {
  const id = "x:" + path;
  const type = f.t || T.text;
  const common = `id="${esc(id)}" data-path="${esc(path)}" `;
  let input;
  if (type === "note") {
    return `<div class="f--wide"><p class="note">${esc(f.note || "")}</p></div>`;
  }
  if (type === T.area) {
    input = `<textarea ${common}>${esc(value ?? "")}</textarea>`;
  } else if (type === "projectlinks") {
    const links = site.projectLinks || {};
    input = cvnProjects.length ? `<div class="stars" data-path="${esc(path)}">
      <input type="search" class="field links__q" placeholder="Filtrar por título, programa o financiador">
      <div class="stars__list">${cvnProjects.map((pr) => {
        const val = links[pr.id] || "";
        const hidden = !val;
        return `<label class="linkrow${hidden ? " is-hidden" : ""}"
            data-text="${esc((pr.title + " " + (pr.program || "") + " " + (pr.funder || "")).toLowerCase())}">
          <span class="linkrow__t">${esc(pr.title)}<em>${esc([pr.start, pr.program || pr.funder].filter(Boolean).join(" · "))}</em></span>
          <input type="url" class="field" data-link="${esc(pr.id)}" value="${esc(val)}" placeholder="https://">
        </label>`;
      }).join("")}</div>
    </div>` : `<p class="note">No se ha encontrado data/cvn.json.</p>`;
  } else if (type === "featured") {
    input = `<div class="stars">
      <input type="search" id="star-q" class="field" placeholder="Buscar entre ${cvnProjects.length} proyectos" value="${esc(starQuery)}">
      <div class="stars__list" id="star-list">${starList()}</div>
      <input type="hidden" data-path="${esc(path)}">
    </div>`;
  } else if (type === "select") {
    input = `<select ${common}>${(f.options || []).map((o) =>
      `<option value="${esc(o.value)}"${String(value) === o.value ? " selected" : ""}>${esc(o.label)}</option>`).join("")}</select>`;
  } else if (type === "photo") {
    const src = photoData ? photoData.dataUrl : value || "";
    input = `<div style="display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap">
      ${src ? `<img src="${esc(src)}" alt="" style="width:110px;border:1px solid var(--line-strong);border-radius:3px">` : ""}
      <div style="flex:1 1 220px">
        <input type="file" accept="image/*" id="${esc(id)}" name="photo-file" class="field" style="width:100%">
        <p class="note" style="margin:.4rem 0 0">Se reescala a 900 px de ancho y se sube como
        <code>assets/img/foto.jpg</code> al publicar.</p>
        <input type="hidden" data-path="${esc(path)}" value="${esc(value ?? "")}">
      </div></div>`;
  } else {
    input = `<input type="${type}" ${common} value="${esc(value ?? "")}"${type === T.pass ? ' autocomplete="new-password"' : ""}>`;
  }
  return `<div class="f${f.wide ? " f--wide" : ""}">
    <label for="${esc(id)}">${esc(f.l)}</label>${input}
    ${f.note ? `<p class="note" style="margin:.2rem 0 0">${esc(f.note)}</p>` : ""}
  </div>`;
}

function repeatHTML(block) {
  const list = get(site, block.path) || [];
  const rows = list.map((item, i) => `
    <div class="rep" data-index="${i}">
      <div class="rep__bar">
        <strong>${esc(block.label(item))}</strong>
        <button class="btn btn--ghost" type="button" data-del="${block.path}:${i}">Quitar</button>
      </div>
      <div class="grid2">
        ${block.item.map((f) => fieldHTML(`${block.path}.${i}.${f.k}`, f, get(site, `${block.path}.${i}.${f.k}`))).join("")}
      </div>
    </div>`).join("");
  return `${rows || '<p class="note">Todavía no hay entradas.</p>'}
    <div style="margin-top:.9rem"><button class="btn btn--ghost" type="button" data-add="${block.path}">Añadir</button></div>`;
}

function renderForm() {
  document.getElementById("form").innerHTML = SCHEMA.map((b) => `
    <fieldset>
      <legend>${esc(b.legend)}</legend>
      ${b.repeat ? repeatHTML(b) : `<div class="grid2">${b.fields.map((f) =>
        fieldHTML(`${b.path}.${f.k}`, f, f.k === "__token" ? sessionStorage.getItem("gh:token") || "" : get(site, `${b.path}.${f.k}`))).join("")}</div>`}
    </fieldset>`).join("");

  document.getElementById("status").textContent = site.__hasDraft ? "borrador local sin publicar" : "";
}

function readForm() {
  document.querySelectorAll("[data-path]").forEach((el) => {
    const path = el.dataset.path;
    if (path.endsWith("__token")) { sessionStorage.setItem("gh:token", el.value.trim()); return; }
    if (path === "featured.__pick") { site.featured = [...starred]; return; }
    if (path === "projectLinks.__links") {
      const out = {};
      el.querySelectorAll("[data-link]").forEach((inp) => {
        const v = inp.value.trim();
        if (v) out[inp.dataset.link] = v;
      });
      site.projectLinks = out;
      return;
    }
    let v = el.value;
    if (el.type === "number") v = v === "" ? 0 : Number(v);
    set(site, path, typeof v === "string" ? v.trim() : v);
  });
  if (photoData) site.identity.photo = photoData.dataUrl; // vista previa local
  site.updatedAt = new Date().toISOString().slice(0, 10);
}

function blank(block) {
  const obj = {};
  block.item.forEach((f) => set(obj, f.k, ""));
  return obj;
}

function flash(text, kind = "ok") {
  const el = document.getElementById("msg");
  el.className = "msg msg--" + kind;
  el.textContent = text;
  el.hidden = false;
}

/* --------------------------------------------- selector de destacados */

function starList() {
  const q = starQuery.toLowerCase();
  const list = cvnProjects.filter((p) =>
    starred.has(p.id) || !q || (p.title + " " + (p.program || "") + " " + (p.funder || "")).toLowerCase().includes(q));
  if (!list.length) return '<p class="note">Sin resultados.</p>';
  return list.slice(0, 120).map((p) => `
    <label class="star${starred.has(p.id) ? " star--on" : ""}">
      <input type="checkbox" data-star="${esc(p.id)}"${starred.has(p.id) ? " checked" : ""}>
      <span class="star__i" aria-hidden="true">${starred.has(p.id) ? "★" : "☆"}</span>
      <span class="star__t">${esc(p.title)}</span>
      <span class="star__m">${[p.start, p.program || p.funder].filter(Boolean).map(esc).join(" · ")}</span>
    </label>`).join("");
}

function repaintStars() {
  const box = document.getElementById("star-list");
  if (box) box.innerHTML = starList();
}

/* ------------------------------------------------------------------- foto */

async function shrink(file, maxW = 900) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
  return { dataUrl, base64: dataUrl.split(",")[1], mime: "image/jpeg" };
}

/* ---------------------------------------------------------------- GitHub */

const b64 = (str) => btoa(String.fromCharCode(...new TextEncoder().encode(str)));

async function gh(path, token, repo, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });
  if (!res.ok && res.status !== 404) throw new Error(`GitHub ${res.status}: ${(await res.json()).message || ""}`);
  return res.status === 404 ? null : res.json();
}

async function putFile(repo, branch, token, path, contentB64, message) {
  const existing = await gh(`contents/${path}?ref=${encodeURIComponent(branch)}`, token, repo);
  return gh(`contents/${path}`, token, repo, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: contentB64,
      branch,
      ...(existing && existing.sha ? { sha: existing.sha } : {})
    })
  });
}

async function publish() {
  readForm();
  const token = (sessionStorage.getItem("gh:token") || "").trim();
  const repo = site.settings?.repo?.trim();
  const branch = site.settings?.branch?.trim() || "main";
  if (!token || !repo) return flash("Faltan el repositorio o el token de acceso.", "warn");

  const btn = document.getElementById("publish");
  btn.disabled = true;
  try {
    if (photoData) {
      await putFile(repo, branch, token, "assets/img/foto.jpg", photoData.base64, "Actualizar foto de perfil");
      site.identity.photo = "assets/img/foto.jpg";
    }
    const payload = { ...site };
    delete payload.__hasDraft;
    await putFile(repo, branch, token, "data/site.json", b64(JSON.stringify(payload, null, 2)),
      "Actualizar contenido del sitio");
    photoData = null;
    clearDraft();
    site.__hasDraft = false;
    renderForm();
    flash("Publicado. GitHub Pages tarda entre uno y dos minutos en reconstruir la web.");
  } catch (err) {
    flash("No se ha publicado: " + err.message, "warn");
  } finally {
    btn.disabled = false;
  }
}

/* ------------------------------------------------------------- arranque */

document.getElementById("form").addEventListener("change", async (e) => {
  if (e.target.name === "photo-file" && e.target.files[0]) {
    photoData = await shrink(e.target.files[0]);
    readForm();
    renderForm();
    flash("Foto lista. Pulsa «Publicar en GitHub» para subirla.");
  }
});

document.getElementById("form").addEventListener("input", (e) => {
  if (e.target.id === "star-q") { starQuery = e.target.value; repaintStars(); }
});

document.getElementById("form").addEventListener("input", (e) => {
  if (!e.target.classList.contains("links__q")) return;
  const q = e.target.value.trim().toLowerCase();
  e.target.closest(".stars").querySelectorAll(".linkrow").forEach((row) => {
    const hasValue = Boolean(row.querySelector("[data-link]").value.trim());
    row.classList.toggle("is-hidden", q ? !row.dataset.text.includes(q) : !hasValue);
  });
});

document.getElementById("form").addEventListener("click", (e) => {
  const star = e.target.closest("[data-star]");
  if (star) {
    const id = star.dataset.star;
    if (starred.has(id)) starred.delete(id); else starred.add(id);
    setTimeout(repaintStars, 0);
    return;
  }
  const add = e.target.dataset.add;
  const del = e.target.dataset.del;
  if (add) {
    readForm();
    const block = SCHEMA.find((b) => b.path === add);
    (site[add] = site[add] || []).push(blank(block));
    renderForm();
  }
  if (del) {
    const [path, i] = del.split(":");
    readForm();
    site[path].splice(Number(i), 1);
    renderForm();
  }
});

document.getElementById("save").addEventListener("click", () => {
  readForm();
  const payload = { ...site };
  delete payload.__hasDraft;
  saveDraft(payload);
  site.__hasDraft = true;
  renderForm();
  flash("Borrador guardado en este navegador. Ábrelo con «Ver la web» para comprobarlo.");
});

document.getElementById("download").addEventListener("click", () => {
  readForm();
  const payload = { ...site };
  delete payload.__hasDraft;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "site.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("discard").addEventListener("click", async () => {
  clearDraft();
  photoData = null;
  site = await loadSite("../");
  renderForm();
  flash("Borrador descartado. Se muestra el contenido publicado.");
});

document.getElementById("publish").addEventListener("click", publish);

/* ------------------------------------------------- acceso con Google ---
 * No hay backend propio: el token que devuelve Google se verifica llamando
 * a su endpoint público (real verificación de firma, gratis, sin servidor).
 * Aviso: la decisión de "mostrar el formulario" ocurre en el navegador del
 * visitante. Es una barrera seria para cualquiera que llegue por curiosidad,
 * no una garantía criptográfica: quien manipule la consola del navegador
 * podría saltarla. Nada de eso permite publicar sin el token de GitHub. */

const ALLOWED_EMAIL = "jpritej@gmail.com";
// Client ID de tu propio proyecto en Google Cloud Console (no es secreto,
// es público por diseño). Sustituye este valor por el tuyo.
const GOOGLE_CLIENT_ID = "687457219394-7o9deuah4hpb6khm3ja6u14gcc2fgcka.apps.googleusercontent.com";

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("No se ha podido cargar Google Sign-In."));
    document.head.appendChild(s);
  });
}

async function verifyCredential(idToken) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) throw new Error("token inválido o caducado");
  const info = await res.json();
  if (info.aud !== GOOGLE_CLIENT_ID) throw new Error("token emitido para otra aplicación");
  if (info.email_verified !== "true" && info.email_verified !== true) throw new Error("correo no verificado por Google");
  if ((info.email || "").toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) throw new Error("cuenta no autorizada");
  return info;
}

function unlock() {
  document.getElementById("gate").hidden = true;
  document.getElementById("content").hidden = false;
}

async function onGoogleCredential(response) {
  const msg = document.getElementById("gate-msg");
  try {
    await verifyCredential(response.credential);
    sessionStorage.setItem("admin:authed", "1");
    unlock();
  } catch (err) {
    msg.hidden = false;
    msg.textContent = "Acceso denegado (" + err.message + ").";
  }
}

async function initGate() {
  if (sessionStorage.getItem("admin:authed") === "1") { unlock(); return; }
  if (GOOGLE_CLIENT_ID.startsWith("TU_CLIENT_ID")) {
    document.getElementById("gate-msg").hidden = false;
    document.getElementById("gate-msg").textContent =
      "Falta configurar el Client ID de Google en assets/js/admin.js (ver README).";
    return;
  }
  try {
    await loadGoogleScript();
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onGoogleCredential });
    google.accounts.id.renderButton(document.getElementById("g-signin-button"), {
      type: "standard", theme: "outline", size: "large", text: "signin_with", shape: "pill"
    });
  } catch (err) {
    document.getElementById("gate-msg").hidden = false;
    document.getElementById("gate-msg").textContent = err.message;
  }
}

initGate();

(async () => {
  site = await loadSite("../");
  try {
    const res = await fetch("../data/cvn.json", { cache: "no-cache" });
    if (res.ok) cvnProjects = (await res.json()).projects || [];
  } catch (_) { /* sin CVN se sigue pudiendo editar todo lo demás */ }
  try {
    const res = await fetch("../data/cvn.json", { cache: "no-cache" });
    if (res.ok) cvnProjects = (await res.json()).projects || [];
  } catch (_) { /* sin CVN se sigue pudiendo editar todo lo demás */ }
  starred = new Set(site.featured || []);
  state.lang = "es";
  renderForm();
})().catch((err) => flash("No se ha podido cargar data/site.json: " + err.message, "warn"));
