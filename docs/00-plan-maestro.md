# Plan maestro — punto de partida único

Este documento existe para que, si el código de una fase sale mal, no gusta el resultado, o hay que empezar de cero, **todo el contexto necesario para retomar esté en un solo lugar**, sin depender del historial de una conversación. `docs/` es la carpeta de planificación del proyecto y no la toca ninguna herramienta de scaffolding de código (`src/`, `supabase/`, `tests/` viven aparte, ver sección 3): borrar el código nunca borra este contexto.

Fecha de esta consolidación: **22/07/2026**.

## 1. Resumen ejecutivo del estado del proyecto

GL Streaming reemplaza un Excel operativo de reventa de cuentas de streaming (Netflix, HBO, Disney+, Prime Video, Crunchyroll, Paramount+, Universal+, VIX, FlujoTV, Telelatino, CapCut, Gemini/Google Cloud, Canva, YouTube, Spotify) por una app web. El modelo de dominio es inusualmente riguroso para una etapa pre-código: **95 decisiones confirmadas** (`DEC-01` a `DEC-95` en `06-decisiones-pendientes.md`), un diccionario de ~30 entidades con campos exactos (`02-modelo-dominio.md`), 90+ invariantes numerados, y fórmulas financieras completas (USD comercial → VES cobrado a BCV → lectura económica a paralela → USDT de costos).

**Fase 0 (decisiones de dominio) está cerrada.** Seis plataformas están funcionalmente sólidas: Netflix, HBO, Disney+, Prime Video, Crunchyroll y Spotify. Los cuatro huecos que quedaban (YouTube, Canva, Telelatino, Gemini/Google Cloud) se resolvieron o se despriorizaron explícitamente en la sesión del 22/07/2026 (ver `DEC-91` a `DEC-95`), incluida una regla nueva de Netflix (verificación de hogar) que no estaba documentada antes.

**Lo único pendiente fuera de este workspace**: rotar una credencial expuesta en el repo público del proyecto Kuanto (fuente de la tasa paralela, propiedad del usuario) — ver `07-integracion-tasas.md` y la nota en `README.md`. **No bloquea la Fase 1**: todo el desarrollo empieza en local con datos simulados; solo importa antes de conectar la tasa paralela en vivo (más cerca de la Fase 4, motor financiero).

## 2. Índice de la documentación (orden de lectura recomendado)

| Documento | Contenido |
|---|---|
| `README.md` | Visión general, hallazgos que cambian el blueprint original, estado de seguridad |
| `01-alcance-y-reglas.md` | Reglas de negocio, actores, vocabulario, fórmulas financieras completas |
| `02-modelo-dominio.md` | Diagrama ER + diccionario de ~30 entidades con campos exactos, invariantes |
| `03-arquitectura-y-seguridad.md` | Stack propuesto, estructura de repo, seguridad por capas, operaciones atómicas |
| `04-carga-manual.md` | Cómo se da de alta el inventario/cartera existente a mano, sin importador |
| `05-roadmap.md` | Fases 0-6 con criterios de entrada/salida de cada una |
| `06-decisiones-pendientes.md` | **Fuente de verdad de qué está confirmado y qué sigue abierto** (P0/P1) |
| `07-integracion-tasas.md` | Contrato exacto de las APIs de tasa BCV y paralela (Kuanto), hallazgos de auditoría |
| `08-proximo-paso.md` | Última instrucción registrada antes de esta consolidación |
| `plataformas/` | Ficha detallada de cada una de las 15 plataformas + 4 arquetipos de cuenta compartida |

Si hay que reconstruir el proyecto desde cero, **empezar por este archivo, luego `06-decisiones-pendientes.md`** (para saber exactamente qué ya está decidido) y después la sección 3 de este documento (stack técnico) antes de tocar cualquier editor.

## 3. Stack técnico confirmado para la Fase 1

Propuesto el 22/07/2026 a pedido explícito del usuario, para no perder tiempo decidiéndolo el día que se arranque a programar.

| Capa | Elección | Por qué |
|---|---|---|
| Framework | Next.js 15 (App Router) | Ya implícito en la estructura de carpetas de `03-arquitectura-y-seguridad.md`; Server Actions maduras para la "frontera de servidor" que pide ese documento |
| Lenguaje | TypeScript 5.x, `strict` activado | Tipos generados de Supabase (`supabase gen types typescript`) encajan directo |
| UI | Tailwind CSS 3.4 LTS (no v4 todavía) | Proyecto financiero, prioriza estabilidad sobre novedad |
| Backend/DB | Supabase (Postgres + Auth + RLS), CLI de Supabase para migraciones locales versionadas | Ya confirmado en `DEC-09`, `DEC-34` |
| Acceso a datos | `@supabase/supabase-js` + tipos generados + patrón repositorio en `server/repositories/`, **sin ORM** (nada de Prisma/Drizzle) | Evita duplicar la lógica de RLS que ya vive en Postgres |
| Validación | Zod | Integra con TS + Server Actions; tipos derivados en `lib/validation/` |
| Cifrado de secretos (credenciales de cuentas, PIN, Gmail de clientes) | AES-256-GCM con el módulo `crypto` nativo de Node, en el servidor Next.js; clave solo en variable de entorno del servidor, nunca en Postgres | Cumple literalmente "clave no guardada junto al dato"; evita depender de pgcrypto/Supabase Vault para miles de secretos por-cliente con revelado auditado caso a caso |
| Testing | Vitest (unidad), Playwright (E2E), `pgTAP` o suites de la CLI de Supabase (RLS/restricciones) | Cubre las categorías que ya pide `03-arquitectura-y-seguridad.md` |
| Estado de UI transversal | Zustand, solo si aparece necesidad real fuera de URL/estado local | Ya condicionado así en el documento original |

Repositorio propuesto (de `03-arquitectura-y-seguridad.md`, sin cambios): `src/app/`, `src/features/`, `src/domain/`, `src/server/`, `src/components/`, `src/lib/`, `supabase/migrations/`, `tests/`. Todo el código de aplicación vive fuera de `docs/`.

## 4. Secuencia de trabajo acordada

Por decisión explícita del usuario, **no se espera a cerrar el catálogo completo de las 15 plataformas** antes de programar:

1. Fase 1 (fundación técnica): proyecto local Next.js/TS/Tailwind/Supabase, migraciones cubriendo el esquema completo de las 6 plataformas sólidas + Spotify + los huecos ya resueltos de Canva/Gemini/Netflix-extra + la nueva regla de verificación de hogar; YouTube con el mínimo necesario para conservar sus 2 registros comerciales reales. Auth/RLS/vistas seguras, seeds sintéticos.
2. Fase 2 (Netflix + carga manual) → Fase 3 (ciclo comercial) → Fase 4 (proveedores/finanzas/cierre, momento natural para resolver la rotación de Kuanto) → Fase 5 (portal revendedor) → Fase 6 (resto de plataformas + despliegue en `glcuenta.com`), tal como están descritas en `05-roadmap.md`, sin cambios de fondo.
3. Telelatino queda con modalidad limitada a "cuenta completa" (default ya aceptado) hasta que se decida ampliarla; el resto de los ~40 ítems P0/P1 no críticos quedan aceptados con la propuesta que ya trae `06-decisiones-pendientes.md`, salvo que el usuario diga lo contrario en el momento de implementarlos.
4. No se toca VPS ni `glcuenta.com` hasta la Fase 6.

## 4.1. Estado del código (actualizado 22/07/2026)

**Fase 1 COMPLETA — 6 rebanadas entregadas y validadas contra PostgreSQL real (23/07/2026).**

Entorno: Docker Desktop 4.83 + WSL2, stack Supabase local, Node 25. La base tiene
**41 tablas + 1 vista de revendedor**; **33 pruebas unitarias** y la **suite RLS** en verde.

Migraciones (`supabase/migrations/`):
- `0001_fundacion_catalogo` — usuarios, vendedores, plataformas, modalidades, productos_plataforma, producto_modalidades, mecanismos_entrega, proveedores. Función `es_admin()` + trigger de alta de perfil.
- `0002_inventario_secretos` — clientes, cuentas, cuenta_modalidades, credenciales_cuenta, unidades_inventario, secretos_unidad, historial_estado_unidad, reservas_inventario.
- `0003_ciclo_comercial` — tasas_cambio, contactos_comerciales, suscripciones, suscripcion_contactos, historial_estado_suscripcion, sesiones_carga_inicial, asignaciones_inventario, periodos_servicio, pagos_cliente.
- `0004_proveedores_finanzas` — ciclos_proveedor, pagos_proveedor, categorias_gasto, gastos_operativos, cierres_mensuales, detalles_cierre_mensual.
- `0005_spotify_entregas` — identidades_spotify, coberturas_spotify, controles_pago_spotify, vinculos_identidad_spotify, incidencias_spotify, casos_incidencia_spotify, entregas_acceso, operaciones_remotas.
- `0006_cierre_vistas_seguras` — verificaciones_hogar_netflix, eventos_auditoria; vista `v_mis_ventas_revendedor` (única ventana del revendedor); grants a `authenticated` (RLS decide filas; `anon` sin privilegios). El revendedor NO ve stock ni solicita por la app (DEC-97).

Lógica de dominio (TypeScript, con pruebas):
- `src/lib/crypto.ts` — cifrado AES-256-GCM de secretos + huella HMAC + máscaras (5 pruebas).
- `src/domain/fechas.ts` — renovación por mes calendario con ajuste de fin de mes, badges (16 pruebas).
- `src/domain/dinero.ts` — redondeo mitad-arriba, monto VES esperado, prorrateo por intersección de días (12 pruebas).

Seguridad validada:
- RLS admin-only en tablas base; el revendedor solo accede a sus propias ventas vía `v_mis_ventas_revendedor`. Ve el paquete de acceso de sus ventas (entregado por acción de servidor que verifica propiedad), pero no stock ni datos ajenos (DEC-97).
- `supabase/tests/rls.sql`: suite que crea admin + 2 revendedores + anon y prueba el aislamiento (revendedor no ve inventario/credenciales/ventas ajenas; sí ve su venta; anon bloqueado; admin ve todo). **Todas en PASS.**
- Base PWA / mobile-first: `src/app/manifest.ts` + viewport/theme-color. Pendiente para instalabilidad completa: iconos 192/512/maskable en `/public` y service worker.

Errores reales encontrados y corregidos gracias a validar contra Postgres:
(1) `es_admin()` declarada antes de existir `usuarios`; (2) función `pg_temp` en el seed que no sobrevive entre lotes del CLI; (3) faltaban grants de tabla a `authenticated` (sin ellos RLS ni se consulta → "permiso denegado" hasta para el admin).

## 4.2. Fase 2 COMPLETA (23/07/2026)

Migraciones `0007..0012` y la primera interfaz real. La app ya sirve para
gestionar inventario de punta a punta.

- **Autenticación y panel**: login, middleware de sesión que protege rutas, shell
  mobile-first (nav inferior en móvil, lateral en escritorio) adaptado por rol.
- **Inventario por plataforma**: lista de plataformas → cuentas agrupadas por
  producto, con filtros de estado y búsqueda en la URL.
- **Alta transaccional**: `crear_cuenta_con_unidades` crea cuenta + unidades +
  credenciales cifradas, todo o nada.
- **Edición**: cuenta, rotación de credenciales (`rotada_at`) y perfiles
  (nombre + PIN cifrado).
- **Paquete de acceso**: revelado manual, temporal (90 s) y auditado, con correo,
  contraseña y el PIN de cada perfil.
- **Ciclo de proveedor**: costo USDT, día ancla recuperable, avisos 6/5/0/-1.
- **Catálogo editable**: productos, plataformas y proveedores. Las capacidades no
  se editan por UI a propósito (regla de dominio; se cambian por migración).

Criterios de salida verificados en `supabase/tests/criterios_fase2.sql`: vertical
Netflix con capacidades 5 y 1 distinguiendo estándar/extra; prueba sintética de
capacidad 7 (Disney+) que descarta un "5" hardcodeado; y que renombrar un
proveedor **no** reescribe los ciclos históricos (guardan snapshot).

Bugs reales encontrados al validar en esta fase: faltaban privilegios de tabla
para `service_role` (BYPASSRLS no sustituye al permiso), el cliente apuntaba a
`127.0.0.1` y por eso el login fallaba desde el móvil, y el login agrupaba todos
los errores como "contraseña incorrecta" ocultando fallos de red.

## 4.3. Fase 3 — núcleo COMPLETO (23/07/2026)

Migraciones `0013..0014`. La app ya cubre el ciclo comercial completo.

- **Clientes** y **venta** de un perfil o de la cuenta completa. `vender_unidad`
  bloquea la cuenta para impedir ventas simultáneas del mismo perfil y aplica la
  exclusión perfil ↔ cuenta completa en ambos sentidos.
- **Ciclo de vida**: renovar (agregando período, nunca sobrescribiendo),
  **renovación tardía** que arranca en la fecha real del pago, pausar/reactivar
  conservando el perfil apartado, y cancelar.
- **Liberación en dos pasos**: cancelar deja la asignación en `cierre_pendiente`
  y la unidad en `pendiente_limpieza` con una operación remota; el perfil solo
  vuelve al stock tras `confirmar_limpieza()`. Verificado que entremedio no se
  puede revender.
- **`/vencimientos`**: vencidos, hoy, próximos 5 días y tareas de limpieza, con
  las acciones en línea. Recordatorio "Recontactar el" que no crea ingreso.

- **Entrega del paquete de acceso**: correo, contraseña, perfil, PIN y fecha, con
  "Copiar todo". La usa el admin y también el **revendedor para sus propias
  ventas** (DEC-97): se verifica la propiedad con su sesión y solo entonces se
  leen los secretos con la clave de servicio. Queda registrada en
  `entregas_acceso` (versiones y metadatos, nunca el valor) y auditada.
- **Venta en un paso**: el cliente se crea desde el mismo formulario y el perfil
  toma su nombre, replicando la fila del Excel del negocio.
- Inventario ordenado por uso (clientes activos), no alfabéticamente.

Bugs reales encontrados al validar: (1) `ON CONFLICT` sobre `clave_idempotencia`
fallaba porque su índice único es **parcial** (hay que repetir el predicado);
(2) tres pruebas eran frágiles porque comparaban totales absolutos y usaban
`limit 1` — con datos reales del usuario en la base daban falsos fallos. Ahora
comparan deltas y apuntan a sus propias filas.

Estado de pruebas: **119 SQL + 43 unitarias**, todas en verde.

**Siguiente**: lo que restaba de la Fase 3 (cobros en Bs y Caja diaria) dependía
de las tasas, así que se resolvió dentro de la Fase 4. Quedan reservas y las
subentregas de YouTube/Spotify.

## 4.4. Fase 4 — motor financiero COMPLETO (23/07/2026)

Migraciones `0016..0019`. El negocio ya se puede cuadrar dentro de la app.

- **Tasas** (`/tasas`): BCV desde la API propia y paralela desde Kuanto, con
  validación defensiva (rechaza saltos > 50 % frente a la última conocida, exige
  fecha de vigencia, guarda idempotentemente y nunca inventa un valor si la
  fuente falla). Ver `DEC-98`.
- **Cobros** (`/cobros`): `registrar_cobro_cliente()` calcula
  `round_half_up(precio_usd × BCV, 2)`, **congela BCV y paralela** en el período
  y en el pago, rechaza abonos y rechaza tasas sin confirmar en 24 h. El reverso
  es una contrapartida con las mismas tasas: no borra el original y devuelve el
  período a la bandeja de por cobrar.
- **Egresos** (`/egresos`): `registrar_renovacion_y_pago()` — un solo importe de
  negocio crea el ciclo nuevo (heredando el día ancla) y su único pago. Costo
  cero no inventa salida de Caja; reintentar no duplica. Gastos operativos en
  USDT valorizados a paralela, con reversos.
- **Caja** (`/caja`): día de negocio en `America/Caracas`, con los tres hechos
  separados — dinero que entró/salió, ventas del día y resultado devengado.
- **Cierre** (`/cierre`): `resumen_financiero(inicio, fin)` es **la misma función
  para el día y para el mes**, así la reconciliación `suma(días) = mes` se cumple
  por construcción en vez de por una segunda implementación. Borrador, cierre y
  **reapertura versionada auditada** (`DEC-99`).

Decisiones nuevas: `DEC-99` (política de cierre tardío) y `DEC-100` (frescura de
tasas y `revalidada_at`).

Detalle de diseño que costó encontrar: como el guardado de tasas es idempotente,
una BCV publicada el viernes no genera fila nueva el lunes y el control de
antigüedad la habría dado por rancia, **bloqueando un cobro válido**. Por eso
existe `revalidada_at`.

Límite conocido y deliberado: el desglose fino de los días-unidad ocupados sin
período pagado (cortesía / pausa / reserva / bloqueo / saneamiento) todavía no se
calcula; esas columnas de `cierres_mensuales` quedan en cero a propósito. Sí se
calculan capacidad, ocupados, pagados, ociosos y **costo ocioso**.

Estado de pruebas al cerrar la fase: **156 SQL + 59 unitarias**, todas en verde.

## 4.5. Correcciones de dominio y migración masiva (24/07/2026)

Migraciones `0021..0022`. Ajustes pedidos por el dueño del negocio tras probar la
app con datos reales, más la herramienta para cargar esos datos.

- **El cobro nace en bolívares** (`DEC-102`). El precio no se pacta en USD: el
  hecho fuente es el monto en Bs que entrega el cliente, que **varía cada mes**.
  El USD es una lectura derivada (`round(monto_ves / BCV, 2)`). Desaparece la
  regla «el cobro iguala `precio × BCV`» que asumía la Fase 4.
- **Renovar es cobrar** (`DEC-103`). Antes había dos caminos para el mismo
  ingreso (renovar en `/vencimientos`, cobrar en `/cobros`), lo que permitía
  cobrar dos veces o dejar renovaciones sin cobro. Ahora `renovar_y_cobrar` y
  `vender_unidad` lo hacen en una transacción; el monto es opcional. `/cobros`
  pasa a ser la red de seguridad de lo pendiente. El cobro se deshace desde Caja.
- **Importación masiva** (`/migracion`, solo escritorio, `DEC-104`). Pega filas
  del Excel; cada una es un `carga_inicial` atómico. Los extras de Netflix son
  cada uno su propia cuenta madre (correo propio, capacidad 1); las cuentas
  completas agrupan sus perfiles por correo. La `carga_inicial` no cuenta como
  venta del día y respeta la fecha de vencimiento del Excel sin recalcularla. El
  analizador (`src/domain/importacion.ts`) es puro y lo comparten la vista previa
  y el guardado.

Estado de pruebas: **181 SQL + 79 unitarias**, todas en verde.

Para retomar: `npx supabase start` y `npm run dev` (ver `09-fase-1-setup.md`).

## 4.6. Operación directa y adaptación móvil (27/07/2026)

Las migraciones `0023..0035` y las iteraciones posteriores llevaron la operación
diaria al inventario: venta y gestión directa desde cada cupo, importadores para
las plataformas reales, cobro con tasa BCV/paralela según el tipo de vendedor y
distinción entre revendedor e intermediario.

El inventario conserva la tabla densa en escritorio y usa tarjetas por cuenta en
pantallas menores de `768px`. Netflix y Spotify tienen un selector URL-first para
alternar sus productos (`Cuenta estándar` / `Perfil extra` e `Individual` /
`Familiar`) sin modificar datos. En Spotify la tarjeta muestra también el Gmail
pagador y su origen, consultados por `controles_pago_spotify.cobertura_cuenta_id`.
Cada venta muestra además una franja táctil de vencimiento con estado relativo y
fecha legible; tocarla abre la gestión para renovar o cobrar sin depender de la
tabla de escritorio.

La gestión de una venta preselecciona su `vendedor_origen_id` y expone la
clasificación revendedor/intermediario junto con BCV/paralela. La renovación
hereda esa base automáticamente y la confirma en pantalla; si el operador cambia
la configuración, debe guardarla antes de poder renovar.

El filtro principal del inventario también pasó de estados técnicos de cuenta a
criterios operativos: cupos disponibles en cuentas activas, próximos 5 días,
vencen hoy, vencidos y cuentas suspendidas. Estos filtros se aplican a los cupos,
por lo que una cuenta solo conserva en pantalla las filas que coinciden.

Las renovaciones anticipadas se encadenan al vencimiento vigente, no a la fecha
del pago: un servicio que vence el 29/07 y se paga el 27/07 genera el período
29/07 → 29/08. Si ya venció, el período empieza en la fecha real del pago y se
marca como renovación tardía.
Al confirmarse, el modal muestra el período creado y oculta el botón de envío
para que el operador reciba feedback inequívoco y no renueve dos veces.

Las ventas de cuenta completa conservan en escritorio el bloque Excel de cinco
filas numeradas (115px total), con correo, acceso, venta, cliente y proveedor
fusionados mediante `rowSpan`. Se mantiene compatibilidad estricta con 24
importaciones históricas de Netflix, Disney+, HBO, Prime Video y Crunchyroll que
guardaron la venta en la primera unidad; en móvil se representan como una sola
tarjeta. La regla se limita a productos `cuenta_con_unidades`, por lo que Spotify
individual conserva su única fila.

Los pagos al proveedor pueden registrarse individualmente o por lote desde el
inventario. En el flujo masivo se elige un proveedor, se seleccionan todas sus
cuentas visibles (con posibilidad de desmarcar), se edita el costo de cada una y
se confirma una sola fecha real de pago. Cada ciclo comienza en la renovación
individual que ya tenía guardada; por eso cuentas pagadas juntas pueden seguir
venciendo en días distintos. La migración `0036` agrupa las asignaciones bajo un
lote auditable y ejecuta todo en una transacción.

`/catalogo` dejó de ser una pila de formularios genéricos: ahora es el centro de
configuración operativo, con resumen, navegación por Productos/Plataformas/
Vendedores/Proveedores y edición bajo demanda. La ficha del vendedor incluye la
clasificación revendedor/intermediario y su base BCV/paralela real.

`/clientes` se reorganizó como cartera activa mobile-first. Cada tarjeta resume
contacto, cantidad de servicios y el vencimiento más próximo; al gestionarla se
ven todos sus servicios con estado, fecha, vendedor y enlace al inventario. La
búsqueda cubre nombre, teléfono, plataforma y vendedor, y existen filtros para
próximos cinco días, vencidos y clientes sin WhatsApp. El alta manual queda
secundaria porque el flujo normal crea al cliente al vender.

El importador de `/migracion` se amplió de forma compatible: las hojas anteriores
siguen entrando sin cambios y se mantienen los casos especiales de celdas
combinadas, Canva, Spotify, cuenta completa, costo y renovación de proveedor. Si
la hoja trae las columnas opcionales, ahora también carga alias/notas/estado de
cuenta, notas de cliente y renovación, clasificación/alias/base de tasa del
vendedor y teléfono/tipo/notas del proveedor. Una hoja antigua que solo indica
`Vendió` reutiliza la clasificación que ya existe en Catálogo; no la pisa.

Se corrigió además una inconsistencia financiera del importador: los importes en
USD ya no se convierten todos con BCV. La vista previa y el guardado usan BCV en
venta directa o intermediario y paralela únicamente para el revendedor marcado,
igual que las ventas y renovaciones normales. Si falta la tasa que corresponde,
la importación se bloquea antes de crear los servicios. El selector de modalidad
también queda sincronizado al cambiar de producto, evitando reutilizar la
modalidad de la plataforma anterior.

La pantalla dejó de ser un formulario largo sin jerarquía. El importador ahora
guía en cuatro pasos visibles, usa selectores tipo tarjeta para moneda, concentra
el pegado en un área principal y repliega la documentación extensa. La revisión
muestra métricas claras, tabla densa en escritorio y tarjetas por fila en móvil;
la acción final queda visible en una barra sticky con el producto, modalidad y
cantidad exacta que se importará.

La secuencia pegada también es ahora la secuencia del Inventario: la primera
cuenta del Excel recibe el mayor `orden`, la segunda el siguiente y así
sucesivamente. Una cuenta madre con varios perfiles solo toma la posición de su
primera aparición. La importación deja la confirmación explícita «Orden del Excel
conservado» o informa el fallo, en vez de invertir silenciosamente la lista.

Cuando la columna `Proveedor` contiene una tarjeta propia, la migración `0037`
separa la presentación del secreto. La grilla conserva solo alias/banco y últimos
cuatro; PAN y vencimiento se cifran con AES-256-GCM en
`tarjetas_proveedor_cifradas`. El administrador puede revelarlos durante 90
segundos desde escritorio o móvil y cada acceso queda auditado. El CVV se elimina
durante el análisis y no se almacena ni siquiera cifrado.

El bloque financiero también se reorganizó alrededor de preguntas reales del
negocio. La navegación dejó los rótulos contables ambiguos y ahora separa:
`Resumen diario` (dinero que entró/salió), `Pagos pendientes` (servicios ya
entregados cuyo cobro no se registró), `Pagos y gastos` (salidas), `Resumen
mensual` (ganancia estimada) y `Tasas de cambio`. Cada vista tiene una cabecera
propia, métricas principales y explicaciones breves antes del detalle técnico.

El antiguo “Cierre mensual” se presenta como `Resumen mensual`. Las cifras en
vivo cambian con la operación; guardar un borrador conserva una revisión
provisional; confirmar el mes congela una versión oficial, pero **no mueve
dinero, no cambia ventas y no recalcula tasas**. Si después falta un dato, se
crea una versión corregida y la anterior se conserva. La lógica SQL y las reglas
de auditoría no cambiaron: solo se tradujeron y jerarquizaron en la interfaz.

La entrada de `/inventario` también dejó de ser una lista monocromática. Ahora
abre con un resumen del stock y separa las plataformas activas de las que aún no
tienen cuentas. Cada servicio usa una tarjeta responsive con identidad de color
propia, estado disponible/completo, cuentas, ventas, cupos libres y porcentaje
de ocupación. Las plataformas vacías mantienen su identidad, pero ocupan menos
altura para conservar una navegación móvil ágil.

El inventario ya permite **mover un servicio por falla** desde el mismo modal de
gestión. El selector ofrece únicamente cuentas/cupos de otro recurso con el
mismo producto y modalidad: una venta por perfil exige una unidad libre,
habilitada, limpia y del mismo tipo; una venta completa exige una cuenta
totalmente libre. La migración `0040` ejecuta el cambio bajo bloqueo, cierra la
asignación anterior con `traslado_falla`, abre el tramo nuevo en el mismo
instante, deja el origen en mantenimiento, revoca la entrega anterior y crea una
entrega nueva pendiente. No crea otra suscripción, período, cobro o movimiento
de Caja. El evento conserva IDs de origen/destino en auditoría, nunca secretos.
El selector es exclusivamente administrativo y muestra el correo completo de
la cuenta destino, junto con su alias si existe, para evitar trasladar al cliente
a unas credenciales equivocadas.

Las alertas de vencimiento del inventario usan el signo real de la diferencia
de fechas tanto en móvil como en escritorio: una fecha pasada siempre se muestra
en rojo como `Venció hace N días`; ya no existe la etiqueta amarilla ambigua
`Tienes N días` para los dos primeros días vencidos.

“Gestionar venta” permite corregir un ingreso ya registrado sin borrar ni
sobrescribir historia. La migración `0042` inserta, en una sola transacción, el
reverso del cobro equivocado y su cobro sustituto usando la misma fecha y base
efectiva; actualiza el valor comercial del período y deja auditoría. Esto sirve
para corregir errores del Excel después de importar sin rehacer la venta.

Spotify admite renovaciones de `1`, `3`, `6` o `12` meses tanto desde
Inventario como desde Operaciones. La fecha final se calcula por meses
calendario y el monto representa el paquete completo: una promoción de 3 meses
por `$13` crea un solo período de tres meses con ingreso total `$13`.
Netflix, Disney+ y el resto de productos permiten igualmente renovar cualquier
duración entre 1 y 12 meses. En ellos no hay tarifa sugerida: se escribe el monto
total acordado y el período se encadena desde el vencimiento vigente.

El traslado por falla puede seleccionarse sobre el inventario visible. Los
cupos vacíos compatibles se resaltan y el administrador toca el destino que
reconoce por cuenta/correo antes de confirmar. La barra incluye todos los
destinos como tarjetas clicables aunque la búsqueda actual oculte su cuenta; el
desplegable queda como opción secundaria. La migración `0043` limpia el nombre
operativo del cupo origen al cerrar su asignación y sanea los nombres residuales
de traslados anteriores sin alterar la asignación histórica.

La migración `0044` elimina la inconsistencia entre el estado de una cuenta y
el de sus unidades: mantenimiento se propaga a los cupos habilitados y una
reactivación publica otra vez únicamente los cupos ya preparados como `lista`.
Los pendientes de limpieza permanecen bloqueados. El editor conserva en pantalla
el estado recién guardado, sin obligar a cerrar y volver a abrir el panel.
Los formularios sugieren la tabla vigente según titularidad del correo:
dominio GL = `$4/$10/$18/$32` y correo del cliente = `$5/$13/$22/$40` para
`1/3/6/12` meses. El total continúa editable para registrar excepciones reales.
La tabla no participa en la importación: el respaldo conserva exactamente el
ingreso histórico escrito en cada fila y se irá sincerando al renovar.

Spotify familiar ya no se presenta como perfiles con PIN. Cada posición muestra
el correo y la contraseña de la identidad del miembro, separados del correo de
la madre y del Gmail pagador. La migración `0041` permite que una identidad de
dominio GL o Gmail quede preparada en una unidad todavía libre: no crea una
venta ni altera la ocupación, y se enlaza automáticamente a la suscripción al
confirmar la venta. El importador conserva también estas credenciales cuando la
fila no tiene cliente, monto, teléfono ni vendedor. Las filas libres importadas
antes de `0041` deben volver a pegarse desde el respaldo porque sus credenciales
no llegaron a guardarse en la base anterior.

La migración `0045` conecta el estado documentado `no se puede` con la carga y
la venta reales. El importador lo detecta aunque aparezca repetido en las celdas
del cupo, termina de cargar a los miembros vigentes y marca después toda la
familia como `bloqueada_por_spotify`. Los cupos libres dejan de publicarse como
venta o traslado y PostgreSQL rechaza cualquier alta accidental. En una familia
abierta, un cupo sin identidad pide primero si utilizará correo del cliente o de
dominio GL, junto con su clave; después solicita cliente, teléfono, precio y
vendedor. Todo se guarda atómicamente y un correo personal queda asociado a su
cliente y marcado como no reutilizable.

La migración `0046` reemplaza además el editor genérico de perfil/PIN para las
familias Spotify. El panel usa “cuenta administradora” y “miembros”, expone
correo, clave, titularidad y cliente por cupo, y permite corregir tanto una
identidad preparada como la de una venta activa. La corrección no recrea la
venta ni altera período, precio o cobro: cierra el vínculo de identidad anterior,
abre el nuevo y registra auditoría. El modal de venta también permite sustituir
el acceso preparado antes de confirmarlo, dentro de la misma transacción.

La migración `0047` actualiza también el alta manual: al elegir Spotify familiar,
“Nueva cuenta” crea la identidad administradora, los cinco miembros, cobertura
abierta y Gmail pagador opcional, en lugar de dejar una cuenta base incompleta.
El borrado desde el editor ya no usa un formulario anidado —causa del error de
React al enviar—, sino una acción confirmada que cierra el panel y refresca el
inventario. La cuenta manual incompleta usada para detectar el fallo fue
eliminada mediante `eliminar_cuenta` después de verificar su UUID y producto.

La carga del inventario Spotify pagina internamente los filtros de UUID en lotes
de 100. Con la cartera actual se validaron 471 unidades en 5 lotes y 243 cuentas
en 3 lotes, evitando el error `URI too long` sin omitir identidades preparadas ni
Gmail pagadores.

El importador conserva ahora la renovación del proveedor aunque la inversión sea
`0` en todas las plataformas. Netflix y las rutas genéricas ya lo hacían, pero
Spotify familiar e individual entraban por RPC especiales que omitían el ciclo.
Al volver a pegar las filas originales de Spotify, la carga sincroniza el ciclo
de la cuenta existente y no duplica la venta. La fecha debe volver a venir del
Excel porque las 68 cuentas Spotify afectadas quedaron sin ese dato en Postgres.

El resumen de plataformas calcula ahora capacidad física en vez de restar el
número bruto de asignaciones: una cuenta indivisible sin unidades aporta un
cupo, una venta completa consume todas sus unidades y un uso principal que no
consume capacidad no reduce los cupos familiares. Esto corrige el falso 100 %
de Spotify producido al sumar individuales y familiares en la misma tarjeta.

## Cierre de sesión — 2026-07-28

Trabajo consolidado de la jornada:

- traslado por falla terminado: selector visual de destinos, limpieza del nombre
  en el origen, compatibilidad real y preservación de venta/período/cobro;
- renovación de clientes entre 1 y 12 meses, tarifas sugeridas de Spotify y
  corrección auditable de ingresos importados desde Inventario;
- estados de vencimiento corregidos y sincronización entre cuenta en
  mantenimiento/reactivada y sus unidades;
- inventario Spotify estabilizado para cientos de IDs mediante consultas en
  lotes, sin el error `URI too long`;
- importador corregido para conservar `Renovar` con inversión `0` en todas las
  plataformas, incluidas las rutas especiales familiar/individual de Spotify;
- Spotify familiar alineado con el dominio: miembro = correo/clave, identidades
  preparadas, elección entre dominio GL/correo personal, edición versionada,
  bloqueo familiar `no se puede` y protección SQL contra altas accidentales;
- editor de familias especializado, sin “Perfil” ni “PIN”, y alta manual Spotify
  actualizada con cinco miembros, cobertura, madre y Gmail pagador opcional;
- borrado desde el panel reparado al eliminar el formulario React anidado; la
  cuenta manual incompleta usada para la prueba se eliminó de forma controlada;
- panel de revendedor recibió una primera simplificación/rediseño en paralelo;
  queda pendiente su revisión visual y funcional final contra el resto de los
  cambios de esta sesión.

### Ajuste de Operaciones: pausas y retiros externos (2026-07-28)

- Pausar significa **reservar el cupo para el mismo cliente sin mantenerlo como
  alarma de renovación**. Los pausados vencidos salen de `Atención urgente` y
  `Próximos 5 días`; se consultan en la pestaña neutral `En pausa` y continúan
  visibles en `Todos`.
- Cancelar/liberar cierra automáticamente el modal después del éxito. No libera
  el stock todavía: crea un `Retiro pendiente` para recordar la acción externa.
- `Retiros pendientes` reemplaza el rótulo ambiguo `Limpieza pendiente` y explica
  el flujo: cancelar en GL, retirar el perfil/dispositivo/correo en la plataforma
  y confirmar el retiro. Solo esa confirmación devuelve el cupo al inventario.
- Validación contra PostgreSQL local: **2 suscripciones pausadas**, ambas
  vencidas y ahora fuera de urgencias; **6 retiros pendientes** existentes. Sin
  migración ni modificación de datos. Typecheck y **161 unitarias** en verde.

### Renovaciones de revendedor desde Operaciones (migración `0048`)

El modal rápido de `Renovar y cobrar` mostraba siempre una equivalencia BCV y no
enseñaba el vendedor, aunque PostgreSQL sí heredaba la base guardada. Ahora
precarga el vendedor de la suscripción, muestra su tipo y base BCV/paralela,
convierte el monto con la tasa correcta y permite escoger otro vendedor. Cuando
se corrige, el cambio de vendedor, el período y el cobro se guardan juntos en
`renovar_y_cobrar`; si una parte falla, se revierte todo. La suite `base_tasa.sql`
comprueba el cambio, el cobro a paralela y la auditoría. OdCarmen fue verificada
en solo lectura como `Paola Cruz · revendedor · paralela`; no se alteró su venta.

### Navegación de retiros pendientes al servicio exacto

Cada retiro pendiente tiene ahora `Abrir servicio`. La navegación transporta el
UUID real de la cuenta y el slug de plataforma, muestra únicamente esa cuenta en
Inventario y abre su panel de gestión automáticamente. Así el administrador
puede consultar la cuenta/perfil correcto, realizar el retiro en la plataforma
externa y regresar a confirmar la tarea sin buscar correos o clientes de memoria.
Los 6 retiros actuales tienen cuenta y plataforma enlazables; la comprobación fue
de solo lectura y no liberó ningún cupo.

El panel abierto conserva además el ID de la tarea y presenta una guía contextual
con `Confirmar retiro`. GL no pretende detectar automáticamente cambios dentro de
Netflix, Spotify u otros proveedores: el administrador realiza la acción externa
y su confirmación manual es el evento auditable que devuelve el cupo al stock.
Antes de mostrar el control, el servidor comprueba que la operación siga
pendiente y pertenezca exactamente a la cuenta abierta.

### Retiro sin datos residuales (migración `0049`)

Confirmar un retiro ya no se limita a habilitar el cupo: borra el nombre visible
del cliente/perfil anterior y destruye su PIN cifrado, luego devuelve la unidad a
`lista`. En una liberación de cuenta completa aplica a todas las unidades que
estaban en saneamiento. El editor también acepta un nombre vacío como una orden
real de borrado. Su panel sincroniza la cuenta abierta después de guardar para no
reaparecer con un valor obsoleto de React. La migración corrigió el único residual
histórico confirmado y sin nueva asignación (`Rossy Cohello` en GLFlujo011),
verificando después que Mawa y Blanca continuaran asignadas sin cambios.

### Admisión y titularidad editables en Spotify familiar (migración `0050`)

El marcador importado `no se puede` representa un bloqueo temporal de toda la
familia y no una propiedad del Gmail que aparezca en la misma fila del Excel.
El editor permite ahora cambiar explícitamente la admisión entre abierta y
bloqueada, con su motivo, sin tocar las identidades ya vendidas.

Cada miembro conserva además una de tres titularidades: correo del dominio GL,
Gmail u otro correo propiedad del negocio, o correo personal del cliente. El
administrador puede corregir correo, clave y titularidad en un cupo preparado o
en una venta activa. Esto permite reutilizar el mismo cupo y sustituir un correo
del cliente por uno propio sin recrear la suscripción, el período ni el cobro;
la identidad personal anterior se retira y destruye sus secretos. Las tarifas
sugeridas se basan en la titularidad registrada, no en adivinarla por el texto
del dominio.

El editor genérico de cuentas recibió además una corrección transversal: el
campo interno que indica cambios de correo o contraseña tenía un nombre distinto
entre cliente y servidor. La interfaz respondía “Guardado”, pero nunca llamaba a
`rotar_credenciales_cuenta`. El contrato quedó alineado para Netflix, Prime Video
y todas las plataformas con credenciales de cuenta, manteniendo compatibilidad
con formularios que ya estuvieran abiertos al actualizar la aplicación.

Estado real al cierre: migraciones aplicadas hasta **`0050`**, **244 cuentas**,
**476 unidades** y **432 suscripciones** en la base local.

Validación acumulada: **165 pruebas unitarias**, **22 suites SQL** y typecheck en
verde. La suite de traslado comprueba el cambio de asignación, preservación del
período, mantenimiento, entrega, auditoría, cuenta completa y rechazo a
revendedores. El usuario confirmó la recuperación de la app y la reimportación;
la base local contiene nuevamente la cartera operativa; el conteo exacto del
cierre está consignado arriba para no conservar cifras históricas contradictorias.

## 5. Próxima sesión — lista acordada con el usuario

1. **Rediseñar “Nueva cuenta” para todas las plataformas.** Sustituir el formulario
   genérico y largo por pasos contextuales según el producto, con identidad visual
   coherente y responsive. Mostrar solo campos útiles. En proveedor, pedir una
   fecha exacta y derivar internamente el día ancla; no volver a pedir “Día de
   renovación” e “Inicio del ciclo” como datos separados. Revisar modalidades,
   capacidad, credenciales, costo, proveedor, renovación y excepciones propias de
   Netflix, Spotify y el resto antes de implementar.
2. **Panel del revendedor finalizado visualmente (COMPLETO 2026-07-28).** Adaptada la experiencia responsive, KPI cromáticos, tarjetas de clientes con modalidad, badges de vencimiento y simplificación de Spotify Premium.
3. **Vista móvil colapsable del inventario y rediseño de espaciado (COMPLETO 2026-07-28).** Rediseño estético con tipografía pulida (`text-xs`), badges HSL suaves, `whitespace-nowrap` en 100% de las celdas, desplegables individuales (`▲ Cerrar` / `▼ Abrir`) y control masivo (`📁 Cerrar todas` / `📂 Abrir todas`).
4. **Corrección de sincronización de proveedor en importaciones masivas (COMPLETO 2026-07-28).** Resuelto el bug de nombre de columna `dia_ancla_proveedor` en `sincronizarCicloProveedorImportado`.
5. **Agregar los siguientes pasos junto con el usuario.** No asumir todavía funcionalidades posteriores a estas prioridades.

## 6. Qué hacer si hay que reiniciar desde cero

- Borrar únicamente `src/`, `supabase/` (excepto este `docs/`) y `tests/` — nunca `docs/`.
- Releer este archivo y `06-decisiones-pendientes.md`.
- Repetir la sección 3 (stack) tal cual, salvo que el usuario pida cambiarlo explícitamente.
- No hace falta repetir ninguna de las preguntas ya resueltas (`DEC-01` a `DEC-95`): son decisiones de negocio, no de implementación, y no caducan porque el código se reescriba.
