# Aural Marketing

Panel interno de Marketing de Aural. Tiene un menú lateral con 6 secciones: **Proyectos de diseño** y **Proyectos de video** (tableros Kanban), **Plan de contenidos**, **Calendario**, **Banco de imágenes** y **Proveedores & cotizaciones** (el módulo original, con todo lo que ya tenía: cotizaciones, pagos a contabilidad, comparación de precios). También hay un enlace directo a **Inventario**, que abre en otra pestaña tu app de inventario ya existente (`inventarioauralcol.netlify.app`), donde ya se gestionan los pendones en préstamo — por eso no se duplicó esa función aquí.

Es un sitio estático (HTML + CSS + JS, sin instalación ni build) que usa **Supabase** como base de datos, almacenamiento de archivos y sistema de usuarios (correo + contraseña).

## 1. Crear el backend en Supabase (una sola vez)

1. Entra a tu proyecto en [supabase.com](https://supabase.com) (o crea uno nuevo).
2. Ve a **SQL Editor** → **New query**, pega **todo** el contenido de [`schema.sql`](schema.sql) y dale **Run**. El archivo es seguro de ejecutar completo, de una sola vez, aunque ya hubieras corrido una versión anterior — cada bloque solo crea lo que falte. Esto crea las tablas de proveedores/cotizaciones y las nuevas de Marketing (`creative_projects`, `content_plan`, `calendar_events`, `image_bank`), la seguridad (solo usuarios con sesión iniciada pueden leer/escribir) y los buckets de almacenamiento `cotizaciones-files` y `banco-imagenes`.
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

- Cada persona inicia sesión con el correo y la contraseña que tú le creaste (ver sección anterior). El menú lateral de la izquierda permite moverse entre las secciones.

### Proyectos de diseño / Proyectos de video
Tablero Kanban con columnas **Por hacer → En proceso → Revisión → Terminado**. Cada tarjeta tiene nombre, descripción, responsable, fecha de entrega, prioridad y un enlace (a Canva, Drive, etc.). Puedes arrastrar las tarjetas entre columnas para cambiar su estado, o editarlas con el botón "Editar". Las fechas de entrega vencidas se resaltan en rojo y aparecen también en el Calendario.

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

Cada registro queda marcado con el correo de quién lo creó y quién lo editó por última vez.

## Si ya tenías el sitio funcionando (actualización a "Aural Marketing")

Esta versión agrega todo el panel de Marketing (proyectos, contenidos, calendario, banco de imágenes) sin tocar lo que ya tenías en Proveedores & cotizaciones. Para que funcione con los datos que ya tienes en Supabase:

1. Entra a Supabase → **SQL Editor** → **New query**.
2. Pega **todo** el contenido de [`schema.sql`](schema.sql) (el archivo completo, no solo un bloque) y dale **Run**. Está hecho para poder correrse entero las veces que sea necesario: no borra ni cambia nada de lo que ya tenías, solo crea las tablas y el bucket nuevos si no existen.
3. Reemplaza en tu repositorio de GitHub (o arrástralos de nuevo si lo subiste así) los archivos `index.html`, `app.js`, `styles.css`, `README.md` y `schema.sql` por los nuevos. `supabase-config.js` y `aural-logo.png` no cambiaron.
