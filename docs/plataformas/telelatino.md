# Telelatino — comportamiento de inventario y venta

## 1. Estado y fuente

Ficha documentada el 22/07/2026 a partir de la explicación del usuario y la captura de su Excel. No se copiaron datos sensibles.

Arquetipo preliminar: [cuenta por dispositivos o cupos](arquetipos/cuenta-dispositivos.md).

## 2. Estructura del inventario

El caso observado corresponde a una cuenta Telelatino vendida completa con **tres dispositivos/cupos**.

Modalidad confirmada:

- venta completa de la cuenta, consumiendo los tres dispositivos.

La venta por dispositivo individual queda pendiente de confirmación antes de habilitarla.

## 3. Entrega y permisos

La venta completa entrega los datos necesarios de acceso y la fecha de renovación/vencimiento. El cliente recibe uso de los tres dispositivos, pero no autorización para modificar datos maestros o recuperar la cuenta.

## 4. Renovación, liberación y fallas

Aplica mes calendario, pago completo y vencimiento sin liberación automática. Si el cliente no renueva, la cuenta completa permanece retenida hasta confirmar limpieza/revocación externa.

Si no existe cierre selectivo de sesiones, Telelatino debe seguir la misma política que FlujoTV: rotación de credenciales antes de liberar.

## 5. Finanzas

El costo proveedor se registra una vez por cuenta y ciclo. La venta completa produce un solo ingreso y consume la capacidad completa.

## 6. Invariantes

1. La modalidad confirmada actual es cuenta completa.
2. La venta completa consume tres dispositivos.
3. No se habilita venta por dispositivo hasta confirmarla.
4. La liberación exige revocación externa antes de volver a stock.

## 7. Decisiones pendientes

| ID | Pregunta | Impacto | Clasificación |
|---|---|---|---|
| TEL-01 | ¿Telelatino permite vender dispositivos individuales o solo cuentas completas? | Define modalidades habilitadas. | Bloqueante de flujo |
| TEL-02 | ¿Permite cerrar sesiones/dispositivos o exige rotar credenciales como FlujoTV? | Define política de revocación. | Bloqueante de flujo |
