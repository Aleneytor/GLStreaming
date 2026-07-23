# Registro de decisiones y puntos pendientes

Este archivo conserva lo ya confirmado y separa las preguntas que todavía pueden cambiar el esquema o los cálculos. No autoriza comenzar la programación.

## Decisiones confirmadas — 22/07/2026

| ID | Decisión | Consecuencia de diseño |
|---|---|---|
| DEC-01 | Los servicios se venden por **mes calendario**. | Cada período pagado sigue el calendario real del mes; la experiencia del cliente no se confunde con la obligación fija del proveedor. |
| DEC-02 | No habrá migración ni importador desde Excel. | El administrador cargará los datos manualmente y el historial confiable empieza en la fecha de corte. |
| DEC-03 | Una suscripción no queda pegada a un perfil/cuenta. | `asignaciones_inventario` registra cada traslado y puede apuntar a una unidad o cuenta completa; una falla cambia la asignación sin crear otra venta. |
| DEC-04 | El precio comercial se introduce manualmente y se congela en USD; el cliente paga en Bs y los costos/pagos usan USDT. | Cada período conserva precio USD, monto esperado/recibido VES y ambas tasas históricas; proveedores y gastos conservan USDT y su snapshot VES. |
| DEC-05 | La API es la autoridad para BCV, paralela, vigencias y calendario hábil. | GL Streaming conserva exactamente las publicaciones/observaciones recibidas y no calcula feriados por su cuenta. |
| DEC-06 | El cobro ordinario al cliente usa la BCV y la rentabilidad se analiza también con la paralela. | La venta congela BCV, paralela, `precio_comercial_usd`, `monto_ves_esperado` y `monto_ves_cobrado`; no existe selector de tasa ni tarifario obligatorio. |
| DEC-07 | El panel de ganancias totales debe mostrar BCV y paralela simultáneamente. | Presenta el resultado consolidado en Bs y ambos equivalentes, siempre con tasa y fecha visibles. |
| DEC-08 | Producto de inventario, capacidad física y modalidad comercial son conceptos distintos. | La cuenta estándar/extra identifica qué se gestiona; perfil/completa/extra identifica cómo se vende. Una venta completa consume la capacidad híbrida sin crear unidades o ventas artificiales. |
| DEC-09 | Credenciales, PIN, costos y datos operativos permanecen separados. | RLS se combina con tablas restringidas y proyecciones seguras; no se confía en ocultar columnas en React. |
| DEC-10 | Cada fin de mes debe existir un corte de ganancias. | Se genera un cierre por mes calendario con ingresos y costos de proveedor prorrateados, gastos operativos por fecha, caja, días vacíos, costo ocioso y conversiones BCV/paralela. |
| DEC-11 | El nombre definitivo de este proyecto es **GL Streaming**. | Toda la documentación, interfaz y configuración usarán exclusivamente este nombre. |
| DEC-12 | Caja debe mostrar ventas y ganancias diarias. | Se separan ventas nuevas/renovaciones, entradas/salidas, flujo neto y resultado devengado; los días suman al cierre mensual. |
| DEC-13 | Los gastos personales quedan fuera del sistema. | Solo se registran movimientos con propósito empresarial y trazabilidad. |
| DEC-14 | Renovar una cobertura con obligación financiera real debe registrar también el pago al proveedor. | La acción `Registrar renovación y pago` solo aplica cuando existe un ciclo financiero; crea el egreso USDT en Caja y el siguiente ciclo en una transacción auditada. Un proveedor meramente operativo no la activa. |
| DEC-15 | Se necesita un apartado compacto dentro de Caja para gastos operativos no vinculados a proveedores. | Fecha/hora, categoría, descripción y monto USDT bastan; contraparte, vínculo y nota son opcionales. |
| DEC-16 | Los pagos a proveedores financieros y los gastos operativos se registran en USDT y se valorizan automáticamente con la paralela. | Como convención interna, `1 USDT = 1 USD de referencia`; se guardan `monto_usdt`, `tasa_paralela_id` y `monto_ves_snapshot`, sin selector BCV. Una recarga de Nigeria es un solo gasto y los nairas son nota opcional; el dinero cubierto por esa recarga no se registra otra vez como pago/costo de ciclo. |
| DEC-17 | El cliente puede usar y pagar durante todo su día de renovación. | Una venta 22/07 se contacta el 22/08 y solo aparece vencida desde el 23/08. El día se atribuye al nuevo período si se confirma la renovación o a cortesía si no se confirma. |
| DEC-18 | La cadencia objetivo de la paralela es cada cinco minutos, todos los días. | Cada observación conserva la hora original y la recepción interna; los egresos toman automáticamente la última válida al confirmarse. La configuración desplegada de Kuanto debe alinearse con esta regla. |
| DEC-19 | La BCV se publica de lunes a viernes a las 5:00 p. m. para la próxima fecha hábil. | `date` define `fecha_vigencia`, `fetchedAt` la observación del scraper y GL Streaming registra su propia recepción; viernes y feriados llegan resueltos. `publicada_at` queda opcional porque el contrato actual no la entrega. |
| DEC-20 | Si coexisten BCV vigente y próxima, el formulario usa automáticamente la publicación nueva para calcular el cobro. | No se agrega selector; se muestra claramente `Vigente para DD/MM/AAAA` y la operación congela esa BCV junto con la paralela contemporánea. |
| DEC-21 | El costo/pago proveedor se valoriza con la paralela disponible al confirmar la renovación. | Un inicio futuro solo controla el devengo; no se espera ni se inventa una tasa futura. |
| DEC-22 | Reversos y anulaciones son excepcionales. | Se ofrecen como acción secundaria auditada desde el detalle y en un bloque pequeño de Caja, nunca como módulo principal. |
| DEC-23 | Vencer no pausa, cancela ni libera automáticamente al cliente. | El administrador decide mantener activo, pausar o cancelar/liberar; son válidos clientes activos que muestran `Vencido hace X días`. |
| DEC-24 | Pausar al cliente conserva la unidad asignada. | El perfil no vuelve al stock hasta una liberación explícita y puede reactivarse para la misma suscripción. |
| DEC-25 | La renovación tardía nunca comienza antes del pago completo ni del acceso reactivado. | Si seguía activo, inicia al recibir el total; si estaba pausado, inicia en la fecha posterior entre pago completo y reactivación. No existe ingreso retroactivo y la próxima fecha se calcula desde ese inicio. |
| DEC-26 | Solo la renovación del proveedor conserva día ancla fijo. | Un mes corto ajusta la fecha y luego recupera el ancla; la flexibilidad concedida al cliente no mueve esta obligación. |
| DEC-27 | El cierre debe explicar días sin ingreso retenidos para un cliente. | Distingue período pagado, cortesía activa, pausa retenida y disponibilidad; el costo proveedor no se duplica. |
| DEC-28 | Una promesa de pago puede tener recordatorio `Recontactar el`. | Es opcional y comercial; no crea ingreso, no cambia el período ni afecta la renovación fija del proveedor. |
| DEC-29 | Pagar al proveedor temprano o uno/dos días tarde no mueve su ciclo fijo. | La cobertura y la próxima renovación siguen el `dia_ancla_proveedor`; la fecha efectiva del pago solo determina la salida en Caja. |
| DEC-30 | Los clientes siempre pagan cada venta o renovación completa. | No existen abonos ni saldos; el cobro confirmado debe igualar el monto VES esperado derivado del precio USD total y la BCV, aunque ocurra después de la fecha prevista. |
| DEC-31 | Los proveedores siempre reciben el costo completo del ciclo. | No existen complementos ni estados parciales; costo y pago se guardan por separado para devengo/Caja, pero tienen el mismo monto USDT. |
| DEC-32 | La fuente BCV será `GET https://bcvscrapper.vercel.app/api/bcv`, una API propia del usuario. | Se mapeará `date` como vigencia, `usd` como Bs/USD, `source` como fuente y `fetchedAt` como observación del scraper; la recepción interna se guarda aparte y no se calcula el calendario hábil. |
| DEC-33 | La tasa paralela proviene de Kuanto, también propiedad del usuario. | `price` promedia exclusivamente los valores `buy` positivos disponibles de Binance, Bybit y Yadio; `sell` queda solo en `details`. GL Streaming no recalcula ese promedio. |
| DEC-34 | El desarrollo y las pruebas se realizarán completamente en local. | No se usarán VPS, DNS ni servicios productivos durante las fases actuales. |
| DEC-35 | La web se publicará al final en el VPS propio mediante `glcuenta.com`. | El dominio y el servidor quedan reservados para la fase final; no se cambia ahora su configuración. |
| DEC-36 | El contrato inicial de lectura paralela será la última fila de `p2p_rate_history`. | Un adaptador de servidor consulta `id`, `price`, `details` y `created_at` con clave pública/publicable protegida por RLS; un endpoint propio futuro podrá sustituirlo sin tocar finanzas. |
| DEC-37 | Se documentará el comportamiento de todas las plataformas y productos de lanzamiento antes de programar. | El catálogo de `docs/plataformas/` es criterio de salida de la Fase 0; las dudas que cambien tablas o restricciones deben resolverse antes de las migraciones. |
| DEC-38 | Una cuenta HBO tiene cinco perfiles físicos y puede venderse por perfil o completa. | La misma cuenta habilita ambas modalidades en intervalos distintos; no queda clasificada permanentemente bajo una sola `modalidad_id`. |
| DEC-39 | En HBO, venta por perfiles y venta completa son mutuamente excluyentes durante su asignación o reserva. | Cualquier perfil retenido bloquea la venta completa y una venta completa bloquea los cinco perfiles; vencer o pausar no libera inventario. |
| DEC-40 | La venta completa de HBO es una sola suscripción que consume las cinco unidades de capacidad. | Genera un período, cobro e ingreso; ocupa cinco unidades-día, no produce vacancia interna y no se representa mediante cinco ventas o un sexto perfil. |
| DEC-41 | El costo proveedor de HBO pertenece una sola vez a la cuenta madre. | En modo perfiles puede distribuirse analíticamente entre cinco slots; en modo completo se compara con el ingreso total sin duplicar costo ni pérdida ociosa. |
| DEC-42 | La cuenta estándar de Netflix y la mayoría de las plataformas basadas en cuentas son híbridas: admiten venta por perfiles o completa. | El núcleo implementa el arquetipo común, pero cada producto/ficha confirma capacidad, secretos, entrega y excepciones antes de habilitarlo. |
| DEC-43 | Una cuenta Disney+ tiene siete perfiles físicos y se vende por perfil o completa. | En modo individual admite hasta siete suscripciones; la venta completa consume los siete sin crear un octavo perfil ni siete ventas. |
| DEC-44 | El costo proveedor de Disney+ pertenece una sola vez a la cuenta madre. | En modo perfiles se distribuye analíticamente entre siete slots; en modo completo hay un ingreso/cobro y no existe vacancia interna durante el período pagado. |
| DEC-45 | Prime Video usa cuentas híbridas de siete perfiles, vendibles por perfiles o completas. | Aplica las mismas exclusiones de cuenta híbrida; una venta completa consume siete unidades pero genera un período, cobro e ingreso. |
| DEC-46 | Plataforma, producto de inventario y modalidad comercial se modelan por separado. | `productos_plataforma` define cuenta estándar/perfil extra y capacidad; `producto_modalidades` limita las formas de venta; la cuenta referencia el producto. |
| DEC-47 | Netflix tiene dos productos actuales: cuenta estándar de cinco perfiles y perfil extra de capacidad uno. | La estándar permite `perfil` o `cuenta_completa`; el extra solo `extra` y nunca es un sexto slot de la estándar. |
| DEC-48 | El perfil extra de Netflix suele ser más costoso y estable. | El sistema guarda producto y precio real, sin inferirlo por monto ni codificar una tarifa; estabilidad queda descriptiva y no elimina fallas/historial. |
| DEC-49 | La estructura física de un producto debe estar completa antes de publicar el recurso. | Las cuentas con unidades crean exactamente sus slots físicos y, cuando aplique, guardan capacidad vendible separada; un recurso indivisible usa capacidad uno sin hijo artificial. La posible cobertura proveedor de YouTube queda pendiente en `YT-06`. |
| DEC-50 | Producto y modalidad son identidad histórica de una suscripción, no campos reclasificables. | Renovar conserva ambos; cambiar de producto o forma de venta cierra la suscripción y crea otra sin reescribir períodos anteriores. |
| DEC-51 | El mecanismo de entrega se configura por combinación producto/modalidad. | Credenciales, invitación, asiento u otro flujo no se infieren por el nombre del producto; una combinación con mecanismo pendiente no se activa para vender. |
| DEC-52 | YouTube conserva únicamente tres servicios actuales y no acepta nuevas ventas. | El producto queda `solo_cartera`; tres es un conteo de cartera, no capacidad ni límite. La carga inicial no se clasifica como venta nueva y el permiso de renovación se resolverá en `YT-07`. |
| DEC-53 | En YouTube se registra el Gmail y la contraseña que pertenecen al cliente. | El recurso exige cliente titular; ambos datos van cifrados al almacén restringido. Solo una máscara generada por el servidor puede aparecer en la grilla administrativa; los valores completos nunca llegan a notas, stock, Caja, reportes generales o respuestas de revendedor. |
| DEC-54 | Cada fila YouTube identifica un servicio sobre el Gmail personal del cliente y no convierte esa identidad en inventario reutilizable. | La capa cliente se retira al finalizar y nunca queda disponible para otra persona. Si existe un plan/cupo proveedor compartido, será otro recurso separado según `YT-06`. |
| DEC-55 | El proveedor YouTube predeterminado es el propio negocio, pero el campo debe ser editable. | `proveedores` admite tipo propio/tercero y se identifica por nombre, alias, teléfono o ambos; `Yo` es un registro configurable, no texto hardcodeado. |
| DEC-56 | Proveedor operativo y relación financiera son conceptos separados. | Elegir `Yo` identifica quién gestiona el servicio, pero no crea ciclo, costo ni pago; un egreso solo nace de un desembolso real confirmado. |
| DEC-57 | Crunchyroll usa cuentas de cinco perfiles vendibles por perfil o completas. | Aplica el arquetipo híbrido: hasta cinco asignaciones individuales o una asignación completa que bloquea toda la cuenta. |
| DEC-58 | En una cuenta compartida, el cliente no puede modificar los datos de la cuenta madre. | Login, contraseña, recuperación, plan y datos maestros son administrados por GL Streaming; entregar acceso concede uso, no propiedad o mutación. |
| DEC-59 | La entrega estándar por perfil incluye correo, contraseña, nombre de perfil, PIN y fecha de vencimiento/renovación. | El servidor genera el paquete para la asignación vigente; la auditoría guarda versiones y metadatos, nunca otra copia de los secretos en claro. |
| DEC-60 | Si falla una cuenta compartida vendida, el servicio se traslada conservando el período. | Perfil usa otro slot libre; cuenta completa usa otra cuenta totalmente libre. Solo cambia el tramo de asignación/entrega y el origen queda en mantenimiento; no cambian venta, período, precio, cobro o fecha. |
| DEC-61 | Si un cliente no renueva y se decide liberar, se elimina/restablece su perfil remoto y el slot rota a futuros clientes. | La asignación queda en `cierre_pendiente` y la unidad en `pendiente_limpieza`; solo confirmar limpieza y revocación externa cierra/habilita ambos sin borrar historia. |
| DEC-62 | En cuentas compartidas por perfiles, la revocación normal al vencer es cerrar sesiones/dispositivos relacionados con el perfil del cliente vencido y mantener las credenciales maestras. | Evita redistribuir contraseña a todos los clientes activos; la limpieza del perfil y el cierre de sesiones son los controles que habilitan reutilizar el slot. |
| DEC-63 | Si una plataforma no permite cerrar sesiones del cliente vencido, se rota la credencial de la cuenta como excepción. | FlujoTV queda confirmado bajo esta política. Spotify usa su propio flujo escalonado y, ante falla familiar, puede exigir recrear la identidad; no se fuerza dentro de esta regla. |
| DEC-64 | Paramount+ usa cuentas híbridas de seis perfiles vendibles por perfil o completas. | Aplica exclusión entre perfiles y cuenta completa; la venta completa consume seis unidades y genera un solo ingreso. |
| DEC-65 | ~~Universal+ tiene seis perfiles físicos, pero solo cinco perfiles vendibles.~~ **Corregida por `DEC-96` el 22/07/2026: Universal+ tiene cinco perfiles y los cinco son vendibles.** | Ver `DEC-96`. |
| DEC-66 | VIX usa cuentas híbridas de cinco perfiles vendibles por perfil o completas. | Aplica el mismo arquetipo híbrido y exclusión temporal de modalidades. |
| DEC-67 | FlujoTV usa cuentas de tres dispositivos/cupos y debe rediseñarse como inventario por cupos. | Cada cupo se controla individualmente; una venta completa consume tres cupos y la liberación exige rotación de credenciales porque no hay cierre de sesiones suficiente. |
| DEC-68 | Telelatino queda registrado inicialmente como cuenta completa de tres dispositivos. | No se habilita venta individual hasta confirmarla; la venta completa es una sola suscripción que consume los tres dispositivos. |
| DEC-69 | CapCut permite tres dispositivos, pero GL Streaming venderá inicialmente solo dos por seguridad. | `capacidad_fisica = 3` y `capacidad_vendible_habilitada = 2`; el tercer cupo no aparece como stock ni pérdida ociosa comercial. |
| DEC-70 | Gemini/Google Cloud se modela inicialmente como grupo familiar de cinco miembros sobre un Gmail principal. | El cliente aporta únicamente su correo; no recibe contraseña del Gmail principal y al vencer se saca del grupo para liberar el cupo. |
| DEC-71 | Canva usa un correo principal con panel educativo y se vende por invitación/asiento al correo del cliente. | El cliente no recibe contraseña del correo principal; al vencer se elimina del panel y solo entonces el asiento vuelve a disponibilidad. |
| DEC-72 | Canva puede venderse por duraciones variables, como 1, 3, 6 o 12 meses. | El período guarda inicio, fecha de renovación y cantidad de meses/duración como snapshot; el cierre mensual prorratea el tramo vendido sin crear renovaciones internas ficticias. |
| DEC-73 | Spotify separa la identidad de acceso de la cobertura Premium. | Una suscripción puede depender simultáneamente de una identidad Spotify y de un plan individual o cupo familiar; reemplazar una capa no reescribe la otra ni la historia comercial. |
| DEC-74 | Spotify opera cuatro mecanismos iniciales: individual propia por GPay, individual activada por proveedor, miembro familiar y uso vendido de la madre. | Origen de activación, titularidad del correo y modalidad comercial se guardan como dimensiones distintas, no como un enum que mezcle conceptos. |
| DEC-75 | Una identidad Spotify sobre dominio GL es reutilizable; una identidad con correo del cliente no lo es. | La primera vuelve a stock solo después de limpiar contenido y revocar acceso. La segunda se retira, destruye sus secretos y exige nuevos datos si el cliente regresa. |
| DEC-76 | Una familia Spotify tiene una madre administradora y cinco miembros. | Los cinco cupos son la capacidad comercial habitual; el costo se registra una vez en la familia. |
| DEC-77 | El uso de la madre Spotify puede venderse excepcionalmente y coexistir con los cinco miembros. | Usa un alcance principal concurrente, no `cuenta_completa`; venderla no bloquea ni multiplica los cupos. |
| DEC-78 | Vender la madre concede uso normal de Spotify, no control administrativo. | La cuenta y su correo siempre pertenecen a GL Streaming; añadir/eliminar miembros y cambiar datos maestros permanece estrictamente reservado al administrador. |
| DEC-79 | Una madre no vendida es infraestructura operativa, no vacancia. | No produce costo ocioso adicional; si se vende, su ingreso se suma sin duplicar el costo familiar. |
| DEC-80 | `no se puede` bloquea nuevas incorporaciones para toda la familia y es recuperable. | Los miembros existentes continúan activos; ningún cupo vacío se publica como stock hasta que el administrador confirme manualmente la recuperación. |
| DEC-81 | La caída de una familia Spotify afecta a todos sus servicios activos y se procesa como incidente por lote. | Cada tarea conserva suscripción, precio, cobro, período y vencimiento; el lote no crea ventas o renovaciones ficticias. |
| DEC-82 | La restricción anual de cambio de familia puede exigir recrear la identidad Spotify. | Se retira/renombra la instancia antigua, se crea otra con el correo habitual, se restaura el contenido y se asigna nueva cobertura. La antigua queda archivada y no vuelve a stock automáticamente. |
| DEC-83 | Una individual activada por proveedor usa todos los datos suministrados por GL Streaming o el cliente. | El proveedor solo activa y atiende fallas; ante una falla reactiva la misma identidad y se registra una gestión de soporte, no un reemplazo. |
| DEC-84 | Cada individual propia por GPay tiene exactamente un Gmail pagador operativo. | Es una referencia restringida necesaria para cancelar o cambiar el plan; no es proveedor, cliente o login vendido y la aplicación no guarda su contraseña, recuperación o 2FA. |
| DEC-85 | Spotify se vende por 1, 3, 6 o 12 meses, aunque la cobertura se renueve mensualmente. | El cliente puede pagar un solo período multimes y Caja registra ese cobro; los costos/pagos proveedor continúan como ciclos mensuales independientes. |
| DEC-86 | El manejo de mora Spotify es manual y depende del cliente. | El administrador puede cerrar sesiones, después rotar la contraseña y solo al final retirar del familiar o cancelar la individual; no existen plazos automáticos codificados. |
| DEC-87 | En ventas intermediadas se separan beneficiario y contacto de cobro. | Cada cuenta conserva el nombre de quien usa el servicio, mientras renovaciones y cobros pueden agruparse bajo quien compró para terceros; eso no concede automáticamente rol o comisión de revendedor. |
| DEC-88 | Finalizar una identidad Spotify propiedad del cliente destruye sus secretos. | El historial comercial/financiero mínimo permanece archivado, pero una reactivación exige que el cliente vuelva a entregar sus datos. |
| DEC-89 | Rescatar a un cliente antiguo con cobertura individual no genera otro cobro. | El precio más alto de la modalidad con correo del cliente ya cubre la excepción; solo cambia cobertura/costo y se conserva el período existente. |
| DEC-90 | Una madre vendida que no renueva puede sanearse y venderse nuevamente sin afectar a sus miembros. | Se rota su contraseña, se limpian playlists/“Me gusta” y se crea una nueva asignación de uso principal; los cinco cupos mantienen sus relaciones. |

## Decisiones confirmadas — 22/07/2026 (sesión de revisión de lectura)

| ID | Decisión | Consecuencia de diseño |
|---|---|---|
| DEC-91 | Resuelve `YT-06`/`YT-04`: cada Gmail de YouTube recibe un plan individual pagado con tarjeta propia del negocio; no existe plan/cupo compartido. | Capacidad y costo proveedor quedan fijados en `1/1` por servicio; la antigua `Inversión` representa un desembolso real que se registra como costo/pago igual que cualquier ciclo de proveedor. Además, el negocio dejó de vender YouTube activamente y pidió no invertir más tiempo de diseño en esta ficha: de los 3 registros, solo 2 son comerciales reales y el tercero (cuenta personal del usuario) se excluye del inventario/tracking. `YT-01`, `YT-02`, `YT-03`, `YT-05` y `YT-07` quedan despriorizados, sin bloquear ninguna fase. |
| DEC-92 | Resuelve `CAN-01`: la cuenta principal de Canva admite 500 asientos (uso actual ~30). | `capacidad_fija = 500` en `productos_plataforma` para Canva; deja de ser bloqueante de esquema. |
| DEC-93 | Resuelve `GEM-01`: Gemini y Google Cloud comparten el mismo Gmail principal y la misma capacidad de cinco cupos familiares. | Un solo `producto_plataforma` para ambos; no se separan en dos productos con costos distintos. |
| DEC-94 | Resuelve `NET-05`/`NET-06`: el perfil extra de Netflix es un perfil dentro de otra cuenta madre propia del negocio, con credenciales y ciclo de proveedor propios e independientes de la cuenta estándar. | Se entrega igual que un perfil de cuenta híbrida normal (correo/contraseña/perfil/PIN/fecha) pero sobre esa cuenta madre separada; su costo/renovación de proveedor nunca se mezcla con el de la cuenta estándar. |
| DEC-97 | **Resuelve `SEC-02` y `RES-01` (aclarado 23/07/2026):** el revendedor ve, de SUS ventas activas, el mismo paquete de acceso que recibe el cliente final (correo, contraseña, nombre de perfil, PIN). NO ve stock disponible (el negocio no publica inventario; los revendedores piden stock por fuera de la app). Su única ventana es `v_mis_ventas_revendedor`. | Sin vista de disponibilidad ni tabla de solicitudes para revendedor. Las credenciales de sus ventas se entregan por una acción de servidor que verifica la propiedad y descifra en memoria (las tablas de credenciales siguen admin-only por RLS). El admin sí ve disponibilidad, solo en su panel. |
| DEC-98 | **El secreto expuesto de Kuanto NO se rota** (decisión del usuario, 23/07/2026): el proyecto funciona y no quiere intervenirlo. GL Streaming procede con la Fase 4 igualmente. | La integración solo **lee** `p2p_rate_history` con la clave pública, distinta de la expuesta (`service_role`, de escritura). El riesgo que permanece es que un tercero inyecte una tasa falsa que GL Streaming congelaría en operaciones reales. Se mitiga **en el lado de GL Streaming**: validación de rango contra la última tasa conocida, control de antigüedad, guardado idempotente por `fuente_registro_id` y prohibición de inventar valores si la fuente falla. `SEC-03` y `RATE-08` quedan cerradas como "asumidas por el usuario". |
| DEC-96 | **Corrige `DEC-65` y resuelve `UNI-01`:** Universal+ tiene **cinco perfiles físicos y los cinco son vendibles**, igual que Netflix estándar. No existe un "sexto perfil". | `capacidad_fija = 5` y `capacidad_vendible = 5`; Universal+ deja de ser un caso de capacidad física ≠ vendible (el único confirmado que queda es CapCut 3/2). `UNI-01` se elimina por carecer de objeto. |
| DEC-95 | Netflix dispara verificaciones de hogar ("No perteneces a este hogar") de forma irregular (~15 días, sin fecha fija) sobre perfiles individuales de una venta `cuenta_completa` del producto A; nunca en modalidad `perfil` ni en el producto extra (por eso este último es más estable). | Nueva entidad `verificaciones_hogar_netflix` (una fila por evento, nunca se sobrescribe) con acción manual de registro y casilla de "código solicitado" por perfil. Conteo acumulativo por perfil, no se reinicia con la renovación. Un código resuelve el evento sin tocar período/precio/cobro/fecha; un segundo evento sin código disponible dispara el traslado por falla de cuenta completa ya existente (no una falla parcial). Detalle en `docs/plataformas/netflix.md` y `docs/02-modelo-dominio.md`. |

## P0 — Antes de implementar

| ID | Decisión pendiente | Propuesta de trabajo |
|---|---|---|
| RATE-03 | ¿El panel histórico convierte con tasa de cierre o agrega conversiones de cada movimiento? | Mostrar ambas métricas con nombres distintos: valor de cierre y equivalente histórico; para la tarjeta principal usar la tasa de la fecha de corte. |
| FIN-02 | ¿`Inversión` es costo contractual o pago realizado? | Mantener ciclo de costo y pagos al proveedor por separado, ambos en USDT y con snapshot Bs a tasa paralela. |
| SEC-01 | ¿Las credenciales y datos aparentes de tarjeta mostrados eran reales? | Considerarlos expuestos: rotar/reemplazar y eliminar códigos de seguridad de todas las copias. |
| ~~SEC-02~~ | **Resuelto por `DEC-97`:** el revendedor ve el paquete de acceso completo (correo/contraseña/perfil/PIN) de SUS ventas activas, igual que el cliente final. | Ver `DEC-97`. |
| AUTH-01 | ¿Todo vendedor tendrá login? | Permitir vendedor manual sin login y vincularlo después a un usuario autenticado. |
| CLOSE-01 | ¿El cierre queda automático o requiere aprobación? | Generar borrador automáticamente al iniciar el mes siguiente y exigir revisión del admin para cerrarlo. |
| CLOSE-02 | ¿Cómo tratar operaciones ingresadas después de cerrar? | Permitir reapertura/versionado solo al admin o ajuste posterior; nunca modificar silenciosamente. |
| CASH-01 | ¿El día actual se “cierra” o permanece dinámico? | Mantenerlo provisional y en vivo; el bloqueo oficial ocurre con el cierre mensual. |
| SEC-03 | ¿Cómo cerrar la exposición del secreto encontrado en el repositorio público de Kuanto? | Revocarlo/rotarlo inmediatamente, actualizar los jobs mediante Vault/secretos, purgarlo del historial Git y habilitar escaneo/protección de pushes. Borrarlo solo del último commit no es suficiente. |
| RATE-08 | ¿Cómo alinear la cadencia real de Kuanto con los cinco minutos confirmados? | Auditar los programadores desplegados: el SQL versionado indica una hora y la muestra en vivo mostró ciclos de diez minutos con pares duplicados. Conservar un solo job a cinco minutos sin borrar el historial. |
| RATE-09 | ¿Cómo endurecer la fuente BCV antes de usarla en cierres? | Habilitar verificación TLS y rechazar una respuesta sin fecha oficial; no sustituirla por la fecha UTC actual. |
| CAN-02 | ¿La invitación pendiente consume cupo inmediatamente o solo cuando el cliente acepta? | Define reserva, disponibilidad y cierre. |

*(`NET-05`, `NET-06`, `GEM-01` y `CAN-01` se resolvieron el 22/07/2026 — ver `DEC-91` a `DEC-94` arriba. `YT-01`, `YT-02`, `YT-03`, `YT-04`, `YT-05`, `YT-06` y `YT-07` se resolvieron o quedaron explícitamente despriorizados en la misma sesión — ver `DEC-91` y `docs/plataformas/youtube.md`.)*

## P1 — Antes de la fase correspondiente

| ID | Decisión pendiente | Propuesta inicial |
|---|---|---|
| BR-02 | ¿Una reserva genera capacidad ociosa? | Contarla como ociosa hasta existir período pagado, salvo que haya anticipo. |
| BR-03 | ¿Cómo se renueva una cuenta completa? | Crear un nuevo período mensual sobre la misma suscripción; la asignación conserva alcance de cuenta y continúa consumiendo toda su capacidad, sin unidades ficticias. |
| FIN-04 | ¿Capacidad ociosa se reporta por mes del cliente, ciclo proveedor o rango libre? | Calcular por intersección de rangos y ofrecer filtros; el denominador usa días reales del ciclo. |
| RATE-06 | ¿Cuántos decimales mostrar en tasa y equivalente? | Guardar alta precisión; mostrar tasa según fuente y USD con dos decimales, sin redondear pasos intermedios. |
| RATE-10 | ¿Qué antigüedad máxima puede tener una paralela al confirmar una operación? | Definir por separado el umbral que solo advierte y el que bloquea o exige una excepción administrativa auditada; mostrar siempre los minutos desde `observada_fuente_at`. |
| CLOSE-04 | ¿Cómo presentar el primer mes si el sistema inicia a mitad de período? | Etiquetarlo como cierre parcial desde la fecha de corte; no estimar días anteriores. |
| CLOSE-05 | ¿Una unidad reservada cuenta como ocupada o vacante para el cierre? | Mostrarla separada y considerarla ociosa hasta que exista servicio/pago, salvo decisión distinta. |
| PROV-03 | ¿Se adjuntará comprobante del pago proveedor? | Dejarlo opcional para una fase posterior; en MVP usar referencia no sensible y nota. |
| PROV-04 | ¿Qué ocurre si cambia el costo al renovar? | Confirmar el nuevo monto y guardarlo solo en el ciclo nuevo, preservando los anteriores. |
| COST-04 | ¿Se adjuntarán facturas/comprobantes de gastos? | Dejar referencia y nota en MVP; archivos pueden añadirse posteriormente. |
| ~~RES-01~~ | **Resuelto por `DEC-97`:** el revendedor no solicita stock por la app; pregunta directamente por fuera. No hay flujo de solicitudes ni de disponibilidad para revendedor. | Ver `DEC-97`. |
| UX-01 | ¿Alertas solo en panel o también WhatsApp/email? | Panel primero; mensajería externa en una fase posterior. |
| INFRA-01 | ¿Supabase de producción será administrado o autoalojado en el VPS? | Decidirlo en la fase final después de revisar recursos, mantenimiento, backups y aislamiento; no afecta el desarrollo local. |
| FLU-01 | En FlujoTV, ¿la venta por cupo entrega siempre la misma credencial o se guarda algún identificador de dispositivo? | Define secretos de unidad y texto de entrega. |
| FLU-02 | Al rotar credenciales de FlujoTV, ¿el sistema debe generar lista automática de clientes activos por notificar o basta confirmación manual? | Define ergonomía de interfaz, no el modelo base. |
| TEL-01 | ¿Telelatino permite vender dispositivos individuales o solo cuentas completas? | Define modalidades habilitadas. |
| TEL-02 | ¿Telelatino permite cerrar sesiones/dispositivos o exige rotar credenciales como FlujoTV? | Define revocación externa. |
| CAP-01 | En CapCut, ¿la venta completa entrega los tres dispositivos o mantiene uno reservado por seguridad? | Define capacidad consumida y entrega. |
| CAP-02 | ¿CapCut permite cerrar un dispositivo/sesión concreta o exige rotar credencial? | Define revocación externa. |
| GEM-02 | ¿Existe venta completa del grupo familiar de Gemini/Google Cloud o solo cupos individuales? | Define modalidades habilitadas. |
| GEM-03 | ¿Qué casos especiales existen al sacar/agregar personas al familiar? | Define estados intermedios y acciones manuales. |
| CAN-03 | ¿Qué duraciones se ofrecerán como opciones rápidas para Canva? | El modelo admite duración manual; esto solo define presets de interfaz. |
| SPOT-01 | ¿Cómo determina Spotify que terminó el bloqueo `no se puede`? | Mantener recuperación manual mediante prueba del administrador; la causa/fecha automática puede añadirse después sin cambiar el esquema. |

## Base documental vigente

Mientras se continúan aclarando reglas, la propuesta usa:

- catálogo funcional obligatorio por plataforma y producto antes de programar, con Netflix como primera implementación vertical;
- arquetipo híbrido confirmado para Netflix estándar, HBO, Disney+, Prime Video, Crunchyroll, Paramount+, Universal+ y VIX, con capacidad propia por producto y exclusión entre perfiles/cuenta completa;
- arquetipo por dispositivos/cupos confirmado para FlujoTV y CapCut, y preliminar para Telelatino;
- arquetipo de grupo/panel por invitación confirmado inicialmente para Gemini/Google Cloud y Canva;
- Spotify como servicio compuesto por identidad de acceso y cobertura Premium: individual propia/proveedor o familia de madre más cinco miembros, con uso principal vendible concurrente y control permanente de GL Streaming;
- cuentas compartidas con datos maestros solo admin, entrega estándar de acceso, traslado por falla sin reiniciar período y saneamiento/revocación confirmados antes de reutilizar slots;
- revocación normal por cierre de sesiones/dispositivos del perfil/cupo y excepción por rotación de credenciales cuando la plataforma no permita cierre selectivo;
- producto Netflix extra separado, capacidad uno y modalidad `extra`;
- YouTube como cartera de dos servicios comerciales reales sobre Gmail del cliente (un tercer registro es la cuenta personal del usuario, excluida del tracking), estado `solo_cartera`, identidad no reutilizable, ventas nuevas cerradas, capacidad/costo `1/1` por servicio sin cupo compartido (`DEC-91`), y proveedor operativo `Yo` editable; alcance despriorizado por decisión de negocio;
- zona horaria `America/Caracas`;
- fechas comerciales tipo `date`;
- periodicidad por mes calendario con fecha flexible para clientes; algunas plataformas como Canva pueden vender un solo período de varios meses; día ancla persistente solo para proveedores;
- precio contractual introducido manualmente y congelado en `USD`, cobro real en `VES` calculado a BCV y lectura económica congelada a paralela;
- costos de proveedores y gastos operativos fuente en `USDT`, valorizados automáticamente a la paralela;
- cobros de clientes y pagos de ciclos financieros reales siempre completos, aunque su fecha efectiva pueda ser tardía;
- tasas normalizadas como `Bs por USD`;
- paralela de Kuanto con objetivo de cinco minutos, consumida como última observación válida; las lecturas repetidas de una misma fila son idempotentes por identificador de fuente;
- BCV obtenida desde `bcvscrapper.vercel.app/api/bcv`, con vigencia y obtención separadas; publicación exacta opcional;
- historial inmutable de períodos, asignaciones, pagos, costos y tasas;
- cierre mensual versionado con detalle de devengo, caja, ocupación y capacidad ociosa;
- vistas diarias separadas de ventas, caja y resultado, reconciliadas con el cierre mensual;
- estados del cliente independientes del badge de vencimiento, sin liberación automática;
- días pagados, cortesía activa, pausa retenida y disponibilidad separados en el cierre;
- pagos de proveedores vinculados únicamente a ciclos financieros reales de cuentas/recursos;
- gastos operativos simples en USDT dentro de Caja, incluidos recargas de bancos del negocio, sin cuentas financieras ni gastos personales;
- reversos/anulaciones como control secundario y auditado;
- capacidades configurables;
- alta de información completamente manual;
- edición completa solo para admin;
- revendedor limitado a operaciones propias y solicitudes;
- credenciales separadas, cifradas y auditadas;
- cero datos completos de tarjeta almacenados por la aplicación.
- desarrollo y pruebas exclusivamente locales hasta la fase final;
- VPS propio y `glcuenta.com` como destino de producción, todavía sin cambios.
