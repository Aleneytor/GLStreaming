# CLAUDE.md — Guía para agentes de GL Streaming

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
3. **El dominio manda.** Las reglas de negocio están en `docs/` con ~97
   decisiones confirmadas (`DEC-01..DEC-97`). No inventes reglas: si falta una
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
npm run db:reset          # aplica migraciones + seed desde cero
npm run db:types          # regenera src/lib/supabase/database.types.ts
npm test                  # pruebas unitarias (Vitest)
npm run dev               # app en http://localhost:3000
# Suite de aislamiento RLS (con el contenedor db corriendo):
#   Get-Content supabase\tests\rls.sql -Raw | docker exec -i <supabase_db_...> psql -U postgres -d postgres
```

Primer admin: crear usuario en Supabase Studio (http://127.0.0.1:54323) y luego
`update public.usuarios set rol='admin' where id='<uuid>';` (el resto nace
`revendedor` por trigger). Detalle en `docs/09-fase-1-setup.md`.

## Estructura del repositorio

```
src/app/            Rutas Next.js (App Router) + manifest PWA
src/lib/            crypto.ts (cifrado), env.ts (Zod), supabase/ (clientes + types)
src/domain/         Lógica pura con pruebas: fechas.ts, dinero.ts
supabase/migrations Migraciones numeradas 0001.. (fuente de verdad del esquema)
supabase/seed.sql   Catálogo sintético (sin secretos)
supabase/tests/     rls.sql (prueba de aislamiento por perfil)
tests/unit/         Pruebas Vitest
docs/               Especificación de dominio (ver más abajo)
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

**Fase 1 (fundación técnica): COMPLETA (2026-07-23).**
- 6 migraciones (`0001..0006`): **41 tablas + 1 vista** (`v_mis_ventas_revendedor`).
  Capas: fundación/catálogo → inventario+secretos → ciclo comercial →
  proveedores+finanzas → rama Spotify → cierre (verificación hogar Netflix,
  auditoría, vista del revendedor).
- **33 pruebas unitarias** (cifrado, fechas, dinero) + **suite RLS**: todas verdes.
- Seguridad validada: revendedor no ve inventario/credenciales/ventas ajenas;
  anon bloqueado; admin ve todo.

**Modelo de revendedor (DEC-97):** ve el paquete de acceso completo
(correo/contraseña/perfil/PIN) de SUS ventas activas, entregado por una acción de
servidor que verifica propiedad y descifra en memoria. **No** ve stock ni solicita
por la app (pide directo). Su única ventana: `v_mis_ventas_revendedor`.

## Lo que sigue

**Fase 2** (ver `docs/05-roadmap.md`): inventario de Netflix + **asistente de
carga manual** + **Data Grid mobile-first** (tarjetas apiladas en móvil, sin
scroll horizontal). Requisito transversal: la app es **mobile-first e instalable
(PWA)** — la mayoría de revendedores usa móvil (ver `docs/01-alcance-y-reglas.md`
§9). Falta para PWA completa: iconos 192/512/maskable en `/public` + service worker.

Después: Fase 3 (ciclo comercial en UI + acción de entrega de acceso), Fase 4
(finanzas/cierre + integración de tasas), Fase 5 (portal revendedor), Fase 6
(resto de plataformas + despliegue en `glcuenta.com`).

## Pendientes externos (fuera del código)

- **Kuanto (tasa paralela): secreto expuesto SIN rotar** en su repo público. Hasta
  rotarlo, la integración usa **datos simulados**. Importa antes de Fase 4. Ver
  `docs/07-integracion-tasas.md`.
- Endurecer el scraper BCV (TLS, rechazar respuesta sin fecha) antes de finanzas.
- Despliegue: nada al VPS ni a `glcuenta.com` hasta Fase 6.

## Mapa de la documentación

- `docs/00-plan-maestro.md` — **ancla de reinicio**: estado detallado + stack + qué borrar si se empieza de cero.
- `docs/01-alcance-y-reglas.md` — reglas de negocio, actores, fórmulas, permisos.
- `docs/02-modelo-dominio.md` — diccionario de entidades e invariantes.
- `docs/05-roadmap.md` — fases 0-6.
- `docs/06-decisiones-pendientes.md` — **qué está confirmado (`DEC-*`) y qué sigue abierto (P0/P1)**.
- `docs/09-fase-1-setup.md` — cómo levantar el entorno local.
- `docs/plataformas/` — ficha por plataforma + arquetipos.

---
*Última actualización: 2026-07-23 (cierre de Fase 1). Actualiza este archivo al
terminar cada sesión: estado, lo que sigue y cualquier decisión nueva.*
