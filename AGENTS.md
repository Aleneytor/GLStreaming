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
3. **El dominio manda.** Las reglas de negocio están en `docs/` con más de 100
   decisiones confirmadas (`DEC-01..DEC-108`). No inventes reglas: si falta una
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
npm run db:reset          # DESTRUCTIVO: migraciones + seed + recrea usuarios; confirmar respaldo si hay datos operativos
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
- **Pausas y liberaciones claras en Operaciones (COMPLETO 2026-07-28)**: una
  suscripción `pausada` conserva el cupo para el cliente, pero ya no aparece en
  la alerta roja de vencidos ni en próximos; vive en la pestaña neutral `En
  pausa` con el distintivo `cupo reservado`. Cancelar y liberar cierra el modal
  al terminar. La UI dejó de llamar “limpieza” a la tarea: ahora muestra
  `Retiros pendientes` y explica el flujo real en dos momentos —cancelar en GL,
  retirar el perfil/dispositivo/correo en la plataforma y confirmar el retiro
  para devolver el cupo al stock—. La clasificación pura tiene pruebas para
  impedir que una pausa vencida regrese a Atención urgente.
- **Renovación de revendedor completa desde Operaciones (migración `0048`)**:
  el modal ya no oculta el vendedor ni muestra siempre BCV. Precarga el vendedor
  real de la suscripción, indica `revendedor/intermediario` y su base
  `BCV/paralela`, calcula la equivalencia con esa tasa y permite corregir el
  vendedor. Si se cambia, vendedor + período + cobro se confirman en una sola
  transacción; un fallo no deja la suscripción modificada a medias. El cambio
  queda auditado sin datos sensibles. Caso real verificado: OdCarmen conserva a
  Paola Cruz, revendedora a paralela.
- **Acceso directo desde Retiros pendientes**: cada tarea expone `Abrir
  servicio`. El enlace usa el `cuenta_id` y el `slug` reales —no nombres
  ambiguos—, filtra el inventario a esa cuenta y abre automáticamente su panel
  de gestión para consultar credenciales y ejecutar el retiro externo antes de
  confirmarlo. Los 6 retiros existentes fueron comprobados contra PostgreSQL y
  todos tienen un destino válido.
- **Confirmación contextual del retiro**: el enlace transporta también el ID de
  la operación pendiente. El panel de la cuenta muestra arriba una guía clara:
  GL no puede observar la plataforma externa; el administrador entra con las
  credenciales, retira el perfil/dispositivo/correo y pulsa `Confirmar retiro`
  en ese mismo panel. La consulta valida que operación, cuenta y estado
  pendiente coincidan antes de mostrar el botón.
- **Retiro limpia realmente el cupo (migración `0049`)**: confirmar el retiro
  ahora borra `unidades_inventario.nombre_visible` y destruye el PIN cifrado del
  cupo antes de devolverlo a `lista`; una cuenta completa hace lo mismo en todas
  sus unidades pendientes. `actualizar_unidades` interpreta un nombre vacío como
  borrado explícito en vez de “no cambiar”. El panel abierto se resincroniza con
  los datos revalidados para no restaurar visualmente valores anteriores. La
  migración saneó el único residual confirmado y no reasignado existente: Rossy
  Cohello; Mawa y Blanca permanecieron intactas y asignadas.
- **Spotify familiar recicla accesos GL al confirmar retiro (migración `0055`)**:
  cancelar un miembro con correo reutilizable del negocio (`dominio_gl` o
  `gmail_propio`) ya no “borra” ese acceso. `confirmar_limpieza` ahora cierra el
  vínculo con la suscripción cancelada y devuelve el correo/clave al mismo cupo
  como `identidad preparada`, listo para revender. Solo los `correo_cliente`
  destruyen secretos y quedan retirados. La identidad madre de la familia no se
  toca. Validado en PostgreSQL real con la suite
  `supabase/tests/spotify_limpieza_reutilizable.sql`.
- **Rediseño visual del Dashboard y Navegación del Panel (COMPLETO 2026-07-28)**: Se amplió el ancho del menú lateral en PC de `w-52` a `w-64/w-72` en `NavPanel`, agregando encabezados de sección e iconos espaciosos. La barra superior en `PanelLayout` incluye insignia de marca y avatar con rol. El contenedor principal se expandió a `max-w-6xl` y `CentroOperaciones` incorpora 4 tarjetas KPI clicables (*Atención urgente, Próximos 5 días, En pausa, Cartera total*), buscador con icono y lista de suscripciones Slate/Zinc.
- **Rediseño visual de Finanzas y Días Perdidos (COMPLETO 2026-07-28)**: La página de Resumen Mensual (`/cierre`) ahora expone en primer plano la tarjeta **Rendimiento de Inventario & Slots Perdidos** con una barra visual de ocupación (porcentaje ocupado vs. perdido), desglosando los slots-día ociosos y el dinero desperdiciado en el mes tanto en **Bs** como en **USDT**. Se modernizó la vista diaria de Caja (`/caja`) y la subnavegación (`SubNavFinanzas`) bajo la línea Slate/Zinc sin alterar la lógica de cálculo ni los RPCs.
- **Rediseño visual de Añadir Nueva Cuenta (COMPLETO 2026-07-28)**: El formulario `FormCuenta` y la página `/inventario/nueva` fueron completamente modernizados con la línea estética Slate/Zinc del proyecto. Se eliminaron bloques de texto redundantes ("cosas innecesarias"), organizando los campos en cuatro tarjetas dinámicas con iconos (Producto & Capacidad con badges de slots, Credenciales Cifradas con indicador AES-256-GCM, Control de Pago Spotify condicional y Proveedor/Costo Operativo en cuadrícula `sm:grid-cols-3`). Cero cambios en lógica o parámetros.
- **Corrección de sincronización de proveedor en importación (COMPLETO 2026-07-28)**: Se corrigió la columna `dia_ancla_proveedor` en `sincronizarCicloProveedorImportado` en `src/features/migracion/actions.ts` (anteriormente usaba el nombre errado `dia_ancla`). Permite importar las 120+ filas de perfiles extras y renovaciones de proveedor sin errores de caché de esquema.
- **Rediseño estético y vista móvil colapsable del inventario (COMPLETO 2026-07-28)**: La tabla de inventario en escritorio y la vista de tarjetas en móvil recibieron un rediseño completo de espaciado (padding `py-2.5 px-3`, tipografía `text-xs` de 12px), encabezados en Slate/Zinc pulido (`bg-slate-900 text-slate-100`), bordes suavizados (`border-slate-200`) y badges de estado en tonos HSL suaves (*Emerald, Amber, Rose, Indigo*). En móviles (`< 768px`) se agregaron **botones de desplegable/plegado individual (`▲ Cerrar` / `▼ Abrir`)** con indicador de cupos libres y un botón maestro **`📁 Cerrar todas` / `📂 Abrir todas`** para navegar rápidamente entre decenas de cuentas. La funcionalidad se conservó al 100%.
- **Panel del revendedor rediseñado visualmente (COMPLETO 2026-07-28)**: `/dashboard` para rol `revendedor` cuenta con cabecera de bienvenida personalizada (*¡Hola, Name! 👋*), 4 tarjetas KPI cromáticas (*Activas, Al día, Por vencer, Vencidas*), buscador con icono 🔍 y botón de limpieza, scroll horizontal de chips de plataforma para móviles, tarjetas de cliente con badge de modalidad (*Perfil extra*, *Familiar*, *Cuenta completa*), franja animada para vencimientos hoy/vencidos, pie con `BotonAcceso` y **simplificación de Spotify**: se presenta limpiamente como `Spotify Premium` omitiendo modalidades internas (*Familiar/Individual*).
- **Vista Responsive en Móviles (Mobile-First)**: En teléfonos y pantallas pequeñas (`< 768px`), el inventario se muestra mediante **tarjetas apiladas por cuenta (`TarjetaCuentaMovil`)** con botones táctiles grandes (`⚡ Vender` / `⚙️ Gestionar`) y enlaces directos a WhatsApp, evitando desbordamientos horizontales de 16 columnas. En escritorio (`>= 768px`) se mantiene la densidad de tabla Excel.
- **Selector de variantes en Netflix y Spotify**: `/inventario/[slug]` expone un selector URL-first para alternar `Cuenta estándar` / `Perfil extra` y `Individual` / `Familiar`, conservando búsqueda y estado. Son productos distintos en PostgreSQL; el selector solo filtra la vista y no transforma cuentas.
- **Gmail pagador de Spotify en móvil**: `TarjetaCuentaMovil` muestra el Gmail y su origen. La página consulta `controles_pago_spotify` directamente por `cobertura_cuenta_id`; si una cuenta no tiene control registrado, muestra «No registrado».
- **Bloqueo Spotify `no se puede` y alta con identidad (migración `0045`)**: el importador conserva esta marca como `coberturas_spotify.estado_admision = bloqueada_por_spotify` después de cargar los miembros existentes. No crea un cliente ficticio: los cupos libres muestran el bloqueo y no se pueden vender ni usar como traslado; un trigger de PostgreSQL protege la regla aunque se omita la UI. En una familia abierta, vender un cupo sin identidad preparada pide primero `Correo a mi dominio` o `Correo del cliente`, correo y clave, y luego los datos comerciales. Venta, cliente, cobro, identidad y vínculo se confirman en una sola transacción; el correo del cliente queda no reutilizable.
- **Editor real de familias Spotify (migración `0046`)**: “Gestionar cuenta” ya no presenta perfiles ni PIN. Muestra cuenta administradora, cinco miembros, correo/clave, titularidad y cliente. Permite preparar un acceso libre, corregir uno preparado antes de vender o sustituir el acceso de una venta activa sin recrear la venta, el período ni el cobro. El vínculo anterior se cierra con motivo auditable y el nuevo queda vigente; si el correo anterior era personal, sus secretos se destruyen. El modal de venta permite también `Cambiar correo o clave` sobre un acceso preparado.
- **Alta manual completa y borrado estable (migración `0047`)**: “Nueva cuenta” detecta Spotify familiar y crea atómicamente cuenta administradora, cinco miembros, identidad madre, cobertura abierta y Gmail pagador opcional con origen USA/Nigeria. Los accesos de miembros se preparan después en “Gestionar familia”. El botón destructivo dejó de anidar un formulario dentro del editor: confirma mediante una acción directa, muestra errores localmente, cierra el panel y refresca el inventario al terminar.
- **Consultas Spotify por lotes**: `/inventario/spotify` divide en grupos de 100
  los UUID enviados a PostgREST para identidades preparadas y Gmail pagadores.
  Evita `URI too long` al cargar cientos de unidades sin cambiar ni recortar el
  inventario mostrado.
- **Vencimiento visible y accionable en móvil**: cada venta de `TarjetaCuentaMovil` muestra una franja con `Vence en N días`, `Vence hoy · renovar` o `Venció hace N días`, además de la fecha formateada. La franja abre `ModalGestionVenta` al tocarla.
- **Vencimiento coherente también en escritorio**: se eliminó una regla visual
  heredada que mostraba los primeros 2 días vencidos en amarillo como `Tienes N
  días`. Toda fecha pasada aparece roja como `Venció hace N días`.
- **Renovación conserva vendedor y base de tasa**: `ModalGestionVenta` recibe el `vendedor_origen_id` real y lo preselecciona. Muestra/permite corregir `tipo` y `cobra_en_paralela`; si hay cambios sin guardar bloquea Renovar. La pantalla de renovación confirma vendedor + BCV/paralela antes de cobrar.
- **Filtros operativos de inventario**: el desplegable de `/inventario/[slug]` ya no usa los estados técnicos poco útiles de la cuenta. Filtra cupos `Disponibles para vender` (libres y con cuenta activa), `Próximos 5 días`, `Vencen hoy`, `Vencidos` y conserva `Cuentas suspendidas`. La lógica pura vive en `src/domain/filtros-inventario.ts`.
- **Renovación anticipada encadenada**: `ModalGestionVenta` no usa «hoy» ciegamente. Si el servicio sigue vigente, el período nuevo comienza en `fecha_renovacion` (ej. 29/07 → 29/08); si ya venció, comienza hoy y envía `tardia=on`. La regla pura es `planificarRenovacionCliente`.
- **Paquetes multimes de Spotify**: al renovar desde Inventario u Operaciones se
  puede elegir `1`, `3`, `6` o `12` meses. El monto ingresado es el total del
  paquete (por ejemplo, `$13` por 3 meses), no una mensualidad que se multiplica.
- **Renovaciones multimes generales**: Netflix, Disney+ y las demás plataformas
  permiten elegir cualquier duración de 1 a 12 meses. No se infiere una tarifa:
  el administrador escribe el total realmente cobrado por todo el período.
- **Traslado visual por falla (migración `0043`)**: además de la lista avanzada,
  “Mover por falla” permite volver al inventario y tocar directamente un cupo
  vacío compatible. Los destinos válidos se resaltan en verde en escritorio y
  móvil y la barra muestra tarjetas clicables de todos los destinos aunque un
  filtro o búsqueda los oculte; se confirma mostrando correo/cupo. Al cerrar la
  asignación se limpia `nombre_visible` del origen y se conserva en el destino;
  la migración sanea también nombres residuales de traslados anteriores.
- **Estado de cuenta y cupos sincronizado (migración `0044`)**: cambiar una
  cuenta a mantenimiento baja sus unidades habilitadas; reactivarla vuelve a
  habilitar solo las unidades con `estado_preparacion='lista'`. Los cupos
  pendientes de limpieza siguen bloqueados. La migración saneó las cuentas ya
  reactivadas después de traslados. El selector del editor es controlado y ya
  no vuelve visualmente al estado anterior después de guardar.
- **Tarifas sugeridas de Spotify, siempre editables**: correo GL usa
  1/3/6/12 meses = $4/$10/$18/$32; correo del cliente usa
  $5/$13/$22/$40. Al cambiar duración o titularidad, el modal propone el total
  del paquete en USD, pero el administrador puede corregirlo para excepciones.
  Esta sugerencia aplica solo a renovaciones nuevas: el importador conserva el
  monto histórico del Excel sin recalcularlo ni compararlo con la tabla.
- **Confirmación visible de renovación**: tras el éxito, `ModalGestionVenta` muestra un aviso verde con el período creado y reemplaza las acciones por `Listo`; el botón de confirmar desaparece para impedir una renovación duplicada.
- **Corrección auditable de ingresos (migración `0042`)**: “Gestionar venta”
  permite editar el ingreso USD del período actual. No sobrescribe el cobro:
  `corregir_cobro_cliente` agrega un reverso y un cobro sustituto atómicamente,
  con la misma fecha y base efectiva del original, y registra auditoría.
- **Cuentas completas compatibles y fusionadas en todas las plataformas**: la detección prioriza `alcance='cuenta'`, pero conserva compatibilidad estricta con 24 ventas importadas antiguas de Netflix, Disney+, HBO, Prime Video y Crunchyroll cuya primera unidad tiene exactamente `Cuenta Completa`/`Completa`. En escritorio mantiene sus filas numeradas de 23px (cinco filas = 115px) y fusiona los datos con `rowSpan`; en móvil muestra una sola tarjeta. Spotify individual queda excluido porque es `recurso_indivisible`.
- **Pagos de proveedor por lote (migración `0036`)**: el inventario permite seleccionar todas las cuentas visibles de un mismo proveedor, desmarcar excepciones y editar el costo de cada ciclo. Comparten una sola `fecha_pago` y un `lote_pago_id`, pero cada ciclo nuevo comienza en la `proxima_renovacion` individual ya guardada. La operación es atómica y rechaza mezclar proveedores. El pago individual también usa `registrar_renovacion_y_pago`, por lo que ahora sí crea el egreso en Caja.
- **Importador ampliado sin romper el Excel anterior**: `/migracion` conserva todas las columnas y reglas históricas (encabezados libres, celdas combinadas, Canva, Spotify, cuentas completas, costos y renovaciones) y ahora también puede leer `Alias Cuenta`, `Notas Cuenta`, `Estado Cuenta`, `Notas Cliente`, `Nota Renovación`, `Alias/Tipo/Tasa Vendedor` y `Tipo/Teléfono/Notas Proveedor`. Son columnas opcionales. La vista previa y el guardado comparten la decisión de tasa: directa usa BCV y cualquier vendedor/intermediario usa su base guardada. Los vendedores existentes conservan su configuración si la hoja vieja solo trae `Vendió`; una configuración explícita sí la actualiza. El selector de modalidad se reinicia al cambiar de producto para no enviar un UUID de la variante anterior.
- **Clientes canónicos e importación comercial coherente (migraciones `0053` y `0054`)**: la resolución de clientes dejó de reutilizar por nombre a secas. Ahora agrupa por `nombre + teléfono` cuando existe número, y solo reutiliza un nombre sin teléfono si es inequívoco. Esto evita mezclar homónimos y permite que Operaciones agrupe mejor la cartera real. `vendedores` ahora guarda `telefono_original`/`telefono_normalizado`; Catálogo lo edita y el importador lo persiste al resolver `Vendió`.
- **Spotify familiar no usa el correo como cliente**: el importador nunca toma `Correo Cliente` como nombre comercial. Si falta el nombre final del cliente, la prioridad queda `Cliente → Perfil → Vendió`; así, una venta de revendedor puede quedar provisionalmente a nombre del revendedor en vez de crear un cliente `correo@gmail.com`. Si no viene WhatsApp del cliente pero sí teléfono del vendedor importado, se usa ese número como referencia comercial provisional.
- **Filas madre/libres de Spotify familiar no se marcan como venta por monto 0**: `monto = 0` ya no dispara por sí solo la exigencia de un cliente. Esto corrige la vista previa de filas madre o cupos libres que antes aparecían en rojo solo por traer `0` en una columna financiera.
- **Centro de Operaciones agrupado por cliente**: el frontend agrupa tarjetas por `cliente_id` y, como respaldo para importaciones históricas, por `nombre + teléfono`. Un mismo cliente con varios servicios ya no se repite innecesariamente como tarjetas separadas cuando la identidad comercial coincide.
- **Renovaciones de proveedor con costo cero en todo el importador**: una fecha en `Renovar` crea o sincroniza el ciclo aunque `Inversión` sea `0`, tanto en Netflix/resto de plataformas como en las rutas especiales Spotify familiar e individual. Si Spotify ya se había importado con el bug, se pueden volver a pegar sus filas: el importador repara el ciclo y trata la venta existente como metadato ya cargado, sin duplicarla. Las fechas omitidas por la carga anterior no pueden reconstruirse desde PostgreSQL y deben venir otra vez del respaldo.
- **Importador rediseñado visualmente**: el flujo se presenta en cuatro pasos (configurar, pegar, revisar e importar), con producto/modalidad y moneda en tarjetas, área de pegado prominente, guía larga plegable, métricas de validación y confirmación sticky. La vista previa mantiene la tabla densa en escritorio y usa tarjetas por fila en móvil; ya no se declara la pantalla «solo PC».
- **Orden exacto de importación**: al terminar una carga, las cuentas reciben
  `orden` según su primera aparición en el Excel. La primera pegada queda primero
  en Inventario; las varias filas de una cuenta madre no crean posiciones extra.
- **Tarjetas propias cifradas (migración `0037`)**: si `Proveedor` contiene una
  tarjeta, el listado guarda/muestra solo banco o alias + últimos cuatro. PAN y
  vencimiento se guardan aparte con AES-256-GCM y un admin puede revelarlos por
  90 segundos desde Inventario; el acceso se audita. **El CVV nunca se guarda**,
  aunque venga en la celda: se descarta antes del cifrado.
- **Finanzas rediseñadas con lenguaje operativo**: la subnavegación ahora usa `Resumen diario`, `Pagos pendientes`, `Pagos y gastos`, `Resumen mensual` y `Tasas de cambio`. “Pagos pendientes” explica que solo contiene servicios entregados/renovados sin cobro registrado; al cobrar pasan al resumen diario. “Resumen mensual” muestra primero la ganancia final estimada y traduce el antiguo cierre: guardar borrador conserva una revisión provisional y confirmar el mes congela una versión oficial, sin mover dinero ni cambiar ventas. Los cálculos/RPC no cambiaron; la suite SQL financiera completa sigue en verde.
- **Catálogo convertido en configuración operativa responsive**: `/catalogo` usa un resumen del negocio y cuatro módulos por tarjetas (`Productos`, `Plataformas`, `Vendedores`, `Proveedores`). Los formularios permanecen cerrados hasta editar. El vendedor expone y persiste por separado `tipo` (`revendedor`/`intermediario`) y base (`BCV`/`paralela`).
- **Clientes convertido en cartera operativa mobile-first**: `/clientes` muestra servicios activos, vencimiento prioritario, estados próximos/vencidos, WhatsApp y acceso directo al inventario filtrado por cliente. Busca también por plataforma y vendedor; crear un cliente manual queda como acción secundaria porque el flujo normal lo crea desde la venta.
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

### Base de tasa por vendedor/intermediario: BCV vs Paralela (migraciones 0034 y 0051)

Situación real: las ventas **directas** se cobran a **BCV**, pero algunos
**vendedores e intermediarios** cobran a **paralela** (y los egresos ya van a paralela). El motor
(0019) ya lee el ingreso económico a paralela, así que la ganancia sale bien con
solo registrar los Bs reales; faltaba la ergonomía de entrada.

- **`vendedores.cobra_en_paralela`** (bool): marca por persona. `registrar_cobro_cliente`
  lee la marca vía `suscripciones.vendedor_origen_id` y elige la base: **paralela**
  para cualquiera marcado, **BCV** en directa. Así toda venta Y renovación de
  esa persona heredan la base sola (sin elegir nada por venta).
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
- Validación: suite `supabase/tests/base_tasa.sql` (12 comprobaciones en verde).

**Revendedor vs Intermediario (migraciones 0035 y 0051):** `vendedores.tipo` distingue
  · **revendedor**: afiliado, tendrá usuario y verá sus clientes por el portal.
  · **intermediario**: compra para conocidos, informal (cualquiera, se escribe el
    nombre y ya), sin usuario.
  Desde `0051`, el tipo no decide la tasa: ambos pueden usar BCV o paralela
  (`EUR`, Zelle u otra vía equivalente) mediante `cobra_en_paralela`.
  El default de un vendedor nuevo creado al vuelo es `intermediario`. En la UI
  (`ModalVentaRapida`) el dropdown separa ambos en optgroups, y al elegir/crear
  uno se muestra un radio tipo + el checkbox de paralela para ambos;
  `resolverVendedorId` persiste tipo y base de forma independiente.

### Decisiones de diseño CONFIRMADAS por el usuario (no cambiar sin avisar)

- **Venta = pago inmediato; solo las renovaciones quedan pendientes.** Por eso la
  venta rápida en celda **exige precio y cobra al instante** — es intencional. La
  opción de "dejar pendiente" es exclusiva de renovaciones (monto en blanco →
  «Por cobrar»). Ver memoria `project-glstreaming-cobro-venta-vs-renovacion`.
- **Cancelar auto-borra el cliente** si se queda sin servicios: el usuario lo
  acepta ("si vuelve a comprar se registra de nuevo"). No hace falta conservarlo.

### Menú visual del inventario (2026-07-27)

- `/inventario` dejó la lista plana y ahora funciona como tablero responsive de
  plataformas. La cabecera resume cuentas, servicios activos, cupos libres y
  plataformas con inventario.
- Cada una de las 15 plataformas activas tiene una identidad cromática estable
  por `slug` (Netflix rojo, Spotify verde, Disney+/Paramount azul, HBO violeta,
  etc.), con estado, métricas de ocupación y acceso táctil a su inventario.
- Las plataformas con cuentas se priorizan por actividad. Las que todavía están
  vacías se muestran aparte y en tarjetas más compactas para no alargar de más la
  navegación móvil.

### Traslado administrativo por falla (migración `0040`, 2026-07-28)

- `ModalGestionVenta` ofrece **Mover por falla** y carga únicamente destinos
  compatibles. Las cuentas importadas no tienen filas en `cuenta_modalidades`;
  por eso la compatibilidad real se valida con el mismo producto y una
  `producto_modalidades` activa, además del tipo/estado del cupo.
- `trasladar_servicio_por_falla` bloquea suscripción, origen y destino; conserva
  suscripción, cliente, vendedor, períodos, cobros, precio y renovación. Solo
  cierra/abre `asignaciones_inventario`, marca la cuenta y unidades origen en
  mantenimiento, revoca el acceso viejo, crea una entrega `traslado` pendiente
  y registra IDs no sensibles en `eventos_auditoria`.
- Perfil/cupo exige otra unidad libre, habilitada, limpia y del mismo tipo.
  Alcance cuenta exige una cuenta totalmente libre y preparada. Una familia
  Spotify con admisión bloqueada nunca aparece ni se acepta como destino.
- `supabase/tests/traslado_servicio.sql` pasa dentro de transacción/rollback:
  10 verificaciones, rechazo de cuenta completa parcialmente ocupada y rechazo
  RLS para revendedor. Typecheck y las pruebas unitarias continúan en verde.
- El selector administrativo de traslado muestra el correo completo de cada
  cuenta destino (y su alias cuando existe). No se enmascara: la acción ya exige
  rol admin y necesita distinguir con precisión qué credenciales se entregarán.

### Spotify familiar: identidades preparadas (migración `0041`, 2026-07-28)

- Un cupo familiar representa un **miembro con correo/contraseña propios**, no
  un perfil/PIN. Inventario usa las columnas `Correo cliente` / `Clave cliente`
  en escritorio y muestra el acceso dentro de cada tarjeta móvil.
- `identidades_spotify.unidad_preparada_id` permite guardar correo/clave en un
  cupo aún libre. Prepararlo no crea cliente, suscripción ni asignación y no
  ocupa stock. Al vender, un trigger enlaza esa misma identidad a la suscripción
  dentro de la transacción y limpia la preparación.
- El importador guarda ahora las columnas `Correo Cliente` / `Clave Cliente`
  aunque la fila no tenga señal de venta. Las credenciales de cupos libres de la
  importación anterior no existen en PostgreSQL y deben reimportarse desde el
  respaldo (pueden pegarse solo esas filas libres).
- El resumen de `/inventario` cuenta una unidad por recurso indivisible sin
  perfiles y usa el consumo snapshot de las ventas completas. Así ya no mezcla
  las ventas individuales de Spotify contra solo los 240 cupos familiares.
- Validación: 159 unitarias, suite `spotify.sql` y nuevas suites transaccionales
  `spotify_identidades_preparadas.sql` en verde.

### Edición administrativa completa de familias Spotify (migración `0050`)

- `No se puede` es un bloqueo de admisión de **toda la familia**, no una
  clasificación del Gmail ni un estado permanente del cupo. “Gestionar
  familia” permite abrirla o bloquearla y guardar el motivo; al abrirla vuelven
  a ser vendibles sus cupos libres.
- La titularidad del acceso conserva tres valores reales: `dominio_gl`,
  `gmail_propio` y `correo_cliente`. Un admin puede corregir correo, clave y
  titularidad incluso en una venta activa, incluida la transición de correo del
  cliente a correo propio sin recrear cupo, suscripción, período ni cobro.
- Un Gmail propio del negocio usa la tarifa de correo administrado por GL. La
  tarifa se decide por la titularidad registrada y no por inferir el dominio.
- Validación en ese corte: 162 unitarias y las suites `spotify.sql`,
  `spotify_identidades_preparadas.sql` y `spotify_edicion_admin.sql` en verde.

### Corrección del editor genérico de credenciales (2026-07-28)

- “Gestionar cuenta” enviaba `creds_cambiadas`, pero la acción esperaba
  `rotar_credenciales`; por eso mostraba “Guardado” sin modificar correo o clave
  en Netflix, Prime Video y cualquier plataforma que use credenciales de cuenta.
- El contrato quedó unificado y la acción acepta también el nombre anterior por
  compatibilidad con formularios que estuvieran abiertos durante la actualización.
- Correo y clave usan estado local optimista y el formulario impide el reinicio
  automático de campos no controlados: al guardar ya no reaparecen fugazmente
  los valores anteriores mientras llega la revalidación del servidor.

### Intermediarios a BCV o paralela (migración `0051`)

- `tipo` solo describe la relación: revendedor afiliado con portal o
  intermediario sin portal. Ya no decide la tasa.
- `cobra_en_paralela` funciona para ambos tipos. Permite englobar EUR, Zelle y
  vías equivalentes como paralela sin introducir nuevas monedas; desmarcado usa
  BCV y venta directa continúa a BCV.
- Catálogo, venta rápida, gestión, renovaciones e importador preservan esta base.
  `Tipo Vendedor = Intermediario` + `Tasa Vendedor = Paralela` es válido.

### ⚠️ Pendiente para el próximo agente

- **Rediseñar por completo “Nueva cuenta” para TODAS las plataformas (prioridad indicada por el usuario al cerrar 2026-07-28).** El formulario actual sigue siendo genérico, largo y visualmente pobre. Debe convertirse en un flujo corto y contextual por producto/plataforma, mostrando únicamente datos que el negocio realmente usa. Eliminar pasos redundantes como pedir a la vez `Día de renovación` e `Inicio del ciclo actual`: una fecha exacta debe bastar y el ancla se deriva. Revisar especialmente modalidades, capacidad fija, proveedor/costo/renovación, credenciales, Gmail pagador, cuenta completa/extra/individual/familiar y responsive móvil. No copiar sin criterio el importador; ambos flujos comparten dominio pero “Nueva cuenta” es una alta operativa individual.
- **Actualizar el panel de revendedor.** Revisarlo contra todos los cambios
  recientes: variantes Netflix/Spotify, vendedor afiliado, base BCV/paralela,
  renovaciones, nuevas vistas responsive, traslados y paquete de acceso. Mantener
  RLS: solo sus ventas; nunca stock, proveedor, costos ni tarjetas propias.
- **Continuar definiendo pasos con el usuario.** Esta lista es la base de la
  próxima sesión, no el cierre definitivo del roadmap.
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
*Pendiente destacado: rediseñar “Nueva cuenta” para todas las plataformas,
probar visualmente un traslado real controlado y terminar la revisión del panel
de revendedor.*

*Última actualización: 2026-07-29 (migraciones hasta `0055`; Spotify familiar
con bloqueos, identidades editables y alta manual coherente; renovaciones con
costo cero reparables; traslado/estados/inventario corregidos; pausas separadas
de urgencias, liberación explicada como retiro externo y renovación operativa
con vendedor/base visibles; 165 unitarias y 22
suites SQL en verde).*
### Nota de sesión 2026-07-28

- `Gestionar Venta` para Spotify familiar ahora deja editar correo, clave y
  titularidad incluso si el servicio está pausado o vencido.
- La persistencia usa el RPC `editar_acceso_miembro_spotify`, comparando primero
  contra los valores originales para no recrear la venta ni tocar el período.
### Nota de sesión 2026-07-28: formularios sin rebote visual

- Se bloqueó el `reset` automático que React dispara tras varios `server actions`
  con `useActionState`. Era la causa de que, al guardar, muchos modales
  volvieran a pintar por un instante los `defaultValue` viejos.
- `ModalGestionVenta` además quedó con estado local para nombre, perfil y acceso
  Spotify. Tras guardar conserva en pantalla el dato nuevo y actualiza su base
  "guardada" para que un segundo submit no compare contra el valor anterior.
