# Arquetipo — cuenta híbrida por perfiles o completa

## 1. Definición

Una cuenta híbrida es una cuenta física con varias unidades internas que puede comercializarse de dos maneras:

1. varias ventas individuales, una por unidad/perfil; o
2. una sola venta de cuenta completa que consume toda la capacidad.

El usuario confirmó este comportamiento para las cuentas estándar de Netflix, HBO, Disney+, Prime Video, Crunchyroll, Paramount+, Universal+ y VIX, y señaló que es común en la mayoría de las plataformas basadas en cuentas compartidas. No se aplica automáticamente a Canva ni a otra plataforma sin ficha propia; Spotify se rige por su modelo específico de identidad y cobertura.

## 2. Variables por plataforma

| Variable | Descripción |
|---|---|
| `capacidad_fisica` | Cantidad de perfiles/unidades internas de la cuenta. |
| `capacidad_vendible_habilitada` | Unidades que participan en ventas, ocupación y distribución analítica del costo durante el ciclo. |
| `secreto_cuenta` | Correo/login, contraseña u otros datos maestros. |
| `secreto_unidad` | PIN u otro secreto opcional de cada perfil. |
| `politica_entrega_perfil` | Paquete estándar: correo, contraseña, nombre de perfil, PIN y fecha de renovación/vencimiento. |
| `politica_entrega_completa` | Credenciales maestras, fecha y datos de perfiles aplicables, siempre sin permiso para modificar la cuenta madre. |
| `politica_cambio_cuenta_madre` | `solo_admin` en todas las cuentas compartidas confirmadas. |
| `permite_traslado_perfil` | Si una suscripción puede cambiar de perfil/cuenta ante fallas. |
| `permite_traslado_completo` | Si una venta completa puede moverse a otra cuenta libre. |

La capacidad se confirma en cada producto/ficha: Netflix estándar, HBO, Crunchyroll, VIX y Universal+ usan cinco; Paramount+ usa seis; Disney+ y Prime Video usan siete. Aunque varias plataformas coincidan, el valor no se fija globalmente. Dentro de este arquetipo no queda ningún caso confirmado de capacidad física distinta de la vendible.

## 3. Inventario físico y oferta comercial

Para distinguir casos futuros, `F` representa capacidad física y `V` capacidad vendible habilitada. En los cinco productos híbridos confirmados se cumple `F = V`.

```text
Cuenta física — capacidad F
  ├─ Unidad 1 ┐
  ├─ Unidad 2 │
  ├─ ...      ├─ modalidad por unidad
  └─ Unidad F ┘

  o

  └─ modalidad cuenta completa — bloquea F y ocupa V para métricas
```

La cuenta completa no se representa como una unidad adicional. Es una modalidad con `alcance = cuenta`; por ello no cambia la cantidad de perfiles físicos ni crea ingresos artificiales.

## 4. Exclusión obligatoria

- Una asignación o reserva completa impide asignar o reservar cualquier unidad hija.
- Una sola unidad asignada, reservada, pausada o retenida impide ocupar la cuenta completa.
- Vencer no libera inventario.
- Pausar conserva el recurso.
- Solo cancelar, liberar, expirar una reserva o trasladar explícitamente elimina la retención.
- La cuenta puede cambiar de modalidad comercial a lo largo de su historia, pero nunca mezclar ambas durante intervalos incompatibles.

La comprobación ocurre dentro de una transacción bloqueada por cuenta. Consultar una pantalla que mostraba disponibilidad unos segundos antes no autoriza la venta.

## 5. Datos de acceso y permisos del cliente

La cuenta madre sigue bajo control de GL Streaming. Ningún cliente —por perfil o cuenta completa— está autorizado a modificar correo/login, contraseña, recuperación, plan, datos del titular ni configuración maestra. Esta es una regla comercial y operativa; cuando la plataforma no permita imponerla técnicamente, se comunica en la entrega y los cambios quedan reservados al administrador.

La entrega de una venta por perfil incluye:

- correo/login de la cuenta madre;
- contraseña vigente de la cuenta madre;
- nombre exacto del perfil asignado;
- PIN de ese perfil;
- fecha comercial mostrada como `Renueva/Vence DD/MM/AAAA`, aclarando que puede usar el servicio durante todo ese día.

La venta completa recibe correo/login, contraseña, fecha comercial y los nombres/PIN de los perfiles que correspondan. Recibir credenciales no transfiere propiedad ni permiso para cambiarlas.

El paquete se genera desde el servidor para la asignación vigente. Los secretos no se copian a notas, reportes o mensajes almacenados en texto plano. Cada revelado/entrega registra actor, cliente, suscripción, asignación, versión de credenciales y fecha, pero no duplica la contraseña o el PIN en el historial.

## 6. Venta por unidades

- Cada perfil vendido tiene su propia suscripción, cliente, período, precio, vendedor y cobro.
- La asignación apunta a una unidad física y consume una unidad de capacidad.
- Los clientes de una misma cuenta pueden iniciar y renovar en días diferentes.
- Liberar un perfil no altera los demás.
- Un traslado confirmado por la plataforma cambia la asignación, no la venta ni el período pagado.

## 7. Venta completa

- Existe una sola suscripción y un solo período comercial.
- Existe un solo precio, cobro e ingreso por renovación.
- La asignación apunta a la cuenta, bloquea toda su capacidad física y guarda por separado los snapshots de capacidad física y vendible consumida.
- Las unidades internas quedan no disponibles, aunque la interfaz las muestre contraídas.
- El uso parcial que haga el cliente no crea vacancia interna: compró exclusividad sobre toda la capacidad.

## 8. Fechas y estados

El arquetipo usa las reglas globales de GL Streaming:

- mes calendario;
- acceso durante todo el día de renovación;
- pago siempre completo;
- alerta de vencimiento independiente del estado;
- acción manual para mantener activo, pausar, cancelar o liberar;
- renovación tardía desde el pago completo o, si estaba pausada, desde la fecha posterior entre pago y reactivación;
- ciclo de proveedor con ancla fija independiente de las fechas de los clientes.

En una venta completa vencida pero retenida, las `V` unidades vendibles se clasifican como cortesía activa o pausa sin ingreso. Ninguna de las `F` unidades físicas se considera disponible ni genera ingreso retroactivo.

## 9. Fallas, traslado y rotación de perfiles

- Si falla una cuenta madre que presta un perfil, la suscripción se traslada a un perfil libre y compatible de otra cuenta de la misma plataforma.
- Si falla una cuenta vendida completa, se traslada a otra cuenta compatible cuyos perfiles estén totalmente libres.
- El traslado marca el origen fallido en mantenimiento, cierra su asignación con motivo `falla` y abre otra sobre el destino; conserva cliente, suscripción, modalidad, período, precio, cobro y fecha de renovación. No crea una venta ni reinicia el mes.
- El sistema genera un nuevo paquete de acceso para el destino y deja auditada la entrega sin guardar otra copia en claro de los secretos.
- Vencer no libera automáticamente. Si el cliente no renueva, el administrador espera todo su día de renovación y decide cancelar/liberar.
- Al iniciar la liberación, la asignación queda retenida en `cierre_pendiente`, el slot pasa a `pendiente_limpieza` y se elimina o restablece el **perfil remoto** usado por ese cliente —nombre, PIN y datos personales—.
- Al confirmar la limpieza y la acción de revocación configurada, una transacción cierra la asignación y devuelve el slot a `lista/disponible`. La política predeterminada para cuentas compartidas es cerrar las sesiones/dispositivos relacionados con el perfil del cliente vencido y mantener las credenciales maestras para no redistribuir datos a los demás clientes activos. Si la plataforma no permite ese cierre selectivo, la ficha debe declarar la excepción y usar rotación de credenciales u otra revocación equivalente.
- La fila interna del slot no se borra y cada intento queda en el historial tipado de operaciones remotas.
- Una venta futura reutiliza ese slot con otra asignación y un perfil limpio. Los clientes pueden rotar entre cuentas madres sin que el inventario pierda su trazabilidad.
- Liberar una venta completa exige limpiar la cuenta según la política de la plataforma antes de habilitar nuevamente sus perfiles o la modalidad completa.

## 10. Proveedor, costo y ocupación

El costo pertenece a la cuenta madre y se registra una vez por ciclo, cualquiera que sea la modalidad de venta.

Para análisis por unidades:

```text
costo_diario_unidad =
  costo_ciclo_ves / dias_reales_ciclo / capacidad_vendible_habilitada
```

- En modo perfiles, cada unidad libre aporta una fracción de capacidad ociosa.
- En modo completo pagado, todas las unidades vendibles-día están pagadas y no existe vacancia interna.
- En modo completo retenido sin período pagado, todas las unidades vendibles-día pertenecen a cortesía o pausa, no a disponibilidad.
- El costo distribuido por capacidad es explicativo y nunca se resta otra vez después de reconocer el costo completo del ciclo.
- Una venta completa genera un ingreso, no un ingreso por cada unidad.

## 11. Modelo común requerido

- `cuentas.capacidad` conserva la capacidad física.
- `cuenta_modalidades` habilita perfil y cuenta completa para la misma cuenta.
- `modalidades.alcance_asignacion` distingue `unidad | cuenta`.
- `reservas_inventario` y `asignaciones_inventario` admiten ambos alcances.
- Las exclusiones se comprueban por cuenta y rango temporal.
- `capacidad_fisica_snapshot` y `capacidad_vendible_consumida_snapshot` evitan mezclar bloqueo técnico con ocupación financiera. Si una capacidad cambia durante el servicio, se crea un nuevo tramo histórico; los snapshots anteriores no se reescriben.
- El costo proveedor sigue vinculado a la cuenta, nunca se replica por unidad.
- La liberación conserva `cierre_pendiente` hasta confirmar limpieza y revocación externa. En la mayoría de cuentas compartidas la revocación externa es cierre de sesiones/dispositivos del perfil; en excepciones como FlujoTV se rota credencial porque no existe cierre selectivo. Ambos controles cierran la asignación y habilitan el slot conjuntamente.
- Las operaciones remotas son idempotentes y conservan estado, actor, fechas y evidencia no sensible por cada reutilización.
- Las entregas de acceso referencian versiones de credencial/PIN y la asignación, sin almacenar otra copia en claro.

## 12. Información que cada ficha debe confirmar

1. capacidad física;
2. presencia y uso de PIN u otros secretos de unidad;
3. excepciones al paquete estándar de entrega, si existen;
4. si capacidad física y capacidad vendible difieren y cómo se trata esa diferencia;
5. acción concreta necesaria para limpiar el perfil remoto antes de reutilizar el slot;
6. política para revocar el acceso anterior: cierre de sesiones/dispositivos del perfil como regla normal, o rotación de credenciales cuando la plataforma no permita cierre selectivo;
7. particularidades adicionales de activación, pausa o recuperación.

Las reglas de no modificar la cuenta madre, traslado por falla manteniendo el período y liberación con limpieza previa ya son comunes; una ficha solo las contradice si el usuario confirma expresamente una excepción.

## 13. Invariantes y pruebas comunes

1. El cliente recibe únicamente el paquete de su asignación vigente y nunca datos de otro perfil.
2. Cambiar credenciales maestras es una acción administrativa; una entrega no concede ese permiso.
3. Un traslado por falla no crea período, venta, cobro ni ingreso nuevos.
4. El destino de un perfil está libre; el destino de una cuenta completa está totalmente libre.
5. El período y su fecha comercial no cambian al trasladar.
6. Una asignación en `cierre_pendiente` sigue reteniendo el slot; confirmar limpieza y revocación externa la cierra y habilita el slot en una transacción.
7. Limpiar el perfil remoto no borra la unidad, cliente, suscripción, períodos ni asignaciones históricas.
8. Reutilizar el slot crea otra asignación sin solapar la anterior.

Una plataforma no necesita repetir todas las reglas de este documento: su ficha declara que implementa el arquetipo y registra únicamente sus valores, excepciones y decisiones pendientes.
