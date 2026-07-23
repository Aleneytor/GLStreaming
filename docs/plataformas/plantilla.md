# Plantilla de comportamiento de plataforma

## 1. Identificación

- Nombre usado internamente:
- Productos de inventario que ofrece:
- Arquetipo de cada producto:
- Estado comercial (`abierto`, `solo_cartera`, `cerrado`):
- Renovaciones de cartera permitidas:
- Cantidad de servicios observada actualmente —no confundir con capacidad—:
- Estado de la ficha:
- Fuente de las reglas y fecha de confirmación:

Una plataforma puede tener uno o varios productos. Cada producto debe identificarse explícitamente; precio, nombre visible o estabilidad no se usan para inferirlo.

## 2. Productos e inventario comprado

Para cada producto:

- Nombre y código interno del producto:
- Qué se obtiene del proveedor:
- Componentes que forman el servicio —por ejemplo, identidad de acceso y cobertura— y si sus ciclos pueden cambiar por separado:
- Quién es titular del recurso (`negocio`, `cliente`, `proveedor`):
- Titularidad y política de reutilización de cada componente:
- Regla de capacidad (`fija`, `rango` o `variable`) y valor:
- Si la cuenta principal está incluida en esa capacidad, es solo operativa o admite una asignación de uso separada:
- Datos operativos:
- Secretos asociados:
- Ciclo y renovación del proveedor:
- Proveedor operativo predeterminado y si admite propio/tercero por nombre o teléfono:
- Relación o independencia respecto de otros productos de la plataforma:

## 3. Modalidades vendidas

Para cada combinación producto/modalidad permitida:

- producto al que aplica;
- unidad comercial;
- alcance de la asignación;
- capacidad consumida;
- componente que conserva la identidad de acceso y componente que aporta la cobertura;
- mecanismo de entrega;
- identidad/cuenta que aporta el cliente, cuando corresponda;
- si el uso de una cuenta principal puede venderse sin transferir su propiedad o administración y si coexiste con sus miembros;
- datos requeridos del cliente;
- precio y periodicidad;
- compatibilidad o exclusión con otras modalidades.

## 4. Activación y entrega

- Prerrequisitos:
- Acción que inicia el servicio:
- Evidencia de activación:
- Datos que recibe el cliente:
- Si usa el paquete común de cuenta compartida —correo, contraseña, perfil, PIN y fecha— o cuál es su excepción:
- Datos de cuenta madre que el cliente no puede modificar:
- Diferencia entre credenciales de la identidad dentro del servicio y credenciales del correo o sistema de recuperación subyacente:
- Actor autorizado para generar la entrega:
- Datos que entrega el cliente y política de retención:
- Estados intermedios:

## 5. Renovación y vencimiento

- Aplicación de las reglas globales:
- Acciones manuales específicas:
- Comportamiento ante pago tardío:
- Acción remota al no renovar —eliminar/restablecer perfil, PIN y datos—:
- Condición exacta para confirmar limpieza y devolver el slot a stock:
- Destino de la identidad de acceso al cerrar —reutilización tras saneamiento, archivo o retiro definitivo— y eliminación de secretos aportados por el cliente:
- Política para revocar acceso anterior —cerrar sesiones/dispositivos, rotar credenciales o sacar de grupo familiar—:

## 6. Fallas, pausa y reemplazo

- Qué puede fallar:
- Alcance de la falla —una identidad, una cobertura, un cupo o todo el recurso compartido—:
- Cómo se pausa:
- Cómo se reemplaza sin crear otra venta:
- Qué componente se conserva y cuál se reasigna, reactiva o recrea:
- Si una falla común debe abrir una incidencia en lote para todas las asignaciones dependientes:
- Compatibilidad exigida al destino para perfil y cuenta completa:
- Estado de mantenimiento/cuarentena del origen fallido:
- Qué recurso continúa retenido:
- Si al cancelar vuelve a stock, queda reservado al mismo titular o se retira definitivamente:

## 7. Finanzas y ocupación

- Nivel del costo proveedor:
- Nivel del ingreso:
- Capacidad ociosa:
- Estado de admisión de nuevas altas y su independencia respecto de la cantidad de cupos físicos libres:
- Tratamiento de una cuenta principal operativa no vendida —sin confundirla con vacancia—:
- Tratamiento de una asignación de uso de la principal que coexista con miembros:
- Tratamiento de venta completa:
- Casos que podrían duplicar costos o ingresos:

## 8. Seguridad y permisos

- Secretos de cuenta:
- Secretos de unidad:
- Datos visibles para administrador:
- Datos visibles para revendedor:
- Datos entregados al cliente:
- Política de mutación de credenciales/recuperación/plan de la cuenta madre:
- Facultades que permanecen reservadas al negocio aunque se venda el uso normal de una cuenta principal:
- Metadatos auditados sin persistir secretos en claro:

## 9. Interfaz y acciones

- Representación en el inventario:
- Badges o alertas particulares:
- Representación de cupos libres pero bloqueados por una restricción de nuevas altas a nivel del recurso:
- Acciones en lote ante una falla del recurso compartido:
- Acciones permitidas según estado:
- Carga de cartera existente separada de una venta nueva:

## 10. Invariantes y pruebas

Lista de condiciones que la base de datos y los flujos deben impedir o garantizar.

## 11. Decisiones pendientes

| ID | Pregunta | Impacto | Clasificación |
|---|---|---|---|
| XXX-01 |  |  | Bloqueante de esquema / flujo / no bloqueante |
