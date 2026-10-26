# PorqueMangaVoy

Extensión de navegador (Chrome / Edge / Brave / Firefox, Manifest V3) que recuerda por qué capítulo de manga o episodio de anime vas, **en cualquier web**.

## Qué hace (MVP 0.1)

- **Consultar**: abres el popup (o `Alt+M`) en la página que estés leyendo y te dice qué serie es, qué capítulo hay en la página y por cuál vas.
- **Estoy leyendo esto**: guarda la serie con el capítulo detectado (puedes corregir título, tipo y número antes).
- **Seguimiento automático**: a partir de ahí, cada vez que abres un capítulo/episodio posterior de esa serie se guarda solo, y el icono muestra un ✓. En páginas de series que sigues, el icono muestra el número por el que vas.
- **Varias webs para la misma serie**: «¿Ya la tienes guardada con otro nombre o en otra web?» vincula la página actual a una serie existente, y desde entonces esa web también se reconoce.
- **Manga y anime**: detecta «capítulo / chapter / cap / ch» y «episodio / episode / ep», y webs de anime conocidas (AnimeFLV, JKAnime, Crunchyroll, etc.).
- **Sincronización entre PCs**: los datos están en `chrome.storage.sync` (Chrome Sync / Firefox Sync), sin servidor propio.
- **AniList (opcional)**: conectas tu cuenta, vinculas cada serie con su ficha y el progreso se envía solo. También puedes importar tus listas «Leyendo / Viendo» de AniList.
- **Copia de seguridad**: exportar / importar JSON en Opciones.

## Instalar (modo desarrollador)

**Chrome / Edge / Brave**
1. Descomprime `porquemangavoy-0.1.0.zip`.
2. Ve a `chrome://extensions`, activa «Modo de desarrollador» y pulsa «Cargar descomprimida».
3. Elige la carpeta descomprimida (la que contiene `manifest.json`).

**Firefox (121+)**
1. Ve a `about:debugging#/runtime/this-firefox` → «Cargar complemento temporal…» y elige `manifest.json`.
2. Se borra al cerrar Firefox; para dejarla instalada hay que firmarla en addons.mozilla.org (gratis, puede ser «no listada»).

Para que se sincronice entre PCs en Chrome: inicia sesión con la misma cuenta y deja activada la sincronización de «Extensiones». Tip: si la cargas descomprimida en cada PC, el ID de la extensión puede ser distinto y Chrome **no** comparte el storage entre IDs distintos. La solución estable es publicarla (aunque sea como no listada) o añadir una `key` fija al manifest.

## Cómo detecta la serie y el capítulo

`lib/parser.js` combina:
1. **URL**: busca un segmento con `chapter-12`, `capitulo-12-5`, `ep-150`, `?chapter=`, o un número al final (`/ver/one-piece-1100`, `/one-piece/1100/`). El segmento anterior o el resto del texto es el *slug* de la serie (p. ej. `one-piece` o `manga-aa951409`).
2. **Título de la pestaña**, `og:title` y `<h1>`: quita el capítulo, el nombre de la web y palabras como «online / sub español».
3. **Reconocer una serie guardada**: primero por web + slug (estable aunque el título cambie), si no por título normalizado (sin acentos ni símbolos). Cada serie recuerda hasta 8 webs y 6 alias de título.

Las webs que usan IDs opacos por capítulo (MangaDex, TMO, MangaPlus) se reconocen por título.

`node test/parser.test.js` prueba la detección con URLs reales de varias webs.

## Decisiones (investigación de APIs)

| Servicio | API | Por qué |
|---|---|---|
| **AniList** | GraphQL pública, OAuth *implicit grant* (token de 1 año), sin secreto | ✅ Elegido para el MVP: funciona 100 % desde la extensión con `identity.launchWebAuthFlow`, sin servidor. |
| MyAnimeList | REST v2, OAuth2 con PKCE (`plain`), necesita Client ID y refrescar tokens | Siguiente paso: viable sin servidor, pero el token caduca al mes y su búsqueda de manga es peor. |
| Kitsu | JSON:API, login con usuario/contraseña | Descartado de momento: pedir la contraseña dentro de la extensión no es buena idea. |
| MangaUpdates | REST con login por usuario/contraseña | Ídem. |

Sincronización: `storage.sync` (100 KB, 512 elementos, 8 KB por elemento, 120 escrituras/min). Cada serie es un elemento propio, lo que da sitio para unas 300 series. Si algún día no basta, el plan B es usar AniList/MAL como fuente de verdad o un pequeño backend.

## Estructura

```
manifest.json        permisos y entradas (Chrome usa service_worker, Firefox usa scripts)
background.js        seguimiento automático al cargar pestañas + badge
lib/parser.js        detección de serie/capítulo/episodio (sin dependencias, testeable en Node)
lib/store.js         series en storage.sync, búsqueda y aprendizaje de webs/alias
lib/anilist.js       login OAuth, búsqueda, guardar progreso, importar lista
popup/               interfaz principal
options/             sincronización, copia de seguridad y AniList
test/                tests del parser
```

## Vinculación desde el popup (0.5.1)

**Subir a AniList** también funciona si todas las series están sin vincular. Envía las vinculadas y muestra las pendientes para elegir su ficha con búsqueda editable y portada. Cada selección vincula la serie y envía su progreso actual, conservando la protección frente a conflictos. Puedes posponerlo con **Ahora no**. Cada serie sin vincular tiene además su propio botón **Vincular y subir a AniList** en la biblioteca.

## Biblioteca, historial y protección de AniList (0.5.0)

- **Continuar leyendo** en cada serie abre el último capítulo guardado. Las series importadas sin URL muestran el botón desactivado hasta que abras un capítulo.
- Al guardar un avance automático aparece un aviso en el lector durante 12 segundos con **Deshacer**. Recupera el progreso y la URL anteriores. No permite deshacer por encima de avances posteriores. La detección corregida no vuelve a aplicarse automáticamente; puedes marcarla manualmente si lo deseas.
- Antes de cada envío se consulta AniList. Si allí el progreso es superior, se conserva y aparece un conflicto en **Mis series**. Puedes **Conservar AniList** o **Sobrescribir AniList**, con confirmación. Se comprueba de nuevo el progreso remoto al resolverlo. Una recuperación local puede dejar un conflicto pendiente si el avance ya se había enviado.
- La biblioteca muestra portadas de AniList, con icono de respaldo y filtros por tipo y estado. Las portadas se obtienen al vincular, importar o sincronizar.
- **Historial de lectura** por serie registra visitas y cambios de progreso, incluidos los manuales, automáticos e importados. Permite recuperar el progreso anterior a un cambio. Se conservan los últimos 100 registros por serie en este navegador; el historial no se sincroniza entre equipos ni se incluye en las copias JSON de series.

Pruebas: `node test/parser.test.js`, `node test/sync.test.js`, `node test/content.test.js` y `node test/i18n.test.js`. Las pruebas de AniList simulan su API.

## Navegación automática (0.4.0)

Con **Guardar automáticamente** activado, abrir un capítulo posterior de una serie guardada actualiza el progreso y lo envía a AniList si está vinculada y conectada. También detecta cambios sin recarga en URL, título, encabezado y selectores de capítulo/episodio. No necesitas abrir el popup. Pasar a otra página dentro del mismo capítulo no suma capítulos, y volver atrás no reduce el progreso. Se conserva el límite de seguridad de 100 capítulos por salto y no se avanza en series terminadas.

El observador se ejecuta en páginas HTTP/HTTPS y lee únicamente URL, título, metadatos del título, primer encabezado y selector de capítulo. Solo guarda progreso de series ya seguidas. Después de actualizar la extensión, recarga las pestañas de lectura para activar el observador. El navegador puede pedir acceso a los sitios para esta función. Si un lector no expone el número en esos datos, sigue disponible el marcado manual.

## Idiomas (0.3.0)

La interfaz está disponible en español e inglés. El modo automático utiliza español cuando el idioma de la interfaz del navegador es español (incluidas variantes como `es-ES` o `es-MX`); en los demás casos utiliza inglés. En **Opciones → Idioma** puedes elegir **Automático**, **Español** o **English**. La preferencia se guarda en el almacenamiento sincronizado del navegador y se aplica al abrir el popup. No cambia los títulos ni el progreso guardado de tus series.

El selector traduce Opciones, el popup, los mensajes y las fechas. La descripción de la extensión y del atajo en los ajustes del navegador siguen el idioma del navegador.

Validación del idioma: `node test/i18n.test.js`.

## Cambios en 0.2.0

- Reconoce nombres dentro del título, encabezado y slug de la URL, incluyendo fichas como `one-piece-s2` y títulos como `➤ Leer manga One Piece`. Compara palabras completas y distingue manga de anime; no elige entre coincidencias parciales empatadas.
- El popup muestra conexión de AniList, series sin vincular y envíos pendientes. Cada serie vinculada muestra la fecha del último envío confirmado o su error.
- «Sincronizar ahora» envía el progreso local de todas las series vinculadas a AniList; también hay un botón por serie. Para traer la lista de AniList sigue disponible la importación en Opciones.
- Los capítulos detectados se envían automáticamente, incluidos cambios de URL sin recarga. Los fallos se conservan y se reintentan al abrir otro capítulo o pulsar Sincronizar. Los envíos se procesan en orden y los estados en pausa se respetan.
- Nuevo icono de libro con marcador e iconos vectoriales de manga, anime y opciones.

Validación local: `node test/parser.test.js` y `node test/sync.test.js` (API de AniList simulada, sin modificar una cuenta real).

## Próximos pasos posibles

- MyAnimeList como segundo proveedor.
- Reglas específicas para webs concretas que fallen (se añaden en `parser.js`).
- Menú contextual «Marcar como leído» y avisos de nuevos capítulos.
- Publicar en Chrome Web Store / AMO para tener un ID fijo y sincronización estable.
