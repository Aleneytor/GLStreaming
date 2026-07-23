# Arquetipo — cuenta por dispositivos o cupos

## 1. Definición

Una cuenta por dispositivos es un recurso con una cantidad limitada de accesos simultáneos o dispositivos autorizados. Puede venderse por cupos individuales o como cuenta completa cuando el cliente compra todos los cupos disponibles.

Este arquetipo aplica inicialmente a FlujoTV, Telelatino y CapCut, con las diferencias indicadas en cada ficha.

## 2. Variables por plataforma

| Variable | Descripción |
|---|---|
| `capacidad_fisica` | Cantidad máxima de dispositivos/cupos que la plataforma permite. |
| `capacidad_vendible_habilitada` | Cantidad que GL Streaming decide vender. Puede ser menor que la física por seguridad. |
| `secreto_cuenta` | Login, contraseña u otro dato maestro. |
| `secreto_unidad` | Identificador opcional del dispositivo, cupo o usuario asociado. |
| `politica_entrega_cupo` | Datos entregados cuando se vende un cupo individual. |
| `politica_entrega_completa` | Datos entregados cuando se vende toda la cuenta. |
| `politica_revocacion` | Cierre de sesión/dispositivo si existe; rotación de credenciales si no existe. |

## 3. Oferta comercial

```text
Cuenta física — capacidad F
  ├─ Cupo/dispositivo 1
  ├─ Cupo/dispositivo 2
  └─ Cupo/dispositivo F

Capacidad vendible V <= F
```

La capacidad física y la capacidad vendible no siempre coinciden. CapCut es el primer caso confirmado: la cuenta permite tres dispositivos, pero solo se venden dos para mantener un margen operativo.

## 4. Exclusión y disponibilidad

- Un cupo vendido, reservado, pausado o retenido no está disponible.
- Una venta completa bloquea todos los cupos vendibles y los cupos físicos que la ficha indique.
- Vencer no libera el cupo automáticamente.
- Pausar conserva la asignación.
- Liberar exige revocar el acceso remoto según la política de la plataforma.
- Si queda un cupo físico no vendible por seguridad, no se publica como stock ni se cuenta como vacancia comercial.

## 5. Vencimiento y revocación

Cuando el cliente no renueva y se decide liberar:

1. la asignación queda en `cierre_pendiente`;
2. el cupo queda `pendiente_limpieza`;
3. se revoca el acceso remoto;
4. se confirma la operación con evidencia no sensible;
5. se cierra la asignación y el cupo vuelve a `lista` si es vendible.

Si la plataforma permite cerrar el dispositivo concreto, se mantiene la contraseña de la cuenta. Si no permite cerrar sesiones selectivas, se rota la credencial y se registra qué clientes activos deben recibir el nuevo dato.

## 6. Fallas y traslado

Una falla no reinicia el mes del cliente. La suscripción se mueve a otro cupo compatible y conserva período, precio, cobro, vendedor y fecha de renovación. El origen queda en mantenimiento o retirado hasta revisión.

## 7. Finanzas

El costo proveedor pertenece a la cuenta o recurso completo y se registra una sola vez por ciclo. Para análisis se distribuye entre la capacidad vendible habilitada, no necesariamente entre toda la capacidad física.

Una venta completa genera un solo ingreso. Un cupo no vendible por seguridad puede explicar margen operativo, pero no aparece como pérdida por capacidad ociosa.

## 8. Invariantes

1. `capacidad_vendible_habilitada <= capacidad_fisica`.
2. Un cupo no vendible nunca aparece en stock.
3. Una venta completa no crea ingresos por cupo.
4. Un vencimiento no libera acceso sin acción administrativa.
5. Una plataforma sin cierre selectivo obliga a rotar credenciales para liberar.
6. El traslado conserva el período comercial.
