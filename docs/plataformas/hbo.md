# HBO — comportamiento de inventario y venta

## 1. Estado y fuente

Ficha documentada el 22/07/2026 a partir de la explicación del usuario y la captura de su Excel. No se copiaron correos, contraseñas, PIN, teléfonos ni datos de proveedores visibles en la imagen.

Nombre interno confirmado: **HBO**. El nombre comercial o slug seguirá siendo configurable y no cambia estas reglas.

Arquetipo: [cuenta híbrida por perfiles o completa](arquetipos/cuenta-hibrida.md).

## 2. Estructura del inventario

Una cuenta madre de HBO tiene capacidad operativa de **cinco perfiles**. Cada perfil posee nombre visible, número de slot y puede tener un PIN propio tratado como texto. La cuenta conserva por separado su correo/login, contraseña, proveedor, costo y ciclo de renovación.

```text
Cuenta HBO — capacidad física: 5 perfiles
  ├─ Perfil 1 ┐
  ├─ Perfil 2 │
  ├─ Perfil 3 ├─ se venden individualmente
  ├─ Perfil 4 │
  └─ Perfil 5 ┘

  o bien

  └─ Venta de cuenta completa — consume y bloquea los 5 perfiles
```

Los cinco perfiles son capacidad física. La venta completa es una modalidad comercial con alcance sobre toda la cuenta; no es un sexto perfil ni cinco ventas ficticias.

## 3. Modalidades confirmadas

### Venta por perfiles

- La cuenta puede atender hasta cinco suscripciones distintas, una por perfil.
- Cada suscripción se asigna a un slot específico.
- Cada perfil conserva su PIN cuando exista y su estado técnico.
- El cliente y su teléfono pertenecen al registro de cliente. El precio, vendedor, inicio y renovación pertenecen a la suscripción/período, y el cobro a su movimiento de pago; ninguno pertenece al perfil físico.
- Un perfil liberado puede venderse nuevamente sin borrar clientes o períodos anteriores.

### Venta de cuenta completa

- Una sola suscripción comercial se asigna a la cuenta madre completa.
- La asignación consume las cinco unidades de capacidad durante todo su intervalo.
- El ingreso se registra una sola vez con el precio total acordado.
- No se crean cinco suscripciones, cinco cobros ni cinco ingresos para representar la venta.
- Mientras la asignación completa permanezca abierta, ningún perfil puede aparecer disponible, reservarse o venderse por separado.

## 4. Exclusión entre modalidades

Las modalidades `perfil` y `cuenta_completa` son compatibles como oferta de una misma cuenta, pero son mutuamente excluyentes durante el uso:

1. no se puede vender la cuenta completa si existe al menos un perfil asignado, reservado, pausado o retenido para un cliente;
2. no se puede vender ni reservar un perfil si existe una asignación o reserva de cuenta completa;
3. una fecha vencida no libera nada automáticamente;
4. una suscripción pausada continúa bloqueando su perfil o la cuenta completa hasta una liberación explícita;
5. cambiar de venta por perfiles a venta completa exige que los cinco perfiles estén libres;
6. cambiar de venta completa a perfiles exige cerrar y liberar explícitamente la asignación completa;
7. cada transición conserva el historial y nunca convierte ventas anteriores en otra modalidad.

Estas validaciones deben ejecutarse dentro de una operación atómica bloqueada por cuenta para evitar que dos ventas simultáneas violen la exclusión.

## 5. Calendario, renovación y flexibilidad

HBO usa las reglas globales ya confirmadas:

- los clientes compran un **mes calendario**;
- el cliente puede usar y pagar durante todo su día de renovación;
- vencer solo genera una alerta; no pausa, cancela ni libera inventario;
- el administrador puede mantener activo, pausar o cancelar/liberar manualmente;
- una renovación confirmada siempre se paga completa;
- una renovación tardía comienza al recibir el pago completo si el servicio seguía activo o en la fecha posterior entre pago y reactivación si estaba pausado;
- el proveedor conserva su día ancla fijo y se paga completo, aunque el pago efectivo ocurra uno o dos días tarde.

En venta por perfiles, cada cliente puede tener una fecha distinta. En venta completa existe una sola fecha comercial del cliente para toda la cuenta. La fecha del proveedor siempre pertenece a la cuenta madre y no se multiplica por cinco.

## 6. Fallas, traslados y liberación

- Si falla un perfil o su cuenta madre, la suscripción por perfil puede trasladarse a un perfil libre de otra cuenta HBO. Se cierra la asignación anterior y se crea otra; no se registra una venta nueva ni se modifica el período pagado.
- Si falla una cuenta vendida completa, se traslada a otra cuenta HBO totalmente libre, conservando la misma suscripción, período, precio, cobro y fecha. Nunca puede usarse una cuenta con perfiles individuales retenidos.
- Pausar conserva la asignación actual.
- Si el cliente no renueva y se decide liberar, la asignación queda en `cierre_pendiente` mientras se elimina/restablece su perfil remoto; confirmar limpieza y cierre de sesiones/dispositivos relacionados con ese perfil cierra la asignación y devuelve el slot al inventario sin borrar historia.
- Liberar una cuenta completa aplica limpieza y revocación externa antes de devolver sus perfiles al inventario.
- El nombre del cliente y el nombre visible del perfil son datos distintos, aunque en el Excel hayan coincidido.

## 7. Proveedor, costos y ganancias

El costo del proveedor pertenece a la **cuenta madre completa** y a su ciclo; nunca a cada perfil por separado.

### Cuando se vende por perfiles

- Los ingresos se reconocen por cada período de perfil.
- El costo del ciclo se registra y paga una sola vez.
- Para ocupación y capacidad ociosa, el costo diario de la cuenta puede distribuirse entre sus cinco perfiles físicos.
- Un perfil vacío representa una quinta parte de la capacidad diaria ociosa durante el intervalo correspondiente.
- Esa asignación de costo explica la ociosidad, pero no vuelve a restarse del resultado después de contabilizar el costo completo del proveedor.

### Cuando se vende completa

- Existe un solo ingreso contractual por período completo.
- El costo proveedor continúa registrándose una sola vez.
- Durante el período pagado se reconocen cinco unidades-día pagadas. Si después permanece activa por cortesía o pausada sin liberar, las cinco se clasifican como capacidad retenida sin ingreso y no como vacancia disponible.
- No existe capacidad ociosa interna durante la venta pagada aunque el cliente decida utilizar menos de cinco perfiles, porque compró la exclusividad de toda la cuenta.
- Los perfiles subyacentes no generan ingresos individuales ni pérdidas adicionales.

El precio comercial se introduce y congela en USD; el cliente paga en Bs calculados a BCV y la operación conserva también la paralela contemporánea. El costo y pago del proveedor se registran en USDT y siguen las reglas globales de valorización con tasa paralela, caja diaria y cierre mensual.

## 8. Seguridad y entrega

- Correo/login y contraseña son secretos de la cuenta.
- Cada PIN es un secreto de perfil.
- En venta por perfil, el cliente recibe correo, contraseña, nombre del perfil, PIN y fecha `Renueva/Vence`.
- En venta completa recibe las credenciales, fecha comercial y los datos de perfiles aplicables.
- Ningún cliente está autorizado a modificar correo, contraseña, recuperación, plan o datos de la cuenta madre.
- Las vistas generales no descifran secretos automáticamente.
- Un revendedor nunca recibe costo proveedor ni secretos de inventario libre.
- Toda revelación de credenciales o PIN debe estar autorizada y auditada.
- La entrega registra versiones y metadatos, pero no duplica los secretos en claro.

## 9. Representación en la interfaz

La fila padre muestra la cuenta HBO, su estado técnico y su renovación de proveedor. Al expandirla:

- en operación por perfiles, aparecen los cinco slots con su disponibilidad, asignación y alerta de cliente;
- en operación completa, aparece una sola asignación comercial como en el Excel; los cinco perfiles pueden permanecer contraídos/ocultos, pero el sistema los mantiene bloqueados internamente;
- una cuenta libre permite elegir `Vender perfil` sobre un slot o `Vender cuenta completa` sobre la fila padre;
- si algún perfil está retenido, `Vender cuenta completa` aparece deshabilitado con la causa;
- si la cuenta completa está retenida, todas las acciones de venta/reserva de perfiles aparecen deshabilitadas.

Las alertas se mantienen separadas:

- alerta de cliente por cada suscripción de perfil o por la única suscripción completa;
- aviso de proveedor único por cuenta madre.

## 10. Implicaciones para el modelo común

HBO demuestra que una cuenta física no puede tener una sola `modalidad_id`: la misma cuenta admite perfil y cuenta completa en momentos distintos. El modelo deberá contemplar:

- modalidades habilitadas por cuenta;
- asignaciones con alcance `unidad` o `cuenta`;
- capacidad física independiente de la modalidad comercial;
- exclusión entre una asignación completa y cualquier asignación/reserva de sus perfiles;
- ocupación equivalente a cinco unidades para la venta completa, sin multiplicar el ingreso o el costo.

Esta necesidad debe incorporarse antes de crear las migraciones de la Fase 1.

## 11. Invariantes y pruebas mínimas

1. Una cuenta HBO crea exactamente cinco perfiles físicos habilitados.
2. Puede haber hasta cinco asignaciones individuales simultáneas, una por slot.
3. Un perfil no admite dos asignaciones solapadas.
4. Una asignación individual impide vender la cuenta completa.
5. Una asignación completa impide vender o reservar cualquiera de los cinco perfiles.
6. Una pausa o vencimiento sin liberar mantiene esas exclusiones.
7. Liberar la cuenta completa habilita nuevamente los cinco perfiles.
8. Liberar el último perfil deja disponible la opción de venta completa.
9. La venta completa crea un ingreso y un período, no cinco.
10. El costo proveedor se cuenta una sola vez en ambas modalidades.
11. Una venta completa ocupa cinco unidades-día y no genera vacancia interna.
12. Un traslado de perfil o cuenta completa conserva la suscripción, el período y el cobro originales.
13. Las fechas usan mes calendario y cubren correctamente febrero y meses de 30/31 días.
14. Ningún revendedor puede obtener contraseña, PIN o costo mediante una consulta de disponibilidad.
15. Un slot liberado no vuelve a stock antes de confirmar limpieza y revocación externa.

## 12. Confirmaciones pendientes

| ID | Pregunta | Impacto | Clasificación |
|---|---|---|---|
| HBO-03 | ¿Los nombres de los perfiles se renombran normalmente con el nombre del cliente o pueden conservar otro nombre? | Define valor predeterminado de interfaz; cliente y perfil seguirán separados. | No bloqueante |

HBO usa la política común de cuentas compartidas: cerrar sesiones/dispositivos relacionados con el perfil liberado y mantener las credenciales maestras cuando sea posible.
