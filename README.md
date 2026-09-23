# javierprieto.me

Web académica estática, bilingüe (ES/EN), con las publicaciones y la trayectoria
tomadas de ORCID y el resto del contenido editable desde `/admin/`.

No hay build ni npm: HTML, CSS y módulos de JavaScript nativos. La única
dependencia externa es Chart.js, cargado por CDN.

## Proyectos, tesis y patentes: importar el CVN

```bash
python3 scripts/import_cvn.py ~/Descargas/cvn.pdf
```

Lee el CVN de FECYT y escribe `data/cvn.json` (proyectos, patentes, tesis y
totales) y, dentro de `data/site.json`, las tesis doctorales, las patentes y los
indicadores de proyectos, financiación y dirección de trabajos. Se puede
reejecutar cada vez que actualices el CVN: sobrescribe lo importado y no toca el
resto del contenido. Necesita `pdftotext` (poppler-utils) o `pip install pypdf`.

El CVN no se sube al repositorio. Solo se sube lo extraído, que es lo que ya
consta en tu CV público.

De cada proyecto se guardan dos importes: `amountTotal` (presupuesto del proyecto
completo) y `amountOwn` (cuantía del subproyecto cuando el CVN la da, y si no el
total). Los totales no están escritos a mano en ningún sitio: se suman sobre los
proyectos de `data/cvn.json` cada vez que se pinta la página, así que el número de
proyectos y la financiación coinciden siempre entre portada, indicadores y la
página de proyectos. Los campos equivalentes de `/admin/` solo se usan si no hay
`data/cvn.json`.

## Proyectos destacados

Se marcan con la estrella en `/admin/`, sobre la lista real del CVN, y se guardan
en `site.json` como una lista de identificadores (`featured`). La portada los
saca de `data/cvn.json`, así que si cambia el importe o las fechas al reimportar,
la portada se entera sola. Para un proyecto que no esté en el CVN queda el bloque
«Proyectos destacados añadidos a mano».

Ningún contador está escrito a mano: proyectos, financiación, tesis, TFM, TFG y
patentes se cuentan sobre las listas de `data/cvn.json` (o de `site.json` si no
hay CVN importado) cada vez que se pinta la página.

## Docencia

Tiene pestaña propia: asignaturas por curso académico, tesis doctorales y
trabajos fin de estudios dirigidos, estos dos últimos importados del CVN.

Los trabajos defendidos que todavía no constan en el CVN se añaden a mano en
`data/extra-supervisions.json` (título, estudiante, año, tipo y universidad); el
importador los fusiona con los del CVN sin duplicar.

Debajo de las asignaturas va la sección de recursos educativos abiertos (REA):
portada, título, enlace a OER Commons, titulación e institución, coautores si
los hay, y la licencia tal como aparece en la propia diapositiva (insignia
"cc" + código, por ejemplo BY-NC-SA). No todos los REA corresponden a una
asignatura de la lista de arriba (algunos son de másteres que no estaban en
los datos de docencia); por eso cada uno lleva su propio contexto en vez de
intentar encajarlo bajo una fila concreta.

Las imágenes de portada están ya subidas en `assets/img/rea/`. El campo
«Portada» del admin no sube ficheros nuevos, solo apunta a uno: para cambiar
una imagen hay que subir el fichero al repositorio y actualizar la ruta.

Las asignaturas se editan en `/admin/` como texto, una por línea:

```
2026-27 | Grado en Ingeniería Informática / BSc in Computer Engineering | Programación II / Programming II | 101107 | Básica / Core
```

Los campos son curso académico, titulación, asignatura, código y carácter. La
barra separa castellano e inglés; si solo pones uno, vale para los dos idiomas.
Dejando la asignatura vacía se lista solo el programa, útil para la docencia de
doctorado. Quitar una asignatura es borrar su línea. En la web sale agrupada por
curso académico, con un desplegable que cambia el listado al vuelo.

## Al actualizar el sitio

Los ficheros CSS y JavaScript llevan `?v=N` para que el navegador no sirva la
versión antigua. Cuando cambies código, sube ese número en `index.html`,
`admin/index.html` y en las líneas `import` de `assets/js/app.js` y
`assets/js/admin.js`. Si ves la web como estaba, recarga forzando caché
(Ctrl+Shift+R, o Cmd+Shift+R en Mac).

## Acceso a la administración

`/admin/` pide iniciar sesión con una cuenta de Google concreta antes de mostrar
el formulario. Para activarlo:

1. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   crea un proyecto (o usa uno existente) y una credencial **OAuth client ID**,
   tipo *Web application*.
2. En «Authorized JavaScript origins» añade `https://javierprieto.me` y, si
   pruebas en local, `http://localhost:8000`.
3. En la pantalla de consentimiento OAuth, modo *Testing*, añade tu propio
   correo de Google como *test user* (con esto basta, no hace falta publicar
   ni verificar la app).
4. Copia el Client ID (termina en `.apps.googleusercontent.com`) y pégalo en
   `assets/js/admin.js`, en la constante `GOOGLE_CLIENT_ID`. Cambia también
   `ALLOWED_EMAIL` si algún día quieres autorizar otra cuenta.

Aviso importante sobre qué protege esto y qué no: la comprobación se hace en el
navegador de quien visita la página, verificando el token contra el endpoint
público de Google (gratis, sin servidor propio). Es una barrera seria para
cualquier visitante casual y no expone ningún secreto que se pueda leer en el
código, a diferencia de una contraseña. No es una garantía criptográfica: nada
impide del todo que alguien muy decidido manipule la consola del navegador
para saltarse la comprobación. Lo que sí es cierto siempre, con o sin este
cerrojo: nadie puede publicar cambios reales sin el token de GitHub, que solo
existe en tu sesión y nunca se guarda en ningún fichero.

## Divulgación

Pestaña con las apariciones en medios, filtrable por tema. Cada tarjeta lleva
como identidad visual, en este orden de preferencia: un vídeo de YouTube (con
miniatura estática y botón de reproducir; el `<iframe>` real solo se carga si
alguien pulsa), una foto propia, o si no hay ninguna de las dos, el icono del
tema. Al pulsar una tarjeta se abre una ficha flotante con el resumen y
enlaces de anterior/siguiente dentro del filtro activo.

Cada entrada nunca reproduce el texto del medio: solo titular, medio, fecha,
tema, tu propio resumen de dos o tres líneas y un enlace de «leer en...».
Cuando no hay hemeroteca disponible (una noticia de un periódico que cerró, o
un recorte que no está en ningún sitio), el campo enlace se deja vacío y la
ficha no muestra botón de salida.

Se edita en `/admin/`, bloque «Divulgación y medios»: título, medio, fecha,
enlace, tema, y opcionalmente un ID de vídeo de YouTube o una foto propia.

Dos recortes de prensa se alojan en el propio sitio, no como reproducción
completa de un periódico sino recortados a lo mínimo necesario:

- `assets/press/orsi-2009-wifi.pdf`: solo las dos páginas del artículo, de
  un boletín oficial de 36 páginas de la Junta de Castilla y León pensado
  para difusión gratuita.
- `assets/img/press/ieee-spectrum-2020.jpg`: tu propia foto, la que
  ilustra el artículo de IEEE Spectrum.

Las otras entradas con periódico desaparecido o sin hemeroteca (El Día de
Salamanca, el PDF de INNOVADORES) van sin enlace y sin alojar el documento
completo, solo cita y resumen.

## Correo sin texto plano

El correo no se guarda entero en ningún fichero: `identity.emailUser` y
`identity.emailHost` van por separado en `data/site.json`, y solo se juntan en
el navegador de quien visita la página. Es para dificultar el barrido masivo de
direcciones (los recolectores de spam suelen leer el HTML o el JSON en bruto sin
ejecutar JavaScript); no es infalible contra algo dirigido a propósito, pero
corta la inmensa mayoría del ruido automático. Se edita en `/admin/` como dos
campos separados.

## Trayectoria

Sale de los `employments` y `educations` de ORCID, no de LinkedIn. ORCID guarda un
registro por cargo, así que la web agrupa por institución y enseña el cargo actual
con el periodo completo. En `/admin/`, apartado «Presentación», se puede cambiar a
que liste debajo los cargos anteriores. Si un cargo está mal escrito, se corrige en
orcid.org y la web se actualiza sola.

## Redes y perfiles

La lista de redes vive en `networks` dentro de `data/site.json` y se edita desde
`/admin/`: nombre visible, enlace e icono. Para añadir una red nueva en el futuro
basta con pulsar «Añadir» y elegir uno de los iconos disponibles (`orcid`,
`scholar`, `wos`, `cienciavitae`, `scopus`, `dialnet`, `researchgate`,
`openalex`, `linkedin`, `github`, `institution`, `web`). Si quieres un icono que
no está, se añade una entrada en `assets/js/icons.js` y aparece en el desplegable.

## Verla en local

No hace falta Apache ni PHP. Sí hace falta un servidor, porque abrir `index.html`
con doble clic bloquea la carga de `data/site.json` por política de origen.

```bash
cd javierprieto.me
python3 -m http.server 8000
```

Luego abre `http://localhost:8000/` y la administración en `http://localhost:8000/admin/`.
Alternativas equivalentes: `npx serve`, `php -S localhost:8000`, la extensión
Live Server de VS Code.

## Subirla a GitHub Pages con dominio propio

Sí, no necesitas hosting. GitHub Pages sirve sitios estáticos gratis y con HTTPS.

1. Crea el repositorio (público) y sube estos ficheros a la rama `main`.
2. Settings → Pages → Source: *Deploy from a branch*, rama `main`, carpeta `/ (root)`.
3. Settings → Pages → Custom domain: `javierprieto.me`. El fichero `CNAME` ya está
   en el repositorio, así que puedes dejarlo tal cual.
4. En el panel DNS de tu registrador:

   | Tipo  | Nombre | Valor |
   |-------|--------|-------|
   | A     | `@`    | `185.199.108.153` |
   | A     | `@`    | `185.199.109.153` |
   | A     | `@`    | `185.199.110.153` |
   | A     | `@`    | `185.199.111.153` |
   | CNAME | `www`  | `TU-USUARIO.github.io` |

5. Espera a que propague (minutos u horas) y marca *Enforce HTTPS*.

Alternativas con el mismo enfoque estático: Cloudflare Pages o Netlify. Solo
necesitarías un servidor real si quisieras una administración con contraseña
propia y guardado en servidor.

## Administración

`/admin/` es una página más del sitio: cualquiera puede abrirla, pero sin token
de GitHub no puede guardar nada. Tres formas de trabajar:

- **Guardar borrador**: queda en el navegador y la web lo muestra solo a ti. Útil
  para probar antes de publicar.
- **Descargar site.json**: te bajas el fichero y lo subes al repositorio a mano.
- **Publicar en GitHub**: escribe `data/site.json` (y `assets/img/foto.jpg` si has
  cambiado la foto) directamente en el repositorio mediante la API.

Para publicar necesitas un *fine-grained personal access token* con permiso
`Contents: Read and write` limitado a este repositorio. Se guarda en
`sessionStorage`, es decir, se borra al cerrar la pestaña. No lo escribas nunca
en ningún fichero del repositorio. Si el repositorio es público, quien abra
`/admin/` verá el formulario con tus datos ya publicados, nada más.

## De dónde sale cada dato

| Dato | Origen | Cómo se actualiza |
|------|--------|-------------------|
| Publicaciones, puestos, formación, proyectos financiados | API pública de ORCID | Automático, más copia diaria en `data/orcid-cache.json` |
| Citas, índice h, índice i10, citas por año | API de OpenAlex | Automático, más copia diaria en `data/openalex-cache.json` |
| Foto, afiliación, biografía, líneas, docencia, cargos editoriales, redes | `data/site.json` | A mano desde `/admin/` |
| Proyectos, financiación, tesis dirigidas, patentes | CVN de FECYT | `scripts/import_cvn.py` |

Las métricas bibliométricas salen de OpenAlex porque es gratis, sin clave y con
CORS abierto. En `/admin/` puedes cambiar la fuente a «manual» y teclear los
números de Google Scholar, que suelen ser más altos.

Tres fuentes que no se pueden ingerir, y por qué:

- **Google Scholar** no tiene API y bloquea el acceso automatizado.
- **Web of Science / ResearcherID**: desde que Publons se fundió en Web of Science
  no hay API pública. Las de Clarivate exigen clave y suscripción, y la que da
  índice h por investigador es de pago aparte.
- **CiênciaVitae** tiene API, pero las credenciales se conceden a sistemas CRIS
  previa solicitud. Además se alimenta de ORCID, así que aportaría poco.
- **Los portales de la USAL y de la Junta** no publican API abierta, y las
  páginas de tesis y financiaciones del portal de la USAL prohíben el acceso
  automatizado en su `robots.txt`. Lo mismo hace diaweb. Esos datos se pegan a
  mano en `/admin/`.

## Copia de ORCID

Para que la web cargue rápido y siga funcionando si ORCID no responde:

```bash
python3 scripts/fetch_orcid.py 0000-0001-8175-2201
python3 scripts/fetch_openalex.py 0000-0001-8175-2201 javierp@usal.es
```

Generan `data/orcid-cache.json` y `data/openalex-cache.json`. El workflow
`.github/workflows/update-data.yml` los repite cada noche y los confirma en el
repositorio si han cambiado.

## Estructura

```
index.html              portada y aplicación (#/, #/docencia, #/proyectos, #/publicaciones, #/indicadores)
admin/index.html        formulario de administración
assets/css/main.css     estilos y tokens de diseño
assets/js/store.js      datos del sitio, idioma y textos de interfaz
assets/js/orcid.js      cliente de la API de ORCID con caché
assets/js/app.js        enrutado y vistas
assets/js/admin.js      formulario, borrador local y publicación en GitHub
data/site.json          contenido editable (lo escribe la administración)
data/orcid-cache.json   copia de ORCID (lo escribe el script o el workflow)
data/cvn.json           proyectos, patentes, tesis y trabajos dirigidos del CVN
data/extra-supervisions.json  trabajos dirigidos que aún no están en el CVN
assets/js/openalex.js   métricas bibliométricas (citas, h, i10, serie anual)
assets/js/charts.js     gráficos con Chart.js, actualizados en caliente
assets/js/icons.js      iconos monocromo de las redes
scripts/fetch_orcid.py  descarga de ORCID sin dependencias
scripts/fetch_openalex.py  descarga de OpenAlex sin dependencias
scripts/import_cvn.py   importador del CVN de FECYT
CNAME                   dominio para GitHub Pages
```
