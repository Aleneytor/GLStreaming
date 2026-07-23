# Crunchyroll — comportamiento de inventario y venta

## 1. Estado y fuente

Ficha documentada el 22/07/2026 a partir de la explicación del usuario y la captura de su Excel. No se copiaron correos, contraseñas, nombres de perfil, PIN, teléfonos ni datos de proveedores visibles en la imagen.

Nombre interno confirmado: **Crunchyroll**.

Arquetipo: [cuenta híbrida por perfiles o completa](arquetipos/cuenta-hibrida.md).

## 2. Estructura del inventario

Una cuenta madre de Crunchyroll tiene capacidad física y vendible de **cinco perfiles**.

```text
Cuenta Crunchyroll — capacidad: 5
  ├─ Perfil 1
  ├─ Perfil 2
  ├─ Perfil 3
  ├─ Perfil 4
  └─ Perfil 5

Modalidades permitidas:
  - venta por perfil
  - venta de cuenta completa
```

Correo/login y contraseña pertenecen a la cuenta madre. El nombre visible y el PIN pertenecen a cada perfil. La venta completa es una modalidad comercial que consume los cinco perfiles; no crea un sexto perfil ni cinco ventas ficticias.

## 3. Modalidades confirmadas

### Venta por perfil

- Se permiten hasta cinco suscripciones simultáneas, una por perfil.
- Cada suscripción se asigna a un slot concreto y puede tener cliente, precio, vendedor, período y renovación diferentes.
- Al entregar el servicio, el cliente recibe **correo, contraseña, nombre del perfil, PIN y fecha de vencimiento**.
- La fecha de vencimiento entregada es la fecha comercial del cliente, no la renovación del proveedor.
- Liberar un perfil permite reutilizar ese slot sin borrar la suscripción, sus períodos ni sus asignaciones anteriores.

### Venta de cuenta completa

- Una sola suscripción se asigna a toda la cuenta madre.
- La asignación consume y bloquea los cinco perfiles.
- Existe un solo período, precio, cobro e ingreso por venta o renovación.
- El cliente recibe acceso de uso sobre la cuenta completa, pero no adquiere control administrativo sobre la cuenta madre.
- La entrega incluye correo, contraseña, fecha `Renueva/Vence` y los nombres/PIN de los perfiles aplicables.
- Mientras la asignación completa permanezca abierta, ningún perfil puede reservarse, venderse o aparecer disponible por separado.

## 4. Control de la cuenta madre

El cliente, tanto en venta por perfil como en venta completa, **no puede modificar los datos de la cuenta madre**.

Esto incluye correo/login, contraseña, recuperación, plan, medio de pago y cualquier otra configuración maestra. El negocio conserva el control operativo de la cuenta y realiza las rotaciones o recuperaciones necesarias. La entrega de credenciales permite usar el servicio, pero no transfiere la propiedad ni autoriza cambios maestros.

Los nombres y PIN de perfil permanecen separados de los secretos de la cuenta. Cualquier restablecimiento operativo se ejecuta mediante una acción administrativa y queda auditado.

## 5. Exclusión entre modalidades

- Un perfil asignado, reservado, pausado o retenido impide vender o reservar la cuenta completa.
- Una asignación o reserva completa bloquea los cinco perfiles.
- Vencer no libera inventario automáticamente.
- Pausar conserva el perfil o la cuenta completa asignados.
- Cambiar de perfiles a cuenta completa exige que los cinco slots estén libres.
- Cambiar de cuenta completa a perfiles exige cerrar y liberar primero la asignación completa.
- Todas las comprobaciones se realizan atómicamente sobre la cuenta para impedir ventas incompatibles concurrentes.

## 6. Activación y entrega

Para una venta por perfil:

1. se selecciona un perfil libre de una cuenta Crunchyroll compatible;
2. se crea el período mensual y su asignación;
3. se confirma el cobro completo;
4. se presenta al cliente correo, contraseña, nombre del perfil, PIN y fecha de vencimiento mediante el flujo restringido;
5. se registra la entrega sin copiar los secretos al evento de auditoría.

Para una venta completa se asigna la fila padre y se bloquean internamente sus cinco perfiles. La entrega concede el acceso necesario para usar toda la cuenta bajo la prohibición expresa de modificar sus datos maestros.

## 7. Calendario, renovación y no renovación

Crunchyroll aplica las reglas globales:

- mes calendario;
- acceso y posibilidad de pago durante todo el día de renovación;
- cobro siempre completo;
- vencimiento sin cancelación o liberación automática;
- decisión manual para mantener activo, pausar o finalizar;
- renovación tardía sin ingreso retroactivo;
- ciclo de proveedor con día ancla independiente de las fechas de los clientes.

Cuando un cliente de perfil confirma que **no renovará**, el administrador ejecuta un flujo controlado:

1. mantiene la asignación en `cierre_pendiente` y marca el slot `pendiente_limpieza`;
2. elimina o restablece en Crunchyroll el perfil usado por ese cliente;
3. limpia o rota el nombre y PIN operativos cuando corresponda;
4. cierra las sesiones/dispositivos relacionados con ese perfil cuando la plataforma lo permita;
5. registra y confirma ambas acciones técnicas;
6. cierra la asignación y deja el slot interno libre/reutilizable dentro de la misma confirmación.

Eliminar o restablecer el perfil en la plataforma no elimina la unidad histórica de GL Streaming. La cuenta, suscripción, períodos, cobros y asignaciones anteriores se conservan. El slot físico se reutiliza mediante una asignación futura, no mediante la reescritura del pasado.

En una venta completa que no renueva, se cierra y libera la asignación de alcance cuenta después de realizar la limpieza y cumplir la misma política de revocación. Los cinco perfiles vuelven a estar disponibles según su estado técnico.

## 8. Fallas y traslados

Si falla la cuenta madre, el servicio se traslada a otro recurso Crunchyroll compatible sin crear otra venta ni alterar el período pagado:

- una suscripción por perfil se mueve a un perfil libre de otra cuenta Crunchyroll;
- una suscripción de cuenta completa se mueve a otra cuenta Crunchyroll totalmente libre;
- se cierra la asignación fallida y se crea un nuevo tramo de asignación;
- el perfil o cuenta origen queda en mantenimiento hasta ser revisado;
- el cliente, precio, cobro, inicio y fecha de vencimiento se mantienen;
- las nuevas credenciales, perfil y PIN se entregan mediante el mismo flujo restringido cuando cambien.

Una cuenta con cualquier perfil retenido no es compatible para recibir una venta completa. El traslado conserva toda la trazabilidad de la falla y de los recursos utilizados.

## 9. Proveedor, costos y ganancias

El costo proveedor pertenece una sola vez a la cuenta madre y a su ciclo.

### Operación por perfiles

- Cada perfil genera su propio período con precio USD manual, cobro VES a BCV y lectura económica paralela.
- El costo del ciclo se registra y paga una sola vez en USDT.
- El costo diario puede distribuirse analíticamente entre cinco unidades.
- Solo los perfiles realmente libres producen capacidad ociosa proporcional.

### Operación completa

- Existe un ingreso y un cobro por período completo.
- La asignación consume cinco unidades-día.
- No hay vacancia interna durante el período pagado.
- Si continúa retenida sin pago, las cinco unidades se clasifican como cortesía o pausa, no como disponibilidad.
- El costo proveedor nunca se multiplica por cinco.

La distribución por unidad es explicativa y no vuelve a restarse del resultado mensual. Caja diaria y cierre mensual siguen las reglas globales de tasas y valorización.

## 10. Seguridad e interfaz

- Correo/login y contraseña se guardan cifrados como secretos de cuenta.
- Cada PIN se guarda cifrado como secreto de perfil.
- Los listados generales no incluyen valores descifrados.
- Toda revelación o entrega de credenciales y PIN requiere autorización y auditoría.
- El evento de entrega registra actor, cliente, cuenta, perfil y fecha, pero nunca el secreto en texto claro.
- Un revendedor no puede consultar credenciales de inventario libre ni costos de proveedor.

La interfaz muestra una fila padre para la cuenta y cinco filas hijas para sus perfiles. `Vender cuenta completa` solo se habilita cuando los cinco están libres. En modo completo se muestra una sola asignación comercial y los perfiles permanecen bloqueados internamente.

Para una venta por perfil están disponibles las acciones `Entregar acceso`, `Trasladar` y `No renueva: restablecer y liberar`, sujetas a permisos y estado.

## 11. Invariantes y pruebas mínimas

1. Cada cuenta Crunchyroll activa tiene exactamente cinco perfiles físicos y vendibles.
2. La cuenta permite `perfil` y `cuenta_completa`, con exclusión temporal estricta.
3. Una venta completa crea una suscripción, un período, un cobro y un ingreso, no cinco.
4. La entrega por perfil incluye correo, contraseña, nombre de perfil, PIN y fecha de vencimiento.
5. Ninguna modalidad autoriza al cliente a modificar datos de la cuenta madre.
6. Un traslado por falla conserva la suscripción, el período, el precio y el cobro originales.
7. Una venta completa solo se traslada a otra cuenta con sus cinco perfiles libres.
8. Vencer o pausar no libera automáticamente el recurso.
9. Confirmar que un perfil no renueva inicia `cierre_pendiente`; la asignación solo termina al confirmar limpieza y revocación externa.
10. Liberar el slot lo vuelve reutilizable sin borrar ni modificar historia comercial.
11. El costo proveedor se registra una vez por cuenta y ciclo.
12. Ningún secreto aparece en stock, listados generales, logs o eventos de auditoría.
13. Todos los períodos usan mes calendario.

## 12. Decisiones pendientes

No quedan decisiones estructurales propias de Crunchyroll. La ficha usa la política común de cuentas compartidas: cerrar sesiones/dispositivos relacionados con el perfil liberado y mantener las credenciales maestras cuando sea posible. Los detalles visuales restantes podrán resolverse durante el diseño de interfaz.
