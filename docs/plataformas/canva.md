# Canva — comportamiento de inventario y venta

## 1. Estado y fuente

Ficha documentada el 22/07/2026 a partir de la explicación del usuario y la captura de su Excel. No se copiaron correos, nombres, teléfonos ni datos sensibles visibles.

Arquetipo: [grupo familiar, panel o membresía por invitación](arquetipos/grupo-familiar.md).

## 2. Estructura del inventario

Canva usa un **correo principal** administrado por GL Streaming con un **panel educativo**. Desde ese panel se invita el correo del cliente.

La unidad vendible es un asiento/cupo dentro del panel educativo, asociado al correo del cliente invitado. El cliente no recibe la contraseña del correo principal ni credenciales maestras del panel.

**`CAN-01` resuelto — confirmado 22/07/2026.** La cuenta principal admite **500 asientos** (capacidad física del panel educativo). El uso actual es de aproximadamente 30 asientos ocupados, muy por debajo del límite. Se modela como `capacidad_fija = 500` en `productos_plataforma`; no se trata como capacidad variable por cuenta salvo que en el futuro se administren varios paneles distintos.

## 3. Modalidad confirmada

Modalidad inicial:

- venta por asiento/invitación a correo del cliente.

No queda confirmada venta de panel completo. Cada asiento vendido tiene su propio cliente, duración, precio, vendedor, inicio y vencimiento.

## 4. Duración comercial

Canva no está limitado a un mes. El cliente puede comprar la duración que quiera ofrecer el negocio, por ejemplo:

- 1 mes;
- 3 meses;
- 6 meses;
- 12 meses;
- otra duración configurada manualmente si el administrador la aprueba.

El período se guarda como un solo tramo pagado con `inicio` y `fecha_renovacion`. Un plan de tres meses no crea tres renovaciones mensuales internas; crea un período comercial de tres meses.

## 5. Activación y entrega

Para activar:

1. se registra el correo del cliente;
2. el administrador envía la invitación desde el panel educativo;
3. se confirma la aceptación o activación con evidencia no sensible;
4. se entrega al cliente confirmación del servicio, correo invitado y fecha de vencimiento/renovación.

La entrega no incluye contraseña del correo principal. El correo invitado queda vinculado a la suscripción del cliente.

## 6. Renovación y vencimiento

Aplica pago completo. Vencer no libera automáticamente el asiento.

Si el cliente renueva, se crea un nuevo período por la duración comprada. Si no renueva y el administrador decide liberar, se elimina al cliente del panel educativo. Solo después de confirmar esa eliminación se cierra la asignación y el asiento vuelve a estar disponible.

El sistema debe permitir clientes activos vencidos o pausados vencidos mientras el administrador decide si espera, pausa o elimina del panel.

## 7. Fallas y traslado

Si falla el panel educativo o el correo principal, la suscripción puede trasladarse a otro panel compatible. El traslado conserva cliente, período, precio, cobro, vendedor y fecha de renovación. El cliente puede requerir una nueva invitación.

## 8. Finanzas

El costo proveedor pertenece al panel/correo principal y se registra una sola vez por ciclo cuando exista una obligación financiera real. Cada período conserva el precio USD introducido, el cobro VES a BCV y la paralela contemporánea según la duración vendida.

El cierre mensual prorratea el ingreso y el costo por intersección de fechas: una venta de 3, 6 o 12 meses aporta al resultado de cada mes según los días que caen dentro del cierre.

## 9. Interfaz requerida

- Fila padre para el panel educativo/correo principal.
- Lista de asientos o miembros invitados.
- Campo obligatorio: correo del cliente.
- Campo de duración vendida.
- Estados por asiento: invitación pendiente, activo, vencido retenido, pausado, pendiente de eliminación, disponible.
- Acción `Eliminar del panel y liberar`.

## 10. Invariantes

1. El cliente solo entrega/usa su correo invitado.
2. La contraseña del correo principal nunca se entrega al cliente.
3. El asiento no vuelve a stock hasta eliminar al cliente del panel.
4. Una duración de varios meses es un solo período pagado.
5. El traslado no reinicia período ni cobro.
6. El costo proveedor no se duplica por cada asiento.

## 11. Decisiones pendientes

`CAN-01` quedó **resuelto** el 22/07/2026 (ver sección 2; registrado como `DEC-92` en `docs/06-decisiones-pendientes.md`): capacidad fija de 500 asientos por cuenta principal.

| ID | Pregunta | Impacto | Clasificación |
|---|---|---|---|
| CAN-02 | ¿La invitación pendiente consume cupo inmediatamente o solo cuando el cliente acepta? | Define reserva, disponibilidad y cierre. | Bloqueante de flujo |
| CAN-03 | ¿Qué duraciones se ofrecerán como opciones rápidas: 1, 3, 6, 12 meses u otras? | Define presets de interfaz; el modelo ya soporta duración manual. | No bloqueante |
