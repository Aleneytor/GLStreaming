# Spotify — identidades, cobertura individual y familias

## 1. Identificación

- **Nombre usado internamente:** Spotify.
- **Productos de inventario que ofrece:** cobertura Premium individual y plan Premium Familiar.
- **Arquetipo:** composición especializada de una identidad Spotify con una cobertura Premium. El familiar comparte rasgos con el arquetipo de grupo familiar, pero agrega una cuenta madre utilizable, cinco miembros, credenciales de Spotify del miembro y una venta excepcional de la madre que no concede administración.
- **Estado comercial:** `abierto`.
- **Renovaciones de cartera permitidas:** sí.
- **Cantidad de servicios observada actualmente:** no se fija a partir de las capturas. Las filas vacías, las fechas ficticias producidas por Excel y las apariciones repetidas de una madre no son servicios adicionales.
- **Estado de la ficha:** comportamiento principal documentado; queda una prueba operativa delimitada en la sección 11.
- **Fuente y fecha:** explicación directa del usuario y capturas de su Excel, confirmadas el 22/07/2026. No se copiaron correos, contraseñas, teléfonos, nombres, códigos ni otros datos identificables.

Spotify es actualmente la segunda plataforma con más ventas del negocio. Sus cuatro mecanismos comerciales confirmados son:

1. cuenta individual activada directamente por GL Streaming mediante GPay;
2. cuenta individual activada por un proveedor externo sobre datos suministrados por GL Streaming;
3. miembro dentro de una familia administrada por GL Streaming;
4. uso vendido de la cuenta madre familiar, de manera excepcional.

Las dos modalidades de identidad —correo administrado por GL Streaming y correo del cliente— atraviesan los tres primeros mecanismos. No son productos ni proveedores distintos y no se infieren por el precio.

### Separación obligatoria entre identidad y cobertura

La cuenta que conserva playlists, “Me gusta” e historial no es lo mismo que el mecanismo que le da Premium:

```text
Suscripción comercial del cliente
  ├─ identidad Spotify
  │    ├─ administrada por GL Streaming y reutilizable después de sanear
  │    └─ aportada por el cliente y no reutilizable
  └─ cobertura Premium vigente
       ├─ individual propia por GPay
       ├─ individual activada por proveedor
       └─ miembro de una familia administrada
```

Una falla puede cambiar la identidad técnica o la cobertura sin crear otra venta. Cliente, beneficiario, período pagado, precio, cobro y vencimiento permanecen en la suscripción comercial.

## 2. Productos e inventario comprado

### 2.1. Cobertura Premium individual — `spotify_individual`

- **Qué se obtiene:** Premium para una sola identidad Spotify.
- **Origen operativo:** activación directa propia mediante GPay o activación realizada por un proveedor externo.
- **Titular del recurso:** la cobertura es administrada por GL Streaming; la identidad puede pertenecer al negocio o al cliente.
- **Reutilización:** la cobertura puede renovarse o sustituirse. Una identidad de GL Streaming puede reutilizarse después de revocar el acceso anterior y sanearla; una identidad del cliente nunca vuelve a stock.
- **Capacidad:** fija de una identidad cubierta a la vez.
- **Datos operativos:** identidad Spotify cubierta, modalidad de identidad, origen de activación, proveedor operativo, ciclos mensuales de cobertura, Gmail pagador cuando corresponde y referencia no sensible del medio propio utilizado.
- **Secretos:** contraseña de Spotify mientras sea necesaria para operar la cuenta. El Gmail pagador no comparte su contraseña con la aplicación.
- **Ciclo proveedor:** mensual, aunque el cliente haya comprado 1, 3, 6 o 12 meses por adelantado.
- **Proveedor predeterminado:** `Yo` para GPay propio; un tercero identificable por nombre, alias o teléfono para la activación externa.
- **Relación con otros productos:** no consume una familia. Una identidad que estaba en un familiar puede recibir individual como rescate sin crear otra venta ni cambiar el período comercial.

No existe una ruta de cuentas individuales pagadas directamente con tarjeta sin Gmail pagador. Las tarjetas u otros medios sin Gmail asociado se observan en planes familiares, no en individuales.

#### Gmail pagador de GPay

Cada individual activada directamente por GPay tiene exactamente un Gmail pagador y cada Gmail pagador corresponde a una sola cuenta individual. Esta identidad de pago es distinta del login Spotify, del correo del cliente y del proveedor.

El Gmail pagador es un dato operativo crítico porque permite cancelar la suscripción o cambiar el plan aunque el cliente modifique las credenciales de Spotify. La aplicación conserva su dirección cifrada en un campo restringido y su relación uno a uno con la cobertura, pero no almacena su contraseña, recuperación ni factores de autenticación.

### 2.2. Plan Premium Familiar — `spotify_familiar`

- **Qué se obtiene:** una cuenta madre que administra el plan y cinco cupos de miembros.
- **Titular del recurso:** siempre GL Streaming. Todas las madres usan un correo de dominio administrado por el negocio o un Gmail propio del negocio; nunca un correo del cliente.
- **Reutilización:** los cinco cupos son reutilizables cuando se confirma la salida del miembro anterior y el familiar permite incorporar personas. El uso de la madre también puede sanearse y reasignarse sin alterar los miembros.
- **Capacidad:** fija de cinco miembros, además de la identidad madre. La madre no es un sexto cupo ni consume uno de los cinco.
- **Datos operativos:** correo y estado de la madre, proveedor, ciclo y costo del plan, fecha de renovación, cinco cupos, bloqueo de incorporaciones y uso operativo o comercial de la madre.
- **Secretos:** contraseña Spotify de la madre y las credenciales de las identidades de miembros cuando la operación las requiera.
- **Ciclo proveedor:** mensual y propio de la familia.
- **Proveedor:** propio o tercero. Un familiar puede haberse pagado con tarjeta u otro medio y no necesita Gmail pagador; el control se conserva mediante la cuenta madre.
- **Relación entre registros:** proveedor, inversión/costo y renovación pertenecen a la familia y se registran una sola vez. No se repiten en cada miembro ni en la fila donde aparece una madre vendida.

La estructura física y comercial es:

```text
Familia Spotify — un costo y un ciclo proveedor
  ├─ cuenta madre / administradora
  │    └─ uso estático, de confianza o venta excepcional
  └─ cinco cupos de miembro
       ├─ miembro 1
       ├─ miembro 2
       ├─ miembro 3
       ├─ miembro 4
       └─ miembro 5
```

La venta de la madre es concurrente con las cinco ventas de miembros. No representa una venta completa de la familia, no concede exclusividad y no bloquea ni libera los cupos hijos.

### 2.3. Identidades Spotify

Toda cobertura apunta a una identidad explícita:

- **Identidad GL:** usa un correo de los dominios administrados por el negocio u otra cuenta propia. GL Streaming crea la cuenta, conserva el control y puede reutilizarla después de cerrar sesiones, rotar la contraseña y limpiar playlists y “Me gusta”.
- **Identidad del cliente:** usa el correo indicado por el cliente y su contraseña de Spotify. El cliente no entrega la contraseña de Gmail. La identidad queda ligada a ese beneficiario, nunca se vende a otra persona y no aparece como stock.
- **Identidad madre:** siempre pertenece al negocio, administra una familia y puede tener un uso de reproducción separado de su función administrativa.
- **Identidad retirada por recreación:** la cuenta antigua cuyo correo se cambió para liberar el identificador habitual queda archivada o retirada. No es inventario disponible y no conserva una asignación comercial activa.

Correo visible e identidad histórica no deben confundirse. Un mismo correo puede volver a aparecer en una identidad nueva solo después de que la identidad anterior haya sido retirada y el cambio remoto haya liberado efectivamente ese correo; nunca puede identificar dos cuentas Spotify activas al mismo tiempo.

## 3. Mecanismos comerciales y modalidades

Los cuatro mecanismos describen **cómo se obtiene la cobertura**; las modalidades canónicas describen **qué se vende**. No son el mismo eje:

| Mecanismo | Modalidad comercial | Tipo de cobertura |
|---|---|---|
| Individual propia por GPay | `servicio_individual` | `individual_gpay_propio` |
| Individual activada por proveedor | `servicio_individual` | `individual_proveedor` |
| Miembro de una familia | `miembro_familiar` | `familiar` sobre uno de cinco slots |
| Uso vendido de la madre | `uso_principal` | `familiar` sobre la identidad madre |

### 3.1. Mecanismo: individual propia por GPay

- **Producto:** `spotify_individual`.
- **Modalidad comercial:** `servicio_individual`.
- **Tipo de cobertura:** `individual_gpay_propio`.
- **Unidad comercial:** una identidad Spotify con Premium individual.
- **Alcance:** una suscripción de un beneficiario.
- **Capacidad consumida:** una cobertura individual.
- **Entrega:** credenciales de la cuenta cuando la identidad es GL; confirmación de activación cuando la identidad es del cliente.
- **Identidad:** GL o cliente.
- **Datos requeridos:** para identidad GL, datos de personalización; para identidad del cliente, correo y contraseña de Spotify. Además, GL Streaming vincula el Gmail pagador propio uno a uno.
- **Precio y periodicidad:** precio total en USD introducido manualmente para 1, 3, 6 o 12 meses calendario; cobro en VES a BCV.
- **Compatibilidad:** no se solapa con otra cobertura activa para la misma identidad.

### 3.2. Mecanismo: individual activada por proveedor

- **Producto:** `spotify_individual`.
- **Modalidad comercial:** `servicio_individual`.
- **Tipo de cobertura:** `individual_proveedor`.
- **Unidad comercial:** una identidad Spotify con Premium individual.
- **Alcance:** una suscripción de un beneficiario.
- **Capacidad consumida:** una cobertura individual administrada por el proveedor.
- **Entrega:** GL Streaming suministra al proveedor el correo y la contraseña de Spotify; el proveedor activa esa misma cuenta. GL Streaming entrega o confirma el servicio al cliente.
- **Identidad:** GL o cliente.
- **Datos requeridos:** los mismos del mecanismo anterior, salvo Gmail pagador.
- **Precio y periodicidad:** precio total en USD introducido manualmente para 1, 3, 6 o 12 meses calendario.
- **Soporte:** ante una falla, GL Streaming contacta al proveedor y este reactiva la misma identidad; no entrega ni crea una cuenta distinta.

### 3.3. Mecanismo: miembro de una familia

- **Producto:** `spotify_familiar`.
- **Modalidad comercial:** `miembro_familiar`.
- **Tipo de cobertura:** `familiar` sobre un slot.
- **Unidad comercial:** un cupo de miembro.
- **Alcance:** una suscripción de un beneficiario dentro de una familia concreta.
- **Capacidad consumida:** exactamente uno de los cinco cupos.
- **Entrega:** incorporación de la identidad Spotify a la familia y entrega o confirmación según el titular de la identidad.
- **Identidad:** GL o cliente.
- **Datos requeridos:** correo y contraseña de Spotify; nunca la contraseña del correo del cliente.
- **Precio y periodicidad:** precio total en USD introducido manualmente para 1, 3, 6 o 12 meses calendario.
- **Compatibilidad:** cinco miembros pueden coexistir con el uso o venta de la madre. No puede asignarse un nuevo miembro mientras la familia tenga bloqueadas las incorporaciones.

### 3.4. Mecanismo: uso vendido de la madre

- **Producto:** `spotify_familiar`.
- **Modalidad comercial:** `uso_principal`.
- **Tipo de cobertura:** `familiar` sobre la identidad madre.
- **Unidad comercial:** el uso normal de la identidad Spotify principal.
- **Alcance:** una suscripción adicional sobre la madre, sin control administrativo transferido.
- **Capacidad consumida:** no consume ninguno de los cinco cupos y no representa venta completa.
- **Entrega:** credenciales Spotify de la madre y una advertencia explícita de uso restringido.
- **Identidad:** exclusivamente una identidad administrada por GL Streaming.
- **Restricciones:** el cliente no puede añadir o eliminar miembros, cambiar correo, contraseña, recuperación, plan, pago ni configuración maestra.
- **Precio y periodicidad:** precio total en USD introducido manualmente para el período vendido.
- **Compatibilidad:** coexiste con los cinco miembros. Finalizar o sanear este uso no debe afectar sus servicios.

Cuando la madre no se vende, puede quedar estática como recurso administrativo o tener un uso de confianza no comercial. Ese estado no genera ingreso, no constituye vacancia de miembro y no altera la capacidad cinco.

### 3.5. Beneficiario, comprador/contacto y vendedor

Spotify necesita distinguir tres funciones que la columna histórica `Vendió` mezcla:

- **beneficiario:** persona cuyo nombre personaliza la identidad y que usa Spotify;
- **comprador/contacto de cobro:** persona que paga, recibe los recordatorios y coordina renovaciones;
- **vendedor o revendedor:** actor que originó o gestionó la venta, si existe.

Una misma persona puede cumplir las tres funciones. Cuando un intermediario compra varias cuentas para otras personas, cada suscripción conserva su beneficiario, mientras las ventas comparten al mismo comprador/contacto y sus datos. Las renovaciones se coordinan con ese contacto, no con beneficiarios de quienes no se guardaron datos. Un comprador intermediario no se convierte automáticamente en revendedor autenticado ni genera una comisión implícita.

## 4. Activación y entrega

### Prerrequisitos generales

- suscripción comercial, beneficiario y contacto de cobro identificados;
- identidad Spotify creada o aportada, con titularidad explícita;
- mecanismo de cobertura elegido;
- período de 1, 3, 6 o 12 meses y precio USD confirmados;
- cobro VES y tasas disponibles según las reglas de la sección 7;
- proveedor y cobertura compatibles;
- para miembro familiar, un cupo libre y una familia que permita nuevas incorporaciones;
- para GPay propio, Gmail pagador libre y no vinculado a otra individual.

### Identidad GL

1. GL Streaming crea la cuenta Spotify usando un correo administrado por el negocio.
2. Registra la credencial en el almacén restringido.
3. Activa la individual o incorpora la identidad al familiar.
4. Verifica que Spotify muestre Premium.
5. Entrega al contacto autorizado el correo, contraseña y fecha comercial.

### Identidad del cliente

1. El cliente entrega su correo y contraseña de **Spotify**, no la contraseña de Gmail.
2. GL Streaming usa esos datos para activar la individual o completar la incorporación familiar.
3. Si Spotify solicita un código enviado al correo, el cliente puede comunicarlo de forma transitoria.
4. El código se usa y descarta; no se almacena en campos, notas, eventos ni logs.
5. Se confirma activación y fecha comercial. No se “entrega” nuevamente una contraseña que ya pertenece al cliente.

### Individual activada por proveedor

GL Streaming suministra al proveedor los datos de la identidad que debe activar. El proveedor no selecciona otra cuenta ni aporta credenciales sustitutas. La evidencia mínima es la confirmación de Premium sobre la identidad suministrada. Si existe una falla posterior, se abre seguimiento con ese proveedor sobre la misma identidad.

### Miembro familiar

El administrador completa la incorporación desde la madre y confirma que la identidad aparece como miembro y tiene Premium. Un cupo reservado o en incorporación pendiente no puede asignarse a otra venta.

### Uso vendido de la madre

La entrega incluye solamente las credenciales necesarias para usar la identidad madre como Spotify normal y la fecha comercial. Debe mostrar de forma destacada que recibir las credenciales no transfiere propiedad ni autorización administrativa. Solo GL Streaming puede gestionar miembros, correo, contraseña, recuperación, plan y forma de pago.

### Actor autorizado y estados intermedios

En el MVP, solo el administrador genera o revela la entrega. Aplican, según el mecanismo, estados intermedios equivalentes a:

- `identidad_pendiente`;
- `esperando_datos_cliente`;
- `esperando_codigo_cliente`;
- `activacion_proveedor_pendiente`;
- `incorporacion_familiar_pendiente`;
- `entrega_pendiente`;
- `activo`.

Los estados pendientes retienen la cobertura o el cupo correspondiente, pero no prueban activación. La evidencia operativa guarda actor, fecha, resultado y referencia no sensible; nunca copia contraseñas o códigos.

## 5. Renovación y vencimiento

### Duración comercial

Spotify se vende por **1, 3, 6 o 12 meses calendario**, no por 30, 90, 180 o 360 días exactos. Los números de días de Excel son una limitación de la hoja y no son la regla de negocio.

Cada venta o renovación de varios meses crea un solo período comercial por la duración completa. La fecha de vencimiento se deriva sumando meses calendario al inicio y aplicando la regla global para el último día válido. El cliente conserva su fecha durante cualquier reparación o reemplazo técnico.

El período del cliente y los ciclos de cobertura no se confunden:

```text
Cliente compra 6 meses y paga una vez
  └─ GL Streaming sostiene 6 ciclos mensuales de proveedor/cobertura
```

Los ciclos mensuales no crean seis ventas, seis cobros ni seis períodos ficticios del cliente.

### Renovación de cobertura

- La individual propia se sostiene mediante su mecanismo GPay y Gmail pagador vinculado.
- La individual de tercero se renueva o reactiva con el proveedor sobre la misma identidad.
- El familiar se renueva una vez por familia, no una vez por miembro.
- Una venta ya cobrada por varios meses debe seguir mostrando las obligaciones mensuales pendientes aun cuando el cliente no deba pagar ese mes.

### Mora y no renovación

El tratamiento es manual y depende de cada cliente; no existen plazos automáticos fijos. Vencer no cancela, no libera ni destruye secretos por sí solo.

El administrador puede aplicar gradualmente:

1. cerrar sesiones durante los primeros días para provocar contacto;
2. rotar la contraseña de Spotify si el cliente continúa sin responder;
3. mantener temporalmente la cobertura mientras decide si concede espera;
4. como última medida, sacar al miembro de la familia o cancelar la individual.

Se evita la finalización prematura porque reactivar puede ser difícil. Cada acción se registra por separado con actor, fecha, motivo y resultado. Una promesa o espera no cambia el período pagado ni genera otro ingreso.

### Cierre definitivo por modalidad de identidad

- **Identidad GL individual o miembro:** cerrar sesiones, rotar contraseña, limpiar playlists y “Me gusta”, confirmar que el acceso anterior quedó revocado y solo entonces devolver la identidad o el cupo al inventario compatible.
- **Identidad del cliente:** retirar del familiar o cancelar la individual, cerrar la asignación y destruir la contraseña Spotify almacenada por la aplicación. La identidad y el correo no vuelven a stock. Si la persona regresa, debe suministrar nuevamente sus datos.
- **Madre vendida:** cerrar sesiones de ese uso, rotar la contraseña y limpiar su contenido personal sin cancelar el familiar ni tocar a sus cinco miembros. Después puede venderse de nuevo.

Durante el cierre, la asignación permanece en `cierre_pendiente` y el recurso reutilizable en `pendiente_limpieza`. Solo la confirmación de revocación y saneamiento habilita una identidad GL, un cupo o el uso de la madre. El historial comercial y financiero no se borra al destruir secretos.

## 6. Fallas, pausa y reemplazo

### Fallas posibles

- una individual pierde Premium;
- un proveedor no sostiene o debe reactivar su cobertura;
- una familia completa falla;
- Spotify impide incorporar cualquier miembro nuevo a una familia;
- una identidad deja de ser elegible para cambiar de familiar por la limitación de Spotify;
- el cliente cambia credenciales o se requiere un código temporal;
- una cobertura familiar debe convertirse excepcionalmente en individual para conservar la identidad.

Pausar una suscripción conserva su identidad, asignación y cobertura reservada mientras se resuelve la incidencia. Nunca publica stock por el solo hecho de que el cliente no pueda usarlo.

### Falla de una individual de proveedor

GL Streaming contacta al proveedor responsable. El proveedor reactiva **la misma cuenta Spotify** suministrada originalmente. La incidencia y la reactivación no crean venta, identidad, período, precio ni cobro nuevos.

### Falla de una familia

Una caída familiar afecta a todos los miembros activos del grupo y, si la madre tiene un uso comercial vigente, también a ese servicio. Debe abrirse una incidencia padre que agrupe todas las suscripciones afectadas; no se trata cada fila como una falla independiente sin relación.

La restricción de Spotify que normalmente impide pasar una identidad entre familiares más de una vez al año obliga al siguiente reemplazo técnico cuando no puede reutilizarse la identidad actual:

1. identificar todos los servicios activos afectados;
2. respaldar playlists y “Me gusta” de cada identidad cuando corresponda;
3. cambiar el correo registrado en la cuenta Spotify antigua por un identificador de archivo, liberando el correo habitual;
4. marcar la identidad antigua como `retirada` o `archivada`, nunca como stock;
5. crear una identidad Spotify nueva con el correo habitual;
6. incorporar la nueva identidad a una familia operativa;
7. restaurar playlists y “Me gusta” y confirmar Premium;
8. cerrar la incidencia y registrar el cambio de asignación técnica.

El procedimiento normalmente toma minutos. Conserva beneficiario, comprador/contacto, vendedor, período, precio, cobro y fecha de vencimiento. No crea renovación, no reinicia el plazo y no cobra otra vez. Aunque se restauren playlists y “Me gusta”, la cuenta nueva no conserva necesariamente todo el historial interno de Spotify; por eso la aplicación debe diferenciarla de la identidad anterior.

El procedimiento también puede aplicarse cuando el correo pertenece al cliente. Este puede necesitar comunicar un código transitorio, que no se persiste.

### Rescate individual de clientes antiguos

Para algunos clientes antiguos con correo propio, GL Streaming puede activar Premium individual sobre la identidad existente en vez de recrearla. Esto preserva su historial. El rescate:

- cambia la cobertura técnica de familiar a individual;
- conserva la misma suscripción y fecha;
- no genera un cobro adicional;
- registra el costo real adicional como parte de la prestación;
- reduce el margen de esa venta si corresponde.

El precio más alto que normalmente se cobra por trabajar con correo del cliente ya cubre comercialmente esa excepción, pero no se codifica una tarifa automática.

### Bloqueo `no se puede`

`no se puede` significa que Spotify impide añadir **a cualquier persona nueva** a esa familia. No representa un miembro, una venta ni un cupo perdido de manera definitiva.

Mientras el bloqueo exista:

- los miembros que ya estaban dentro continúan activos;
- los campos comerciales de las posiciones vacías pueden mostrarse en blanco;
- todos los cupos sin miembro heredan el bloqueo familiar `estado_admision = bloqueada_por_spotify` y no están disponibles;
- no se aceptan reservas, asignaciones ni ventas nuevas contra esa familia;
- el costo y la renovación del familiar continúan mientras la familia siga operativa;
- la recuperación se marca manualmente después de una prueba satisfactoria.

No se conoce todavía una fecha o señal automática de recuperación. El sistema no debe adivinarla ni transformar el bloqueo en disponibilidad por tiempo transcurrido.

### Destino de recursos al cancelar

- El cupo familiar vuelve a estar disponible solo tras sacar al miembro y si la familia admite incorporaciones.
- La identidad GL puede volver a stock tras saneamiento, salvo que quede retirada por una recreación.
- La identidad del cliente se desvincula operativamente y conserva solo historia no secreta; nunca vuelve a stock.
- La identidad antigua renombrada queda archivada y fuera de stock. La aplicación no elimina automáticamente la cuenta remota: conserva solo su referencia histórica no secreta cuando ya no se necesita operar sobre ella; cualquier eliminación remota posterior es una acción administrativa explícita.
- La familia fallida permanece en mantenimiento o retirada; sus cupos no se publican por el solo hecho de trasladar clientes.

## 7. Finanzas y ocupación

### Precio, cobro y tasas del cliente

Spotify tiene una regla comercial específica confirmada:

1. al vender o renovar, el administrador introduce manualmente el **precio total acordado en USD**;
2. el sistema obtiene la publicación BCV aplicable y calcula el cobro esperado en VES;
3. el cliente final paga en bolívares a BCV;
4. se registra el monto real recibido en VES, que debe coincidir con el esperado después del redondeo determinista a dos decimales;
5. la misma operación conserva también la paralela disponible para mostrar su lectura económica y calcular rentabilidad;
6. precio USD, BCV, paralela, monto esperado VES y cobro real VES quedan congelados y no se recalculan con tasas futuras.

La paralela no sustituye la BCV usada para cobrar al cliente. Sirve para comparar, valorizar costos y presentar el resultado real frente a la referencia con la que se paga normalmente a proveedores.

La renovación ofrece una tabla comercial sugerida por duración y titularidad del
correo. Con correo de los dominios GL: 1 mes $4, 3 meses $10, 6 meses $18 y 12
meses $32. Con correo del cliente: 1 mes $5, 3 meses $13, 6 meses $22 y 12 meses
$40. El valor es el **total del paquete**, no una mensualidad que deba
multiplicarse. La sugerencia rellena el formulario, pero permanece editable para
registrar promociones, acuerdos anteriores o cambios de precio sin falsear el
cobro real. Esta sugerencia no modifica el importador: los montos históricos se
leen tal como aparecen en el Excel y solo adoptan la tabla cuando se registra
una renovación futura.

### Costos de cobertura

- Los costos y pagos de proveedores se registran por cada ciclo mensual real en USDT y se valorizan con la paralela de confirmación.
- Una venta de 3, 6 o 12 meses puede tener un solo cobro anticipado y 3, 6 o 12 costos mensuales posteriores.
- El proveedor de una individual se registra al nivel de esa cobertura.
- El costo familiar pertenece a la madre/familia y se registra una sola vez por ciclo, sin repetirse en cada miembro.
- El Gmail pagador es una referencia operativa y no crea por sí solo un segundo costo, proveedor o egreso.
- En una activación GPay propia, un mismo desembolso se representa una sola vez. Si el pago de la cobertura se registra como costo/pago de su ciclo, la recarga que lo financió no se registra además como gasto operativo; si la recarga ya fue registrada como el gasto fuente, los débitos posteriores cubiertos por ella no vuelven a crear costos/pagos financieros. El MVP sacrifica una atribución analítica más fina antes que duplicar el egreso.
- Un rescate individual sin cobro adicional reconoce el costo realmente asumido, pero no inventa ingreso.

### Ingresos y ocupación familiar

La ocupación comercial ordinaria del familiar usa como denominador cinco cupos de miembros:

- miembro vendido: un cupo ocupado con ingreso;
- miembro activo sin período pagado: cortesía o pausa retenida según corresponda;
- cupo libre y habilitado: capacidad ociosa disponible;
- cupo vacío bajo `estado_admision = bloqueada_por_spotify`: capacidad bloqueada, no disponible;
- madre no vendida: recurso administrativo, no vacancia;
- madre vendida: ingreso adicional concurrente que no modifica el denominador cinco.

La rentabilidad total de una familia es la suma de los ingresos reales de sus miembros y, cuando exista, de la madre vendida, menos el único costo del familiar y otros costos reales vinculados. El costo distribuido por cupo es analítico y nunca se descuenta otra vez.

La madre puede aparecer como servicio vendido en una vista y como cabecera del familiar en otra. Ambas referencias apuntan al mismo recurso y no duplican inversión, renovación, costo ni ingreso.

## 8. Seguridad y permisos

### Secretos y datos restringidos

- contraseñas Spotify de identidades GL, madres y cuentas de clientes activas;
- dirección del Gmail pagador y su vínculo uno a uno;
- credenciales suministradas temporalmente a un proveedor;
- códigos transitorios comunicados por el cliente;
- datos de recuperación o control de cuentas propias, cuando existan fuera de la aplicación.

Las contraseñas Spotify necesarias se guardan cifradas en un almacén restringido y nunca aparecen en grillas generales, stock, Caja, reportes, analítica, exportaciones, notas, logs, errores ni evidencias. Las consultas muestran identificadores enmascarados cuando el correo completo no sea imprescindible.

La aplicación **no almacena** contraseñas de los Gmail pagadores, contraseñas de Gmail de clientes, códigos temporales, datos de recuperación ni factores de autenticación. Tampoco guarda datos completos de tarjetas o bancos.

### Retención según titularidad

- Las credenciales de una identidad GL se conservan mientras el recurso exista y cada rotación crea auditoría sin copiar el secreto anterior.
- La contraseña Spotify aportada por un cliente se conserva únicamente mientras la relación esté activa o retenida por un cierre pendiente.
- Al finalizar definitivamente una identidad del cliente, se destruye su secreto en la aplicación y se mantiene solo el historial comercial no secreto.
- La cuenta retirada por recreación queda oculta del stock y de entregas; conservarla no autoriza a conservar indefinidamente secretos del cliente.

### Visibilidad y mutación

- **Administrador:** puede operar credenciales mediante acciones específicas, ver el Gmail pagador cuando sea necesario, gestionar miembros, contactar proveedores y confirmar saneamientos. Cada revelado o cambio queda auditado.
- **Revendedor:** ve únicamente sus operaciones, beneficiarios, contacto comercial y estado saneado permitido por las reglas globales; nunca costos, Gmail pagador, madre completa ni secretos libres. Un permiso futuro de entrega deberá ser explícito y limitado a una venta propia vigente.
- **Cliente o intermediario:** recibe solo los datos necesarios para usar las identidades compradas. Nunca recibe Gmail pagador, datos de otros miembros, medios de pago ni secretos de recuperación.
- **Cliente de una madre:** puede reproducir contenido, pero no administrar el grupo ni mutar datos maestros, aun cuando la interfaz externa de Spotify técnicamente se lo permita.

Si un cliente de la madre incumple y cambia la contraseña, GL Streaming recupera el control mediante el correo de dominio o Gmail propio asociado a la madre. Toda madre permanece bajo titularidad del negocio.

## 9. Interfaz y acciones

### Representación de inventario

Las individuales se muestran como una composición de identidad y cobertura, no como una sola celda ambigua:

```text
Identidad Spotify
  ├─ titular: GL | cliente
  ├─ estado de credencial
  └─ cobertura actual
       ├─ propia GPay + Gmail pagador restringido
       └─ proveedor externo
```

Las familias usan una grilla jerárquica:

```text
Familia / madre
  ├─ uso de madre: estático | confianza | vendido | vencido retenido
  ├─ miembro 1
  ├─ miembro 2
  ├─ miembro 3
  ├─ miembro 4
  └─ miembro 5
```

Costo, proveedor, renovación y estado de incorporación se ven en la cabecera familiar. Cada hijo conserva beneficiario, comprador/contacto, vendedor, precio, período, vencimiento y estado propios.

### Badges y alertas particulares

- `Identidad GL` / `Identidad cliente`;
- `GPay propio` / `Proveedor externo` / `Miembro familiar` / `Uso de madre`;
- `Gmail pagador vinculado` sin revelar su valor;
- `Cobertura mensual pendiente` cuando existe un período cliente prepagado;
- `Familia bloqueada para nuevas incorporaciones`;
- `Miembros afectados por incidencia familiar`;
- `Esperando código del cliente`;
- `Rescate individual`;
- `Identidad retirada`;
- `Cierre pendiente` / `Saneamiento pendiente`;
- alertas separadas para vencimiento del cliente y renovación del proveedor/familia.

### Acciones principales

- crear identidad GL;
- registrar identidad del cliente de forma restringida;
- activar por GPay y vincular Gmail pagador;
- enviar activación a proveedor;
- confirmar activación o reactivación;
- incorporar o sacar miembro;
- asignar, entregar o cerrar uso de la madre;
- cerrar sesiones;
- rotar contraseña;
- respaldar y confirmar restauración de playlists/“Me gusta”;
- retirar identidad antigua y crear reemplazo;
- trasladar cobertura sin crear venta;
- activar rescate individual;
- bloquear o desbloquear incorporaciones de la familia;
- iniciar y confirmar cierre/saneamiento;
- destruir credenciales de cliente al finalizar.

Las acciones remotas son reintentables y mantienen el recurso retenido hasta confirmación. Ningún fallo de Spotify convierte automáticamente un cupo o una identidad en disponible.

### Carga de cartera existente

La cartera se carga manualmente y separada de una venta nueva. La conciliación debe aplicar estas reglas:

- una etiqueta histórica equivalente a `(spotify fam)` identifica el uso vendido de la madre;
- esa madre reaparece como cabecera con sus cinco integrantes, pero se crea un solo recurso familiar;
- los datos de costo/proveedor colocados en otra sección de Excel se vinculan a la familia, no se replican;
- filas completamente vacías no crean cuentas, cupos ni ventas;
- una fecha ficticia generada por una celda vacía, como la base de 1900 de Excel, se carga como `null` y no como fecha real;
- `no se puede` crea el bloqueo familiar de incorporaciones y deja en blanco los datos comerciales de los cupos sin cliente;
- un nombre bajo `Vendió` se clasifica durante la carga como vendedor, comprador/intermediario o ambos según el hecho conocido;
- valores financieros solo se registran cuando se conocen; no se inventan cobros, costos, tasas o fechas para completar la cuadrícula.

## 10. Invariantes y pruebas

1. Toda prestación Spotify separa identidad, cobertura y suscripción comercial.
2. Una falla o traslado de cobertura no crea otra venta ni reescribe el período pagado.
3. Una identidad Spotify no puede tener dos coberturas activas solapadas.
4. Un correo no puede identificar dos identidades Spotify activas al mismo tiempo.
5. Una identidad del cliente exige beneficiario y nunca aparece como stock reutilizable.
6. Una identidad GL solo vuelve a stock después de revocación, rotación y saneamiento confirmados.
7. Finalizar una identidad del cliente destruye su contraseña Spotify almacenada sin borrar historia comercial.
8. La aplicación nunca solicita ni almacena la contraseña de Gmail del cliente.
9. Un código temporal nunca se persiste.
10. Una individual GPay exige exactamente un Gmail pagador y ese Gmail no puede vincularse a ninguna otra individual.
11. La contraseña, recuperación y autenticación del Gmail pagador no se almacenan en la aplicación.
12. Una individual sin Gmail pagador solo puede usar el mecanismo de proveedor; la ruta de tarjeta directa no está habilitada para individuales.
13. El proveedor de una individual reactiva la identidad suministrada; no la sustituye silenciosamente.
14. Toda familia tiene exactamente cinco cupos de miembro además de la madre.
15. Una asignación de miembro consume un único cupo y no se solapa con otra asignación en ese cupo.
16. El uso o venta de la madre no consume cupo, no bloquea miembros y no significa venta completa.
17. La madre vendida puede coexistir con cinco miembros vendidos.
18. El cliente de la madre nunca recibe permiso de administración, aunque posea credenciales de uso.
19. Toda madre pertenece al negocio; ninguna usa como identidad maestra el correo de un cliente.
20. Finalizar el uso vendido de la madre no cancela el plan ni altera a los cinco miembros.
21. Costo, proveedor y renovación familiar se registran una sola vez en la familia.
22. Unir la madre con sus hijos o con su venta visible no duplica costos ni ingresos.
23. `estado_admision = bloqueada_por_spotify` impide toda nueva reserva o asignación de miembro en esa familia.
24. Un cupo vacío dentro de una familia bloqueada no se considera disponible.
25. Bloquear incorporaciones no desactiva a los miembros ya presentes.
26. Una falla familiar genera una incidencia que incluye a todos sus servicios activos afectados.
27. Recrear identidades por una falla conserva el vencimiento y no crea precio, cobro o comisión nuevos.
28. Una identidad antigua renombrada queda retirada y nunca retorna automáticamente a stock.
29. El rescate individual conserva identidad, suscripción y vencimiento; su costo no crea ingreso adicional.
30. Los períodos comerciales permitidos son 1, 3, 6 y 12 meses calendario; no se derivan de 30, 90, 180 o 360 días.
31. Una venta prepagada de varios meses crea un período y un cobro, mientras cada costo mensual real se registra por separado.
32. El precio USD lo introduce el administrador; ninguna tarifa se infiere por correo, duración, mecanismo o proveedor.
33. El cobro VES usa BCV, coincide con el monto esperado redondeado a dos decimales y congela precio USD, BCV, paralela, monto calculado y monto real.
34. Una tasa futura nunca modifica una operación Spotify confirmada.
35. La lectura paralela y el monto VES son representaciones analíticas del mismo hecho; no se suman como ingresos distintos.
36. Beneficiario, comprador/contacto y vendedor son funciones separadas, aunque una persona pueda cumplir varias.
37. Un contacto puede agrupar varias suscripciones con beneficiarios distintos y recibe sus avisos de renovación.
38. Vencer no libera, cancela, limpia ni destruye credenciales automáticamente.
39. Una asignación en cierre o saneamiento pendiente continúa reteniendo su recurso.
40. Fechas ficticias de Excel y filas vacías nunca se convierten en inventario o ventas reales.

## 11. Decisiones pendientes

| ID | Pregunta | Impacto | Clasificación |
|---|---|---|---|
| SPOT-01 | ¿Qué prueba concreta confirma que una familia marcada `estado_admision = bloqueada_por_spotify` ya permite añadir miembros otra vez? | Define la evidencia y automatización del desbloqueo. Hasta resolverlo, solo el administrador puede levantarlo después de una prueba manual satisfactoria. | Bloqueante del flujo automático; no bloqueante de esquema |
