# Carga manual y transición operativa

## 1. Decisión de alcance

No se construirá un importador ni se migrarán automáticamente datos del Excel. Las hojas y capturas solo sirven para comprender la operación anterior. El administrador dará de alta manualmente plataformas, productos, modalidades permitidas, cuentas/recursos, unidades, clientes, suscripciones, costos y pagos cuando corresponda.

Esta decisión elimina del MVP:

- lectura de `.xlsx` o CSV;
- staging de importación;
- mapeo automático de celdas combinadas;
- deduplicación heredada;
- conciliación automática contra las hojas;
- migración de credenciales, proveedores o datos financieros antiguos.

## 2. Punto de corte

El sistema necesita una fecha oficial de inicio operativo. Desde esa fecha:

- cada venta, renovación, pago, costo, cambio de asignación y tasa queda registrado;
- el sistema puede calcular historial y capacidad ociosa con precisión;
- el Excel deja de ser la fuente de verdad para nuevas operaciones.
- cada fin de mes puede cerrarse con datos reproducibles.

No se reconstruirán automáticamente ventas, pagos ni días vacíos anteriores al corte. Si el administrador decide registrar cartera previa, se hará manualmente dentro de una sesión de carga inicial con fecha de corte, administrador responsable, conteo esperado informativo y estado `abierta | cerrada`. Cada elemento usa una clave idempotente; una sesión cerrada no admite más cargas y cualquier corrección posterior exige otra versión auditada.

Para una unidad reutilizable que ingresa disponible sin fecha anterior confiable, `disponible_desde` comienza en la fecha de alta/corte. Así no se fabrica una pérdida histórica. Esta regla no aplica a cuentas propiedad del cliente, como los Gmail de YouTube: nunca se convierten en stock libre.

Si la puesta en marcha ocurre después del día 1, el primer cierre se etiqueta como **período parcial** y empieza en la fecha de corte. No se presenta como un mes completo ni se estiman los días anteriores.

## 3. Orden recomendado de carga inicial

1. Crear usuarios, roles y vendedores.
2. Crear plataformas, productos, estados comerciales, modalidades permitidas y mecanismos de entrega según sus fichas aprobadas.
3. Crear proveedores operativos/financieros sin datos completos de tarjetas; `Yo` es un proveedor propio válido y los terceros admiten nombre, teléfono o ambos.
4. Crear cada recurso/cuenta bajo su producto, con capacidad física, titularidad, reutilización, proveedor operativo, modalidades habilitadas y estado.
5. Registrar credenciales o completar el mecanismo de activación documentado, cuando aplique; todo secreto usa el flujo restringido.
6. Crear sus unidades vendibles, nombre de perfil, PIN y `estado_preparacion` cuando aplique; un recurso indivisible omite este paso.
7. Registrar el ciclo vigente del proveedor, costo en USDT, próxima renovación y si el pago inicial ya fue realizado, cuando ese producto tenga ciclo/costo propio.
8. Crear clientes activos.
9. Crear la suscripción mensual de cada cliente.
10. Asignar la suscripción a la unidad actual o a la cuenta completa, según el alcance de su modalidad.
11. Registrar tipo de operación y período; fecha de venta, vendedor, precio, pago y tasa solo cuando sean hechos reales conocidos. Una carga histórica nunca inventa esos valores.
12. Crear las categorías iniciales de gastos operativos.
13. Revisar el resumen antes de confirmar el alta.

Para YouTube, los pasos 3–11 se especializan como `Cargar servicio existente`: cliente propietario, capa de servicio no reutilizable sobre su Gmail, credenciales restringidas, proveedor operativo `Yo` por defecto, combinación provisional `servicio_individual`, suscripción/período vigente y ciclo financiero solo si realmente existe. El origen `carga_inicial`, la sesión abierta y la clave idempotente impiden contar esas tres filas como ventas nuevas, duplicarlas o crear cobros anteriores no registrados.

Spotify usa una carga compuesta. Cada servicio registra primero su identidad Spotify —propiedad de GL Streaming o del cliente— y luego su cobertura Premium —individual propia mediante GPay, individual activada por proveedor o cupo de una familia—. Una familia crea una madre administradora y exactamente cinco cupos de miembro. El uso de la madre puede registrarse como operativo o como venta excepcional concurrente; nunca se carga otra cuenta duplicada por aparecer también en el listado comercial. El Gmail pagador de GPay se vincula uno a uno como referencia restringida sin contraseña ni datos completos de tarjeta. Las identidades antiguas renombradas después de una falla se archivan y no se cargan como stock libre.

Un producto indivisible usa capacidad uno y no crea una unidad hija artificial. La capa cliente provisional de YouTube sigue esa forma, pero `YT-06` decidirá si consume además un cupo dentro de un plan proveedor separado. Netflix extra conserva su propia unidad de capacidad uno, quedando pendiente confirmar su mecanismo técnico de activación. Una cuenta híbrida crea su capacidad física real y habilita tanto perfil como cuenta completa: Netflix estándar/HBO/Crunchyroll/VIX crean cinco perfiles, Paramount+/Universal+ seis y Disney+/Prime Video siete. Universal+ marca solo cinco como vendibles. Una asignación completa los bloquea sin crear una unidad adicional. Las cuentas por dispositivos crean sus cupos físicos: FlujoTV/Telelatino tres, CapCut tres con solo dos vendibles. Gemini/Google Cloud crea cinco cupos de miembro familiar. Si una suscripción ya pasó por varias cuentas pero no se desea cargar su historia, solo se registra la asignación vigente y el historial comienza en el corte.

Una fila del Excel que siga activa aunque muestre `Vencido hace X días` se carga de la misma forma: conserva la fecha vencida, el estado activo o pausado elegido y la asignación abierta. No se convierte en disponible por estar vencida.

## 4. Asistente de carga manual

Aunque no exista importador, la interfaz debe reducir errores:

- pasos guiados para cuenta, unidades, ciclo de proveedor y asignaciones;
- valores predeterminados desde el producto/modalidad; la capacidad solo es editable cuando el producto permita variaciones o planes alternativos;
- PIN, teléfonos y credenciales tratados como texto;
- precio comercial introducido manualmente en USD, sin depender de un tarifario obligatorio;
- cálculo del cobro del cliente en Bs con la BCV aplicable y captura simultánea de la paralela para la lectura económica;
- BCV actualizada automáticamente cuando se publica la nueva a las 5:00 p. m., mostrando siempre su fecha de vigencia;
- costos/pagos de proveedores y gastos operativos en USDT, con tasa paralela automática y equivalente Bs visible;
- campos separados para fecha de venta, inicio del servicio y fecha efectiva del pago;
- fecha del cliente mostrada como `Contactar/renovar`, con acceso permitido durante todo ese día;
- acción específica `Registrar renovación y pago` únicamente desde cuentas/recursos con ciclo financiero real por vencer;
- formulario simple `Registrar gasto` dentro de Caja, con fecha/hora, categoría, descripción, monto USDT, contraparte y nota opcionales;
- vista previa de precio USD, BCV, paralela, monto esperado en Bs, monto efectivamente recibido y equivalente económico antes de confirmar;
- validación de fechas por mes calendario;
- advertencia de duplicados por plataforma/login, sin mostrar secretos;
- confirmación antes de crear varias unidades;
- transacción única para evitar cuentas incompletas a mitad del flujo.
- selector de proveedor operativo con `Yo` predeterminado cuando corresponda y creación/edición rápida por nombre, alias o teléfono;
- badge de estado comercial y comandos separados para `Nueva venta`, `Cargar servicio existente` y renovación cuando esté habilitada.
- pasos Spotify para identidad, cobertura, madre/miembro, titularidad del correo, referencia GPay, proveedor y estado de admisión familiar, sin pedir la contraseña del Gmail pagador.

## 5. Validaciones obligatorias

- La capacidad es mayor que cero.
- La capacidad cumple el producto: Netflix estándar, HBO, Crunchyroll y VIX exigen cinco; Paramount+ seis; Universal+ seis físicos y cinco vendibles; Netflix extra uno; Disney+/Prime Video siete; FlujoTV/Telelatino tres dispositivos; CapCut tres físicos y dos vendibles; Gemini/Google Cloud cinco miembros; Canva usa capacidad variable o fija según el panel educativo que se confirme. La capa cliente provisional de YouTube usa uno; la capacidad de una posible cobertura compartida queda pendiente en `YT-06`. Otro plan no modifica una cuenta de capacidad fija: exige otro producto/versionado o una regla aprobada previamente.
- El producto permite la modalidad seleccionada: Netflix estándar/HBO/Disney+/Prime Video/Crunchyroll/Paramount+/Universal+/VIX admiten perfil/completa y Netflix extra únicamente `extra`. FlujoTV admite dispositivo/completa; Telelatino solo completa hasta resolver `TEL-01`; CapCut admite dispositivo y mantiene la completa pendiente de `CAP-01`; Gemini/Google Cloud admite miembro familiar; Canva admite asiento por invitación. YouTube usa `servicio_individual` solo para conciliar su cartera mientras `YT-01/YT-06` cierran el mecanismo definitivo; nunca habilita ventas nuevas.
- `cuenta_con_unidades` exige exactamente sus slots; `recurso_indivisible` exige capacidad uno y cero unidades hijas.
- `venta_nueva` exige estado `abierto`; `solo_cartera` permite `carga_inicial` controlada y solo renueva si el producto tiene ese permiso confirmado.
- Un recurso propiedad del cliente exige `cliente_propietario_id`, no puede asignarse a otra persona ni volver a disponibilidad.
- Una cuenta compartida no queda operativa sin credencial madre, política de revocación configurada y los nombres/PIN/cupos requeridos por su mecanismo; cada slot libre debe estar `estado_preparacion = lista` o permanecer bloqueado para saneamiento. En grupo familiar, el Gmail principal no se entrega y cada miembro requiere correo de cliente.
- YouTube exige Gmail y contraseña dentro del flujo cifrado; nunca se copian a notas, cliente, proveedor o respuestas generales. La grilla administrativa recibe solo una máscara generada por el servidor.
- `carga_inicial` exige administrador, sesión abierta y clave idempotente; una sesión cerrada rechaza altas y un reintento devuelve el registro existente.
- El slot es único dentro de la cuenta.
- Una cuenta de alcance completo consume toda su capacidad; solo las cuentas físicamente indivisibles usan capacidad uno.
- Una cuenta híbrida no puede iniciar con asignaciones de perfil y cuenta completa solapadas.
- No existen asignaciones vigentes solapadas.
- La fecha del cliente corresponde a la duración vendida desde el inicio confirmado. La mayoría de plataformas usa un mes calendario; Canva puede usar varios meses en un solo período. Si el destino no tiene el mismo día, se usa el último día válido cuando sea necesario.
- La fecha del proveedor corresponde a su `dia_ancla_proveedor` fijo y recuperable después de un mes corto.
- El cliente puede usar el servicio durante todo su día de renovación; queda vencido a partir del día siguiente.
- Un vencimiento nunca libera la unidad automáticamente. `Mantener activo`, `Pausar` y `Cancelar/liberar` son acciones explícitas.
- En una cuenta compartida, `Cancelar/liberar` inicia `cierre_pendiente` y saneamiento remoto; solo confirmar limpieza más revocación externa cierra la asignación y devuelve el slot a stock. La revocación normal es cerrar sesiones/dispositivos del perfil o cupo; si la plataforma no lo permite, como FlujoTV, se rotan credenciales.
- Una pausa conserva la asignación. Una renovación tardía comienza en el pago completo si seguía activa o, si estaba pausada, en la fecha posterior entre pago completo y reactivación.
- Los clientes y los ciclos financieros de proveedor siempre se pagan completos; el sistema rechaza cobros/pagos positivos que no igualen el precio o costo completo relacionado. Un proveedor meramente operativo no exige pago.
- Cliente, vendedor y cuenta/recurso están activos; cuando el alcance es individual, la unidad también debe estar habilitada y limpia. Una venta completa usa la cuenta, no exige `unidad_id` y requiere todas sus unidades habilitadas y limpias.
- `fecha_venta`, vendedor, inicio de servicio, precio, tasa y fecha de pago no se completan unos desde otros sin confirmación. En `carga_inicial` pueden quedar pendientes si se desconocen; en venta o renovación ordinaria se exigen los que correspondan.
- `precio_comercial_usd > 0`, `monto_ves_esperado` y `monto_ves_cobrado` son decimales no negativos. La venta ordinaria exige una BCV y una paralela válidas del momento de confirmación; `monto_ves_esperado = round_half_up(precio_comercial_usd * tasa_bcv.bs_por_usd, 2)` y el cobro completo coincide exactamente con ese total.
- La lectura económica histórica del ingreso se calcula como `monto_ves_cobrado / tasa_paralela.bs_por_usd`; la lectura nominal BCV conserva el precio USD introducido. Ninguna tasa futura modifica esos snapshots.
- `costo_usdt >= 0`; un gasto operativo exige `monto_usdt > 0`.
- Proveedores y gastos usan automáticamente la última observación disponible con `tipo = paralela` al confirmarse; no ofrecen selector de tasa.
- El snapshot de un egreso se calcula como `monto_usdt * tasa_paralela.bs_por_usd` y no se recalcula después.
- Costo cero es válido; ausencia de costo es desconocida y requiere revisión.
- Proveedor y medio de pago no se mezclan en un campo libre.
- En Spotify, el Gmail pagador no es proveedor, login vendido ni cliente. Se vincula exactamente a una individual GPay y se almacena como dato restringido sin contraseña, 2FA o recuperación.
- Una identidad Spotify sobre dominio GL es reutilizable solo después de cerrar sesiones, limpiar contenido y confirmar saneamiento. Una identidad sobre correo del cliente no vuelve a stock y sus secretos se destruyen al finalizar definitivamente.
- Una cobertura Spotify familiar exige una madre activa y uno de cinco cupos. Vender el uso de la madre puede coexistir con los cinco miembros y no se representa como `cuenta_completa`; la madre no vendida es operación interna, no vacancia.
- Una familia Spotify con admisiones bloqueadas conserva sus miembros actuales, pero rechaza cualquier asignación nueva aunque visualmente tenga cupos sin cliente. Solo una confirmación manual de recuperación vuelve a publicar esos cupos.
- Cargar una venta Spotify por 3, 6 o 12 meses crea un solo período y cobro de cliente. Sus costos y pagos de cobertura continúan en ciclos mensuales separados.
- El proveedor operativo acepta `Yo`, nombre, teléfono o ambos, pero no crea automáticamente ciclo, costo o pago.
- El asistente solo confirma el alta cuando el recurso cumple su estructura —slots exactos o ninguno si es indivisible— y contiene los datos obligatorios de su producto; antes de eso no aparece operativo ni entra en cierres.
- Una cuenta con costo mayor que cero requiere ciclo proveedor; “pagado” exige un movimiento completo confirmado por el mismo monto del costo.
- Crear el siguiente ciclo y registrar su pago completo ocurre de forma atómica e idempotente. Registrar el pago uno o dos días tarde no mueve su cobertura ni ancla.
- Un gasto operativo no puede duplicar un pago proveedor ya vinculado a una cuenta/ciclo.
- Un gasto personal se rechaza; el registro exige propósito de negocio.
- Una recarga empresarial, incluida la del banco de Nigeria, se registra como un único gasto USDT; trader y nairas son nota opcional.
- La acción secundaria `Revertir` crea una compensación auditada desde el detalle y no puede exceder el saldo original; no requiere una pantalla principal.

## 6. Seguridad de las hojas existentes

Que no exista migración no elimina la exposición ya ocurrida. Si las capturas o el Excel contienen credenciales o datos reales de tarjetas:

- rotar credenciales de streaming expuestas;
- contactar al emisor si un medio de pago completo quedó visible;
- eliminar todo CVV/CVC/CID de todas las copias;
- no copiar PAN completos, vencimientos o códigos al nuevo sistema;
- no adjuntar el Excel al repositorio, fixtures, logs o ambientes de prueba.

Los datos de desarrollo serán completamente sintéticos.

## 7. Revisión del alta

Antes de considerar operativa una plataforma, el administrador revisa:

- total de cuentas y unidades;
- unidades disponibles, reservadas, asignadas y pendientes de limpieza;
- próximas renovaciones de clientes y proveedores;
- precios comerciales cargados y congelados en USD, cobros reales en Bs y costos/gastos en USDT;
- BCV aplicada al cobro, paralela contemporánea para su lectura económica y paralelas automáticas usadas en egresos;
- renovaciones proveedor próximas, vencidas, pendientes, pagadas y anuladas;
- clientes al día, que renuevan hoy, activos vencidos y pausados vencidos;
- días de cortesía, pausa retenida, saneamiento pendiente y disponibilidad incluidos en el cierre;
- gastos operativos por categoría, con monto USDT y snapshot Bs, sin gastos personales;
- credenciales almacenadas únicamente en el flujo restringido;
- fecha desde la cual comienza el historial confiable.
- estado del cierre mensual actual y posibles datos aún incompletos.
- ventas, caja y resultado diario desde la fecha de corte.
- YouTube concilia los tres servicios existentes declarados al corte, cada uno con cliente propietario y sin imponer un máximo técnico de tres; ninguno aparece como venta nueva o stock. La sesión queda cerrada después de conciliarlos y una cuarta carga posterior al corte se rechaza.
- Spotify concilia cada identidad una sola vez con su cobertura vigente; las madres repetidas entre la lista plana y el detalle familiar no duplican recurso, costo o renovación. Cada familia muestra cinco cupos, uso operativo/venta de madre, estado de admisión y todos los servicios afectados por una incidencia abierta.

La revisión es interna al nuevo sistema y no constituye una conciliación automática con Excel.
