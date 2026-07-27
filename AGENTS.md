# AGENTS.md — Guía para agentes de GL Streaming

> Este archivo se carga automáticamente como contexto. Léelo primero.
> **Manténlo actualizado al final de cada sesión de trabajo** (junto con
> `docs/00-plan-maestro.md`). Es la fuente de orientación para cualquier agente.

## Qué es este proyecto

Aplicación web para gestionar un negocio de **reventa de cuentas de streaming**
(Netflix, HBO, Disney+, Spotify, etc.): inventario, ventas, renovaciones,
finanzas en tres monedas (USD comercial / VES cobrado a BCV / USDT de costos a
tasa paralela) y revendedores. Reemplaza un Excel. Zona horaria del negocio:
`America/Caracas`. La documentación y el código están **en español**.

## Cómo se trabaja aquí (reglas de oro)

1. **Valida contra PostgreSQL real antes de avanzar.** No basta con que
   compile: aplica las migraciones (`npm run db:reset`) y comprueba con SQL o
   pruebas. Así hemos encontrado bugs reales (orden de funciones, grants, etc.).
2. **Avanza por rebanadas pequeñas y coherentes**, no todo de golpe. Cada
   rebanada: escribir → validar → **commit**. Un commit por rebanada.
3. **El dominio manda.** Las reglas de negocio están en `docs/` con ~101
   decisiones confirmadas (`DEC-01..DEC-101`). No inventes reglas: si falta una
   decisión de negocio que solo el usuario sabe, **pregúntale**.
4. **No programar de más.** El usuario prefiere no construir lo que no usará
   (ver DEC-97: sin stock para revendedor). Ante la duda, confirma alcance.
5. **Secretos:** nunca en claro. Se cifran en la app (AES-256-GCM,
   `src/lib/crypto.ts`); la clave vive solo en `.env.local`, nunca en Postgres.
6. **Este proyecto es del trabajo del usuario, es importante.** Explica lo que
   haces; el usuario está aprendiendo y quiere poder revisar, no confiar a ciegas.

## Stack

- **Next.js 15** (App Router) + **TypeScript 5** (`strict`) + **Tailwind 3.4**.
- **Supabase** local (Postgres + Auth + RLS) vía Docker. CLI como devDependency
  (`npx supabase`). **Sin ORM**: `@supabase/supabase-js` + tipos generados.
- **Zod** para validación. **Vitest** (unidad) + Playwright (E2E, aún sin usar).
- Cifrado con `node:crypto` (AES-256-GCM). Estado de UI: URL primero; Zustand
  solo si hace falta.

## Comandos

```bash
# Requiere Docker Desktop corriendo. En PowerShell, anteponer el PATH de docker:
#   $env:PATH = "C:\Program Files\Docker\Docker\resources\bin;$env:PATH"
npx supabase start        # levanta el stack local (imprime claves para .env.local)
npm run db:reset          # migraciones + seed + RECREA los usuarios de prueba
npm run db:types          # regenera src/lib/supabase/database.types.ts
npm test                  # pruebas unitarias (Vitest)
npm run dev               # app en http://localhost:3000
npx next dev -H 0.0.0.0   # accesible desde el móvil en la red local
# Suite de aislamiento RLS (con el contenedor db corriendo):
#   Get-Content supabase\tests\rls.sql -Raw | docker exec -i <supabase_db_...> psql -U postgres -d postgres
```

**Usuarios de desarrollo** (los recrea `npm run db:reset`, porque el reset borra
`auth.users`): `admin@glstreaming.local` / `admin123456` y
`revendedor@glstreaming.local` / `revend123456`. Script:
`scripts/crear-usuarios-dev.mjs`. Para crear otro admin a mano:
`update public.usuarios set rol='admin' where id='<uuid>';` (el resto nace
`revendedor` por trigger). Detalle en `docs/09-fase-1-setup.md`.

## Estructura del repositorio

```
src/app/(auth)/     Login
src/app/(panel)/    Panel: dashboard (Centro de Operaciones), vencimientos, inventario/…, clientes, catalogo
src/app/(panel)/(finanzas)/  Bloque de dinero: caja, cobros, egresos, cierre, tasas
src/features/       Por funcionalidad: auth/, inventario/, operaciones/, catalogo/, ventas/, clientes/,
                    tasas/, finanzas/ (acciones + formularios)
src/server/         Adaptadores de fuentes externas (tasas)
src/components/     Piezas compartidas (nav-panel)
src/lib/            crypto.ts (cifrado), auth.ts, env.ts (Zod), supabase/ (clientes + types)
src/domain/         Lógica pura con pruebas: fechas.ts, dinero.ts
src/middleware.ts   Sesión + protección de rutas
supabase/migrations Migraciones numeradas 0001..0032 (fuente de verdad del esquema)
supabase/seed.sql   Catálogo sintético (sin secretos)
supabase/tests/     Suites SQL: rls, alta_cuenta, editar_cuenta, editar_unidades,
                    ciclo_proveedor, criterios_fase2, venta_unidad, ciclo_vida,
                    finanzas
scripts/            crear-usuarios-dev.mjs
tests/unit/         Pruebas Vitest (129 pasando)
docs/               Especificación de dominio (ver más abajo)
```

**Cómo se prueba aquí**: las suites SQL corren dentro de una transacción y hacen
`rollback` (no dejan datos). Simulan identidades con
`set role authenticated` + `request.jwt.claims` para que RLS aplique de verdad;
como `postgres` er superusuario y se salta RLS, probar sin eso no valida nada.

⚠️ Las pruebas deben comparar **deltas, no totales absolutos**, y apuntar a las
filas que ellas mismas crearon (`set_config('pruebas.x', …)` para pasarlas a los
bloques `DO`). La base de desarrollo tiene datos reales del usuario: un
`select … limit 1` puede agarrar una fila suya y dar un falso fallo.

```bash
Get-Content supabase\tests\<suite>.sql -Raw | docker exec -i <supabase_db_...> psql -U postgres -d postgres
```

## Convenciones de código y esquema

- **Nomenclatura en español** (tablas, columnas, funciones): `cuentas`,
  `es_admin()`, `capacidad_vendible_habilitada`.
- **Dinero en `numeric`, nunca `float`.** PIN/teléfonos/credenciales como `text`
  (preservar `+` y ceros). Fechas comerciales como `date`; instantes `timestamptz`.
- **Vocabularios controlados con `CHECK`** (no enums de Postgres: más fáciles de evolucionar).
- **RLS en toda tabla.** Tablas base: admin-only (`using (public.es_admin())`).
  El revendedor accede solo por **vistas** propiedad de postgres (gateway), nunca
  a tablas base. `authenticated` tiene grants; RLS decide filas; `anon` sin grants.
- **Migraciones**: una por rebanada, numeradas, con cabecera que explica la capa
  y las reglas de dominio que implementa. No reescribir migraciones ya commiteadas.
- **Historial inmutable**: renovar/corregir agrega filas, no sobrescribe.

## Estado actual

**Gestión Directa, Registro Flexible y Revendedores en Inventario (COMPLETO 2026-07-27).**
- **Venta Flexible con Fecha de Inicio & Revendedor**: `ModalVentaRapida` y `ModalGestionVenta` permiten elegir fecha de inicio de venta (útil para pagos de días anteriores) y seleccionar el revendedor/vendedor (ej. Gabriel Nadales) para comisiones y registros.
- **Pre-llenado de Cliente**: Si el perfil ya tiene un nombre visible (ej. `Luis Martínez`), el formulario lo auto-completa sin forzar a volverlo a escribir.
- **Unificación Visual de Cuentas Completas**: Las cuentas vendidas completas fusionan sus celdas verticalmente en un bloque limpio de altura uniforme (`h-[115px]`), impidiendo la venta duplicada de perfiles individuales.
- **Clic en Celda de Cliente / Alerta**: Abre `ModalGestionVenta` para renovar/cobrar 1 mes de mes a mes, editar cliente/perfil/PIN/revendedor o eliminar la venta con reseteo de perfil y limpieza de clientes huérfanos.
- **129 pruebas unitarias** pasando en verde y chequeo de tipos TypeScript sin errores.

---
*Última actualización: 2026-07-27 (Gestión de ventas flexibles, asignación de revendedores y unificación visual completadas).*
