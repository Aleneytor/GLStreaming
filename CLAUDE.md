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
src/app/(panel)/    Panel: dashboard, inventario/[slug], inventario/cuenta/[id]/…, catalogo
src/features/       Por funcionalidad: auth/, inventario/, catalogo/ (acciones + formularios)
src/components/     Piezas compartidas (nav-panel)
src/lib/            crypto.ts (cifrado), auth.ts, env.ts (Zod), supabase/ (clientes + types)
src/domain/         Lógica pura con pruebas: fechas.ts, dinero.ts
src/middleware.ts   Sesión + protección de rutas
supabase/migrations Migraciones numeradas 0001.. (fuente de verdad del esquema)
supabase/seed.sql   Catálogo sintético (sin secretos)
supabase/tests/     Suites SQL: rls, alta_cuenta, editar_cuenta, editar_unidades,
                    ciclo_proveedor, criterios_fase2
scripts/            crear-usuarios-dev.mjs
tests/unit/         Pruebas Vitest
docs/               Especificación de dominio (ver más abajo)
```

**Cómo se prueba aquí**: las suites SQL corren dentro de una transacción y hacen
`rollback` (no dejan datos). Simulan identidades con
`set role authenticated` + `request.jwt.claims` para que RLS aplique de verdad;
como `postgres` es superusuario y se salta RLS, probar sin eso no valida nada.

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

**Fase 3 (ciclo comercial): núcleo COMPLETO (2026-07-23).** Ya se puede vender y
gestionar el ciclo de vida entero.
- **Clientes** (`/clientes`): alta, edición, búsqueda, contador de servicios activos.
- **Venta** (`vender_unidad`): crea suscripción + asignación + período en una
  transacción. **Bloquea la cuenta** (`for update`) para que dos operadores no
  vendan el mismo perfil, y aplica la exclusión perfil ↔ cuenta completa en ambos
  sentidos.
- **Ciclo de vida** (migración 0014): renovar (normal y **tardía**, que arranca en
  la fecha real del pago), pausar/reactivar, cancelar, y **liberación en DOS PASOS**
  — cancelar deja la unidad en `pendiente_limpieza` con una operación remota; solo
  `confirmar_limpieza()` la devuelve al stock.
- **Vencimientos** (`/vencimientos`): agrupa por vencidos / hoy / próximos 5 días,
  con las acciones en línea y las **tareas de limpieza pendientes**.
- El inventario muestra el estado real de cada perfil: cliente, badge de
  vencimiento o botón Vender.
- **Venta en un paso**: el cliente se escribe en el mismo formulario (se crea si
  es nuevo) y el perfil toma su nombre, como en la hoja de cálculo del negocio.
- **Entrega del paquete de acceso** (`entregarAccesoAction`): correo, contraseña,
  perfil, PIN y fecha, con botón "Copiar todo" para pegárselo al cliente. Se
  registra en `entregas_acceso` (solo versiones y metadatos, nunca el valor) y
  queda auditado. **El revendedor la usa para SUS ventas** (DEC-97): primero se
  verifica la propiedad con su sesión y solo entonces se leen los secretos con
  `createAdminClient()`, que él no puede leer por RLS.
- El inventario se ordena por **uso** (clientes activos), no alfabéticamente.

**Falta de la Fase 3**: cobros del cliente en Bs (necesita tasas), Caja diaria,
reservas, y las subentregas de YouTube (carga de cartera) y Spotify.

**Fase 2 (inventario Netflix y carga manual): COMPLETA (2026-07-23).**
La app ya es usable para inventario: login, panel mobile-first y gestión completa
de cuentas.
- **Autenticación**: login con correo/contraseña, middleware que protege rutas,
  panel con navegación inferior en móvil y lateral en escritorio, adaptada por rol.
- **Inventario navegable por plataforma**: `/inventario` lista plataformas;
  entrar muestra sus cuentas agrupadas por producto (Netflix estándar vs extra),
  con filtros por estado y búsqueda que viven en la URL.
- **Alta transaccional** (`crear_cuenta_con_unidades`): cuenta + unidades +
  credenciales cifradas, todo o nada. Valida capacidad según el producto.
- **Edición**: cuenta (alias/proveedor/notas/estado), rotación de credenciales
  y perfiles (nombre + PIN cifrado).
- **Revelado del paquete de acceso**: correo, contraseña y cada perfil con su PIN;
  manual, temporal (90 s) y **auditado**.
- **Ciclo de proveedor**: costo en USDT, día ancla recuperable y avisos 6/5/0/-1.
- **Catálogo editable** (`/catalogo`): productos (estado comercial, renovaciones),
  plataformas y proveedores. Las capacidades NO se editan por UI (regla de dominio).
- Migraciones `0007..0012`. Pruebas: **43 unitarias** + suites SQL
  (`alta_cuenta`, `editar_cuenta`, `editar_unidades`, `ciclo_proveedor`,
  `criterios_fase2`, `rls`), todas en verde.

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

**Terminar la Fase 3**: cobros del cliente (requiere tasas BCV/paralela), Caja
diaria, registrar la entrega del paquete de acceso en `entregas_acceso`, reservas,
y las subentregas de YouTube (carga de cartera con sesión de corte) y Spotify.

Ojo con la rotación de credenciales: `credenciales_cuenta.rotada_at` ya se marca;
falta usarlo para detectar entregas obsoletas y avisar a qué clientes activos hay
que reenviarles los datos nuevos.

Después: Fase 4 (finanzas/cierre + integración de tasas), Fase 5 (portal
revendedor), Fase 6 (resto de plataformas + despliegue en `glcuenta.com`).

**Pendiente transversal**: la app es mobile-first ✓ pero la PWA está a medias.
Falta para que sea instalable: iconos 192/512/maskable en `/public` y un service
worker (ver `docs/01-alcance-y-reglas.md` §9).

**Desarrollo desde el móvil**: `NEXT_PUBLIC_SUPABASE_URL` y `allowedDevOrigins`
apuntan a la IP local del PC (no a `127.0.0.1`, que desde el teléfono es el
propio teléfono). Si cambia la red, hay que actualizarlas — ver
`docs/09-fase-1-setup.md`.

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
*Última actualización: 2026-07-23 (núcleo de Fase 3 cerrado). Actualiza este
archivo al terminar cada sesión: estado, lo que sigue y cualquier decisión nueva.*
