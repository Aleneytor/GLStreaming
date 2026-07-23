# Alcance y reglas de negocio

## 1. Visión del producto

GL Streaming reemplazará las hojas de cálculo por un panel web que conserve la lectura familiar del Excel —cuenta madre con filas hijas cuando existan, o fila plana para un recurso indivisible—, pero añada historial, validaciones, permisos y cálculos confiables.

Netflix seguirá siendo la primera implementación vertical, pero antes de programar se documentará el comportamiento de todas las plataformas previstas en `docs/plataformas/`. El diseño no codificará “Netflix = cinco perfiles” como regla universal: cada plataforma tendrá modalidades, capacidades y mecanismos de entrega confirmados.

## 2. Alcance funcional inicial

1. Autenticación de administrador y revendedores.
2. Catálogo de plataformas, productos de inventario, modalidades y proveedores.
3. Inventario de cuentas/unidades reutilizables, identidades de acceso y coberturas técnicas; cuando la plataforma lo requiera, la identidad del cliente se administra separada del recurso que aporta el plan.
4. Clientes beneficiarios, contactos comerciales, ventas, renovaciones, cancelaciones y pagos.
5. Dos seguimientos de renovación separados:
   - fecha flexible de contacto/cobro del cliente;
   - fecha fija del ciclo con el proveedor.
6. Data Grid jerárquico, filtros, búsqueda y badges de estado.
7. Resumen financiero por período y por plataforma, con precio comercial en USD, cobro en Bs y lecturas históricas BCV/paralela.
8. Costo asignado a inventario vacante.
9. Ventas propias y solicitudes de stock para revendedores.
10. Carga manual validada del inventario y saldos iniciales.
11. Sincronización de tasas según su cadencia: BCV de lunes a viernes a las 5:00 p. m. y objetivo de paralela cada cinco minutos, tolerando retrasos o consultas repetidas sin duplicar observaciones.
12. Cierre financiero por cada mes calendario.
13. Panel de Caja con ventas, movimientos y ganancias diarias.
14. Registro de renovaciones y pagos de proveedores vinculados a ciclos de cuentas/recursos cuando exista una obligación financiera.
15. Registro de costos operativos del negocio, excluyendo gastos personales.
16. Valorización automática en Bs de todo egreso USDT mediante la paralela disponible al confirmarlo.
17. Auditoría de operaciones sensibles.
18. Gestión de Spotify individual y familiar, incluida la cuenta madre, sus cinco cupos, identidades de acceso, bloqueos de admisión e incidencias por lote.

Fuera del MVP: migración o importación automática desde Excel, procesamiento de tarjetas, contabilidad fiscal, portal del cliente final, integraciones automáticas con plataformas de streaming y mensajería por WhatsApp. Estas capacidades podrán evaluarse después sin bloquear la operación central.

## 3. Actores

| Actor | Responsabilidad |
|---|---|
| Administrador | Gestiona inventario, clientes, proveedores, costos, ventas, usuarios y credenciales. Consulta todos los indicadores. |
| Revendedor | Consulta sus ventas y clientes relacionados. Ve disponibilidad saneada y solicita stock. |
| Cliente | Compra el servicio, pero inicialmente no inicia sesión en la aplicación. |
| Contacto comercial | Compra, paga, intermedia o recibe los avisos de una o varias suscripciones cuyos beneficiarios pueden ser otras personas. No sustituye al cliente que usa cada servicio. |
| Proveedor | Suministra o gestiona cuentas/servicios. Puede ser el propio negocio o un tercero y no es necesariamente el beneficiario de un pago. |

Los nombres hoy escritos en la columna `Vendió` requieren clasificación manual. Solo quien realmente originó o gestionó la venta se vincula a un usuario o vendedor histórico; cuando el valor representa a quien compró para terceros, paga o coordina renovaciones, se registra como contacto comercial con esos roles y no como vendedor automático.

## 4. Vocabulario común

- **Cuenta/recurso:** acceso administrado para una plataforma, equivalente a la fila padre del Excel. Puede ser inventario reutilizable o una cuenta externa propiedad del cliente.
- **Identidad de plataforma:** cuenta con la que una persona entra y conserva sus datos de uso —por ejemplo, correo, contraseña, playlists y “Me gusta” de Spotify—. No siempre es el recurso que aporta la cobertura pagada.
- **Cobertura:** recurso técnico que mantiene activo el plan de una identidad durante un intervalo, por ejemplo una individual de Spotify o un cupo de una familia.
- **Producto de plataforma:** clase de inventario adquirido/gestionado, por ejemplo `Netflix cuenta estándar` o `Netflix perfil extra`.
- **Modalidad:** forma en que se comercializa una cuenta: por perfil, cuenta completa, extra u otra modalidad futura.
- **Unidad de inventario:** recurso físico mínimo dentro de una cuenta, como un perfil. No siempre coincide con lo vendido comercialmente.
- **Suscripción:** relación comercial entre cliente, modalidad y vendedor a lo largo del tiempo.
- **Asignación:** intervalo durante el cual una unidad o una cuenta completa presta servicio a una suscripción. Permite mover al cliente sin alterar su historial comercial.
- **Período de servicio:** venta o renovación concreta, con precio, inicio y fin. Una renovación crea un período nuevo y no sobrescribe el anterior.
- **Proveedor operativo:** referencia editable de quién gestiona o suministra el servicio; puede ser `Yo`, un nombre o un teléfono y no crea un gasto automáticamente.
- **Ciclo de proveedor:** cobertura/renovación financiera de una cuenta o recurso cuando existe esa obligación.
- **Disponible:** inventario reutilizable sin asignación abierta, reserva ni bloqueo operativo. Un recurso pausado o vencido que sigue retenido no está disponible; una cuenta propiedad del cliente nunca se vuelve stock para otra persona.
- **Capacidad ociosa:** fracción pagada al proveedor que permanece sin vender durante un intervalo.
- **Beneficiario:** persona que usa una suscripción. Puede ser distinta del comprador, pagador, intermediario y contacto de renovación.
- **Precio comercial:** importe en USD que el administrador acuerda e introduce manualmente para una venta o renovación; no depende de un catálogo obligatorio de tarifas.

## 5. Reglas confirmadas por las capturas

### Jerarquía

- Una plataforma define productos y modalidades comerciales.
- Un producto instancia muchas cuentas/recursos y limita qué modalidades puede usar cada uno.
- Una cuenta contiene una cantidad configurable de unidades físicas y puede habilitar varias modalidades comerciales.
- Un producto también puede ser un recurso indivisible de capacidad uno, sin perfiles ni filas hijas.
- Titularidad y reutilización son explícitas: los Gmail administrados para YouTube pertenecen al cliente y no se reasignan.
- `numero_slot` es único dentro de una cuenta, no en todo el sistema.
- PIN, teléfono y credenciales se tratan como texto para preservar `+` y ceros iniciales.
- Importes se almacenan como decimal y nunca como `float`.

Producto, capacidad física y alcance comercial se separan. Netflix cuenta estándar, HBO, Disney+, Prime Video y Crunchyroll son híbridas y pueden venderse por perfiles o completas, con capacidades respectivas de cinco, cinco, siete, siete y cinco. Netflix perfil extra es otro producto de capacidad uno y solo usa modalidad `extra`. En una cuenta híbrida, la asignación completa consume toda la capacidad y excluye cualquier asignación o reserva individual durante el mismo intervalo.

En todas las cuentas compartidas confirmadas, la cuenta madre permanece bajo control del negocio: el cliente no está autorizado a modificar correo, contraseña, recuperación, plan ni datos maestros. Una venta por perfil entrega correo, contraseña, nombre de perfil, PIN y fecha `Renueva/Vence`; una venta completa entrega las credenciales, fecha y datos de perfiles aplicables, sin transferir permiso de administración. El revelado queda auditado y no duplica secretos en notas o reportes. En el MVP solo el administrador genera el paquete; `SEC-02` decidirá si después un revendedor puede hacerlo exclusivamente para una venta propia vigente.

YouTube introduce una capa distinta: el servicio se gestiona sobre el Gmail del cliente y sus tres registros actuales son cartera, no una capacidad máxima. No acepta ventas nuevas. Como modelo provisional, cada fila visible se trata como un recurso cliente de capacidad comercial uno y no reutilizable; todavía debe confirmarse si la activación consume además un cupo de un plan proveedor compartido. Renovar los tres servicios también queda como permiso independiente por confirmar.

### Spotify: identidad, cobertura y familia

Spotify no se modela como una sola fila de credenciales. La **identidad Spotify** conserva el login y los datos personales de uso; la **cobertura Premium** explica por qué esa identidad está activa. Una suscripción vigente necesita ambas relaciones, y cualquiera de ellas puede cambiar técnicamente sin crear otra venta ni reescribir el período comercial.

Los cuatro mecanismos comerciales iniciales son:

1. individual activada directamente por GL Streaming mediante GPay;
2. individual activada sobre los datos suministrados por GL Streaming a un proveedor externo;
3. miembro de una familia Spotify;
4. uso de la identidad madre de una familia, vendido de forma excepcional.

La modalidad de correo es independiente del mecanismo: una identidad puede usar un correo de los dominios GL o el correo del cliente. Con correo GL, el administrador crea la identidad, la incorpora a la cobertura cuando corresponda y entrega correo/contraseña; tras un cierre definitivo puede sanearla y reutilizarla. Con correo del cliente, este facilita solamente correo y contraseña de **Spotify**, nunca la contraseña de Gmail. Esa identidad pertenece al cliente, no se convierte en stock y sus secretos se destruyen al terminar definitivamente el servicio; si vuelve, debe suministrarlos otra vez.

Una familia se representa así:

```text
Familia Spotify bajo control de GL Streaming
├─ identidad madre/principal: uso operativo o venta excepcional
└─ cinco slots de miembro: ventas independientes
```

La madre y los cinco miembros son alcances concurrentes distintos. Vender el uso de la madre no equivale a vender la cuenta completa, no consume uno de los cinco slots y no excluye a los miembros. El cliente de la madre puede escuchar Spotify, pero no recibe autorización para añadir/eliminar integrantes, cambiar correo, contraseña, recuperación, plan o datos maestros. Todas las madres usan correo de dominio GL o un Gmail propiedad del negocio y GL Streaming conserva el control. Si la madre no está vendida, es una herramienta operativa: no cuenta como vacante, pérdida ni sexto cupo ocioso. Si se vende, su ingreso es adicional y el costo de la familia sigue registrándose una sola vez.

Cada familiar contiene exactamente cinco slots de miembro. Un estado de admisión a nivel de la familia distingue `abierta` de `bloqueada_por_spotify`. El bloqueo visible en el Excel como `no se puede` impide incorporar a **cualquier** persona nueva, aunque los miembros actuales continúen activos. Mientras exista, ningún slot vacío se publica como disponible ni puede reservarse; sus datos comerciales pueden verse en blanco, pero el bloqueo técnico no se pierde. La recuperación todavía no tiene fecha o señal fiable y se confirma manualmente después de una prueba exitosa.

En una individual directa por GPay existe exactamente un Gmail pagador propio por cobertura y ese Gmail no financia otra individual. Es un dato de control crítico porque permite cancelar o cambiar el plan aunque alguien modifique las credenciales de Spotify. Se guarda cifrado y auditado, sin almacenar su contraseña, datos de recuperación o segundo factor en la aplicación. El origen `GPay Nigeria | GPay USA` se conserva como alias operativo no sensible. Las familias pagadas por tarjeta u otro método continúan bajo control mediante su identidad madre y no usan este vínculo.

En una individual de proveedor, GL Streaming suministra la identidad y sus credenciales; el tercero solo activa el Premium y atiende las fallas. Una incidencia ordinaria reactiva **la misma identidad**, no crea una sustituta. Proveedor operativo, proveedor financiero y mecanismo de activación siguen siendo conceptos separados.

Spotify se vende por uno, tres, seis o doce meses calendario. Una venta de varios meses crea un solo período y un solo cobro anticipado; GL Streaming puede incurrir en costos o renovaciones mensuales de cobertura durante ese período. Esos ciclos de proveedor no generan renovaciones, ventas ni cobros ficticios al cliente.

El beneficiario tampoco se infiere de la persona anotada históricamente en `Vendió`. Si una persona compra varias cuentas para amistades, cada identidad conserva a su beneficiario y la misma persona puede quedar vinculada como comprador, pagador, intermediario y contacto de renovación. Solo se clasifica como vendedor/revendedor cuando realmente cumplió ese rol.

### Calendario flexible del cliente y calendario fijo del proveedor

Las capturas muestran una regla real que el modelo rígido no representaba: un cliente puede continuar activo aunque el badge diga `Vencido hace 2 días`. Por eso cliente y proveedor no compartirán la misma política.

Para clientes, la fecha representa **cuándo contactar y cobrar**, no un corte automático:

```text
fecha_renovacion_cliente
  = mismo dia despues de cantidad_periodos meses calendario
    o ultimo dia valido del mes destino si este no lo contiene

gracia_de_pago
  = todo el dia de fecha_renovacion_cliente en America/Caracas
```

| Inicio/último pago | Contactar y renovar | Puede usar/pagar hasta | Queda vencido desde |
|---|---|---|---|
| 22/07 | 22/08 | 22/08 a las 11:59 p. m. | 23/08 |
| 31/05 | 30/06 | 30/06 a las 11:59 p. m. | 01/07 |
| 31/01, año normal | 28/02 | 28/02 a las 11:59 p. m. | 01/03 |

El período pagado se calcula como `[inicio, fecha_renovacion_cliente)`. La mayoría de las ventas es mensual, pero la misma regla admite varios meses calendario —incluidos los períodos Spotify de `1 | 3 | 6 | 12` meses— sin convertirlos a 30, 90, 180 o 365 días. El día de renovación funciona de dos maneras sin duplicar ingresos: si el administrador confirma la renovación ese día, comienza allí el nuevo período; si no, el cliente puede disfrutarlo como día de cortesía y el administrador decide en la noche si continúa activo o se pausa.

La fecha por sí sola nunca libera la unidad ni cambia forzosamente el estado. Después del vencimiento, el administrador puede:

- mantener el acceso activo mientras espera respuesta;
- pausar el servicio, conservando la unidad para ese cliente;
- renovar cuando finalmente pague;
- cancelar y liberar la unidad explícitamente.

En el MVP, `Pausar` registra que el administrador cortó manualmente el acceso en la plataforma; GL Streaming no ejecuta ese corte externo por sí solo.

Al mantener activo o pausar, puede indicarse opcionalmente `Recontactar el` y una nota breve como `prometió pagar el 24/08`. Es solo un recordatorio comercial: no crea un período, no reconoce ingreso y no altera la obligación del proveedor.

Una renovación tardía comienza por defecto en la fecha real del pago completo cuando el cliente seguía activo. Si estaba pausado, comienza en la fecha posterior entre pago completo y reactivación. Nunca se reconoce un nuevo período antes de recibir el total ni antes de devolver el acceso. La siguiente renovación se calcula por la cantidad de meses comprada desde ese inicio, dando al cliente el período completo sin arrastrar una deuda de días. En clientes no se conserva un ancla rígida indefinidamente: cada renovación confirmada establece la nueva referencia.

Ejemplo completo de flexibilidad: un servicio iniciado el 22/07 tiene período pagado `[22/07, 22/08)`. Si no paga el 22/08 y se corta el acceso al terminar el día, el 22/08 se registra como cortesía. Si la unidad se mantiene apartada y el cliente paga el total y reactiva el 25/08, los días 23 y 24 se registran como pausa retenida y el nuevo período pagado es `[25/08, 25/09)`. La siguiente fecha para contactarlo es 25/09.

```text
dias_para_renovar = fecha_renovacion_cliente - fecha_local_actual
```

| Condición | Color | Etiqueta recomendada |
|---|---|---|
| Unidad disponible | Azul | `Disponible` |
| `dias_para_renovar > 5` | Verde | `Faltan X días` |
| `1 <= dias_para_renovar <= 5` | Amarillo | `Renueva en X días` |
| `dias_para_renovar = 0` | Amarillo | `Renueva hoy · acceso todo el día` |
| `dias_para_renovar < 0` | Rojo | `Vencido hace X días` |

El badge de fecha y el estado operativo se muestran separados. Son combinaciones válidas `Activo · Vencido hace 2 días` y `Pausado · Vencido hace 2 días`. El estado disponible solo aparece después de una liberación explícita y, cuando aplique, del saneamiento completo: limpieza y revocación externa confirmada.

Para proveedores, en cambio, la renovación es una obligación fija. `dia_ancla_proveedor` se conserva; si el mes no contiene ese día se usa el último válido y luego se recupera el ancla original. No existe gracia comercial ni desplazamiento por la respuesta de un cliente.

Todas las fechas de negocio usan `America/Caracas`. Los ciclos pagados y los ciclos de proveedor continúan usando rangos semiabiertos para prorratear correctamente, pero esa implementación no obliga a cortar al cliente al comenzar su fecha de renovación.

### Integridad de inventario

- Una unidad no puede tener dos asignaciones comerciales solapadas.
- La venta o reserva de una unidad se realiza en una transacción de base de datos para evitar dobles asignaciones.
- Una renovación agrega un período; no modifica ni borra el anterior.
- Vencer no equivale a liberar: una unidad activa o pausada continúa asignada hasta una acción explícita.
- Los registros con historia financiera se archivan y no se eliminan físicamente desde la interfaz normal.
- Una cuenta con costo cero es válida.
- La capacidad de una cuenta/recurso debe ser mayor que cero y cumplir la regla de su producto (`fija`, `rango` o `variable`); la modalidad comercial no define esa capacidad.
- Un recurso propiedad del cliente exige propietario, solo sirve a sus suscripciones y no se publica como disponible al finalizar. Producto, titular, cliente propietario y reutilización quedan inmutables al activar o crear historia; un reemplazo crea otro recurso sin reescribir el anterior.
- El estado comercial del producto se valida en servidor y base de datos; ocultar un botón no basta para impedir una venta nueva.
- Una identidad Spotify y una cobertura Spotify tienen historiales independientes. Como máximo existe un vínculo vigente de cada tipo por suscripción, pero un reemplazo conserva los tramos anteriores.
- El alcance `principal` de Spotify puede coexistir con los cinco alcances `unidad` de la misma familia. No puede coexistir con otra venta principal, no consume un slot y nunca concede administración.
- Una familia con admisiones bloqueadas conserva los miembros vigentes, pero rechaza atómicamente nuevas reservas, asignaciones o traslados hacia cualquiera de sus slots vacíos.

## 6. Flujos operativos

### Alta de inventario

1. El administrador elige plataforma, producto y proveedor operativo cuando aplique.
2. Registra la cuenta/recurso, titularidad, reutilización, capacidad física y modalidades permitidas que estarán habilitadas.
3. Registra las credenciales o completa el mecanismo de activación documentado, cuando aplique; todo secreto usa el almacén restringido.
4. El sistema crea o permite crear las unidades vendibles.
5. Registra el primer ciclo de proveedor y su costo, si corresponde.

Para cartera existente de un producto en `solo_cartera`, como los tres servicios actuales de YouTube, el administrador usa `Cargar servicio existente`. Solo funciona dentro de una sesión de corte abierta por un administrador, usa una clave idempotente, conserva las fechas reales conocidas y no crea venta, vendedor, tasa, cobro o pago ficticios. El conteo esperado de tres sirve para conciliar, no limita el producto. Al cerrar la sesión, la carga ordinaria queda deshabilitada; una corrección posterior exige una sesión versionada y auditada. Un recurso YouTube exige cliente propietario, Gmail/contraseña en el almacén restringido y proveedor operativo predeterminado `Yo`, editable por nombre o teléfono.

En Spotify, el alta registra por separado la identidad y la cobertura. Una individual propia enlaza su control Gmail uno a uno; una individual de tercero conserva el proveedor que debe activarla/reactivarla; una familia crea su identidad madre y exactamente cinco slots de miembro. La madre usa siempre identidad propiedad de GL Streaming. Ningún código temporal enviado por un cliente se persiste.

### Venta

1. Se elige una modalidad y un recurso compatible: unidad interna, uso principal, cuenta completa o servicio indivisible propiedad del cliente.
2. Se registra o selecciona el cliente beneficiario y, si es otra persona, el comprador/pagador/contacto de renovación. El vendedor se registra en su rol real y no se deduce del contacto.
3. Se introduce manualmente el precio comercial en USD, la cantidad de meses calendario y la fecha de pago. El sistema selecciona y muestra la BCV aplicable y la paralela contemporánea, calcula los Bs esperados a BCV y permite registrar los Bs realmente recibidos.
4. Una operación atómica congela precio USD, ambas tasas, Bs esperados y Bs cobrados; crea la suscripción, el período y la asignación, y ocupa la capacidad correspondiente sin violar exclusiones con otras modalidades.
5. La fecha de contacto/renovación y el badge se derivan del inicio.
6. Para una cuenta compartida, el administrador genera el paquete de acceso de la asignación vigente: correo, contraseña, perfil, PIN y fecha cuando corresponda.

`venta_nueva` solo está disponible si el producto está `abierto`. `solo_cartera` la rechaza aunque se invoque directamente por API; renovar una suscripción cargada depende del permiso específico de renovación.

No existe un catálogo obligatorio de tarifas ni una fórmula que imponga el precio por modalidad. La aplicación puede reutilizar el último valor como ayuda de interfaz en el futuro, pero la fuente contractual es siempre el importe USD confirmado para esa operación.

### Renovación del cliente

1. El día de renovación se contacta al cliente y se mantiene el acceso durante todo el día.
2. Si recibe el pago completo y confirma la renovación ese día, se registra un nuevo período desde esa fecha y, separadamente, el cobro recibido.
3. Si no completa el pago, al finalizar el día el administrador elige mantener activo, pausar o cancelar/liberar y puede fijar una fecha opcional para recontactarlo.
4. Activo o pausado pueden continuar mostrando `Vencido hace X días`; la asignación permanece reservada al mismo cliente.
5. Si renueva tarde, el nuevo inicio es la fecha del pago completo cuando continuaba activo o la fecha posterior entre pago completo y reactivación cuando estaba pausado; desde allí se calcula su próxima fecha.
6. El historial anterior y los días intermedios permanecen intactos para el cierre financiero.

Los clientes pagan cada operación completa y el sistema no administra abonos ni saldos. `monto_ves_esperado` se obtiene con `round_half_up(precio_comercial_usd × BCV, 2 decimales)`: el precio y la tasa conservan alta precisión, pero el importe transferible se expresa en céntimos de bolívar. `monto_ves_cobrado` documenta la transferencia real y debe coincidir exactamente con ese resultado para confirmar. Si cambia el acuerdo comercial, el administrador corrige el precio USD antes de confirmar; nunca se oculta una diferencia alterando la tasa congelada.

Si una cuenta o unidad compartida falla durante un período vigente, se marca el origen en mantenimiento, se cierra la asignación anterior y se crea otra sobre inventario compatible de reemplazo; una venta por perfil usa un slot libre y una venta completa exige otra cuenta totalmente libre. Cliente, suscripción, modalidad, período, precio, cobro y fecha de renovación permanecen intactos: no se inventa una venta ni se reinicia el mes. El nuevo paquete de acceso se entrega y audita contra la asignación sustituta. Para recursos propiedad del cliente, cualquier reemplazo conserva al mismo propietario y nunca usa la cuenta personal de otra persona.

Cuando un cliente de perfil, dispositivo o cupo no renueva y el administrador decide liberar después de su día completo de renovación, `iniciar_liberacion` mantiene la asignación retenida en `cierre_pendiente`, marca el slot `pendiente_limpieza` y crea la tarea remota. El administrador elimina/restablece el perfil, cierra la sesión o dispositivo relacionado, rota credenciales cuando la plataforma no permita cierre selectivo, o saca al correo del grupo familiar según la ficha. Solo después de confirmar limpieza y revocación externa, una transacción cierra la asignación y cambia el slot a `lista`. La unidad interna no se borra; si alguna acción falla o la política no está configurada, continúa bloqueada. La liberación de una cuenta completa aplica la misma barrera a todos sus perfiles o cupos.

Para Spotify, el tratamiento de mora es manual y depende del cliente; no existe un cronómetro automático. El administrador puede cerrar sesiones durante los primeros días, cambiar la contraseña si continúa sin respuesta y, como última medida, retirar al miembro de la familia o cancelar la individual. Una identidad GL liberada se limpia antes de reutilizarla. En una identidad con correo del cliente se elimina el secreto local al cierre definitivo y solo se conserva el historial comercial no sensible. Si deja de pagar quien usaba la madre, se rota la contraseña y se limpian playlists/“Me gusta” antes de revender ese mismo uso principal; los cinco miembros no se alteran.

### Incidencias y reemplazos de Spotify

La caída de una familia abre una incidencia por lote sobre la cobertura madre. El sistema toma un snapshot de todos los miembros activos y del uso de la madre si estaba vendido; no pregunta cuáles están afectados, porque la falla alcanza a todos. Para cada suscripción conserva beneficiario, contacto, vendedor, período, precio, tasas, cobro y fecha de renovación.

Cuando la limitación anual de Spotify impide mover una identidad a otra familia, el procedimiento técnico puede:

1. confirmar el respaldo de playlists y “Me gusta”;
2. renombrar y archivar la identidad anterior para liberar el correo habitual;
3. crear una nueva identidad con ese correo;
4. asignarla a un slot válido de otra familia;
5. restaurar playlists y “Me gusta”;
6. entregar nuevamente el acceso.

La identidad antigua no vuelve automáticamente a inventario aunque se conserve. Cada paso se registra como control no sensible y el reemplazo abre nuevos tramos de identidad y cobertura; no crea venta, período, cobro o vencimiento nuevos. El procedimiento dura normalmente minutos y mantiene exactamente la fecha comercial existente. Para una identidad con correo del cliente puede requerirse un código efímero que no se guarda. En clientes antiguos, una cobertura individual puede usarse excepcionalmente para preservar la identidad original: cambia el costo/cobertura técnica, pero no genera un cargo adicional dentro del período ya pagado.

Una falla individual gestionada por proveedor se registra en la misma capa de incidencias y se resuelve reactivando la identidad existente. El flujo confirmado no permite que el proveedor la reemplace por otra cuenta.

### Renovación del proveedor

Este flujo solo aparece cuando la cuenta/recurso tiene una obligación o ciclo financiero real. Un proveedor operativo —incluido `Yo`— sin cobertura pagada no genera aviso ni acción de pago.

1. La cuenta muestra próxima renovación, costo esperado y estado de pago.
2. Al vencer o pagar anticipadamente, el administrador elige `Registrar renovación y pago`.
3. Confirma el costo completo del nuevo ciclo en USDT y la fecha efectiva en que se pagó. El monto del pago es exactamente igual al costo confirmado; puede registrarse uno o dos días tarde sin mover el ciclo.
4. Una transacción registra el pago, crea el nuevo ciclo mensual y calcula la próxima renovación.
5. El ciclo anterior y su pago quedan como historial; el aviso pasa a resuelto.

La fecha no marca una cuenta como pagada automáticamente. El sistema avisa, pero solo una confirmación explícita del administrador produce la salida de Caja.

### Solicitud de stock

1. El revendedor ve un resumen sin credenciales ni costos.
2. Solicita un producto/modalidad o inventario disponible.
3. El administrador aprueba, rechaza o cancela.
4. La aprobación reserva o asigna inventario de forma transaccional.

Productos en `solo_cartera`, recursos no reutilizables y cuentas propiedad del cliente se excluyen por completo de disponibilidad, reservas y solicitudes. Por eso los Gmail de YouTube no aparecen como stock para revendedores; si se confirma un cupo proveedor reutilizable, se modelará como otro recurso separado.

## 7. Monedas, tasas y definiciones financieras

### Monedas fuente

El acuerdo comercial del cliente nace en USD, el cobro ocurre en bolívares y los egresos de proveedor/operación nacen en USDT. La aplicación conserva las tres perspectivas sin sustituir una por otra:

| Hecho | Monto fuente | Snapshots obligatorios |
|---|---|---|
| Venta o renovación del cliente | Precio comercial introducido manualmente en USD | BCV usada, paralela contemporánea y Bs esperados a BCV. |
| Cobro del cliente | Bs (`VES`) realmente recibidos | Vínculo al mismo precio USD y a las dos tasas congeladas de la operación. |
| Costo/pago de proveedor | USDT | Última paralela disponible y equivalente histórico en Bs al confirmar. |
| Gasto operativo | USDT | Última paralela disponible y equivalente histórico en Bs al confirmar. |

No existe un catálogo obligatorio de tarifas. El administrador confirma el precio USD de cada venta o renovación y ese valor no cambia aunque después cambien las tarifas del negocio o las tasas.

```text
monto_ves_esperado
  = round_half_up(precio_comercial_usd * tasa_bcv_bs_por_usd, 2)

valor_cobro_usd_segun_bcv
  = monto_ves_cobrado / tasa_bcv_bs_por_usd

valor_economico_cobro_usd_paralela
  = monto_ves_cobrado / tasa_paralela_bs_por_usd

monto_ves_snapshot_egreso
  = monto_usdt * tasa_paralela_bs_por_usd
```

El cliente final se calcula a BCV; la paralela no sustituye ese cobro, sino que congela cuánto valían económicamente esos bolívares cuando se confirmó la operación y permite comparar el ingreso con proveedores/gastos pagados a paralela. Para GL Streaming, `1 USDT = 1 USD de referencia` continúa siendo una **convención interna de valorización**, no una afirmación sobre el precio externo del activo.

Precio USD, BCV, paralela, Bs esperados y Bs cobrados son hechos históricos. Ninguna publicación posterior los recalcula. Los egresos USDT tampoco presentan selector BCV/paralela: usan obligatoriamente la observación paralela vigente al confirmarlos.

### Publicación y selección automática de tasas

- La BCV se obtiene con `GET https://bcvscrapper.vercel.app/api/bcv`, una API propia del usuario. Su contrato actual entrega `success`, `date`, `usd`, `eur`, `source` y `fetchedAt`.
- `date` se conserva como `fecha_vigencia`, `usd` como `bs_por_usd` y `fetchedAt` como `observada_fuente_at`; `obtenida_at` registra la recepción en GL Streaming. El contrato no entrega la hora oficial `publishedAt`, por lo que `publicada_at` queda opcional y no se falsifica copiando una hora de observación.
- La BCV se publica de lunes a viernes alrededor de las 5:00 p. m. para su próxima fecha hábil. El viernes se recibe la tasa con vigencia del lunes y, si existe un feriado, `date` ya contiene la fecha correspondiente.
- La paralela proviene de `p2p_rate_history` de Kuanto. `price` es el promedio de los valores `buy` positivos disponibles de Binance, Bybit y Yadio; `details` conserva compras/ventas por fuente, `id` identifica la observación y `created_at` registra su momento original.
- La cadencia objetivo del productor es cada cinco minutos, todos los días. GL Streaming no depende de que se cumpla al segundo: consulta la última fila, no guarda dos veces el mismo identificador y vuelve a validarla al confirmar una operación.
- GL Streaming no calculará fines de semana ni feriados por su cuenta; la fecha entregada por la fuente es la autoridad.

Desde las 5:00 p. m. hasta terminar el día pueden coexistir una BCV vigente y otra ya publicada para la siguiente fecha hábil. Para mantener el formulario simple, el cálculo de cobro cambia automáticamente a la publicación más nueva y muestra junto al valor `Vigente para DD/MM/AAAA`. La tasa anterior permanece disponible en el historial y toda operación ya confirmada conserva exactamente la que utilizó.

En la venta/renovación no existe selector `BCV | Paralela`: el cobro esperado usa BCV y, en paralelo, el sistema adjunta automáticamente la observación paralela contemporánea para análisis económico. El formulario muestra ambas fuentes, valor, vigencia/observación y hora antes de confirmar. Los reportes históricos y cierres usan las tasas identificadas de la operación o de su fecha de corte y no recalculan operaciones antiguas con una publicación más reciente.

El contrato observado, la lectura directa aislada detrás de un adaptador, la discrepancia de cadencia del despliegue y las acciones de seguridad de Kuanto se detallan en `docs/07-integracion-tasas.md`.

### Gastos y pagos de proveedores

Los pagos de proveedores relacionados con ciclos reales de cuentas/recursos conservan su flujo específico. No se mezclan con otros costos porque crean cobertura, avisos de renovación y Caja. Esto se separa del **proveedor operativo**, que solo identifica quién gestiona o suministra el servicio.

Se conservan dos hechos diferentes:

```text
costo_proveedor_usdt
  = costo contractual del ciclo que cubre la cuenta

pago_proveedor_usdt
  = dinero realmente entregado al proveedor en una fecha
```

El costo contractual y el pago conservan la última tasa paralela disponible cuando el administrador confirma `Registrar renovación y pago`. Siempre se paga el ciclo completo, por lo que el movimiento positivo usa el mismo monto USDT del costo. Se mantienen como dos registros contables porque el costo se devenga durante la cobertura y el pago afecta Caja en su fecha efectiva.

Al crear un recurso puede seleccionarse un proveedor operativo propio o tercero mediante nombre, alias o teléfono. Si además existe una cobertura/obligación financiera, se registra su proveedor financiero, costo esperado, inicio del ciclo y próxima renovación. Si ya fue pagada, el alta puede registrar también el pago inicial. Después, la vista `Pagos a proveedores` muestra:

- renovaciones próximas;
- vencimientos de hoy;
- cuentas vencidas o pendientes;
- pagos pendientes, vencidos, pagados o anulados;
- historial por cuenta, plataforma y proveedor;
- monto fuente en USDT, tasa paralela aplicada automáticamente y snapshot equivalente en Bs;
- fecha esperada frente a fecha efectiva de pago.

El proveedor operativo canónico `Yo` es válido y editable como cualquier referencia, pero seleccionarlo no crea un pago a sí mismo ni fuerza costo cero. Solo un desembolso/ciclo realmente confirmado afecta Caja y resultados. Cada ciclo congela la etiqueta y contacto usados para que editar posteriormente el proveedor no reescriba el pasado.

La acción `Registrar renovación y pago` viene precargada desde la cuenta y permite confirmar si el costo cambió. El administrador edita un solo monto de negocio, `costo_ciclo_usdt`; al confirmar, el sistema crea `monto_pago_usdt` con exactamente el mismo valor. El costo y el pago quedan separados internamente, pero no son dos importes editables ni alteran ciclos anteriores.

```text
pago_proveedor_usdt = costo_ciclo_usdt

estado_pago = pendiente hasta confirmar el pago completo
              o pagado después de confirmarlo
```

Un pago normal aporta signo positivo al total pagado. Un reverso referencia el pago original y aporta el signo contrario, sin permitir revertir más de lo previamente confirmado.

En Caja, el pago aparece como salida en su fecha efectiva. En el resultado financiero, el costo se devenga durante los días cubiertos por el ciclo. Si el vencimiento fijo es 22/08 y se paga completo el 23 o 24/08, solo cambia el día de la salida en Caja: el inicio, la cobertura, el `dia_ancla_proveedor` y la próxima renovación permanecen intactos.

El cierre mensual muestra ambos hechos, tanto en USDT como en su valorización histórica en Bs:

- `costo_proveedor_devengado_usdt` y `costo_proveedor_devengado_ves`, dos lecturas del mismo costo; solo la segunda entra en el margen consolidado en Bs;
- `pagos_proveedor_usdt` y `pagos_proveedor_ves`, dos lecturas del mismo pago; solo la segunda entra en el flujo de caja valorizado en Bs.

El pago no se vuelve a restar de la ganancia si el costo ya fue devengado. Esta separación evita duplicar gastos.

### Gastos operativos

Dentro de Caja existirá un apartado compacto para egresos empresariales que no pertenecen a ciclos de proveedores de cuentas. Categorías iniciales:

- `recarga_banco`;
- `compra_producto`;
- `comision`;
- `servicio_herramienta`;
- `publicidad`;
- `otro_negocio`.

Los gastos personales quedan fuera del sistema. El formulario se mantiene deliberadamente simple:

- fecha y hora del gasto;
- categoría y descripción;
- monto en USDT;
- contraparte, página o trader opcional;
- plataforma/cuenta relacionada opcional;
- referencia no sensible y nota opcional;
- usuario que lo registró y estado.

La última tasa paralela recibida se selecciona automáticamente al confirmar. La interfaz muestra antes de guardar el equivalente en Bs y conserva `monto_usdt`, `tasa_paralela_id`, `monto_ves_snapshot` y `confirmado_at`.

Una recarga al banco de Nigeria se registra, por ejemplo, como `recarga_banco` por `20 USDT`. El nombre del trader y la cantidad de nairas recibida pueden quedar en la nota, pero no crean cuentas financieras, transferencias internas ni aportes dentro del modelo.

Un mismo desembolso nunca puede registrarse por las dos rutas. Si una compra o renovación concreta se reconoce como costo/pago de un ciclo proveedor, la recarga que la financió no se registra además como gasto operativo. Si la recarga se registró como el gasto fuente —porque el MVP no controla el saldo bancario ni su consumo posterior—, los débitos cubiertos por ella no vuelven a generar costos/pagos financieros. Esta exclusión evita restar dos veces el mismo dinero, aunque limite temporalmente la atribución por cuenta.

```text
monto_usdt          = 20
tasa_paralela       = X Bs por USD
monto_ves_snapshot  = 20 * X
nota_opcional       = trader y nairas recibidos
```

Todo gasto operativo normal confirmado afecta Caja y resultado en la fecha registrada. Como los reversos son excepcionales, se gestionan desde una acción secundaria `Revertir` en el detalle del movimiento y aparecen en un bloque pequeño de `Ajustes y reversos` dentro de Caja. Conservan el signo contrario y nunca borran el original ni superan su saldo vigente.

```text
gastos_operativos_dia_ves
  = suma(monto_ves_snapshot_firmado de gastos y reversos confirmados del dia)

resultado_operativo_ves
  = margen_bruto_ves - gastos_operativos_ves
```

### Panel de ganancias

El panel muestra los hechos fuente y dos lecturas del ingreso recibido, sin confundir precio nominal, caja y poder de compra:

```text
precio_comercial_usd
valor_cobro_usd_segun_bcv
valor_economico_cobro_usd_paralela

resultado_economico_usd_paralela
  = ingresos_cobrados_ves / paralela_historica_de_cada_operacion
    - costos_proveedor_usdt
    - gastos_operativos_usdt
    + ajustes_economicos_derivados_de_reversos
```

La rentabilidad económica principal usa paralela porque es la referencia con la que se valorizan y pagan proveedores/gastos. La lectura BCV sigue visible para explicar el precio cobrado al cliente. Para agregados históricos, cada operación usa sus propias tasas congeladas; las tasas de corte solo convierten un total consolidado cuando el panel ofrece una lectura adicional “a valor de hoy”. Toda cifra muestra si usa snapshot de operación o tasa de corte, además de fuente, vigencia/observación y actualización.

### Caja, ventas y ganancias diarias

Cada día de negocio se identifica como un valor `date` en `America/Caracas`. Caja no mezcla tres hechos distintos:

1. **Ventas del día:** operaciones comerciales cuya `fecha_venta` corresponde al día, separadas en ventas nuevas y renovaciones.
2. **Caja del día:** dinero efectivamente recibido o pagado durante el día.
3. **Resultado diario:** ingreso y costo devengados por prestar servicio ese día, aunque la venta o el pago hayan ocurrido en otra fecha.

```text
ventas_dia_usd
  = suma(precio_comercial_usd de ventas_nuevas y renovaciones
         con fecha_venta = dia)

ventas_esperadas_dia_ves
  = suma(monto_ves_esperado de esas operaciones)

entradas_caja_dia_ves
  = suma(monto_ves_cobrado de pagos_cliente confirmados
         con tipo = cobro y ocurrido_at = dia)

salidas_caja_dia_ves
  = suma(snapshot_ves_firmado de pagos_proveedor con fecha_pago = dia)
    + suma(snapshot_ves_firmado de gastos_operativos con fecha_gasto = dia)
    + suma(monto_ves de pagos_cliente con tipo = reverso
           y ocurrido_at = dia)

flujo_caja_dia_ves
  = entradas_caja_dia_ves - salidas_caja_dia_ves

ingreso_comercial_devengado_dia_usd
  = suma(precio_comercial_usd / dias_reales_periodo
         para periodos pagados que cubren ese dia)

ingreso_cobrado_devengado_dia_ves
  = suma(monto_ves_cobrado / dias_reales_periodo
         para periodos pagados que cubren ese dia)

ingreso_economico_devengado_dia_usd_paralela
  = suma((monto_ves_cobrado / paralela_snapshot) / dias_reales_periodo
         para periodos pagados que cubren ese dia)

costo_devengado_dia_usdt
  = suma(costo_usdt / dias_reales_ciclo para cuentas cubiertas ese dia)

costo_devengado_dia_ves
  = suma(costo_ves_snapshot / dias_reales_ciclo para cuentas cubiertas ese dia)

margen_bruto_dia_ves
  = ingreso_cobrado_devengado_dia_ves - costo_devengado_dia_ves

margen_economico_dia_usd_paralela
  = ingreso_economico_devengado_dia_usd_paralela
    - costo_devengado_dia_usdt

ajuste_clientes_dia_ves
  = -suma(monto_ves de reversos_cliente confirmados
          con ocurrido_at = dia)

ajuste_clientes_dia_usd_paralela
  = -suma(monto_ves / paralela_snapshot_del_cobro_original
          de esos reversos)

resultado_operativo_economico_dia_usd_paralela
  = margen_economico_dia_usd_paralela
    - gastos_operativos_dia_usdt
    + ajuste_clientes_dia_usd_paralela

resultado_operativo_dia_ves
  = margen_bruto_dia_ves
    - gastos_operativos_dia_ves
    + ajuste_clientes_dia_ves
```

En las fórmulas, `monto_ves_cobrado` es el alias derivado de `pagos_cliente.monto_ves` para el único movimiento confirmado `tipo = cobro` de cada período. Los movimientos `tipo = reverso` se muestran por separado como reembolsos y usan `ocurrido_at` como fecha efectiva.

El panel diario mostrará:

- cantidad y monto de ventas nuevas;
- cantidad y monto de renovaciones;
- precio comercial USD y Bs esperados a BCV de ventas/renovaciones;
- cobros de clientes;
- pagos a proveedores y gastos operativos en USDT, con su equivalente histórico en Bs, más reembolsos/reversos comerciales;
- flujo neto de caja;
- ingreso comercial USD, ingreso cobrado VES, costo y margen bruto devengados;
- ingreso y margen económicos a la paralela congelada de cada operación;
- resultado operativo después de gastos;
- unidades-día con período pagado, en cortesía activa, pausadas para el cliente, disponibles, reservadas y bloqueadas;
- costo ocioso del día;
- costo asignado a días de cortesía y pausa sin ingreso;
- desglose por plataforma, producto, modalidad y vendedor;
- detalle de movimientos con estado y referencia;
- ventas fuente en USD, cobros fuente en Bs, egresos fuente en USDT y sus valorizaciones históricas; BCV explica el cobro y paralela gobierna la lectura económica de rentabilidad.

Una venta pagada y registrada hoy con servicio futuro pertenece a las ventas y a la Caja de hoy, pero su ingreso comienza a devengarse cuando inicia el servicio. Una venta o renovación ordinaria nunca deja un período confirmado esperando cobro: si el cliente paga después de vencer, el intervalo previo continúa clasificado como cortesía o pausa y el nuevo período inicia al recibir el total si seguía activo o, si estaba pausado, en la fecha posterior entre pago completo y reactivación, sin ingreso retroactivo. Solo una `carga_inicial` puede reflejar un período histórico vigente con datos financieros todavía pendientes, y no inventa Caja ni ingreso hasta disponer de una base real.

El día actual es provisional y se actualiza en vivo. Los días de un mes abierto pueden cambiar por correcciones auditadas; al cerrar el mes quedan vinculados a la versión oficial del cierre.

La regla de reconciliación es obligatoria:

```text
suma(resultado_diario_ves de todos los dias del mes)
  = resultado_del_cierre_mensual_ves
```

Las diferencias de redondeo se resuelven con la misma política de alta precisión y residuo final usada por el cierre mensual.

### Cierre financiero mensual

Cada mes se calcula como un rango semiabierto en `America/Caracas`:

```text
mes = [primer_dia_del_mes, primer_dia_del_mes_siguiente)
```

Como clientes, cuentas y proveedores comienzan o renuevan en días distintos, el cierre no asigna todo el precio al mes de cobro. Prorratea cada período por los días reales que coinciden con el mes:

```text
dias_periodo = fecha_renovacion_cliente - inicio
dias_en_mes  = dias(interseccion(periodo, mes))

ingreso_comercial_devengado_usd
  = precio_comercial_usd * dias_en_mes / dias_periodo

ingreso_cobrado_devengado_ves
  = monto_ves_cobrado * dias_en_mes / dias_periodo

ingreso_economico_devengado_usd_paralela
  = (monto_ves_cobrado / tasa_paralela_snapshot)
    * dias_en_mes / dias_periodo

costo_proveedor_devengado_ves
  = costo_ciclo_ves_snapshot * dias_en_mes / dias_ciclo_proveedor
```

Ejemplo: un período pagado 22/07–22/08 tiene 31 días. Julio recibe 10 días de ingreso —del 22 al 31— y agosto recibe 21 —del 1 al 21—. Si el cliente no paga el 22/08, ese día puede quedar como cortesía, pero no se agrega como ingreso del período vencido.

El cierre mensual presenta por plataforma, producto, modalidad y total:

- precio comercial e ingreso contractual devengado en USD;
- Bs esperados a BCV, Bs efectivamente cobrados y su conciliación obligatoria;
- ingreso devengado en Bs reales cobrados y lectura económica USD a paralela;
- costo proveedor devengado en Bs;
- margen bruto del mes;
- gastos operativos por categoría, mostrando total USDT y equivalente histórico en Bs;
- reembolsos y ajustes comerciales derivados de sus movimientos fuente;
- resultado operativo del mes;
- cobros recibidos, pagos realizados y flujo de caja, separados del devengo;
- días-unidad pagados, en cortesía activa, pausados/retenidos, reservados, en saneamiento, bloqueados y disponibles;
- porcentaje de ocupación pagada y porcentaje de inventario retenido sin ingreso;
- costo asignado a capacidad ociosa;
- resultado en Bs, lectura nominal BCV y rentabilidad económica a paralela; las tasas de cierre quedan congeladas y no sustituyen los snapshots de cada operación.

El devengo usa fechas de servicio y la Caja usa la fecha efectiva del pago. Por ejemplo, un período de varios meses pagado por adelantado en julio registra toda la entrada de Caja en julio, pero distribuye su ingreso entre los meses realmente servidos. En la carga histórica, una fecha de pago real conocida conserva su mes efectivo; nunca se mueve para hacer coincidir Caja y devengo.

Los días entre la fecha de renovación no pagada y una renovación tardía se clasifican según lo ocurrido:

- `cortesia_activa`: el cliente conservó acceso sin período pagado;
- `pausa_retenida`: el acceso se pausó, pero la unidad se reservó para ese cliente;
- `saneamiento_pendiente`: terminó el uso comercial, pero el perfil remoto aún no se ha limpiado y sigue bloqueado;
- `disponible`: el administrador canceló y liberó la unidad.

En los dos primeros casos no se reconoce ingreso, pero el costo del proveedor continúa y la unidad no puede venderse a otra persona. El cierre muestra esos días y el costo que absorbieron como explicación del margen cedido, sin registrar ni restar un gasto duplicado.

El saneamiento pendiente tampoco genera ingreso ni vacancia vendible. Si intersecta un ciclo proveedor, su costo se muestra como capacidad bloqueada por limpieza; sigue siendo una distribución explicativa del costo ya reconocido, no otro gasto.

```text
dias_sin_ingreso_por_flexibilidad
  = dias_cortesia_activa + dias_pausa_retenida
```

Si una suscripción cambia de perfil/cuenta dentro del mes, su ingreso se divide entre las asignaciones según sus días de uso para el detalle por cuenta, pero no se duplica en el total. Cualquier día de servicio sin asignación se reporta como incidencia y no se oculta dentro de una cuenta ficticia.

El borrador del mes se genera automáticamente al comenzar el primer día del mes siguiente, cuando ya terminó el último día en Caracas. El administrador lo revisa y lo cierra. Un cierre cerrado no cambia silenciosamente: cualquier dato tardío exige reapertura auditada o una versión/ajuste posterior, según la política que se confirme.

Para que los cierres parciales sumen exactamente el precio o costo del ciclo, los cálculos conservan alta precisión, redondean al presentar y asignan cualquier residuo de centavos al último tramo. Nunca se redondea cada costo diario antes de sumar.

El nombre “ganancia neta” del Excel se dividirá en dos métricas claras: **margen bruto** antes de gastos operativos y **resultado operativo** después de restarlos. El sistema también distinguirá contrato, devengo y caja:

```text
ingreso_contractual_usd
  = suma(precio_comercial_usd de ventas/renovaciones
         con fecha_venta dentro del mes)

ves_esperados_devengados_clientes
  = suma(monto_ves_esperado * dias_en_mes / dias_periodo
         para períodos que intersectan el mes)

cobros_clientes_ves
  = suma(monto_ves de pagos_cliente tipo = cobro confirmados
         con ocurrido_at dentro del mes)

reembolsos_clientes_ves
  = suma(monto_ves de pagos_cliente tipo = reverso confirmados
         con ocurrido_at dentro del mes)

ingreso_economico_devengado_usd_paralela
  = suma((monto_ves_cobrado / tasa_paralela_snapshot_de_la_operacion)
         * dias_en_mes / dias_periodo)

flujo_de_caja_valorizado_ves
  = cobros_clientes_ves
  - reembolsos_clientes_ves
  - pagos_proveedor_ves_snapshot_firmado
  - gastos_operativos_ves_snapshot_firmado

margen_bruto_ves
  = ingreso_cobrado_ves_reconocido_en_el_intervalo
  - costo_proveedor_ves_asignado_al_mismo_intervalo

margen_bruto_economico_usd_paralela
  = ingreso_economico_devengado_usd_paralela
    - costo_proveedor_usdt_asignado_al_mismo_intervalo

resultado_operativo_ves
  = margen_bruto_ves
  - gastos_operativos_ves_snapshot_del_intervalo
  + ajustes_clientes_ves

resultado_operativo_economico_usd_paralela
  = margen_bruto_economico_usd_paralela
    - gastos_operativos_usdt_del_intervalo
    + ajustes_economicos_usd_paralela

ajustes_clientes_ves = -reembolsos_clientes_ves

ajustes_economicos_usd_paralela
  = -suma(monto_ves_reversado / paralela_snapshot_del_cobro_original
          para reversos con ocurrido_at dentro del mes)
```

Así, una venta o renovación ordinaria no se confirma sin el cobro completo. Antes de ese momento puede existir una reserva o gestión comercial, pero no un período pagado, ingreso ni entrada de Caja; la única excepción es la carga histórica explícitamente marcada con finanzas pendientes. Los precios contractuales nacen en USD, los cobros de clientes entran en Bs y los pagos de proveedores/gastos salen en USDT; reembolsos y reversos conservan la moneda del hecho que compensan. Caja muestra cada moneda fuente por separado y `flujo_de_caja_valorizado_ves` es una lectura comparable, no el saldo de una cuenta bancaria. La rentabilidad económica usa el equivalente del cobro real a la paralela congelada, no una reconversión posterior.

La fórmula general para capacidad ociosa es:

```text
costo_diario_por_unidad
  = costo_del_ciclo
  / dias_del_ciclo
  / capacidad_vendible_snapshot_del_ciclo

costo_asignado_a_vacancia
  = suma(dias(interseccion(vacancia_unidad, ciclo_proveedor, mes_reportado))
         * costo_diario_por_unidad)
```

La capacidad vendible del ciclo se congela al confirmarlo. Para los productos con cobertura confirmada equivale a la capacidad física contratada —Netflix extra 1, Netflix estándar/HBO/Crunchyroll 5, Disney+/Prime Video 7, Spotify individual 1 y Spotify familiar 5 miembros— aunque después una unidad pase a mantenimiento: ese tramo se clasifica como bloqueo técnico y no cambia el denominador histórico. El uso de la madre Spotify no amplía el denominador cinco y, si no está vendido, no es vacancia. YouTube no fija todavía un denominador proveedor: dependerá de `YT-06` y solo existirá si se registra una cobertura financiera real. Así todos los días-unidad pagados, vendidos, retenidos, bloqueados o vacantes reconcilian con el costo completo sin inventar ciclos.

La vacancia solo existe para inventario reutilizable. Un Gmail propiedad del cliente no vuelve a stock al finalizar YouTube. Si quedara cobertura ya pagada que no puede trasladarse, el cierre la muestra como `costo_no_reutilizable_sin_ingreso`, separado del costo ocioso vendible y sin restarlo por segunda vez.

Para que un servicio sin perfiles no desaparezca del cierre, el motor genera una unidad de cálculo desde el recurso padre: `cuenta_id` presente, `unidad_id = NULL` y snapshot `1`. Produce un día-capacidad por día aplicable, pero nunca el estado `disponible` cuando es propiedad del cliente. Un costo sin ingreso solo aparece al intersectar una cobertura financiera real; si `YT-06` confirma un plan compartido, su ocupación y costo viven en esa segunda capa.

Este valor es un indicador analítico de cómo se reparte un costo ya pagado. No se registra otra vez como gasto, porque hacerlo duplicaría la inversión.

En el cierre mensual, el costo completo del proveedor ya participa en `costo_proveedor_devengado_ves`. Una unidad vacante reduce la ganancia porque no genera ingreso mientras el costo continúa. `costo_asignado_a_vacancia` explica qué parte del costo fue ociosa, pero **no se resta nuevamente** del resultado.

El USD comercial no sustituye al cobro real en Bs: ambos se guardan junto con Bs esperados, BCV y paralela de la operación. En los egresos, USDT es el monto fuente y su snapshot en Bs queda congelado con una tasa paralela histórica identificable.

## 8. Permisos mínimos

| Recurso | Administrador | Revendedor |
|---|---:|---:|
| Inventario completo | Lectura/escritura | No |
| Disponibilidad saneada | Sí | Sí |
| Ventas de cualquier vendedor | Sí | No |
| Ventas propias | Sí | Sí |
| Clientes vinculados a ventas propias | Sí | Sí |
| Credenciales de cuenta | Acceso explícito y auditado | No |
| Gmail/contraseña propiedad del cliente | Acceso explícito, cifrado y auditado | No |
| Credenciales de identidad Spotify | Acceso explícito, temporal y auditado; eliminación de secretos de cliente al cierre | No |
| Gmail pagador Spotify | Acceso explícito, cifrado y auditado; la aplicación no guarda su contraseña | No |
| PIN de unidad | Acceso explícito | Solo si se autoriza para una venta propia |
| Costos y finanzas | Sí | No por defecto |
| Solicitudes de stock | Gestiona | Crea y consulta las propias |
| Roles de usuarios | Gestiona | No |

Un revendedor que consulta inventario libre no debe recibir correo/login, contraseña, PIN, proveedor, costo ni datos del cliente anterior.

En la grilla administrativa de YouTube y Spotify solo puede aparecer una máscara de los correos sensibles generada por el servidor. El correo completo, una contraseña Spotify o el Gmail pagador requieren un comando de revelado específico, temporal y auditado, y nunca forman parte de Caja o reportes generales. La aplicación no ofrece ningún camino para guardar/revelar la contraseña del Gmail pagador.

## 9. Requisitos no funcionales

- Dark mode, interfaz responsive y alternativa en tarjetas para pantallas estrechas.
- Consultas paginadas; el navegador no cargará todo el historial para pintar una grilla.
- Validación en UI y nuevamente en servidor/base de datos.
- RLS activa en toda tabla expuesta por Supabase.
- Auditoría de cambios financieros, asignaciones y revelado de secretos.
- Datos sintéticos en desarrollo y pruebas; nunca una copia cruda del Excel.
- Pruebas unitarias de meses calendario, períodos Spotify de 1/3/6/12 meses, fin de mes, tasas y dinero; pruebas SQL de restricciones/RLS y pruebas E2E de flujos críticos, incluidos bloqueo de admisiones, uso concurrente de madre + cinco miembros e incidencia familiar por lote.
- Backups con prueba periódica de restauración antes de convertir la aplicación en la única fuente operativa.
