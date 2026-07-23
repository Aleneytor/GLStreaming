# YouTube — cartera sobre el Gmail del cliente

## 1. Estado y fuente

Ficha documentada el 22/07/2026 a partir de la explicación del usuario y la captura de su Excel. No se copiaron correos, contraseñas, nombres, teléfonos ni valores identificables de las tres filas mostradas.

Nombre interno confirmado: **YouTube**.

Hechos confirmados:

- existen **tres servicios actuales**, que se registrarán manualmente;
- el usuario dejó de realizar ventas nuevas de YouTube;
- en cada servicio se registran el correo Gmail y la contraseña que pertenecen al cliente;
- el proveedor actual es el propio negocio, mostrado como `Yo`;
- el proveedor debe poder cambiarse por un nombre, un número telefónico o ambos;
- el número tres es el conteo actual de cartera, no una capacidad ni un límite técnico.

El producto se modelará inicialmente con `estado_comercial = solo_cartera`: conserva historia y operaciones sobre los servicios existentes, pero rechaza ventas nuevas, reservas y solicitudes de stock. El permiso `permite_renovaciones` queda separado y pendiente de confirmar en `YT-07`; “dejé de vender” no se interpretará automáticamente como “seguiré renovando”. Una reactivación futura de ventas requerirá una acción administrativa explícita y auditada.

**Alcance despriorizado — confirmado 22/07/2026.** El negocio dejó de vender YouTube activamente y el usuario pidió explícitamente no invertir más tiempo de diseño en esta ficha. De los tres servicios de la cartera, solo **dos son registros comerciales reales**; el tercero es la **cuenta personal del propio usuario** y se excluye del inventario/tracking comercial (no se carga como servicio de cliente, no participa en Caja ni en cierres). YouTube se implementará con el mínimo necesario para conservar esos dos registros en modo consulta/cierre; `YT-01`, `YT-02`, `YT-03`, `YT-05` y `YT-07` quedan despriorizados y no bloquean ninguna fase mientras el negocio no reactive ventas de YouTube.

## 2. Estructura conocida y clasificación provisional

YouTube confirma una **capa de identidad propiedad del cliente**: cada fila actual representa un servicio administrado sobre un Gmail concreto. Ese Gmail no es una cuenta madre del negocio, no se vende a otra persona y nunca vuelve a stock.

```text
Servicio comercial YouTube
  ├─ identidad de acceso: Gmail del cliente, no reutilizable
  └─ cobertura del proveedor: plan individual propio por Gmail
```

**`YT-06` resuelto — confirmado 22/07/2026.** Cada Gmail recibe un **plan individual activado y pagado con tarjeta propia del negocio**; no existe un plan/cupo compartido entre servicios. Cada fila se trata como un recurso cliente de alcance completo y capacidad comercial **uno**, sin perfiles hijos y sin capa de cobertura proveedor separada — el costo es real y propio de cada servicio (ver también `YT-04` resuelto en la sección 8).

## 3. Propiedad y disponibilidad

- El correo Gmail pertenece al cliente, no a GL Streaming ni al proveedor.
- El sistema administra la relación de servicio, fechas, cobros y costos sin convertir la cuenta personal en inventario transferible.
- El recurso de cliente queda ligado a un único `cliente_propietario_id`.
- Una suscripción solo puede vincularse al recurso de su mismo cliente propietario.
- Pausar, cancelar o finalizar el servicio nunca convierte ese Gmail en stock libre para otra persona.
- El Gmail no aparece en disponibilidad de revendedores ni acepta reservas o solicitudes de stock.
- Si el cliente cambia de Gmail, el historial debe conservar la identidad anterior y enlazar la nueva sin sobrescribir el pasado; el procedimiento exacto queda pendiente en `YT-03`.
- La posible reutilización de un cupo proveedor se decidirá por separado y nunca permitirá reutilizar las credenciales del cliente.

## 4. Datos registrados y seguridad

El usuario confirmó que se registran:

- correo Gmail del cliente;
- contraseña de ese Gmail.

Ambos se tratan como credenciales de una cuenta propiedad del cliente:

- se guardan cifrados en un contenedor restringido, separados de clientes, proveedores y tablas operativas generales;
- la grilla administrativa puede recibir únicamente una máscara generada por el servidor, por ejemplo `a***@gmail.com`;
- el Gmail completo y la contraseña quedan fuera de consultas generales, stock, Caja, reportes, exportaciones, logs, errores, analítica y datos de prueba;
- solo un administrador autorizado puede usar una acción específica y temporal para revelar o actualizar los valores;
- cada revelado, rotación o eliminación deja auditoría;
- un revendedor nunca recibe el Gmail, su máscara ni la contraseña;
- finalizar el servicio conserva la historia comercial, pero podrá destruir el secreto mediante una acción auditada cuando se defina la política de retención.

La contraseña se almacenará porque el usuario indicó que forma parte de la operación. Su tiempo de conservación todavía debe confirmarse; no se asumirá que deba guardarse indefinidamente.

## 5. Carga de los tres servicios existentes

No habrá importación desde Excel. El administrador usará **Cargar servicio existente** dentro de una sesión explícita de carga inicial:

1. abre una sesión de corte para YouTube con fecha y conteo esperado informativo de tres;
2. selecciona o crea al cliente propietario;
3. crea el servicio/recurso del cliente sin publicarlo como stock;
4. registra Gmail y contraseña mediante el flujo restringido;
5. conserva las fechas reales conocidas del período vigente;
6. registra precio USD, BCV/paralela y cobro VES únicamente si esos hechos reales son conocidos;
7. selecciona `Yo` u otro proveedor editable;
8. registra ciclo, costo y pago en USDT únicamente si existieron realmente;
9. usa una clave idempotente para que un reintento no duplique cliente, servicio, suscripción, período ni movimientos;
10. concilia los tres servicios y cierra la sesión de carga.

`carga_inicial` no crea una venta nueva, no inventa una fecha de venta ni genera cobros o pagos ficticios. Su fecha de registro tampoco aumenta las ventas del día. Una vez cerrada la sesión, el comando queda deshabilitado; cualquier reapertura excepcional exige autorización y auditoría. Esto impide usar la carga histórica para encubrir altas nuevas.

## 6. Renovación, vencimiento y cierre

Si `YT-07` confirma que la cartera continúa renovándose, YouTube aplicará las reglas globales del cliente:

- mes calendario;
- acceso y posibilidad de pago durante todo el día de renovación;
- pago completo, sin abonos;
- vencimiento sin cancelación ni liberación automática;
- decisión manual para mantener activo, pausar o finalizar;
- renovación tardía desde el pago completo o desde la reactivación posterior, según corresponda.

Mientras ese permiso no esté confirmado, el diseño conserva consulta, pausa, actualización administrativa y finalización, pero no presupone una acción de renovación. Si se permite, renovar conservará la misma suscripción, producto, cliente propietario y recurso mientras siga usándose el mismo Gmail.

Finalizar retira el servicio de la operación y nunca publica el Gmail como disponible. El tratamiento de un posible cupo proveedor restante depende de `YT-06`.

## 7. Proveedor editable

Proveedor operativo predeterminado: **propio**, mostrado como `Yo`.

La interfaz permite seleccionar, crear o editar el proveedor mediante:

- etiqueta visible: `Yo`, nombre, alias o número telefónico;
- nombre/alias opcional;
- teléfono opcional, siempre tratado como texto;
- tipo `propio | tercero`;
- nota opcional.

Para un tercero debe existir al menos un nombre/alias o un teléfono. `Yo` es un registro canónico configurable, no un texto repetido en cada fila. Los períodos o ciclos conservan una instantánea de la etiqueta y contacto utilizados para que una edición futura no reescriba el historial.

El proveedor operativo identifica quién gestiona o suministra el servicio. Seleccionar `Yo` o cualquier otro nombre no crea por sí solo un costo, ciclo financiero ni pago.

## 8. Finanzas

- El precio comercial se registra en USD y el cobro real en Bs a BCV; ambas tasas históricas se conservan cuando los datos son conocidos.
- Los costos y pagos reales, si existen, se registran en USDT y se valorizan con la paralela.
- La etiqueta `Yo` admite costo cero cuando no hubo desembolso.
- Si existió un desembolso real para activar o sostener YouTube, se contabiliza una sola vez contra la relación financiera correspondiente.
- La prestación visible representa un servicio por cliente; la capacidad y distribución del costo proveedor quedan fijadas en `1/1` por servicio (`YT-06` resuelto: no hay plan compartido).
- Como no existe inventario proveedor reutilizable, finalizar un servicio no genera vacancia vendible.
- Caja diaria y cierre mensual podrán filtrar YouTube, producto y proveedor sin exponer credenciales.
- **`YT-04` resuelto — confirmado 22/07/2026.** Cuando el proveedor mostrado es `Yo`, la antigua columna `Inversión` representa un **desembolso real**: el costo del plan individual de YouTube activado con tarjeta propia del negocio para ese Gmail específico. No es una referencia analítica ni texto libre; se registra como costo/pago real igual que cualquier otro ciclo de proveedor, una sola vez por servicio.

## 9. Interfaz

- Una fila operativa por servicio actual; no se fija todavía una estructura proveedor oculta.
- Gmail mostrado solo mediante máscara producida por el servidor; contraseña ausente de la consulta de grilla.
- Badge `Solo cartera`.
- `Nueva venta`, reserva y solicitud de stock deshabilitadas.
- `Cargar servicio existente` visible únicamente para el administrador durante una sesión de corte abierta.
- `Renovar` solo aparece si `permite_renovaciones` se confirma y está activo.
- Pausar, reactivar, actualizar credenciales y finalizar dependen de permisos y estado.
- El selector de proveedor permite búsqueda y creación rápida por etiqueta, nombre o teléfono.

## 10. Invariantes y pruebas mínimas

1. Cualquier `venta_nueva` de YouTube se rechaza, exista o no la cartera inicial cargada.
2. Tres es el conteo del corte, nunca una capacidad ni un máximo codificado.
3. El Gmail exige cliente propietario y no puede asignarse a otra persona.
4. Pausar, cancelar o finalizar nunca convierte el Gmail en stock disponible.
5. El recurso cliente rechaza reservas y solicitudes de revendedor.
6. `carga_inicial` exige administrador, sesión abierta e idempotencia.
7. Reintentar la misma carga no duplica datos ni movimientos.
8. Cerrar la sesión impide nuevas cargas históricas ordinarias.
9. La carga no aumenta ventas nuevas ni crea cobros/pagos sin hechos reales.
10. Gmail completo y contraseña están cifrados y ausentes de respuestas generales.
11. La máscara de Gmail solo la genera el servidor para una grilla administrativa autorizada.
12. Revelar, cambiar o destruir credenciales siempre deja auditoría.
13. La etiqueta `Yo` no genera automáticamente un egreso salvo el costo real confirmado del plan individual (`YT-04`).
14. Un costo real se contabiliza una sola vez.
15. Capacidad y costo proveedor son `1/1` por servicio; no existe capa de cupo compartido (`YT-06` resuelto).
16. Ninguna renovación se habilita hasta resolver `YT-07` (despriorizado, ver sección 1).

## 11. Confirmaciones pendientes

`YT-06` y `YT-04` quedaron **resueltos** el 22/07/2026 (ver secciones 2 y 8; registrados como `DEC-91` en `docs/06-decisiones-pendientes.md`). Las siguientes quedan **despriorizadas** por decisión explícita del negocio (dejó de vender YouTube, solo 2 registros comerciales reales) y no bloquean ninguna fase mientras no se reactiven ventas:

| ID | Pregunta | Impacto | Clasificación |
|---|---|---|---|
| YT-01 | ¿Qué acción se realiza con el Gmail y la contraseña para activar YouTube: compra directa, incorporación a un plan, cambio de región u otro procedimiento? | Solo relevante si se reactivan ventas nuevas. | Despriorizado |
| YT-02 | ¿La contraseña debe conservarse durante toda la suscripción o solo hasta completar activación/renovación? | Afecta únicamente política de retención fina; mientras tanto se mantiene cifrada sin fecha de destrucción automática. | Despriorizado |
| YT-03 | Si el cliente cambia de Gmail o pierde acceso, ¿se conserva la suscripción y el período sobre un recurso nuevo? | Caso raro dado que no hay ventas activas nuevas. | Despriorizado |
| YT-05 | Al finalizar YouTube, ¿en qué momento se elimina la contraseña guardada? | Se resolverá si/cuando se finalice alguno de los 2 servicios reales. | Despriorizado |
| YT-07 | ¿Los tres [dos, tras excluir la cuenta personal] servicios actuales seguirán aceptando renovaciones o solo deben poder consultarse, pausarse y cerrarse? | Por defecto: solo consulta/pausa/cierre, sin `permite_renovaciones`, hasta que el negocio decida lo contrario. | Despriorizado |
