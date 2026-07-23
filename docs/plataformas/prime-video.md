# Prime Video — comportamiento de inventario y venta

## 1. Estado y fuente

Ficha documentada el 22/07/2026 a partir de la explicación del usuario y la captura de su Excel. No se copiaron correos, contraseñas, PIN, teléfonos ni datos de proveedores visibles en la imagen.

Nombre interno confirmado: **Prime Video**.

Arquetipo: [cuenta híbrida por perfiles o completa](arquetipos/cuenta-hibrida.md).

## 2. Estructura confirmada

Una cuenta madre de Prime Video tiene capacidad física y vendible de **siete perfiles**.

```text
Cuenta Prime Video — capacidad: 7
  ├─ Perfil 1
  ├─ Perfil 2
  ├─ Perfil 3
  ├─ Perfil 4
  ├─ Perfil 5
  ├─ Perfil 6
  └─ Perfil 7

Modalidades:
  - venta por perfil
  - venta de cuenta completa
```

Los perfiles pueden conservar nombre visible y PIN tratado como texto. Correo/login y contraseña pertenecen a la cuenta madre; proveedor, costo y renovación pertenecen a su ciclo de proveedor.

## 3. Venta por perfiles

- Hasta siete suscripciones simultáneas, una por perfil.
- Cada cliente puede comenzar y renovar en una fecha diferente.
- Cliente/teléfono, precio, vendedor, período y cobro no se guardan dentro del perfil físico.
- Un perfil vacío puede venderse sin afectar a los demás.
- Cualquier perfil asignado, reservado, pausado o retenido impide vender la cuenta completa.
- Liberar o trasladar un perfil conserva todo su historial comercial. Si no renueva, el perfil remoto se elimina/restablece y el slot solo vuelve a stock después de confirmar limpieza y cierre de sesiones/dispositivos relacionados con ese perfil.

## 4. Venta completa

- Una sola suscripción se asigna a toda la cuenta.
- Consume y bloquea los siete perfiles.
- Cada venta o renovación crea un período, precio, cobro e ingreso.
- No se crean siete ventas ni un octavo perfil artificial.
- Mientras la cuenta permanezca asignada, reservada, pausada o retenida, ningún perfil puede aparecer disponible.
- Liberar la asignación completa permite volver a vender sus perfiles o la cuenta completa únicamente después de completar limpieza y revocación externa.

## 5. Calendario y estados

Prime Video aplica las reglas globales:

- mes calendario;
- acceso durante todo el día de renovación;
- cobro completo;
- vencimiento sin pausa o liberación automática;
- decisión manual para mantener activo, pausar o cancelar/liberar;
- renovación tardía sin ingreso retroactivo;
- proveedor con ciclo y día ancla independientes de los clientes.

En modo perfiles pueden coexistir siete fechas de cliente. En modo completo existe una sola fecha comercial para toda la cuenta.

## 6. Reservas, fallas y traslado

- Reservas y asignaciones usan la misma exclusión entre perfil y cuenta completa.
- Una reserva completa bloquea los siete perfiles.
- Un perfil retenido bloquea la reserva/venta completa.
- Una suscripción por perfil puede trasladarse a otro perfil Prime Video compatible sin crear otra venta o período.
- Una venta completa puede trasladarse a otra cuenta Prime Video totalmente libre, conservando suscripción, período, precio, cobro y fecha de renovación.

La entrega sigue la regla común de cuentas compartidas: por perfil se entregan correo, contraseña, nombre de perfil, PIN y fecha `Renueva/Vence`; por cuenta completa se entregan credenciales, fecha y datos de perfiles aplicables. Ningún cliente puede modificar correo, contraseña, recuperación, plan o datos maestros de la cuenta madre.

## 7. Proveedor y finanzas

El costo proveedor se registra una sola vez por cuenta y ciclo.

### En venta por perfiles

- Cada perfil genera un período con precio USD manual, cobro VES a BCV y lectura económica paralela.
- El pago proveedor se registra en USDT una sola vez.
- El costo diario puede distribuirse analíticamente entre siete unidades vendibles.
- Solo los perfiles realmente libres generan capacidad ociosa proporcional.

### En venta completa

- Existe un ingreso y un cobro por período.
- La asignación consume siete unidades-día.
- No hay vacancia interna durante el período pagado.
- Si permanece retenida sin pago, las siete unidades pertenecen a cortesía o pausa, no a disponibilidad.
- El costo proveedor no se multiplica por siete.

La distribución de costo por unidades es explicativa y nunca se resta por segunda vez del resultado mensual.

## 8. Interfaz

- Fila padre para la cuenta, estado técnico y aviso único de proveedor.
- Siete filas hijas cuando opera por perfiles.
- Una sola fila/resumen cuando está vendida completa, con los siete perfiles bloqueados internamente.
- `Vender cuenta completa` solo se habilita cuando los siete perfiles están libres.
- Una reserva/venta completa deshabilita las acciones individuales.
- Las fechas vacías heredadas de Excel no se consideran períodos reales.

## 9. Invariantes y pruebas mínimas

1. Cada cuenta Prime Video crea exactamente siete perfiles físicos y vendibles.
2. Se permiten como máximo siete asignaciones individuales simultáneas.
3. Un perfil no admite asignaciones o reservas solapadas.
4. Cualquier perfil retenido impide vender completa.
5. Una cuenta completa retenida impide usar cualquiera de los siete perfiles.
6. Pausar o vencer no libera inventario.
7. La venta completa crea un ingreso y no siete.
8. El costo proveedor se cuenta una sola vez.
9. La venta completa pagada ocupa siete unidades-día.
10. La vacancia individual solo considera perfiles realmente disponibles.
11. Todos los períodos usan mes calendario.
12. Trasladar un perfil o una cuenta completa conserva el período y no crea otra venta/cobro.
13. Un slot con limpieza o revocación pendiente no aparece disponible y su reutilización nunca borra historia.

## 10. Confirmaciones pendientes

| ID | Pregunta | Impacto | Clasificación |
|---|---|---|---|
| PRI-03 | ¿Los perfiles se renombran normalmente con el nombre del cliente? | Define valor predeterminado de interfaz. | No bloqueante |

Prime Video usa la política común de cuentas compartidas: cerrar sesiones/dispositivos relacionados con el perfil liberado y mantener las credenciales maestras cuando sea posible.
