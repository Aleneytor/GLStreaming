# Guía de despliegue: Supabase Free + Netlify + glcuenta.com

> Paso a paso para llevar GL Streaming de desarrollo local a producción con
> costo cero mensual. Supabase Free Tier para la base de datos + Netlify Free
> Tier para el frontend + dominio `glcuenta.com`.

**Tiempo estimado**: 30–45 minutos la primera vez.

---

## Paso 1 — Crear el proyecto Supabase en producción

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard) con tu cuenta.
2. Clic en **New project**.
3. Configura:
   - **Organization**: tu cuenta personal.
   - **Name**: `glstreaming` (o el que prefieras).
   - **Database password**: genera una fuerte y guárdala en tu gestor de contraseñas.
   - **Region**: elige la más cercana a Venezuela (recomendado: `São Paulo (sa-east-1)` o `US East (us-east-1)`).
   - **Pricing plan**: Free tier.
4. Clic en **Create project**. Espera ~2 minutos a que la base de datos se aprovisione.

---

## Paso 2 — Conectar la CLI local al proyecto Supabase hosted

1. En el dashboard de Supabase, ve a **Project Settings** (el engranaje junto al nombre del proyecto). Aquí verás el **Project ID** (ej. `aqsroqaohfnznnppzezr`). Apúntalo.
2. También en el dashboard, ve a **Project Settings > API** (o **Settings > Data API** según la versión). Ahí encontrarás las dos API keys:
   - **anon public**: un token larguísimo que empieza con `eyJ...` (seguro para el navegador)
   - **service_role**: otro token que también empieza con `eyJ...` (clave secreta total, NUNCA en el navegador)
3. La **Project URL** NO aparece como campo separado: se construye con el Project ID:
   ```
   https://<project-id>.supabase.co
   ```
   Por ejemplo, si tu Project ID es `aqsroqaohfnznnppzezr`, la URL es `https://aqsroqaohfnznnppzezr.supabase.co`.
4. En tu `.env.local` local, **crea una copia de respaldo** y luego reemplaza temporalmente las variables para apuntar al proyecto hosted:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://aqsroqaohfnznnppzezr.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ... (la service_role, NO la anon)
   ```
5. (Opcional) Linkea la CLI de Supabase al proyecto hosted (el `project-ref` es el Project ID):
   ```bash
   npx supabase link --project-ref aqsroqaohfnznnppzezr
   ```
5. **Aplica las migraciones** al proyecto hosted:
   ```bash
   npx supabase db push
   ```
   Esto sube todas las migraciones de `supabase/migrations/` (0001 a 0061) al proyecto hosted.
   **No uses `db:reset`** aquí — eso es solo para desarrollo local.
6. Verifica que las tablas existen: en el dashboard de Supabase, ve a **Table Editor** y confirma que ves `cuentas`, `unidades_inventario`, `suscripciones`, `clientes`, etc.

---

## Paso 3 — Crear los usuarios de negocio

1. Edita `scripts/crear-usuarios-prod.mjs`:
   - Cambia el email del admin por el tuyo real (ej. `alejandro@glcuenta.com` o tu correo personal).
   - Cambia la contraseña por una fuerte.
   - Descomenta y ajusta los revendedores que necesites.
2. Ejecuta el script (debe apuntar al proyecto hosted, ver paso 2):
   ```bash
   node --env-file=.env.local scripts/crear-usuarios-prod.mjs
   ```
3. Verifica en el dashboard de Supabase > **Authentication > Users** que los usuarios aparecen.
4. Vuelve a poner `.env.local` con los valores de desarrollo local (`http://127.0.0.1:54321`). La app en Netlify usará sus propias variables de entorno (no este archivo).

---

## Paso 4 — Migrar los datos de la base local a producción

Esto es **solo si ya tienes datos reales** (cuentas, ventas, clientes) en tu Supabase local que quieras conservar. Si empiezas desde cero, salta al paso 5.

### Opción A — Respaldo y restauración (recomendado)

1. Haz un dump de la base local:
   ```bash
   docker exec -t <supabase_db_container> pg_dump -U postgres -d postgres --no-owner --no-acl -f /tmp/dump.sql
   docker cp <supabase_db_container>:/tmp/dump.sql ./dump.sql
   ```
   El nombre del contenedor lo obtienes con `docker ps --filter "name=supabase_db"`.

2. Edita `dump.sql` y **quita/edita** estas líneas antes de restaurar en producción:
   - **NO incluyas** `CREATE SCHEMA public` (ya existe en el proyecto hosted).
   - Las migraciones ya crearon la estructura; solo necesitas los `INSERT` y las secuencias (`setval`).
   - Si usaste `supabase db push`, la estructura ya está — basta con los datos.

3. Restaura en el proyecto hosted. Desde el dashboard de Supabase, ve a **SQL Editor** y pega el contenido de `dump.sql` (solo las partes de datos, no la estructura). Alternativamente, usa psql:
   ```bash
   psql -h <project-id>.supabase.co -U postgres -d postgres -f dump.sql
   ```
   La contraseña es la que pusiste al crear el proyecto.

### Opción B — Reimportar desde el Excel

Si prefieres empezar limpio, usa la función de importación de la app (`/migracion`) una vez que la app esté corriendo en producción (paso 6). Esto recrea todo desde tu hoja de respaldo.

---

## Paso 5 — Configurar Netlify

1. Entra a [netlify.com](https://netlify.com) con tu cuenta (GitHub, GitLab o email).
2. Clic en **Add new site > Import an existing project**.
3. Conecta tu cuenta de GitHub/GitLab y selecciona el repositorio `GLStreaming`.
4. Netlify detectará automáticamente que es un proyecto Next.js (gracias al `netlify.toml` y al `@netlify/plugin-nextjs` en el `package.json` — espera, hay que instalarlo primero, ver abajo).
5. **⚠️ IMPORTANTE**: antes del primer deploy, instala el plugin de Netlify para Next.js:
   ```bash
   npm install -D @netlify/plugin-nextjs
   ```
   Esto ya está en `netlify.toml`, pero el paquete debe estar en `node_modules`.

6. Configura las **variables de entorno** en Netlify (Site settings > Environment variables). Añade **todas** estas. Las que dicen "solo servidor" NO deben marcarse como "available in the browser":

   | Variable | Valor | ¿Navegador? |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-id>.supabase.co` | ✅ Sí |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | La `anon public` key del dashboard de Supabase | ✅ Sí |
   | `SUPABASE_SERVICE_ROLE_KEY` | La `service_role` key del dashboard de Supabase | ❌ NO |
   | `GLS_ENCRYPTION_KEY` | **LA MISMA** clave de 64 hex de tu `.env.local` actual. ¡No la pierdas! | ❌ NO |
   | `KUANTO_SUPABASE_URL` | URL del proyecto Kuanto en Supabase (si usas tasa paralela real) | ❌ NO |
   | `KUANTO_SUPABASE_PUBLISHABLE_KEY` | Clave pública de Kuanto (si usas tasa paralela real) | ❌ NO |
   | `BCV_API_URL` | `https://bcvscrapper.vercel.app/api/bcv` (default) | ❌ NO |
   | `APP_TIMEZONE` | `America/Caracas` | ❌ NO |
   | `CSP_DIRECTIVES` | Ver sección CSP abajo | ❌ NO |

   **CSP_DIRECTIVES** para producción (ajusta el dominio de Supabase):
   ```
   default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://<project-id>.supabase.co https://bcvscrapper.vercel.app; font-src 'self' data:; frame-ancestors 'none';
   ```

7. Configurar el dominio `glcuenta.com` (DNS en Cloudflare, sin moverlo):

   **En Netlify:**
   - Ve a **Site settings > Domain management > Custom domains**.
   - Añade `glcuenta.com`.
   - Netlify te dará un subdominio temporal (ej. `glstreaming.netlify.app`). Toma nota de él.

   **En Cloudflare:**
   - Ve al panel DNS de `glcuenta.com`.
   - Añade un registro **CNAME**:  
     - Nombre: `@` (o `glcuenta.com`)  
     - Destino: `glstreaming.netlify.app` (el que te dio Netlify)  
     - Proxy: **Desactívalo** (nube gris, ⚠️ no naranja) — Let's Encrypt necesita ver el registro real para emitir el certificado.
   - Añade otro CNAME para `www`:  
     - Nombre: `www`  
     - Destino: `glstreaming.netlify.app`  
     - Proxy: también desactivado.
   - Guarda los cambios.

8. **Activar HTTPS en Netlify**: vuelve a Netlify > Domain management y espera a que el dominio se verifique. Netlify aprovisionará el certificado SSL automáticamente vía Let's Encrypt. Una vez que aparezca el candado verde, puedes **volver a activar el proxy de Cloudflare** (nube naranja) si quieres — Cloudflare usará el certificado de Netlify en modo "Full".

9. ⚠️ **Desactiva "Always Use HTTPS" en Cloudflare** si lo tienes activo: Netlify ya fuerza HTTPS, y la doble redirección puede causar bucles.

---

## Paso 6 — Primer deploy y smoke tests

1. Haz push de todos los cambios (incluyendo `netlify.toml` y `@netlify/plugin-nextjs`):
   ```bash
   git add -A
   git commit -m "feat(despliegue): configuracion de Netlify + Supabase hosted"
   git push
   ```
2. Netlify iniciará el build automáticamente. Ve a **Deploys** para seguir el progreso.
3. Cuando termine, abre `https://glcuenta.com` (o la URL temporal de Netlify tipo `https://<site>.netlify.app`).

### Smoke tests (verificar que todo funciona)

- [ ] Login con el admin (correo y contraseña del paso 3).
- [ ] Login con un revendedor.
- [ ] El dashboard carga las KPI y las suscripciones.
- [ ] Inventario por plataforma carga las cuentas.
- [ ] Venta rápida (si hay datos).
- [ ] Renovación y cobro.
- [ ] Finanzas: Caja, Cobros, Egresos, Cierre, Tasas.
- [ ] Tasa BCV se obtiene correctamente.
- [ ] Tasa paralela (si Kuanto está configurado).
- [ ] Portal del revendedor: solo ve sus ventas.
- [ ] Cifrado: las credenciales de cuentas se descifran correctamente (`GLS_ENCRYPTION_KEY` es la correcta).
- [ ] WhatsApp / teléfonos sin enlaces automáticos en iOS.
- [ ] Modo oscuro "dim" intacto.
- [ ] PWA: el navegador ofrece "Instalar app" (iconos y manifest).

---

## Paso 7 — Rotar secreto de Kuanto (pendiente)

El secreto `sb_secret_…` de Kuanto está expuesto en el historial de git del repo público `github.com/Aleneytor/Kuanto-App`. Antes de conectar la tasa paralela real:

1. Rota el secreto en el proyecto Kuanto (Supabase > Project Settings > API > JWT Secret).
2. Purga el historial de git de ese repo (`git filter-branch` o `bfg`).
3. Actualiza `KUANTO_SUPABASE_PUBLISHABLE_KEY` en las variables de entorno de Netlify.

---

## Variables de entorno para copiar y pegar en Netlify

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key del dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service_role key del dashboard>
GLS_ENCRYPTION_KEY=<64 caracteres hex, la misma de .env.local>
KUANTO_SUPABASE_URL=
KUANTO_SUPABASE_PUBLISHABLE_KEY=
BCV_API_URL=https://bcvscrapper.vercel.app/api/bcv
APP_TIMEZONE=America/Caracas
CSP_DIRECTIVES=default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://<project-id>.supabase.co https://bcvscrapper.vercel.app; font-src 'self' data:; frame-ancestors 'none';
```

---

## Notas importantes

- **`GLS_ENCRYPTION_KEY` es irremplazable**: si se pierde, las credenciales cifradas (AES-256-GCM) de las cuentas de streaming no se pueden descifrar nunca. Guárdala en un gestor de secretos (Bitwarden, 1Password). Si usas la misma clave que en desarrollo, los datos cifrados migrados funcionarán.
- **Supabase free tier se pausa tras 1 semana de inactividad**: con uso diario no hay problema.
- **Cold starts en Netlify**: la primera carga tras inactividad puede tardar 1–3s. Las cargas siguientes son instantáneas.
- **Límites del free tier**: 500 MB de BD (holgadísimo), 5 GB de ancho de banda/mes, 300 min de build/mes. Todo más que suficiente para este caso de uso.