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

export const ICON_KEYS = Object.keys(ICONS);

export function icon(key) {
  const glyph = ICONS[key] || ICONS.web;
  return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${glyph}</svg>`;
}
