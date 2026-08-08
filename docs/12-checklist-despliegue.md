# Checklist de despliegue a producción

> Guía práctica para llevar GL Streaming de desarrollo local (Supabase Docker) a
> un entorno de producción. No sustituye a `docs/03-arquitectura-y-seguridad.md`
> ni a las decisiones de dominio (`docs/01-alcance-y-reglas.md`): esto es el
> "qué hacer y en qué orden" antes de apretar el botón.
>
> Estado: **borrador de sesión 2026-08-08** — la app aún se despliega en
> desarrollo local; este checklist se actualiza a medida que se decide el
> destino final (Supabase Hosted vs VPS).

## 0. Antes de empezar

- [ ] Docker Desktop corriendo (solo para validar localmente).
- [ ] Confirmar respaldo de la base operativa si hay datos reales que conservar
      (`npm run db:reset` es DESTRUCTIVO: migraciones + seed + recrea usuarios).
- [ ] Decidir el destino: **Supabase Hosted** (gestionado, RLS listo, sin
      mantenimiento de Postgres) vs **VPS propio** (más control, más trabajo).
      La arquitectura ya está lista para ambos: migraciones numeradas, RLS en
      toda tabla y `service_role` solo en el servidor.

## 1. Validación completa antes de desplegar

```bash
npm run typecheck   # tsc --noEmit
npm test            # Vitest (213 unitarias)
npm run build       # Next.js build de producción
```

- [ ] Las 25/25 suites SQL en verde contra PostgreSQL real (no solo que compile):
      ver `supabase/tests/` y la instrucción de ejecución de `AGENTS.md`.
- [ ] `npx supabase status` para confirmar migraciones aplicadas y anotar claves
      de entorno.

## 2. Variables de entorno (producción)

Plantilla: [`.env.example`](../.env.example). Mapear en el proveedor elegido:

| Variable | Dónde vive | Nota |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente + servidor | URL del proyecto Supabase de producción |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente + servidor | clave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor** | nunca en variables `NEXT_PUBLIC_*` |
| `GLS_ENCRYPTION_KEY` | **solo servidor** | **CRÍTICA**: si se pierde, los secretos cifrados (credenciales de cuentas, tarjetas) no se pueden descifrar jamás. Respaldarla en un gestor de secretos. |
| `KUANTO_SUPABASE_URL` | servidor | fuente de tasa paralela |
| `KUANTO_SUPABASE_PUBLISHABLE_KEY` | servidor | hasta rotar el secreto expuesto, dejarla vacía (datos simulados) |
| `BCV_API_URL` | servidor | fuente BCV (default ya en el código) |
| `APP_TIMEZONE` | servidor | `America/Caracas` (default) |

- [ ] La clave `GLS_ENCRYPTION_KEY` de producción NO debe ser la de desarrollo
      si ya hay secretos cifrados con la de desarrollo... **o al revés**: si hay
      datos reales cifrados con una clave, producción debe usar ESA misma clave o
      los secretos no descifrarán. Definir la política antes de migrar datos.

## 3. Base de datos (Supabase)

- [ ] Aplicar migraciones al proyecto de producción (`npx supabase link` +
      `npx supabase db push`, o el flujo CI del proyecto).
- [ ] Verificar RLS activo y roles/grants en producción (`supabase/tests/rls.sql`
      adaptado al entorno).
- [ ] Crear los usuarios de negocio reales (admin + revendedores) en
      `auth.users` con los roles correctos (`public.usuarios.rol`).
- [ ] No exponer la `service_role`: solo el servidor Next la lee.

## 4. Seguridad

- [ ] Cabeceras de seguridad: ya añadidas en [`next.config.ts`](../next.config.ts)
      (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
      `Referrer-Policy`, `Permissions-Policy`).
- [ ] **CSP pendiente (manual)**: definir un `Content-Security-Policy` por
      entorno una vez fijados los dominios reales de Supabase/Kuanto/BCV. No se
      hardcodea en `next.config.ts` a propósito (ver comentario del archivo).
- [ ] **Rotación del secreto de Kuanto** (`sb_secret_…` filtrado históricamente):
      rotarlo en el proyecto Kuanto, purgar el historial de git y recién ahí
      conectar la tasa paralela real. Hasta entonces, datos simulados.
- [ ] Aplicación privada de negocio: evaluar `robots.txt`/`noindex` para que
      Google no indexe el panel (decidir con el usuario; no forzado en el código).
- [ ] Autenticación: revisar `src/middleware.ts` (sesión + protección de rutas)
      en el dominio definitivo.

## 5. PWA

- [ ] Los iconos ya viven en `public/` (`icon-192.png`, `icon-512.png`,
      `icon-maskable-512.png`, `apple-icon.png`) y el manifest en
      `src/app/manifest.ts` los referencia.
- [ ] Falta el **service worker** para que el navegador ofrezca "Instalar app"
      (ver `docs/01-alcance-y-reglas.md` §9). Trabajo pendiente, no bloqueante
      para el MVP web.
- [ ] Pasada visual final con el logo del negocio (rebanada de marca en el chat
      con modelo con visión — `docs/11-pase-visual-claude.md`).

## 6. Despliegue de la app Next.js

- [ ] Build de producción (`npm run build`).
- [ ] Elegir Node.js LTS y `npm ci` (no `npm install`) en el servidor.
- [ ] `next start` (o el adaptador del hosting elegido) detrás de HTTPS.
- [ ] HTTPS obligatorio: cookies de sesión y datos de streaming cifrados.

## 7. Pruebas de humo post-despliegue

- [ ] Login admin y revendedor.
- [ ] Inventario carga con cuentas reales y credenciales descifran
      (`GLS_ENCRYPTION_KEY` correcta).
- [ ] Tasa BCV se obtiene y es utilizable; paralela según la política Kuanto.
- [ ] Venta rápida, renovación, traslado por falla y confirmación de retiro.
- [ ] WhatsApp / teléfonos visibles sin enlaces automáticos en iOS
      (`formatDetection` activado).
- [ ] Modo oscuro "dim" y paleta neutral intactos (supervisar con el chat visual).
- [ ] RLS: un revendedor ve solo sus ventas (nunca stock, proveedor ni tarjetas).

## 8. Documentación

- [ ] Actualizar `AGENTS.md` y `docs/00-plan-maestro.md` con el estado final de
      la sesión (regla de oro nº 1: "hay que comitear todo", un commit por
      rebanada).
