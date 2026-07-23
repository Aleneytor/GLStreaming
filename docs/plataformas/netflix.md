# Netflix — productos y modalidades

## 1. Estado y fuente

Esta ficha normaliza el blueprint original y la aclaración del usuario del 22/07/2026. No agrega datos sensibles de las capturas.

Nombre interno confirmado: **Netflix**.

Netflix maneja actualmente **dos productos de inventario** distintos:

1. cuenta estándar de cinco perfiles;
2. perfil extra de capacidad uno.

“Producto” describe qué se compra/gestiona físicamente. “Modalidad” describe cómo se vende. Esta separación evita tratar el perfil extra como si fuera un sexto perfil de una cuenta estándar.

## 2. Producto A — cuenta estándar de cinco perfiles

Arquetipo: [cuenta híbrida por perfiles o completa](arquetipos/cuenta-hibrida.md).

```text
Cuenta estándar Netflix — capacidad: 5
  ├─ Perfil 1
  ├─ Perfil 2
  ├─ Perfil 3
  ├─ Perfil 4
  └─ Perfil 5

Modalidades permitidas:
  - perfil individual
  - cuenta completa
```

### Venta por perfiles

- Hasta cinco suscripciones individuales, una por perfil.
- Cada perfil puede tener cliente, precio, vendedor y renovación diferentes.
- El perfil puede conservar nombre y PIN, separados de los datos comerciales.
- Una suscripción puede trasladarse a otro perfil compatible ante una falla, sin crear otra venta ni modificar el período pagado.
- Cualquier perfil retenido impide vender la cuenta completa.

### Venta completa

- Una sola suscripción ocupa la cuenta y sus cinco perfiles.
- Genera un período, precio, cobro e ingreso.
- No se representa mediante cinco ventas ni un sexto perfil.
- Bloquea cualquier reserva o venta individual hasta su liberación explícita.

### Verificación de hogar ("No perteneces a este hogar") — solo en modalidad `cuenta_completa`

**Añadido el 22/07/2026, a partir de la experiencia operativa del usuario.** Netflix dispara de forma irregular (aproximadamente cada 15 días, sin fecha fija — la decide Netflix, no el negocio) un mensaje de verificación de hogar sobre un perfil concreto cuando la cuenta estándar se vendió en modalidad `cuenta_completa`. **No ocurre en modalidad `perfil` individual del producto A, ni en el producto B (perfil extra)** — esto explica por qué el perfil extra es más estable operativamente (ver sección 3).

Se registra **por perfil** (hasta 5 por cuenta completa vendida), no a nivel de toda la cuenta, porque distintos miembros de esa venta completa pueden disparar el aviso desde ubicaciones distintas de forma independiente.

Flujo confirmado:

1. El cliente avisa que le apareció el mensaje en un perfil concreto. No hay forma de detectarlo automáticamente; el administrador lo registra manualmente con una acción por perfil.
2. El cliente solicita el código a Netflix y lo introduce. El administrador marca `código solicitado` para ese evento cuando el cliente confirma que ya lo hizo.
3. El código concede aproximadamente 14 días adicionales de servicio normal, que sumados al uso ya transcurrido del mes suelen completar el período pagado. No genera cobro adicional, no modifica el período, precio ni fecha de renovación del cliente.
4. Si a ese mismo perfil le vuelve a aparecer la verificación, Netflix ya no permite solicitar otro código. Esto se trata como una **falla de la cuenta completa**: se aplica el traslado por falla ya documentado más abajo (traslado a otra cuenta estándar totalmente libre, conservando período/precio/cobro/fecha de renovación); la cuenta de origen queda en mantenimiento.
5. El conteo de eventos por perfil es **acumulativo durante toda la vida de esa asignación de cuenta completa**: una renovación mensual normal del cliente **no reinicia** el contador.

Cada evento queda registrado como una fila propia (nunca se sobrescribe uno anterior), con: perfil afectado, asignación de cuenta completa vigente, quién lo registró, momento en que se disparó, momento en que se marcó "código solicitado" y resultado (`resuelta` o `requiere_traslado`). Ver entidad `verificaciones_hogar_netflix` en `docs/02-modelo-dominio.md`.

### Entrega, traslado y liberación de la cuenta estándar

- La venta por perfil entrega correo, contraseña, nombre de perfil, PIN y fecha `Renueva/Vence`.
- La venta completa entrega credenciales, fecha comercial y los datos de perfiles aplicables.
- Ningún cliente puede modificar correo, contraseña, recuperación, plan o datos maestros de la cuenta madre; las credenciales conceden uso, no administración.
- Si falla un perfil/cuenta, una venta individual se traslada a otro slot libre compatible y una venta completa a otra cuenta Netflix estándar totalmente libre.
- El traslado conserva suscripción, modalidad, período, precio, cobro y fecha de renovación; solo cambia la asignación y el paquete de acceso.
- Si un cliente de perfil no renueva y se decide liberar, se elimina/restablece el perfil remoto y el slot interno solo vuelve a stock después de confirmar limpieza y cierre de sesiones/dispositivos relacionados con ese perfil, sin borrar historia.
- Liberar una venta completa aplica limpieza y revocación externa antes de habilitar sus cinco perfiles.

## 3. Producto B — perfil extra

El perfil extra es un producto independiente con:

- capacidad física y vendible de **una unidad**;
- una sola suscripción simultánea;
- modalidad comercial `extra`;
- precio normalmente mayor que un perfil estándar;
- mayor estabilidad operativa según la experiencia del negocio.

La diferencia de precio no se codifica como un monto fijo: cada período conserva el precio real introducido en USD, el cobro calculado/recibido en Bs y las tasas BCV/paralela congeladas. “Más estable” es una característica descriptiva del producto y no elimina el historial de fallas, pausas o reemplazos.

```text
Producto Netflix extra — capacidad: 1
  └─ Perfil extra único

Modalidad permitida:
  - extra
```

Reglas confirmadas:

- No pertenece a los cinco slots de una cuenta estándar.
- No se combina con la modalidad `cuenta_completa` de otro producto.
- Cuando está asignado o pausado, su única unidad no está disponible.
- Una venta nueva crea la suscripción y su primer período; cada renovación conserva esa suscripción y crea otro período con cobro completo.
- Usa mes calendario y las mismas reglas globales de vencimiento flexible, cortesía, pausa y liberación manual.
- Si falla, se traslada a otro extra compatible conservando la misma suscripción y período.

**`NET-05` y `NET-06` resueltos — confirmado 22/07/2026.** El perfil extra **no** usa invitación ni mecanismo oficial de Netflix: es un perfil dentro de **otra cuenta madre propia del negocio**, distinta de la cuenta estándar, con sus propias credenciales (correo/contraseña) y su propio ciclo de proveedor. Se entrega exactamente igual que un perfil de cuenta híbrida normal: correo, contraseña, nombre de perfil, PIN y fecha `Renueva/Vence` de esa cuenta madre separada — nunca las credenciales de la cuenta estándar. Su costo y renovación de proveedor pertenecen a esa cuenta madre extra, completamente independientes del ciclo de la cuenta estándar (nunca se mezclan ni se dividen entre ambos productos). Un traslado por falla usa otro perfil libre dentro de una cuenta madre "extra" compatible, con el mismo mecanismo de entrega.

## 4. Proveedor y finanzas

### Cuenta estándar

- Un costo proveedor por cuenta y ciclo.
- En modo perfiles puede distribuirse analíticamente entre cinco unidades.
- En modo completo existe un ingreso/cobro y no hay vacancia interna durante el período pagado.
- Si continúa retenida sin pago, las cinco unidades se clasifican como cortesía o pausa.

### Perfil extra

- Un ingreso y cobro por su única unidad.
- El precio superior se registra en el período, no en una regla global.
- Tiene **ciclo de proveedor propio e independiente**, asociado a la cuenta madre extra donde vive el perfil (`NET-06` resuelto); nunca se duplica ni se reparte con el ciclo de la cuenta estándar.
- Capacidad uno evita cualquier división entre cinco.

Ambos productos participan en caja diaria y cierre mensual, pero deben poder desglosarse por `producto_plataforma` y modalidad.

## 5. Reservas y exclusión

- La cuenta estándar usa exclusión entre perfiles y cuenta completa.
- El perfil extra solo admite una reserva/asignación vigente sobre su unidad.
- Una reserva del perfil extra no bloquea cuentas estándar distintas.
- Las operaciones se validan atómicamente sobre el recurso correspondiente.
- Vencer o pausar no libera ninguno de los dos productos.

## 6. Interfaz

En Netflix se podrán filtrar o agrupar los dos productos:

- `Cuenta estándar` muestra fila padre y cinco perfiles, o un resumen único cuando está vendida completa.
- `Perfil extra` muestra una sola unidad y una etiqueta visible que lo diferencia de un perfil estándar.
- Precio, costo, estabilidad o nombre no se usarán para inferir el producto; se guarda su identificador explícito.
- Cada perfil dentro de una venta `cuenta_completa` muestra una acción manual `Registrar verificación de hogar` y, una vez registrado el evento, una casilla `Código solicitado` para que el administrador marque cuándo el cliente confirmó haberlo pedido. El historial de eventos por perfil queda visible en el detalle de la asignación.

## 7. Invariantes mínimas

1. Una cuenta estándar crea exactamente cinco perfiles.
2. La cuenta estándar habilita perfil y cuenta completa.
3. Perfil y cuenta completa son excluyentes durante reservas/asignaciones.
4. Una venta completa crea un ingreso y el costo proveedor se cuenta una vez.
5. Un perfil extra crea exactamente una unidad.
6. Un perfil extra nunca aparece como slot 6 de una cuenta estándar.
7. La modalidad `extra` solo puede usarse con el producto extra.
8. El costo de un extra no se reparte entre la capacidad de una cuenta estándar.
9. Todos los períodos usan mes calendario.
10. Entregar acceso a una cuenta estándar no permite modificar sus datos maestros.
11. Trasladar un perfil o venta completa estándar no crea otra venta/período/cobro.
12. Un perfil estándar con limpieza o revocación pendiente no aparece disponible.
13. La verificación de hogar solo puede registrarse sobre perfiles de una asignación `cuenta_completa`; nunca sobre modalidad `perfil` individual ni sobre el producto extra.
14. Un evento de verificación de hogar nunca modifica período, precio, cobro ni fecha de renovación por sí solo.
15. El conteo de eventos por perfil es acumulativo y no se reinicia al renovar.
16. Un segundo evento sin código disponible en el mismo perfil dispara el traslado por falla de la cuenta completa, nunca una falla parcial de un solo perfil dentro de la misma cuenta.

## 8. Confirmaciones pendientes

`NET-05` y `NET-06` quedaron **resueltos** el 22/07/2026 (ver sección 3; registrados como `DEC-94` en `docs/06-decisiones-pendientes.md`).

| ID | Pregunta | Impacto | Clasificación |
|---|---|---|---|
| NET-03 | ¿Los perfiles estándar se renombran normalmente con el nombre del cliente? | Define valor predeterminado de interfaz. | No bloqueante |

La cuenta estándar usa la política común de cuentas compartidas: cerrar sesiones/dispositivos relacionados con el perfil liberado y mantener las credenciales maestras cuando sea posible.
