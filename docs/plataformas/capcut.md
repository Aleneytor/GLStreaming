# CapCut — comportamiento de inventario y venta

## 1. Estado y fuente

Ficha documentada el 22/07/2026 a partir de la explicación del usuario y la captura de su Excel. No se copiaron datos sensibles.

Arquetipo: [cuenta por dispositivos o cupos](arquetipos/cuenta-dispositivos.md).

## 2. Estructura del inventario

CapCut permite una cuenta completa o uso por hasta **tres dispositivos**, pero la operación confirmada por el usuario vende **solo dos dispositivos por seguridad**.

```text
Cuenta CapCut — capacidad física: 3 dispositivos
  ├─ Dispositivo vendible 1
  ├─ Dispositivo vendible 2
  └─ Dispositivo no vendible / reserva operativa
```

La capacidad física es tres y la capacidad vendible habilitada inicial es dos. El tercer cupo no aparece como stock ni como capacidad ociosa comercial.

## 3. Modalidades

Modalidades permitidas de trabajo:

- venta por dispositivo/cupo, limitada inicialmente a dos cupos vendibles;
- venta completa, pendiente de precisar si entrega los tres cupos o solo los dos vendibles más control administrativo reservado.

## 4. Entrega y permisos

El cliente recibe datos de acceso, cupo/dispositivo asignado cuando aplique y fecha comercial. No recibe permiso para cambiar datos maestros de la cuenta.

## 5. Renovación, liberación y fallas

Aplica mes calendario y pago completo. Vencer no libera cupos automáticamente.

Al no renovar, se revoca el acceso del dispositivo/cupo. Si CapCut permite cerrar dispositivo o sesión concreta, se mantiene la credencial. Si no lo permite, se rota credencial como excepción.

Una falla traslada la suscripción a otro cupo compatible manteniendo el período.

## 6. Finanzas

El costo proveedor se registra una vez por cuenta y ciclo. La distribución analítica usa dos cupos vendibles mientras esa sea la política comercial. El cupo reservado por seguridad no se trata como pérdida.

## 7. Invariantes

1. CapCut tiene capacidad física tres.
2. La capacidad vendible inicial es dos.
3. El tercer cupo no se publica en stock.
4. Una venta por cupo ocupa uno de los dos cupos vendibles.
5. La liberación exige revocar acceso antes de reutilizar.

## 8. Decisiones pendientes

| ID | Pregunta | Impacto | Clasificación |
|---|---|---|---|
| CAP-01 | En venta completa, ¿se entregan los tres dispositivos o se mantiene uno reservado por seguridad? | Define capacidad consumida y entrega. | Bloqueante de flujo |
| CAP-02 | ¿CapCut permite cerrar un dispositivo/sesión concreta o exige rotar credencial? | Define revocación. | Bloqueante de flujo |
