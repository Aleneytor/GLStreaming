# Arquetipo — servicio sobre cuenta propiedad del cliente

## 1. Propósito

Este arquetipo representa servicios que GL Streaming activa o administra sobre una cuenta externa cuyo titular sigue siendo el cliente. YouTube confirma por primera vez esta capa de identidad, aunque su estructura completa de provisión todavía depende de `YT-06`. Spotify la confirma para las identidades creadas sobre el correo del cliente: la identidad es privada y no reutilizable, mientras la cobertura Premium individual o familiar se administra por separado.

No se aplica automáticamente a Canva ni a otra plataforma hasta documentar su operación.

## 2. Diferencia frente al inventario del negocio

```text
Cuenta o identidad del cliente
  -> pertenece a una persona concreta
  -> no se revende ni vuelve a stock

Cobertura que habilita el servicio
  -> puede ser independiente o provenir de un plan/cupo compartido
  -> la ficha de cada plataforma define propiedad, capacidad y reutilización
```

El negocio puede administrar el servicio y su renovación sin adquirir propiedad comercial sobre la cuenta externa. Que la identidad no sea reutilizable no demuestra, por sí solo, que el cupo utilizado para habilitarla tampoco lo sea.

## 3. Configuración de la capa cliente

Cuando una ficha confirme este arquetipo, la identidad o recurso aportado por el cliente usa:

- `titular_tipo = cliente`;
- `cliente_propietario_id` obligatorio;
- `reutilizable = false`;
- asignación exclusiva a una suscripción del mismo cliente;
- mecanismo de credenciales, activación y retención definido por la plataforma;
- exclusión de stock, reservas y solicitudes de revendedor.

La ficha debe confirmar por separado si la prestación comercial es indivisible de capacidad uno o si también consume una unidad dentro de un inventario proveedor. Para YouTube, el primer modelo es provisional y el segundo permanece pendiente: no se crearán perfiles artificiales ni se fijará el denominador financiero antes de responder `YT-06`.

## 4. Ciclo de vida

1. Se selecciona o crea el cliente propietario.
2. Se registra la identidad/recurso ligado a ese cliente.
3. Se reciben y protegen los datos requeridos para activar el servicio.
4. Se crea la suscripción/período y, si corresponde, se asigna también la cobertura proveedor.
5. Renovar conserva la identidad mientras siga siendo válida y la plataforma permita esa acción.
6. Cambiar la cuenta externa crea otro tramo sin reescribir el anterior.
7. Finalizar cierra la asignación y retira la identidad; nunca la deja disponible para otro cliente.
8. Un eventual cupo proveedor sigue su propio ciclo y regla de liberación.

Estos recursos cliente no participan en reservas ni solicitudes de stock. Si el producto está en `solo_cartera`, una sesión administrativa de carga inicial puede registrar servicios preexistentes; una venta nueva queda bloqueada y la renovación depende de `permite_renovaciones`.

## 5. Credenciales del cliente

Las credenciales se separan de clientes, suscripciones y reportes. El contenedor registra que su titular es el cliente y aplica:

- cifrado;
- revelado específico solo a administradores autorizados;
- máscara generada por servidor cuando una ficha permita mostrarla en una grilla administrativa;
- auditoría de acceso, rotación y destrucción;
- prohibición en logs, exportaciones generales, analítica y datos de prueba;
- política de retención definida por plataforma.

Los valores completos nunca forman parte de consultas generales. Eliminar un secreto no elimina el recurso, la suscripción, los períodos, los cobros ni el historial de auditoría.

## 6. Finanzas y ocupación

El ingreso pertenece al período comercial del cliente. El costo se reconoce únicamente cuando exista cobertura o un desembolso real, contra la capa que lo produzca.

Si la cobertura es individual y no transferible, finalizar puede dejar un costo no recuperable sin crear vacancia vendible. Si proviene de un plan compartido reutilizable, la vacancia, ocupación y distribución del costo se calculan sobre ese plan/cupo, no sobre la cuenta personal del cliente.

## 7. Invariantes comunes

1. `cliente_propietario_id` es obligatorio para la identidad del cliente.
2. La suscripción vinculada pertenece al mismo cliente.
3. `reutilizable = false` impide disponibilidad, reserva, solicitud y reasignación de esa identidad.
4. Finalizar retira la identidad y conserva la historia.
5. Las credenciales completas nunca se revelan a revendedores ni aparecen en respuestas generales; en Spotify se destruyen al finalizar definitivamente y una reactivación exige que el cliente vuelva a entregarlas.
6. La posible cobertura proveedor se modela por separado y no cambia la propiedad de la identidad.
7. Capacidad, modalidad y snapshots solo se fijan cuando la ficha confirme el mecanismo completo.
