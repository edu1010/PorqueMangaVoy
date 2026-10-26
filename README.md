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

## Próximos pasos posibles

- MyAnimeList como segundo proveedor.
- Reglas específicas para webs concretas que fallen (se añaden en `parser.js`).
- Menú contextual «Marcar como leído» y avisos de nuevos capítulos.
- Publicar en Chrome Web Store / AMO para tener un ID fijo y sincronización estable.
