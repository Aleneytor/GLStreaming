# FlujoTV — comportamiento de inventario y venta

## 1. Estado y fuente

Ficha documentada el 22/07/2026 a partir de la explicación del usuario y la captura de su Excel. No se copiaron datos sensibles.

Arquetipo: [cuenta por dispositivos o cupos](arquetipos/cuenta-dispositivos.md).

## 2. Estructura del inventario

Cada cuenta FlujoTV permite **tres dispositivos/cupos**.

La unidad vendible no es un perfil clásico, sino un cupo de dispositivo dentro de la cuenta. La ficha debe mostrar cada cuenta con tres cupos controlados, asignables y liberables por separado cuando se venda por dispositivo.

Modalidades de trabajo:

- venta por dispositivo/cupo;
- venta completa de la cuenta cuando los tres cupos se entregan a un solo cliente.

## 3. Entrega y permisos

El cliente recibe los datos necesarios para usar el servicio en su dispositivo y la fecha comercial de renovación/vencimiento. Si se vende completa, recibe acceso sobre los tres dispositivos.

El cliente no puede cambiar credenciales maestras ni datos administrativos de la cuenta.

## 4. Revocación especial

FlujoTV queda marcado como excepción: el usuario confirmó que **no se pueden cerrar sesiones** de forma suficiente para retirar solo al cliente vencido.

Por eso, al liberar un cupo o una cuenta FlujoTV:

1. la asignación queda en `cierre_pendiente`;
2. el cupo queda `pendiente_limpieza`;
3. se cambian las credenciales de la cuenta;
4. se registran los clientes activos que deben recibir las credenciales nuevas;
5. se confirma la redistribución necesaria;
6. se libera el cupo o la cuenta según corresponda.

Esta excepción evita depender de un cierre de sesión que la plataforma no ofrece.

## 5. Renovación, fallas y traslado

Aplica mes calendario y pago completo. Vencer no libera cupos automáticamente.

Si falla una cuenta FlujoTV, cada suscripción afectada se traslada a un cupo libre compatible o a otra cuenta completa disponible, manteniendo período, precio, cobro, vendedor y fecha de renovación. El origen queda en mantenimiento.

## 6. Finanzas

El costo proveedor pertenece a la cuenta FlujoTV completa y se registra una vez por ciclo. En venta por cupos, el costo analítico se divide entre tres; en venta completa se mantiene un solo ingreso.

## 7. Interfaz requerida

La pantalla debe ser mejor que la estructura vieja de Excel:

- una fila padre por cuenta FlujoTV;
- tres cupos visibles por cuenta;
- estado claro por cupo: disponible, asignado, pausado, vencido retenido, pendiente de limpieza o mantenimiento;
- acción directa para rotar credenciales y marcar redistribución a clientes activos;
- filtro para cuentas con cupos libres reales.

## 8. Invariantes

1. Cada cuenta FlujoTV tiene tres cupos.
2. Una venta completa consume los tres cupos.
3. Un cupo vencido no vuelve a stock sin rotación de credenciales.
4. Rotar credenciales no crea nuevas ventas ni cambia períodos.
5. El costo proveedor no se multiplica por tres.

## 9. Decisiones pendientes

| ID | Pregunta | Impacto | Clasificación |
|---|---|---|---|
| FLU-01 | ¿La venta por cupo entrega siempre la misma credencial de cuenta o hay algún identificador de dispositivo que deba guardarse? | Define secretos de unidad y datos de entrega. | Bloqueante de flujo |
| FLU-02 | Al rotar credenciales, ¿el sistema debe generar automáticamente una lista de clientes activos por notificar o basta con marcar confirmación manual? | Define la interfaz de redistribución. | No bloqueante |
