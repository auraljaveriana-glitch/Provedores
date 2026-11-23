# Aural Marketing

Panel interno de Marketing de Aural. Tiene un menú lateral con 6 secciones: **Proyectos de diseño** y **Proyectos de video** (tableros Kanban), **Plan de contenidos**, **Calendario**, **Banco de imágenes** y **Proveedores & cotizaciones** (el módulo original, con todo lo que ya tenía: cotizaciones, pagos a contabilidad, comparación de precios). También hay un enlace directo a **Inventario**, que abre en otra pestaña tu app de inventario ya existente (`inventarioauralcol.netlify.app`), donde ya se gestionan los pendones en préstamo — por eso no se duplicó esa función aquí.

Cada cuenta tiene un **rol** (Administrativo, Diseño, Video o Proveedores) que decide qué ve esa persona en el menú — ver "Asignar el rol de cada cuenta" más abajo.

Es un sitio estático (HTML + CSS + JS, sin instalación ni build) que usa **Supabase** como base de datos, almacenamiento de archivos y sistema de usuarios (correo + contraseña).

## 1. Crear el backend en Supabase (una sola vez)

1. Entra a tu proyecto en [supabase.com](https://supabase.com) (o crea uno nuevo).
2. Ve a **SQL Editor** → **New query**, pega **todo** el contenido de [`schema.sql`](schema.sql) y dale **Run**. El archivo es seguro de ejecutar completo, de una sola vez, aunque ya hubieras corrido una versión anterior — cada bloque solo crea lo que falte. Esto crea las tablas de proveedores/cotizaciones y las nuevas de Marketing (`creative_projects`, `content_plan`, `calendar_events`, `image_bank`), la seguridad por rol y los buckets de almacenamiento `cotizaciones-files`, `banco-imagenes` y `proyectos-archivos`.
3. Ve a **Project Settings → API Keys** y copia:
   - **Project URL**
   - **Publishable key** (`sb_publishable_...`) — nunca la **Secret key** (`sb_secret_...`), esa nunca va en el sitio.
4. Abre el archivo [`supabase-config.js`](supabase-config.js) de este proyecto y pega esos dos valores en lugar de los textos de ejemplo.

### Quién puede entrar — las cuentas las creas tú
El sitio ya NO tiene opción de "Crear cuenta": solo se puede iniciar sesión. Para que alguien del equipo entre, tú le creas la cuenta desde el panel de Supabase:

1. **Authentication → Users → Add user**.
2. Escribe su correo y una contraseña temporal (o marca "Auto Confirm User" para que no necesite confirmar por correo).
3. Comparte con esa persona su correo y contraseña para que inicie sesión — puede cambiarla después si agregas esa opción, o dásela ya definitiva.

Además, por seguridad, ve a **Authentication → Providers → Email** y desactiva **"Allow new users to sign up"** — así, aunque alguien intente registrarse por su cuenta (por ejemplo llamando directamente a la API), Supabase lo rechaza. El sitio ya no ofrece ese botón, pero esto cierra la puerta también a nivel de Supabase.

### Asignar el rol de cada cuenta (perfiles) — paso obligatorio

⚠️ **Importante:** después de correr `schema.sql`, **nadie va a poder usar la página** (ni siquiera tú) hasta que le asignes un rol a cada cuenta, incluida la tuya. En cuanto alguien inicia sesión sin tener un rol asignado, le aparece un aviso de "Tu cuenta no tiene un rol asignado" en vez del panel — es la señal de que falta este paso.

Hay 4 roles:

| Rol | Ve y puede usar |
|---|---|
| **admin** (Administrativo) | Todo: Proyectos de diseño, Proyectos de video, Plan de contenidos, Calendario, Banco de imágenes, Proveedores y el enlace a Inventario. Es el único que puede crear o borrar tarjetas de Proyectos de diseño/video. |
| **diseno** (Diseño) | Solo las tarjetas de **Proyectos de diseño** que tengan su nombre exacto en "Responsable" (las demás no las ve), más Plan de contenidos, Calendario y Banco de imágenes. No ve Proveedores ni Inventario. |
| **video** (Video) | Lo mismo que diseño, pero con **Proyectos de video**: solo ve las tarjetas asignadas a su nombre. |
| **proveedores** (Proveedores) | **Proveedores y cotizaciones** completo (puede crear y editar) + Inventario, más Plan de contenidos, Calendario y Banco de imágenes. No ve Proyectos de diseño ni de video. |

Para asignarle un rol a alguien:

1. Crea su cuenta como siempre (**Authentication → Users → Add user**).
2. En esa misma pantalla, haz clic sobre el usuario para abrir su detalle y copia su **User UID** (un código largo tipo `xxxxxxxx-xxxx-...`).
3. Ve a **Table Editor → profiles → Insert row** y llena:
   - `id`: el User UID que copiaste.
   - `email`: su correo (solo para que te sea fácil identificarlo ahí, no lo usa el sitio).
   - `full_name`: **para diseño y video, este nombre debe ser exactamente igual al que escribes en el campo "Responsable" de sus tarjetas** (ej. `Fredy Gómez`, tal cual, con tilde) — así el sistema sabe cuáles tarjetas son suyas. Para admin y proveedores no importa tanto, pero igual ponlo.
   - `role`: `admin`, `diseno`, `video` o `proveedores`.
4. Guarda. La próxima vez que esa persona inicie sesión (o recargue la página), ya va a ver solo lo que le corresponde.

No olvides crear tu propia fila con `role = admin` — si no, tú tampoco vas a poder entrar.

Esto no es solo "esconder botones": los permisos están puestos también en la base de datos (en `schema.sql`, FASE 4), así que aunque alguien sea curioso y mire el código del sitio, Supabase le va a negar el acceso a lo que no le corresponde a su rol.

## 2. Subir el proyecto a GitHub

Desde una terminal, en esta misma carpeta:

```bash
git init
git add .
git commit -m "Proveedores y cotizaciones Aural"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/aural-proveedores.git
git push -u origin main
```

(Reemplaza `TU-USUARIO` por tu usuario de GitHub, y crea antes el repositorio vacío en github.com si no existe.)

## 3. Publicar en Netlify

1. Entra a [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
2. Conecta tu cuenta de GitHub y elige el repositorio que acabas de subir.
3. Build command: (déjalo vacío) — Publish directory: `.` (la raíz).
4. Deploy. En unos segundos te da un link tipo `https://tu-sitio.netlify.app` — ese es el que compartes con el gerente y el equipo.

Cada vez que hagas cambios y los subas a GitHub (`git push`), Netlify vuelve a publicar automáticamente.

## Estructura del proyecto

```
index.html            La página (estructura)
styles.css            Estilos y colores de marca Aural
app.js                Toda la lógica (proveedores, cotizaciones, login, archivos)
supabase-config.js    Tus llaves de Supabase (edítalo, no lo compartas públicamente)
aural-logo.png        Logo real de Aural
schema.sql            Script para crear la base de datos en Supabase (se pega en Supabase, no lo usa el sitio)
```

Todos los archivos van sueltos en la raíz del repositorio (sin subcarpetas) — así funciona si subes el proyecto arrastrando los archivos directamente en la página de GitHub.

## Uso

- Cada persona inicia sesión con el correo y la contraseña que tú le creaste (ver sección anterior). El menú lateral solo muestra las secciones que le corresponden según su **rol** (ver "Asignar el rol de cada cuenta" arriba) — cada persona ve un menú distinto según sea Administrativo, Diseño, Video o Proveedores.

### Proyectos de diseño / Proyectos de video
Tablero Kanban con columnas **Por hacer → En proceso → Revisión → Terminado**. Cada tarjeta tiene nombre, descripción, responsable, fecha de entrega, prioridad y un enlace (a Canva, Drive, etc.). Se puede arrastrar las tarjetas entre columnas para cambiar su estado, o editarlas con el botón "Editar". Las fechas de entrega vencidas se resaltan en rojo y aparecen también en el Calendario.

Cada tarjeta también tiene dos campos de archivo, dentro del mismo formulario de "Editar proyecto":
- **Archivo de referencia / muestra**: si la solicitud vino del formulario público y la persona adjuntó una imagen o PDF de muestra, aparece aquí automáticamente (con su botón "Descargar"). Quien edita la tarjeta desde el panel también puede subir uno manualmente si hace falta.
- **Arte final**: en cuanto el diseñador o el editor de video terminan la pieza, abren la tarjeta y suben aquí el archivo final (imagen, PDF, video, zip, lo que sea) — queda guardado junto al proyecto y cualquiera con acceso a esa tarjeta puede descargarlo con el botón "⬇ Descargar arte final" que aparece también en la vista del tablero.

Solo **Administrativo** puede crear tarjetas nuevas o borrarlas (además de las que llegan solas por el formulario público de solicitudes). Quien tiene rol **Diseño** o **Video** solo ve, en su tablero correspondiente, las tarjetas donde "Responsable" sea exactamente su nombre — puede moverlas y editarlas, pero no ve el trabajo de sus compañeros ni puede crear tarjetas nuevas.

**Administrativo** además ve, arriba de cada tablero, una barra "Ver por responsable" con un botón por cada persona que tiene tarjetas asignadas (y cuántas tiene cada una, incluida "Sin asignar"). Al hacer clic en un nombre, el tablero se filtra para mostrar solo las tarjetas de esa persona; clic de nuevo (o en "Todos") para quitar el filtro. Esto es solo una vista para Administrativo — no cambia lo que ve cada diseñador o editor en su propio tablero.

### Tiempos de cada proyecto
Cada tarjeta ahora muestra cuánto tiempo lleva (si sigue en curso) o cuánto le tomó completarse (si ya está "Terminado"), calculado automáticamente desde que se creó. Mientras está en curso, también muestra cuánto tiempo lleva en su etapa actual (Por hacer, En proceso o Revisión) — útil para notar cuando algo se está quedando estancado.

Si una tarjeta se devuelve a una etapa anterior (por ejemplo, de Revisión otra vez a En proceso porque hubo que corregir algo), eso también queda registrado: la tarjeta muestra una etiqueta "↩ Reabierto", el tiempo "en esta etapa" se reinicia desde que volvió a entrar ahí, y el tiempo total que termina mostrando cuando por fin se marca como Terminado incluye esa vuelta atrás.

**Administrativo** tiene además un botón "📊 Ver tiempos" junto a la barra de "Ver por responsable", con un resumen de ese tablero (diseño o video por separado):
- El tiempo promedio que toma terminar una pieza, en general y por cada persona (con una barra para comparar a simple vista).
- Cuántas piezas se devolvieron a una etapa anterior en algún momento.
- El tiempo promedio que pasan las piezas en cada etapa del tablero (sumando todas las veces que una pieza pasó por ahí, si se devolvió más de una vez).
- Las piezas en curso que llevan más tiempo sin moverse de su columna actual — para detectar rápido qué se está demorando.

Esto se calcula a partir de un registro interno (`status_history`) que el sitio va guardando solo, cada vez que una tarjeta cambia de columna — no hay que llenar nada a mano. A las tarjetas que ya existían antes de este cambio se les puso un primer registro al correr el `schema.sql` más reciente, así que sus tiempos empiezan a contarse bien desde ahí en adelante.

### Plan de contenidos
Lista de publicaciones con red social, tipo de contenido, fecha y estado de publicación, responsable, el copy/texto y el enlace al diseño o video ya terminado. Se puede filtrar por red social, estado o buscar texto. Las fechas de publicación también aparecen en el Calendario.

### Calendario
Muestra los eventos que agregues manualmente **más** las fechas de entrega de los proyectos de diseño/video y las fechas de publicación del plan de contenidos — todo junto, sin tener que duplicar nada. Haz clic en un día para ver el detalle o agregar un evento nuevo en esa fecha.

### Banco de imágenes
Galería para subir y organizar imágenes de marketing (fotos de producto, piezas para redes, material impreso, etc.) con título y categoría. Haz clic en una imagen para verla en tamaño completo.

### Proveedores & cotizaciones
Es el módulo original, sin cambios en su funcionamiento:
- **Cotizaciones**: registra cada cotización con su proveedor, valor, archivo adjunto y fechas de pago del 50% y del saldo. Al marcarla como aprobada, se despliegan los datos para el trámite con contabilidad (RUT, cuenta bancaria, fecha de envío y fecha de pago).
  - En cada pago (abono y saldo) puedes indicar el **valor realmente pagado** — por defecto sugiere el 50%, pero lo puedes cambiar cuando pagan un valor distinto.
  - En cada pago también puedes adjuntar la **foto o el PDF del comprobante** de ese pago (abono y saldo por separado), y luego descargarlo con el botón "Descargar".
  - Puedes ir agregando **anotaciones** con fecha y autor a cada cotización en cualquier momento (incluso después de que ya se pagó), para dejar constancia de novedades, acuerdos o cambios.
  - En cada cotización se ve cuánto **falta por pagar**, y en la parte de arriba hay un resumen con el total que falta por pagar a todos los proveedores.
- **Proveedores**: directorio con qué vende cada uno, contacto, RUT y cuenta bancaria. A cada proveedor le puedes subir la **foto o el PDF del documento del RUT** y del **certificado bancario / comprobante de la cuenta**, y después descargarlos con el botón "Descargar".
- **Comparar**: busca un producto o servicio y compara lo que ofrece cada proveedor para eso mismo.
- **Descargar en CSV**: tanto en "Proveedores" como en "Cotizaciones" hay un botón para descargar un archivo CSV (se abre en Excel) con el RUT y las cuentas bancarias, o con los datos de pago de cada cotización.

### Inventario
El botón "Inventario" del menú lateral abre en una pestaña nueva tu app de inventario (`inventarioauralcol.netlify.app`), que ya tiene su propio manejo de existencias y de pendones en préstamo — no se rehízo aquí para no duplicar esa información en dos bases de datos distintas. Si prefieres que el inventario viva dentro de esta misma página, dímelo y lo integramos.

### Solicitar pieza — enlace público para toda la empresa
[`solicitar.html`](solicitar.html) es una página aparte, **sin inicio de sesión**, para que cualquier persona de Aural pida una pieza de diseño o un video. El enlace es la dirección del sitio + `/solicitar.html` (ej. `https://tu-sitio.netlify.app/solicitar.html`) — lo puedes copiar con el botón "🔗 Copiar enlace para solicitudes" que está arriba del tablero de Proyectos de diseño o de video, y compartirlo por donde quieras (correo, WhatsApp, intranet).

Quien llena el formulario pone su nombre, sede/área, qué necesita, una descripción, —si quiere— un archivo de muestra o referencia (imagen o PDF) y —si quiere— la fecha en que la necesita. Al enviarlo:
- Siempre se le avisa que la **entrega puede tardar hasta 2 días hábiles**; si no pide una fecha puntual, se le muestra esa fecha estimada (hoy + 2 días hábiles, sin contar sábados y domingos).
- La solicitud cae automáticamente como una tarjeta nueva en la columna "Por hacer" del tablero de **Proyectos de diseño** o de **Proyectos de video**, según lo que haya marcado, con una etiqueta "📩 Solicitud" y sin responsable asignado. Si adjuntó un archivo de muestra, queda guardado en la tarjeta como "Archivo de referencia".
- Como las solicitudes llegan sin responsable, solo **Administrativo** las ve apenas entran (el rol Diseño/Video de cada persona solo le muestra lo que ya tiene su nombre puesto). Administrativo abre la tarjeta y escribe el nombre del diseñador o editor en "Responsable" — el campo ya sugiere **Fredy Gómez** y **Estefanya Peña** — y recién ahí esa persona la ve en su propio tablero.
- Quien llena el formulario **no** puede ver, editar ni borrar ninguna tarjeta — solo puede crear la suya. Eso está garantizado desde la base de datos (política de seguridad en Supabase), no solo escondiendo botones en la pantalla.

Cada registro queda marcado con el correo de quién lo creó y quién lo editó por última vez (las solicitudes públicas, al no tener usuario, quedan marcadas con el nombre que la persona escribió en el formulario).

## Si ya tenías el sitio funcionando (actualización a "Aural Marketing")

Esta versión agrega todo el panel de Marketing (proyectos, contenidos, calendario, banco de imágenes, formulario público de solicitudes) sin tocar lo que ya tenías en Proveedores & cotizaciones. Para que funcione con los datos que ya tienes en Supabase:

1. Entra a Supabase → **SQL Editor** → **New query**.
2. Pega **todo** el contenido de [`schema.sql`](schema.sql) (el archivo completo, no solo un bloque) y dale **Run**. Está hecho para poder correrse entero las veces que sea necesario: no borra ni cambia nada de lo que ya tenías, solo crea las tablas, columnas (incluida `status_history`, para medir tiempos), los buckets (incluido `proyectos-archivos`, para los archivos de referencia y de arte final) y las políticas nuevas si no existen.
3. Reemplaza en tu repositorio de GitHub (o arrástralos de nuevo si lo subiste así) los archivos `index.html`, `app.js`, `styles.css`, `README.md` y `schema.sql` por los nuevos, y agrega los dos archivos nuevos `solicitar.html` y `solicitar.js`. `supabase-config.js` y `aural-logo.png` no cambiaron.
4. **No te saltes este paso:** esta versión agrega roles y permisos (ver "Asignar el rol de cada cuenta" arriba). Hasta que le pongas un rol a cada cuenta que ya existía — incluida la tuya — nadie va a poder usar el panel, solo verán el aviso de que falta asignarles un rol.
