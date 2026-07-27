# AGENTS.md — Guía para agentes de GL Streaming

> Este archivo se carga automáticamente como contexto. Léelo primero.
> Consulta también `GEMINI.md` para el mapa técnico de RPCs de Supabase y nombres de columnas reales.
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
supabase/migrations Migraciones numeradas 0001..0033 (fuente de verdad del esquema)
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

**Gestión Directa, Registro Flexible y Revendedores completos; adaptación móvil del inventario EN PROGRESO (2026-07-27).**
- **Vista Responsive en Móviles (Mobile-First)**: En teléfonos y pantallas pequeñas (`< 768px`), el inventario se muestra mediante **tarjetas apiladas por cuenta (`TarjetaCuentaMovil`)** con botones táctiles grandes (`⚡ Vender` / `⚙️ Gestionar`) y enlaces directos a WhatsApp, evitando desbordamientos horizontales de 16 columnas. En escritorio (`>= 768px`) se mantiene la densidad de tabla Excel.
- **Selector de variantes en Netflix y Spotify**: `/inventario/[slug]` expone un selector URL-first para alternar `Cuenta estándar` / `Perfil extra` y `Individual` / `Familiar`, conservando búsqueda y estado. Son productos distintos en PostgreSQL; el selector solo filtra la vista y no transforma cuentas.
- **Gmail pagador de Spotify en móvil**: `TarjetaCuentaMovil` muestra el Gmail y su origen. La página consulta `controles_pago_spotify` directamente por `cobertura_cuenta_id`; si una cuenta no tiene control registrado, muestra «No registrado».
- **Vencimiento visible y accionable en móvil**: cada venta de `TarjetaCuentaMovil` muestra una franja con `Vence en N días`, `Vence hoy · renovar` o `Venció hace N días`, además de la fecha formateada. La franja abre `ModalGestionVenta` al tocarla.
- **Renovación conserva vendedor y base de tasa**: `ModalGestionVenta` recibe el `vendedor_origen_id` real y lo preselecciona. Muestra/permite corregir `tipo` y `cobra_en_paralela`; si hay cambios sin guardar bloquea Renovar. La pantalla de renovación confirma vendedor + BCV/paralela antes de cobrar.
- **Filtros operativos de inventario**: el desplegable de `/inventario/[slug]` ya no usa los estados técnicos poco útiles de la cuenta. Filtra cupos `Disponibles para vender` (libres y con cuenta activa), `Próximos 5 días`, `Vencen hoy`, `Vencidos` y conserva `Cuentas suspendidas`. La lógica pura vive en `src/domain/filtros-inventario.ts`.
- **Renovación anticipada encadenada**: `ModalGestionVenta` no usa «hoy» ciegamente. Si el servicio sigue vigente, el período nuevo comienza en `fecha_renovacion` (ej. 29/07 → 29/08); si ya venció, comienza hoy y envía `tardia=on`. La regla pura es `planificarRenovacionCliente`.
- **Confirmación visible de renovación**: tras el éxito, `ModalGestionVenta` muestra un aviso verde con el período creado y reemplaza las acciones por `Listo`; el botón de confirmar desaparece para impedir una renovación duplicada.
- **Cuentas completas compatibles y fusionadas en todas las plataformas**: la detección prioriza `alcance='cuenta'`, pero conserva compatibilidad estricta con 24 ventas importadas antiguas de Netflix, Disney+, HBO, Prime Video y Crunchyroll cuya primera unidad tiene exactamente `Cuenta Completa`/`Completa`. En escritorio mantiene sus filas numeradas de 23px (cinco filas = 115px) y fusiona los datos con `rowSpan`; en móvil muestra una sola tarjeta. Spotify individual queda excluido porque es `recurso_indivisible`.
- **Simplificación de Menú Principal**: Se removió la sección duplicada `Vencimientos` del menú de navegación (toda la gestión central de vencimientos, renovaciones y cobros se realiza unificadamente desde `Operaciones` / `/dashboard`), dejando un flujo más limpio.
- **Corrección de Firma `registrar_cobro_cliente` (Migración `0033`)**: Se ajustó la llamada interna dentro de `vender_unidad` para coincidir con la firma exacta de `registrar_cobro_cliente` en PostgreSQL (`p_periodo_id`, `p_monto_ves`, `p_referencia`, `p_monto_usd`).
- **Eliminación de Sobrecargas Duplicadas de Funciones**: Se depuraron las versiones/sobrecargas anteriores de `vender_unidad` en Postgres mediante un bloque `DO`, dejando una única versión limpia e inambigua para llamadas RPC.
- **Auto-preparación de Perfiles en Venta**: Si un perfil estaba deshabilitado o en estado `por_limpiar` tras cancelar una venta previa, la función `vender_unidad` lo habilita y marca como `lista` automáticamente al venderlo, eliminando bloqueos de limpieza.
- **Resolución Dinámica de Modalidad por Producto**: `venderUnidadRapidaAction` detecta automáticamente la `modalidad_id` activa registrada en `public.producto_modalidades` para cada plataforma (Canva, Netflix, Disney+, Spotify, etc.), evitando errores de modalidad no permitida.
- **Vendedores e Intermediarios (`public.vendedores`)**: Se consulta directamente la tabla `public.vendedores` (donde viven los revendedores/intermediarios con o sin usuario web), permitiendo asociar cualquier revendedor (ej. Gabriel Nadales, Edgar Esperanza) o registrar uno nuevo al vuelo (`+ Registrar nuevo revendedor...`).
- **Venta Flexible con Fecha de Inicio & Revendedor**: `ModalVentaRapida` y `ModalGestionVenta` permiten elegir fecha de inicio de venta (útil para pagos de días anteriores) y asignar el revendedor/vendedor para comisiones y registros.
- **Pre-llenado de Cliente**: Si el perfil ya tiene un nombre visible (ej. `Luis Martínez`), el formulario lo auto-completa sin forzar a volverlo a escribir.
- **Unificación Visual de Cuentas Completas**: Las cuentas vendidas completas fusionan sus celdas verticalmente en un bloque limpio de altura uniforme (`h-[115px]`), impidiendo la venta duplicada de perfiles individuales.
- **Clic en Celda de Cliente / Alerta**: Abre `ModalGestionVenta` para renovar/cobrar 1 mes de mes a mes, editar cliente/perfil/PIN/revendedor o eliminar la venta con reseteo de perfil y limpieza de clientes huérfanos.
- **129 pruebas unitarias** pasando en verde y chequeo de tipos TypeScript sin errores.

### Correcciones de una revisión posterior (2026-07-27)

Una revisión contra la base Postgres real (typecheck + suites + inspección de
`pg_proc`/`information_schema`) encontró que varias acciones nuevas del inventario
llamaban a funciones/columnas **que no existen**. Como el error de Supabase no se
comprobaba, fallaban **en silencio** (el typecheck no las atrapa: los nombres de
RPC son strings). Corregidas en `src/features/inventario/actions.ts`:

1. **`eliminarCuentaAction`** llamaba al RPC `borrar_cuenta_admin` (inexistente).
   Correcto: **`eliminar_cuenta`** (`p_cuenta_id`). Antes borrar una cuenta desde
   el inventario daba error.
2. **`cancelarVentaConLimpiezaAction`** llamaba a `borrar_cliente` (inexistente).
   Correcto: **`eliminar_cliente`** (`p_cliente_id`). Ahora además **comprueba el
   error** y lo reporta en el mensaje en vez de fingir un "ok".
3. **`editarVentaDirectaAction`** actualizaba `suscripciones.vendedor_id` — esa
   columna **no existe**: el vendedor de una suscripción es
   **`vendedor_origen_id`** (el `vendedor_id` vive en `periodos_servicio`). Cambiar
   el "Vendió" de una venta no hacía nada. Ahora también se comprueba el error.
4. **`editarVentaDirectaAction`** machacaba `whatsapp_original` con `null` cuando
   el campo llegaba vacío, **borrando el teléfono** del cliente. Ahora el WhatsApp
   solo se toca si el formulario trae uno (y se actualiza también
   `whatsapp_normalizado`).

También: la **migración 0033 no estaba registrada** en
`supabase_migrations.schema_migrations` (se había aplicado a mano). Se insertó la
fila `('0033', …)` para que el historial cuadre con la función viva.

### Suites SQL restauradas tras la nueva firma de `vender_unidad`

La 0033 cambió la firma de `vender_unidad` (ahora **19 argumentos**, otro orden:
`p_cuenta_id, p_unidad_id, p_modalidad_id, …`). Las suites `venta_unidad`,
`finanzas`, `ciclo_vida` y `borrado` la llamaban por **posición** (firma vieja) y
fallaban enteras. Se pasaron **todas** esas llamadas a **argumentos por nombre**
(`p_cliente_id => …`), inmunes a futuros reordenamientos de firma.

- **Regla nueva confirmada por el código** (`pendiente_limpieza` NO se revende):
  sigue en pie. La 0033 auto-prepara/habilita la *unidad* al venderla, pero la
  **asignación queda abierta** (`fin` null) hasta `confirmar_limpieza`, así que la
  liberación en dos pasos se mantiene: no se puede revender hasta confirmar.
- **Ojo con los datos reales** (`CLAUDE.md`): `venta_unidad` usaba el nombre
  «Luis Rodriguez», que existe de verdad en la base del usuario (con 2
  suscripciones), y el conteo absoluto fallaba. Se renombró a «Luis QA-Prueba»
  para no chocar con datos reales — comparar contra nombres/deltas propios.
- Estado: **235 comprobaciones SQL en verde, 0 errores.** Las llamadas a
  `registrar_cobro_cliente` y `renovar_y_cobrar` no se tocaron: sus firmas solo
  crecieron por el final, así que las llamadas posicionales existentes siguen
  válidas.

### Más correcciones de inventario (2026-07-27, tarde)

- **Spotify individual en una sola línea.** Un Spotify individual es
  `recurso_indivisible` (capacidad 1, sin unidades, alcance `cuenta`): caía en la
  rama de "cuenta completa" que rellenaba hasta 5 filas y heredaba `h-[115px]`,
  viéndose tan alto como un familiar. Ahora los indivisibles generan **1 fila**
  (cupo «Individual») y NO se marcan `esCuentaCompleta` (en `page.tsx`). Esto
  además evita el caso patológico de un indivisible de capacidad grande (Canva
  500) generando cientos de filas.
- **El dashboard ya se refresca solo** («pedía F5»). Las acciones revalidaban
  `/vencimientos` (fuera del menú) pero no `/dashboard` (el Centro de
  Operaciones). Se agregó `revalidatePath('/dashboard')` en venderUnidadRapida,
  cancelarVentaConLimpieza, registrarPagoProveedorRapido, renovar e importación.

### Base de tasa por revendedor: BCV vs Paralela (migración 0034)

Situación real: las ventas **directas** se cobran a **BCV**, pero algunos
**revendedores** cobran a **paralela** (y los egresos ya van a paralela). El motor
(0019) ya lee el ingreso económico a paralela, así que la ganancia sale bien con
solo registrar los Bs reales; faltaba la ergonomía de entrada.

- **`vendedores.cobra_en_paralela`** (bool): marca por revendedor. `registrar_cobro_cliente`
  lee la marca vía `suscripciones.vendedor_origen_id` y elige la base: **paralela**
  para revendedores marcados, **BCV** en directa. Así toda venta Y renovación de
  ese revendedor heredan la base sola (sin elegir nada por venta).
- Efecto: al indicar el cobro en USD, convierte a Bs con la tasa correcta, y
  `precio_comercial_usd` (columna «Ingreso») se deriva a la MISMA base → un $5 de
  revendedor-paralela graba `5×paralela` Bs y se lee como $5 (no inflado a BCV).
- La lectura económica NO cambia (siempre `monto_ves / paralela`); ambas tasas se
  siguen congelando. Si la base es paralela y no hay paralela confirmada, el cobro
  se **bloquea** (no inventa tasa).
- UI: checkbox «cobra a tasa paralela» en `ModalVentaRapida` y
  `ModalGestionVenta`; se autocompleta con la marca guardada y se persiste al
  confirmar. La renovación no permite escoger una tasa independiente: muestra y
  hereda la base del vendedor para evitar divergencias.
- Validación: suite `supabase/tests/base_tasa.sql` (7 comprobaciones en verde).

**Revendedor vs Intermediario (migración 0035):** `vendedores.tipo` distingue
  · **revendedor**: afiliado, tendrá usuario y verá sus clientes por el portal;
    puede cobrar a paralela.
  · **intermediario**: compra para conocidos, informal (cualquiera, se escribe el
    nombre y ya), sin usuario, **siempre BCV**.
  Regla de dominio por CHECK: un intermediario NO puede tener `cobra_en_paralela`.
  El default de un vendedor nuevo creado al vuelo es `intermediario`. En la UI
  (`ModalVentaRapida`) el dropdown separa ambos en optgroups, y al elegir/crear
  uno se muestra un radio tipo + el checkbox de paralela (solo si revendedor);
  `resolverVendedorId` persiste `tipo` y fuerza BCV para intermediarios.

### Decisiones de diseño CONFIRMADAS por el usuario (no cambiar sin avisar)

- **Venta = pago inmediato; solo las renovaciones quedan pendientes.** Por eso la
  venta rápida en celda **exige precio y cobra al instante** — es intencional. La
  opción de "dejar pendiente" es exclusiva de renovaciones (monto en blanco →
  «Por cobrar»). Ver memoria `project-glstreaming-cobro-venta-vs-renovacion`.
- **Cancelar auto-borra el cliente** si se queda sin servicios: el usuario lo
  acepta ("si vuelve a comprar se registra de nuevo"). No hace falta conservarlo.

### ⚠️ Pendiente para el próximo agente

- **Responsive móvil todavía en revisión.** La tabla ya fue sustituida por
  tarjetas en `< 768px`, Spotify/Netflix ya tienen selector de variante y Spotify
  ya enseña el Gmail pagador. Falta una pasada visual manual en teléfonos reales
  por todas las plataformas y modales para detectar ajustes específicos; no
  volver a marcar el responsive completo hasta terminar esa revisión.
- **Auditoría — inconsistencias detectadas (2026-07-27):**
  - **Modalidad con UUID quemado como fallback** en `venderUnidadRapidaAction`
    (`'1111…1101'`): si la resolución dinámica falla, mejor error claro que un
    UUID adivinado (en otra plataforma daría "modalidad no permitida").
  - **3 «perfiles fantasma»**: unidades con `nombre_visible` de cliente pero sin
    venta abierta (restos de cancelaciones viejas). Limpieza puntual pendiente
    (UPDATE a `nombre_visible = null`), previa luz verde del usuario (datos reales).
  - **NO son bugs** (revisados): 0 cuentas sin credenciales, 0 dobles ventas, y
    los 11 períodos «completo» sin BCV son **cortesías** de importación (costo 0,
    sin cobro): correcto que no congelen tasa.
- **Convención:** `vender_unidad` (0033) quedó como `security definer` con
  `search_path = public`, apartándose del resto del proyecto (`search_path = ''` +
  nombres calificados, invoker). Funciona porque valida `es_admin()` de primero,
  pero conviene reconciliarlo en una migración futura. También hay `any` sueltos
  en `resolverVendedorId`.

---
*Pendiente destacado: terminar la revisión visual responsive de plataformas y modales.*

*Última actualización: 2026-07-27 (restaurada la fusión Excel de cuentas completas
en cinco filas/115px y compatibilidad con 6 asignaciones históricas; 137 unitarias
y typecheck en verde).*
