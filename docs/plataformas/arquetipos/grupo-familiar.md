# Arquetipo — grupo familiar, panel o membresía por invitación

## 1. Definición

Un grupo familiar, panel o membresía por invitación es un recurso principal bajo control administrativo de GL Streaming que habilita cupos para miembros o asientos. Según la plataforma, el miembro puede usar una identidad aportada por el cliente o una identidad de acceso creada y administrada por GL Streaming; la incorporación puede ocurrir por invitación, agregado manual u otra activación equivalente.

Este arquetipo aplica a Gemini/Google Cloud, Canva y Spotify. No presupone que todas permitan vender el uso de la cuenta principal, separar identidad y cobertura, reutilizar identidades o bloquear altas a nivel de grupo: cada ficha debe confirmar esas capacidades.

## 2. Variables por plataforma

| Variable | Descripción |
|---|---|
| `cuenta_principal` | Gmail o identidad administradora del grupo, panel o equipo. |
| `titularidad_y_control_principal` | Titular del recurso y actor que conserva las facultades administrativas aunque otra persona pueda usarlo. |
| `capacidad_fisica` | Cantidad de miembros/asientos permitidos, indicando si excluye o incluye a la cuenta principal. |
| `capacidad_vendible_habilitada` | Cupos que GL Streaming decide vender. |
| `uso_comercial_principal` | Si la cuenta principal es solo operativa o si su uso normal puede asignarse sin transferir propiedad ni administración. |
| `identidad_miembro` | Identidad de acceso usada por el miembro, su origen (`negocio` o `cliente`) y su relación con la cobertura. |
| `politica_reutilizacion_identidad` | Condición de saneamiento y revocación para una identidad del negocio, o retiro definitivo para una identidad del cliente. |
| `mecanismo_entrega` | Invitación, agregado manual o activación equivalente. |
| `estado_admision` | Si el recurso acepta nuevas altas, independientemente de que tenga capacidad física libre. |
| `politica_salida` | Acción para retirar al cliente del grupo, panel o equipo. |
| `duracion_comercial` | Duración adquirida por el cliente cuando la plataforma permita 1, 3, 6, 12 meses u otro tramo comercial. |

## 3. Oferta comercial

Cada miembro/asiento vendido es una suscripción individual con su propio cliente, período, precio, vendedor y fecha de renovación. El recurso principal conserva el costo proveedor y la capacidad.

El uso normal de la cuenta principal solo puede venderse si la ficha lo confirma. Esa asignación no equivale necesariamente a una venta completa o exclusiva: puede coexistir con los miembros y nunca transfiere por sí sola la titularidad, la recuperación ni las operaciones administrativas. Una principal no vendida sigue siendo un recurso operativo; no se cuenta como cupo vacante.

Para Gemini/Google Cloud y Canva, de momento queda documentada únicamente la venta por cupo/asiento individual. Spotify permite excepcionalmente vender el uso de la principal y mantener cinco ventas de miembros simultáneas.

## 4. Activación y entrega

El cliente entrega únicamente los datos que exige la modalidad. Puede bastar su correo para una invitación o, cuando la ficha lo autorice, puede aportar credenciales de su identidad dentro del servicio. Esto no autoriza a solicitar la contraseña del buzón de correo subyacente. Si la identidad pertenece a GL Streaming, el negocio la crea, la incorpora y entrega sus datos de acceso según las reglas de seguridad.

La entrega al cliente no incluye credenciales maestras ni permisos administrativos. Si una plataforma permite vender el uso de la principal, el cliente recibe solo lo necesario para su uso normal y se mantienen reservadas a GL Streaming las acciones de agregar o retirar miembros, recuperar la cuenta y cambiar el plan.

## 5. Renovación y vencimiento

Aplican las reglas globales de pago completo y flexibilidad comercial del cliente. La duración comercial puede ser de uno o varios meses calendario según lo vendido. Vencer no libera el cupo automáticamente.

Si el cliente no renueva y se decide liberar, se retira del grupo/panel su identidad o asignación. La asignación comercial se cierra solo después de confirmar esa salida.

Retirar una identidad propiedad del cliente libera el cupo, pero esa identidad nunca vuelve al inventario y sus secretos se eliminan según la política de cierre. Una identidad propiedad de GL Streaming solo puede volver a ofrecerse después de sanear los datos del usuario anterior y revocar su acceso.

## 6. Fallas y traslado

Si falla el recurso principal, la afectación alcanza a todas las asignaciones activas que dependan de él. Debe abrirse una incidencia común y procesar sus miembros en lote, manteniendo para cada uno período, precio, cobro y fecha de renovación. La resolución puede requerir una nueva invitación, trasladar la cobertura, reactivar la identidad o recrearla; la ficha define cuál de esos componentes cambia.

Una restricción de admisión a nivel de grupo no equivale a una falla de los miembros existentes. Mientras esté activa, ningún cupo libre puede venderse o recibir una nueva identidad aunque la capacidad física indique espacio. La recuperación debe confirmarse por el mecanismo que defina la plataforma, incluida una comprobación manual cuando no exista una fecha conocida.

## 7. Ocupación y disponibilidad

La ocupación de miembros y el uso de la cuenta principal se miden por separado cuando la plataforma distingue ambos. Vender el uso de la principal puede añadir ingreso sin consumir un cupo de miembro; mantenerla solo para operar el grupo no crea pérdida ni capacidad comercial ociosa.

Un cupo solo está disponible cuando concurren capacidad física libre, capacidad vendible habilitada y admisión de nuevas altas. La interfaz debe distinguir al menos entre `ocupado`, `libre habilitado` y `libre bloqueado para altas`.

## 8. Invariantes

1. La propiedad y el control administrativo de la cuenta principal no se transfieren mediante una asignación de uso.
2. Vender el uso de la principal solo es válido si la plataforma lo permite y no altera por defecto la capacidad de miembros.
3. Un cupo/asiento se ocupa por una asignación de miembro, aunque identidad y cobertura se administren como componentes distintos.
4. Una identidad propiedad del cliente no se reutiliza para otra persona; una identidad del negocio no se reutiliza sin saneamiento y revocación confirmados.
5. Sacar al cliente del grupo/panel libera el cupo, pero no borra la historia comercial.
6. La capacidad vendible no puede exceder la capacidad física del recurso.
7. Capacidad libre no implica disponibilidad mientras el grupo rechace nuevas altas.
8. Una falla del recurso principal no se resuelve como casos aislados si afecta simultáneamente a todas sus asignaciones.
9. Una duración de varios meses crea un solo período por el tramo vendido; no se fracciona en meses internos ficticios.
