# Universal+ — comportamiento de inventario y venta

## 1. Estado y fuente

Ficha documentada el 22/07/2026 a partir de la explicación del usuario y la captura de su Excel. No se copiaron datos sensibles.

Arquetipo: [cuenta híbrida por perfiles o completa](arquetipos/cuenta-hibrida.md), con diferencia entre capacidad física y capacidad vendible.

## 2. Estructura del inventario

Universal+ muestra **seis perfiles físicos**, pero para la operación del negocio se tratará como **cinco perfiles vendibles**.

```text
Cuenta Universal+ — capacidad física: 6
  ├─ Perfil vendible 1
  ├─ Perfil vendible 2
  ├─ Perfil vendible 3
  ├─ Perfil vendible 4
  ├─ Perfil vendible 5
  └─ Perfil no vendible / operativo
```

Modalidades permitidas:

- venta por perfil sobre los cinco perfiles vendibles;
- venta de cuenta completa, ocupando la cuenta completa bajo la regla operativa que se defina para el sexto perfil.

El sexto perfil no aparece como stock individual ni como vacancia comercial.

## 3. Entrega y permisos

La venta por perfil entrega correo, contraseña, nombre de perfil, PIN si aplica y fecha comercial. La venta completa entrega credenciales maestras, fecha y datos aplicables de la cuenta.

El cliente no puede modificar datos maestros de la cuenta.

## 4. Renovación, liberación y fallas

Aplica mes calendario, pago completo y vencimiento sin liberación automática. Al liberar un perfil, se elimina/restablece el perfil remoto y se cierran sesiones/dispositivos relacionados con ese perfil si la plataforma lo permite.

Una falla traslada la suscripción a otro perfil vendible o a otra cuenta completa compatible, sin crear nueva venta ni reiniciar el período.

## 5. Finanzas

El costo proveedor se registra una vez por cuenta y ciclo. La distribución analítica usa `capacidad_vendible_habilitada = 5`; el sexto perfil no vendible no produce pérdida por ociosidad.

## 6. Invariantes

1. Universal+ tiene seis perfiles físicos y cinco perfiles vendibles.
2. El sexto perfil no se ofrece como stock.
3. Una venta completa no crea seis ingresos.
4. La capacidad financiera se reparte entre cinco unidades vendibles salvo decisión futura.
5. El perfil no vuelve a stock sin limpieza y revocación confirmadas.

## 7. Decisiones pendientes

| ID | Pregunta | Impacto | Clasificación |
|---|---|---|---|
| UNI-01 | En venta completa, ¿el sexto perfil queda reservado como soporte interno o se entrega al cliente como parte de la cuenta completa? | Define entrega y capacidad consumida en modalidad completa. | Bloqueante de flujo |
