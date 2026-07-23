# Disney+ — comportamiento de inventario y venta

## 1. Estado y fuente

Ficha documentada el 22/07/2026 a partir de la explicación del usuario y la captura de su Excel. No se copiaron correos, contraseñas, PIN, teléfonos ni datos de proveedores visibles en la imagen.

Nombre interno confirmado: **Disney+**.

Arquetipo: [cuenta híbrida por perfiles o completa](arquetipos/cuenta-hibrida.md).

## 2. Estructura confirmada

Una cuenta madre de Disney+ tiene capacidad física de **siete perfiles vendibles**.

```text
Cuenta Disney+ — capacidad: 7
  ├─ Perfil 1
  ├─ Perfil 2
  ├─ Perfil 3
  ├─ Perfil 4
  ├─ Perfil 5
  ├─ Perfil 6
  └─ Perfil 7

Modalidades habilitadas:
  - venta por perfil
  - venta de cuenta completa
```

Los perfiles pueden tener nombre visible y PIN tratado como texto. Correo/login y contraseña pertenecen a la cuenta madre; proveedor, costo y renovación pertenecen a su ciclo de proveedor.

## 3. Venta por perfiles

- Se permiten hasta siete suscripciones individuales simultáneas, una por perfil.
- Cada perfil puede tener cliente y fecha de renovación diferentes.
- Cliente/teléfono, período, vendedor, precio y cobro permanecen separados del perfil físico.
- Un perfil vacío puede venderse sin afectar las asignaciones de los demás.
- Un perfil activo, reservado, pausado o retenido impide vender la cuenta completa.
- Si un cliente no renueva y se decide liberar, se elimina/restablece su perfil remoto. El slot interno conserva íntegramente sus ventas, períodos y asignaciones anteriores y solo vuelve a stock tras confirmar limpieza y cierre de sesiones/dispositivos relacionados con ese perfil.

## 4. Venta de cuenta completa

- Una sola suscripción se asigna con alcance sobre toda la cuenta.
- Consume y bloquea los siete perfiles físicos.
- Genera un período, precio, cobro e ingreso por cada venta o renovación completa.
- No crea siete ventas ni un octavo perfil artificial.
- Mientras esté asignada, reservada, pausada o retenida, ningún perfil puede aparecer disponible.
- Al liberarla, los siete perfiles recuperan disponibilidad según su estado técnico y únicamente después de completar limpieza y revocación externa.

## 5. Calendario y vencimientos

Disney+ sigue las reglas globales:

- mes calendario;
- todo el día de renovación disponible para pagar;
- cobro siempre completo;
- vencimiento sin liberación automática;
- decisión manual entre mantener activo, pausar o cancelar/liberar;
- renovación tardía sin ingreso retroactivo;
- ciclo de proveedor con fecha ancla fija y separada de los clientes.

En venta por perfiles existen hasta siete fechas comerciales independientes. En venta completa existe una sola fecha de cliente para toda la cuenta.

## 6. Reservas, fallas y traslados

- Las reservas respetan la misma exclusión entre perfil y cuenta completa que las asignaciones.
- Una reserva completa bloquea los siete perfiles.
- Cualquier perfil retenido bloquea una reserva completa.
- Un perfil puede trasladarse a otro perfil Disney+ compatible sin crear una venta o período nuevo, siguiendo la regla global ya confirmada para suscripciones por perfil.
- Una venta completa puede trasladarse a otra cuenta Disney+ totalmente libre, conservando suscripción, período, precio, cobro y fecha de renovación.

La entrega sigue la regla común de cuentas compartidas: por perfil se entregan correo, contraseña, nombre de perfil, PIN y fecha `Renueva/Vence`; por cuenta completa se entregan credenciales, fecha y datos de perfiles aplicables. Ningún cliente puede modificar correo, contraseña, recuperación, plan o datos maestros de la cuenta madre.

## 7. Proveedor y finanzas

El costo proveedor pertenece una sola vez a la cuenta de siete perfiles.

### Operación por perfiles

- Cada período de perfil conserva su propio precio USD, cobro VES a BCV y lectura económica paralela.
- El costo del ciclo se registra/paga una vez en USDT.
- Para ocupación, el costo diario puede distribuirse analíticamente entre siete unidades.
- Los perfiles realmente libres generan capacidad ociosa proporcional, sin volver a restar ese costo del resultado.

### Operación completa

- Existe un ingreso contractual y un cobro por período.
- La asignación consume siete unidades-día.
- Durante un período pagado no hay vacancia interna, aunque el cliente use menos perfiles.
- Si permanece retenida sin pago, las siete unidades se clasifican como cortesía o pausa, no como inventario disponible.
- El costo proveedor continúa contabilizándose una sola vez.

Todos los cierres, tasas, caja diaria y conversiones siguen las reglas financieras comunes de GL Streaming.

## 8. Interfaz

- La fila padre representa la cuenta y su aviso único de proveedor.
- En modo perfiles se despliegan siete slots con sus estados y alertas individuales.
- En modo completo se muestra una sola venta, como en la captura; los perfiles pueden permanecer contraídos, pero están bloqueados internamente.
- `Vender cuenta completa` solo está habilitado cuando los siete perfiles están libres.
- Una reserva/asignación completa deshabilita todas las acciones individuales.
- Las fechas antiguas vacías del Excel no se migran ni se interpretan como períodos reales.

## 9. Invariantes y pruebas mínimas

1. Cada cuenta Disney+ crea exactamente siete perfiles físicos.
2. Se permiten como máximo siete asignaciones individuales simultáneas.
3. No existen dos asignaciones o reservas solapadas sobre el mismo perfil.
4. Cualquier perfil retenido impide reservar o vender la cuenta completa.
5. Una reserva o venta completa impide usar cualquiera de los siete perfiles.
6. Pausar o vencer no libera capacidad.
7. La venta completa crea un período, cobro e ingreso, no siete.
8. El costo proveedor se cuenta una sola vez.
9. La venta completa pagada ocupa siete unidades-día sin vacancia interna.
10. Una venta completa retenida sin pago produce siete unidades-día de cortesía/pausa.
11. Una cuenta parcialmente vendida calcula vacancia únicamente sobre los perfiles libres.
12. Todas las fechas comerciales usan mes calendario.
13. Trasladar un perfil o una cuenta completa conserva el período y no crea otra venta/cobro.
14. Un slot con limpieza o revocación pendiente no aparece disponible y su reutilización nunca borra historia.

## 10. Confirmaciones pendientes

| ID | Pregunta | Impacto | Clasificación |
|---|---|---|---|
| DIS-03 | ¿Los perfiles se renombran normalmente con el nombre del cliente? | Define valor predeterminado de interfaz; los datos seguirán separados. | No bloqueante |

Disney+ usa la política común de cuentas compartidas: cerrar sesiones/dispositivos relacionados con el perfil liberado y mantener las credenciales maestras cuando sea posible.
