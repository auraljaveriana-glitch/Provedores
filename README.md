# Proveedores & cotizaciones — Aural

Página interna para registrar cotizaciones de proveedores, adjuntar el PDF/imagen de cada una, llevar el trámite de aprobación y pago con contabilidad (50% y saldo), y comparar precios entre proveedores.

Es un sitio estático (HTML + CSS + JS, sin instalación ni build) que usa **Supabase** como base de datos, almacenamiento de archivos y sistema de usuarios (correo + contraseña).

## 1. Crear el backend en Supabase (una sola vez)

1. Entra a tu proyecto en [supabase.com](https://supabase.com) (o crea uno nuevo).
2. Ve a **SQL Editor** → **New query**, pega todo el contenido de [`schema.sql`](schema.sql) y dale **Run**. Esto crea las tablas `providers` y `quotes`, la seguridad (solo usuarios con sesión iniciada pueden leer/escribir) y el bucket de almacenamiento `cotizaciones-files` para los archivos adjuntos.
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

- Cada persona inicia sesión con el correo y la contraseña que tú le creaste (ver sección anterior).
- **Cotizaciones**: registra cada cotización con su proveedor, valor, archivo adjunto y fechas de pago del 50% y del saldo. Al marcarla como aprobada, se despliegan los datos para el trámite con contabilidad (RUT, cuenta bancaria, fecha de envío y fecha de pago).
  - En cada pago (abono y saldo) puedes indicar el **valor realmente pagado** — por defecto sugiere el 50%, pero lo puedes cambiar cuando pagan un valor distinto.
  - En cada pago también puedes adjuntar la **foto o el PDF del comprobante** de ese pago (abono y saldo por separado), y luego verlo con el botón "Ver".
  - Puedes ir agregando **anotaciones** con fecha y autor a cada cotización en cualquier momento (incluso después de que ya se pagó), para dejar constancia de novedades, acuerdos o cambios.
- **Proveedores**: directorio con qué vende cada uno, contacto, RUT y cuenta bancaria.
- **Comparar**: busca un producto o servicio y compara lo que ofrece cada proveedor para eso mismo.
- **Descargar en CSV**: tanto en "Proveedores" como en "Cotizaciones" hay un botón para descargar un archivo CSV (se abre en Excel) con el RUT y las cuentas bancarias, o con los datos de pago de cada cotización.

Cada proveedor y cotización queda marcado con el correo de quién lo creó y quién lo editó por última vez.

## Si ya tenías el sitio funcionando (actualización)

Esta versión agrega valor pagado real, comprobantes de pago, anotaciones y descarga en CSV. Para que funcione con los datos que ya tienes en Supabase:

1. Entra a Supabase → **SQL Editor** → **New query**.
2. Abre [`schema.sql`](schema.sql) y copia solo el bloque final, bajo el título **"ACTUALIZACIÓN: valor realmente pagado y anotaciones"**.
3. Pégalo y dale **Run**. No borra ni cambia nada de lo que ya tenías, solo agrega las columnas nuevas.
4. Reemplaza en tu repositorio de GitHub los archivos `index.html`, `app.js` y `styles.css` por los nuevos.
