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

Validación acumulada: **134 pruebas unitarias** y typecheck en verde; el último
build de producción también pasó. PostgreSQL real contiene controles con Gmail para ambas
variantes de Spotify. Queda pendiente una revisión visual manual completa en
teléfonos reales de todas las plataformas y sus modales.

## 5. Qué hacer si hay que reiniciar desde cero

- Borrar únicamente `src/`, `supabase/` (excepto este `docs/`) y `tests/` — nunca `docs/`.
- Releer este archivo y `06-decisiones-pendientes.md`.
- Repetir la sección 3 (stack) tal cual, salvo que el usuario pida cambiarlo explícitamente.
- No hace falta repetir ninguna de las preguntas ya resueltas (`DEC-01` a `DEC-95`): son decisiones de negocio, no de implementación, y no caducan porque el código se reescriba.
