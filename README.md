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

### Importante — quién puede crear cuenta
Por defecto, Supabase permite que cualquiera con el link se registre con su correo. Como aquí se maneja RUT y cuentas bancarias de proveedores, te recomendamos:
- Ir a **Authentication → Providers → Email** y, cuando ya tengan las cuentas del equipo creadas, desactivar "Allow new users to sign up".
- O crear tú mismo las cuentas del equipo desde **Authentication → Users → Add user**, en vez de dejar el registro abierto.

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

- Cada persona crea su cuenta con su correo y contraseña (pestaña "Crear cuenta" en la pantalla de entrada) o inicia sesión si ya la tiene.
- **Cotizaciones**: registra cada cotización con su proveedor, valor, archivo adjunto y fechas de pago del 50% y del saldo. Al marcarla como aprobada, se despliegan los datos para el trámite con contabilidad (RUT, cuenta bancaria, fecha de envío y fecha de pago).
- **Proveedores**: directorio con qué vende cada uno, contacto, RUT y cuenta bancaria.
- **Comparar**: busca un producto o servicio y compara lo que ofrece cada proveedor para eso mismo.

Cada proveedor y cotización queda marcado con el correo de quién lo creó y quién lo editó por última vez.
