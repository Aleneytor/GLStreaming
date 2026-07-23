# VIX — comportamiento de inventario y venta

## 1. Estado y fuente

Ficha documentada el 22/07/2026 a partir de la explicación del usuario y la captura de su Excel. No se copiaron datos sensibles.

Arquetipo: [cuenta híbrida por perfiles o completa](arquetipos/cuenta-hibrida.md).

## 2. Estructura del inventario

Una cuenta madre de VIX tiene **cinco perfiles físicos y vendibles**.

Modalidades permitidas:

- venta por perfil;
- venta de cuenta completa.

La venta completa consume los cinco perfiles y se registra como una sola suscripción.

## 3. Entrega y permisos

La venta por perfil entrega correo, contraseña, nombre de perfil, PIN si aplica y fecha de vencimiento/renovación. La venta completa entrega credenciales de la cuenta y fecha comercial.

El cliente no puede cambiar contraseña, correo, recuperación, plan ni datos maestros.

## 4. Renovación, liberación y fallas

Aplica la regla global de mes calendario. Si el cliente no renueva, la liberación requiere limpiar/restablecer el perfil y cerrar sesiones o dispositivos relacionados con ese perfil cuando VIX lo permita.

Si la cuenta falla, el cliente se traslada a otro perfil o cuenta completa compatible manteniendo su período.

## 5. Finanzas

El costo proveedor pertenece a la cuenta madre y se registra una sola vez por ciclo. En perfiles se distribuye entre cinco unidades; en cuenta completa se compara contra un solo ingreso.

## 6. Invariantes

1. Cada cuenta VIX activa tiene cinco perfiles vendibles.
2. Perfil y cuenta completa son modalidades excluyentes en el tiempo.
3. Vencer no libera inventario.
4. El traslado conserva período y fecha comercial.
5. La liberación exige limpieza y revocación externa confirmadas.

## 7. Decisiones pendientes

No quedan decisiones estructurales propias de VIX.
