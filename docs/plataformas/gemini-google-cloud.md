# Gemini / Google Cloud — comportamiento de inventario y venta

## 1. Estado y fuente

Ficha documentada el 22/07/2026 a partir de la explicación del usuario y la captura de su Excel. No se copiaron correos ni datos sensibles.

Arquetipo: [grupo familiar o membresía por invitación](arquetipos/grupo-familiar.md).

## 2. Estructura del inventario

Existe un **Gmail principal** administrado por GL Streaming con espacio para **cinco personas en el grupo familiar**.

La unidad vendible es un cupo de miembro familiar asociado al correo del cliente. El cliente aporta únicamente su correo.

**`GEM-01` resuelto — confirmado 22/07/2026.** Gemini y Google Cloud se ofrecen sobre el **mismo Gmail principal y la misma capacidad** de cinco cupos familiares; no son productos separados. Se modelan como un único `producto_plataforma` con un solo costo y una sola capacidad.

## 3. Modalidad confirmada

Modalidad inicial:

- venta por cupo familiar / miembro agregado.

La cuenta principal no se vende ni se entrega como credencial al cliente en esta ficha.

## 4. Activación y entrega

Para activar:

1. se registra el correo del cliente;
2. se agrega al cliente al grupo familiar desde el Gmail principal;
3. se confirma la activación con evidencia no sensible;
4. se entrega confirmación del servicio y fecha comercial.

El cliente no recibe contraseña del Gmail principal. El correo del cliente queda vinculado a su suscripción y no se reutiliza para otra persona.

## 5. Renovación y vencimiento

Aplica mes calendario, pago completo y acceso durante todo el día de renovación. Vencer no saca automáticamente al cliente del grupo.

Si el cliente no renueva y se decide liberar, se saca su correo del grupo familiar. La asignación solo se cierra y el cupo vuelve a stock después de confirmar esa salida.

## 6. Fallas y casos especiales

Si falla el Gmail principal o el grupo familiar, la suscripción puede trasladarse a otro grupo compatible manteniendo período y fecha comercial. El cliente puede necesitar una nueva invitación o reactivación.

El usuario indicó que existen distintos casos para Gemini; se documentarán antes de activar flujos adicionales.

## 7. Finanzas

El costo proveedor pertenece al Gmail principal o recurso de grupo y se registra una vez por ciclo. El análisis por cupo usa capacidad cinco salvo que se confirme una política distinta.

## 8. Invariantes

1. La capacidad inicial del grupo es cinco miembros.
2. El cliente solo aporta correo.
3. La cuenta principal no se entrega al cliente.
4. Sacar al cliente del grupo es requisito para liberar el cupo.
5. El traslado no reinicia el período.

## 9. Decisiones pendientes

`GEM-01` quedó **resuelto** el 22/07/2026 (ver sección 2; registrado como `DEC-93` en `docs/06-decisiones-pendientes.md`): un solo producto, misma capacidad de cinco cupos.

| ID | Pregunta | Impacto | Clasificación |
|---|---|---|---|
| GEM-02 | ¿Existe venta completa del grupo familiar o solo cupos individuales? | Define modalidades habilitadas. | Bloqueante de flujo |
| GEM-03 | ¿Qué casos especiales existen al sacar/agregar personas al familiar? | Define estados intermedios y acciones manuales. | Bloqueante de flujo |
