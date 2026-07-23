# Paramount+ — comportamiento de inventario y venta

## 1. Estado y fuente

Ficha documentada el 22/07/2026 a partir de la explicación del usuario y la captura de su Excel. No se copiaron correos, contraseñas, nombres, teléfonos, PIN ni datos de proveedores visibles.

Arquetipo: [cuenta híbrida por perfiles o completa](arquetipos/cuenta-hibrida.md).

## 2. Estructura del inventario

Una cuenta madre de Paramount+ tiene **seis perfiles físicos y vendibles**.

Modalidades permitidas:

- venta por perfil;
- venta de cuenta completa.

Correo/login y contraseña pertenecen a la cuenta madre. El perfil es la unidad vendible individual. La venta completa consume los seis perfiles y genera una sola suscripción, un solo período, un solo cobro y un solo ingreso.

## 3. Entrega y permisos

La venta por perfil usa el paquete estándar de cuenta compartida: correo, contraseña, nombre de perfil, PIN si aplica y fecha de vencimiento/renovación. La cuenta completa recibe credenciales maestras, fecha comercial y datos de perfiles aplicables.

El cliente no puede modificar correo, contraseña, recuperación, plan ni datos maestros. GL Streaming conserva control administrativo.

## 4. Renovación, liberación y fallas

Aplica mes calendario, pago completo y acceso durante todo el día de renovación. Vencer no libera inventario.

Al no renovar, el administrador elimina/restablece el perfil remoto, cierra las sesiones o dispositivos relacionados con ese perfil cuando la plataforma lo permita, confirma la limpieza y solo entonces libera el slot. Si falla una cuenta, la suscripción se traslada a otro perfil o cuenta completa compatible conservando el mismo período.

## 5. Finanzas

El costo proveedor pertenece una sola vez a la cuenta madre. En venta por perfiles se distribuye analíticamente entre seis slots; en venta completa no se multiplica el costo ni el ingreso por seis.

## 6. Invariantes

1. Cada cuenta Paramount+ activa tiene seis perfiles.
2. No puede mezclarse venta completa con perfiles vendidos o retenidos.
3. Una venta completa bloquea los seis perfiles.
4. El traslado por falla no reinicia el período.
5. La liberación requiere limpieza y revocación externa confirmadas.

## 7. Decisiones pendientes

No quedan decisiones estructurales propias de Paramount+. Los detalles visuales y nombres predeterminados de perfiles pueden resolverse durante interfaz.
