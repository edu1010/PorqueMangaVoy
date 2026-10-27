# Privacy Policy — PorqueMangaVoy

*Last updated: 27 October 2026* · [Español más abajo](#política-de-privacidad--porquemangavoy)

PorqueMangaVoy is a browser extension that remembers which manga chapter or anime episode you are on. This policy explains what data it handles and why.

## Summary

- No account, no ads, no analytics, no tracking.
- The developer does not run any server and never receives your data.
- Your data is stored in your own browser and, if enabled, in your browser's sync service.
- Data is only sent to AniList if you choose to connect your AniList account.
- Your data is never sold or shared with anyone else.

## What data the extension handles

**Page information (on http/https pages).** To detect a series and its chapter or episode number, the extension reads only the page URL, the page title, the `og:title` meta tag, the first heading and the chapter/episode selector of the page. It does not read any other page content, form fields, passwords or keystrokes. Progress is only saved automatically for series you have chosen to follow.

**Your reading list.** For each series you follow, the extension stores its title and alternative titles, type (manga or anime), current chapter or episode, status, the websites and URL slugs where you read it, the URL of the last chapter, and, if linked, its AniList ID and cover image URL.

**Reading history.** A local log of the last 100 visits and progress changes for each series, so you can undo mistakes.

**Settings.** Language and other preferences.

**AniList connection (optional).** If you connect AniList, the extension stores your AniList access token and your AniList user ID and name.

## Where the data is stored

- Your reading list and settings are stored in `chrome.storage.sync`. If you are signed in to your browser with sync enabled, your browser provider (for example Google for Chrome, or Mozilla for Firefox) syncs it between your devices under their own privacy policy.
- Reading history, the AniList token and sync status are stored only on your device in `chrome.storage.local`.
- You can export your list as a JSON file. That file stays wherever you save it.

## Data sent to third parties

Only if you connect your AniList account, the extension communicates with AniList (`anilist.co` and `graphql.anilist.co`) to:

- sign you in through AniList's own login page (OAuth);
- search for series by title so you can link them;
- read and update your progress and status in your AniList lists;
- import your "Reading" and "Watching" lists and cover images.

AniList's handling of this data is covered by the [AniList privacy policy](https://anilist.co/terms). No other third party receives any data.

## Your control

- Disconnect AniList at any time from the Options page; this deletes the stored token.
- Delete individual series from the popup, or all data by removing the extension.
- Export your data at any time from the Options page.

## Changes

If this policy changes, the new version will be published at this same address with a new date.

## Contact

Questions or requests: open an issue at <https://github.com/edu1010/PorqueMangaVoy/issues>.

---

# Política de privacidad — PorqueMangaVoy

*Última actualización: 27 de octubre de 2026*

PorqueMangaVoy es una extensión de navegador que recuerda por qué capítulo de manga o episodio de anime vas. Esta política explica qué datos trata y para qué.

## Resumen

- Sin cuenta, sin anuncios, sin analíticas y sin rastreo.
- El desarrollador no tiene ningún servidor y nunca recibe tus datos.
- Tus datos se guardan en tu propio navegador y, si lo tienes activado, en su servicio de sincronización.
- Solo se envían datos a AniList si decides conectar tu cuenta de AniList.
- Tus datos nunca se venden ni se comparten con nadie más.

## Qué datos trata la extensión

**Información de la página (en páginas http/https).** Para detectar la serie y el número de capítulo o episodio, la extensión lee solo la URL, el título de la página, la etiqueta `og:title`, el primer encabezado y el selector de capítulo o episodio. No lee ningún otro contenido de la página, ni formularios, contraseñas o pulsaciones de teclas. El progreso solo se guarda automáticamente en las series que has decidido seguir.

**Tu lista de lectura.** De cada serie que sigues se guarda su título y títulos alternativos, el tipo (manga o anime), el capítulo o episodio actual, el estado, las webs y fragmentos de URL donde la lees, la URL del último capítulo y, si está vinculada, su ID de AniList y la URL de su portada.

**Historial de lectura.** Un registro local de las últimas 100 visitas y cambios de progreso de cada serie, para poder deshacer errores.

**Ajustes.** Idioma y otras preferencias.

**Conexión con AniList (opcional).** Si conectas AniList, se guarda tu token de acceso de AniList y tu ID y nombre de usuario de AniList.

## Dónde se guardan

- Tu lista y tus ajustes se guardan en `chrome.storage.sync`. Si has iniciado sesión en el navegador con la sincronización activada, el proveedor del navegador (por ejemplo Google en Chrome o Mozilla en Firefox) los sincroniza entre tus dispositivos según su propia política de privacidad.
- El historial, el token de AniList y el estado de sincronización se guardan solo en tu dispositivo, en `chrome.storage.local`.
- Puedes exportar tu lista a un archivo JSON, que se queda donde tú lo guardes.

## Datos que se envían a terceros

Solo si conectas tu cuenta de AniList, la extensión se comunica con AniList (`anilist.co` y `graphql.anilist.co`) para:

- iniciar sesión mediante la propia página de acceso de AniList (OAuth);
- buscar series por título para vincularlas;
- leer y actualizar tu progreso y estado en tus listas de AniList;
- importar tus listas «Leyendo» y «Viendo» y las portadas.

El tratamiento de estos datos por parte de AniList se rige por la [política de privacidad de AniList](https://anilist.co/terms). Ningún otro tercero recibe datos.

## Tu control

- Desconecta AniList cuando quieras desde Opciones; se borra el token guardado.
- Borra series concretas desde el popup, o todos los datos desinstalando la extensión.
- Exporta tus datos cuando quieras desde Opciones.

## Cambios

Si esta política cambia, la nueva versión se publicará en esta misma dirección con una fecha nueva.

## Contacto

Dudas o solicitudes: abre una incidencia en <https://github.com/edu1010/PorqueMangaVoy/issues>.
