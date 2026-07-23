# Universal+ — comportamiento de inventario y venta

## 1. Estado y fuente

Ficha documentada el 22/07/2026 a partir de la explicación del usuario y la captura de su Excel. No se copiaron datos sensibles.

**Corregido el 22/07/2026** por aclaración directa del usuario: Universal+ tiene **cinco perfiles, todos vendibles**, igual que Netflix estándar. La versión anterior de esta ficha registraba por error seis perfiles físicos con solo cinco vendibles; esa suposición queda descartada y con ella la pregunta `UNI-01`, que carecía de objeto.

Arquetipo: [cuenta híbrida por perfiles o completa](arquetipos/cuenta-hibrida.md).

## 2. Estructura del inventario

Universal+ usa **cinco perfiles físicos, los cinco vendibles** (capacidad física = capacidad vendible = 5).

```text
Cuenta Universal+ — capacidad: 5
  ├─ Perfil 1
  ├─ Perfil 2
  ├─ Perfil 3
  ├─ Perfil 4
  └─ Perfil 5
```

Modalidades permitidas:

- venta por perfil, hasta cinco suscripciones individuales;
- venta de cuenta completa, que consume las cinco unidades.

Se aplica la exclusión estándar del arquetipo híbrido: cualquier perfil retenido impide vender la cuenta completa, y una venta completa bloquea los cinco perfiles.

## 3. Entrega y permisos

La venta por perfil entrega correo, contraseña, nombre de perfil, PIN si aplica y fecha comercial. La venta completa entrega credenciales maestras, fecha y datos aplicables de la cuenta.

El cliente no puede modificar datos maestros de la cuenta.

## 4. Renovación, liberación y fallas

Aplica mes calendario, pago completo y vencimiento sin liberación automática. Al liberar un perfil, se elimina/restablece el perfil remoto y se cierran sesiones/dispositivos relacionados con ese perfil si la plataforma lo permite.

Una falla traslada la suscripción a otro perfil libre o a otra cuenta completa compatible, sin crear nueva venta ni reiniciar el período.

## 5. Finanzas

El costo proveedor se registra una vez por cuenta y ciclo. La distribución analítica usa `capacidad_vendible_habilitada = 5`.

## 6. Invariantes

1. Una cuenta Universal+ crea exactamente cinco perfiles, los cinco vendibles.
2. Perfil y cuenta completa son excluyentes durante reservas/asignaciones.
3. Una venta completa genera un solo ingreso y consume las cinco unidades.
4. El costo proveedor se cuenta una sola vez por cuenta y ciclo.
5. El perfil no vuelve a stock sin limpieza y revocación confirmadas.

## 7. Decisiones pendientes

Ninguna. `UNI-01` quedó sin objeto al confirmarse que no existe un sexto perfil (ver sección 1; registrado como `DEC-96` en `docs/06-decisiones-pendientes.md`).
