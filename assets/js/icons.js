/* Iconos monocromo (heredan currentColor) para las redes del perfil.
   Sistema deliberado: glifo dibujado donde la forma es reconocible y
   monograma tipográfico en el resto, para no reproducir mal logotipos ajenos.
   Añadir uno nuevo es añadir una entrada aquí y una opción en admin.js. */

const mono = (text, size = 8.5) =>
  `<text x="12" y="15.4" text-anchor="middle" font-family="IBM Plex Sans, sans-serif"
     font-size="${size}" font-weight="600" letter-spacing="-0.2" fill="currentColor">${text}</text>`;

const ICONS = {
  orcid: `<circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.5"/>${mono("iD", 8)}`,
  scholar: `<path d="M12 3.4 22 8.6 12 13.8 2 8.6z" fill="currentColor"/>
    <path d="M6.6 11.1v4.2c0 1.9 2.4 3.4 5.4 3.4s5.4-1.5 5.4-3.4v-4.2" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  wos: mono("WoS", 7),
  cienciavitae: mono("CV", 8),
  scopus: mono("Sc", 8),
  dialnet: mono("D", 10),
  researchgate: mono("RG", 8),
  openalex: mono("OA", 8),
  linkedin: `<rect x="2.8" y="2.8" width="18.4" height="18.4" rx="3.4" fill="none" stroke="currentColor" stroke-width="1.5"/>${mono("in", 8)}`,
  github: mono("GH", 8),
  institution: `<path d="M12 3.2 21 8H3z" fill="currentColor"/>
    <path d="M5.4 9.6v8.2M9.8 9.6v8.2M14.2 9.6v8.2M18.6 9.6v8.2M3 19.6h18" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  web: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z" fill="none" stroke="currentColor" stroke-width="1.4"/>`,
  mail: `<rect x="2.6" y="5" width="18.8" height="14" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="m3.6 6.6 8.4 6.2 8.4-6.2" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  doc: `<path d="M6 2.8h8l4 4v14.4H6z" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M14 2.8v4.2h4M8.6 12.6h6.8M8.6 16.2h6.8" fill="none" stroke="currentColor" stroke-width="1.4"/>`
};

/* Iconos temáticos (líneas de investigación y, con el mismo dibujo,
   identidad visual de las tarjetas de divulgación). ViewBox 0 0 48 48. */
const TOPIC_ICONS = {
  ia: `<circle cx="12" cy="14" r="4"/><circle cx="12" cy="34" r="4"/>
    <circle cx="27" cy="24" r="4"/><circle cx="41" cy="24" r="4"/>
    <path d="M16 14l8 8M16 34l8-8M31 24h6"/>`,
  blockchain: `<rect x="5" y="14" width="16" height="16" rx="4"/>
    <rect x="19" y="14" width="16" height="16" rx="4"/>
    <path d="M30 30l8 3v6c0 4-3 6-8 8-5-2-8-4-8-8v-6z"/>`,
  iot: `<rect x="15" y="15" width="18" height="18" rx="3"/><circle cx="24" cy="24" r="3"/>
    <path d="M24 15v-5M24 38v-5M15 24h-5M38 24h-5M18 15l-3-4M33 33l3 4M18 33l-3 4M33 15l3-4"/>`,
  quantum: `<path d="M24 6v4"/><path d="M18 10a9 9 0 0 1 12 0"/><path d="M14 10a15 15 0 0 1 20 0"/>
    <circle cx="24" cy="30" r="2.6"/><ellipse cx="24" cy="30" rx="15" ry="6"/>
    <ellipse cx="24" cy="30" rx="15" ry="6" transform="rotate(65 24 30)"/>`,
  metaverse: `<rect x="8" y="18" width="32" height="16" rx="6"/>
    <circle cx="18" cy="26" r="4"/><circle cx="30" cy="26" r="4"/>
    <path d="M8 24c-3 0-3 6 0 6M40 24c3 0 3 6 0 6"/><path d="M24 10l10 4-10 4-10-4z"/>`,
  ehealth: `<path d="M8 8v6M8 8h6M40 8v6M40 8h-6M8 40v-6M8 40h6M40 40v-6M40 40h-6"/>
    <path d="M6 24h8l3-8 5 16 4-12 3 4h13"/>`
};

export function topicIcon(key, size = 48) {
  const glyph = TOPIC_ICONS[key] || TOPIC_ICONS.ia;
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" stroke="currentColor"
    stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyph}</svg>`;
}

/* Insignia de licencia Creative Commons: el roundel "cc" reconocible más el
   código de la licencia en texto (BY-NC-SA…), con equivalente accesible. */
export function ccBadge(code) {
  const label = `Licencia Creative Commons ${code.replace(/^CC\s*/i, "")}`;
  return `<span class="cc-badge" role="img" aria-label="${label}">
    <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <text x="16" y="21" text-anchor="middle" font-family="IBM Plex Sans, sans-serif"
        font-size="13" font-weight="600" fill="currentColor">cc</text>
    </svg>
    <span>${code}</span>
  </span>`;
}

export const ICON_KEYS = Object.keys(ICONS);

export function icon(key) {
  const glyph = ICONS[key] || ICONS.web;
  return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${glyph}</svg>`;
}
