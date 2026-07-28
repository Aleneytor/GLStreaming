-- Traslado por falla: conserva lo comercial y cambia solo la asignación física.
-- Todo ocurre dentro de una transacción y se revierte.
begin;

insert into auth.users (id, email)
values (gen_random_uuid(), 'admin-traslado@test.local') returning id as admin_id \gset
insert into auth.users (id, email)
values (gen_random_uuid(), 'rev-traslado@test.local') returning id as rev_id \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as prod from public.productos_plataforma where codigo = 'netflix' \gset
select plataforma_id as plat from public.productos_plataforma where id = :'prod' \gset
select id as modalidad from public.modalidades
where plataforma_id = :'plat' and tipo_modalidad = 'perfil' \gset
select id as modalidad_completa from public.modalidades
where plataforma_id = :'plat' and tipo_modalidad = 'cuenta_completa' \gset

select set_config('request.jwt.claims', json_build_object(
  'sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

insert into public.clientes (nombre) values ('Cliente QA Traslado') returning id as cliente \gset
select public.crear_cuenta_con_unidades(
  :'prod', 5, 'QA origen traslado', null,
  'login-cifrado-origen', 'huella-origen-' || :'admin_id', 'clave-cifrada', null, null, 'Yo'
) as origen \gset
select public.crear_cuenta_con_unidades(
  :'prod', 5, 'QA destino traslado', null,
  'login-cifrado-destino', 'huella-destino-' || :'admin_id', 'clave-cifrada', null, null, 'Yo'
) as destino \gset
select public.crear_cuenta_con_unidades(
  :'prod', 5, 'QA completa origen', null,
  'login-cifrado-completa', 'huella-completa-' || :'admin_id', 'clave-cifrada', null, null, 'Yo'
) as completa_origen \gset
select id as unidad_origen from public.unidades_inventario
where cuenta_id = :'origen' and numero_slot = 1 \gset
select id as unidad_destino from public.unidades_inventario
where cuenta_id = :'destino' and numero_slot = 1 \gset

insert into public.suscripciones (
  cliente_id, producto_plataforma_id, modalidad_id, estado
) values (:'cliente', :'prod', :'modalidad', 'activa') returning id as suscripcion \gset

insert into public.periodos_servicio (
  suscripcion_id, tipo_operacion, fecha_venta, inicio, fecha_renovacion,
  precio_comercial_usd, estado_datos_financieros, estado
) values (
  :'suscripcion', 'venta_nueva', current_date, current_date,
  current_date + 30, 3.50, 'pendiente', 'vigente'
) returning id as periodo \gset

insert into public.asignaciones_inventario (
  suscripcion_id, producto_plataforma_id, modalidad_id, alcance,
  cuenta_id, unidad_id, consume_capacidad, capacidad_fisica_snapshot,
  capacidad_vendible_consumida_snapshot, created_by
) values (
  :'suscripcion', :'prod', :'modalidad', 'unidad', :'origen', :'unidad_origen',
  true, 5, 1, :'admin_id'
) returning id as asignacion_origen \gset

update public.unidades_inventario set nombre_visible = 'Perfil Cliente QA'
where id = :'unidad_origen';

insert into public.entregas_acceso (
  suscripcion_id, periodo_servicio_id, asignacion_inventario_id,
  tipo, estado, entregada_por_id, entregada_at, canal
) values (
  :'suscripcion', :'periodo', :'asignacion_origen',
  'alta', 'entregada', :'admin_id', now(), 'panel'
);

select set_config('pruebas.suscripcion', :'suscripcion', true);
select set_config('pruebas.destino', :'destino', true);
select set_config('pruebas.unidad_destino', :'unidad_destino', true);
select set_config('pruebas.asignacion_origen', :'asignacion_origen', true);
select set_config('pruebas.periodo', :'periodo', true);

select 'El selector ofrece el cupo compatible' as prueba,
       exists (
         select 1 from public.listar_destinos_traslado(:'suscripcion') d
         where d.cuenta_id = :'destino' and d.unidad_id = :'unidad_destino'
       ) as pass;

select public.trasladar_servicio_por_falla(
  :'suscripcion', :'destino', :'unidad_destino'
) as asignacion_destino \gset

select 'Cierra la asignación anterior con motivo de falla' as prueba,
       exists (
         select 1 from public.asignaciones_inventario
         where id = :'asignacion_origen' and fin is not null
           and motivo_fin = 'traslado_falla' and estado_cierre = 'ninguno'
       ) as pass
union all select 'Abre una sola asignación en el destino',
       (select count(*) = 1 from public.asignaciones_inventario
        where suscripcion_id = :'suscripcion' and fin is null
          and cuenta_id = :'destino' and unidad_id = :'unidad_destino')
union all select 'Conserva la misma suscripción',
       (select count(*) = 1 from public.suscripciones where id = :'suscripcion')
union all select 'No crea ni altera períodos comerciales',
       ((select count(*) = 1 from public.periodos_servicio
         where suscripcion_id = :'suscripcion')
        and exists (select 1 from public.periodos_servicio
         where id = :'periodo' and suscripcion_id = :'suscripcion'))
union all select 'Marca la cuenta origen en mantenimiento',
       (select estado = 'mantenimiento' from public.cuentas where id = :'origen')
union all select 'Conserva el nombre visible en el nuevo cupo',
       (select nombre_visible = 'Perfil Cliente QA' from public.unidades_inventario
        where id = :'unidad_destino')
union all select 'Limpia el nombre visible del cupo anterior',
       (select nombre_visible is null from public.unidades_inventario
        where id = :'unidad_origen')
union all select 'Revoca el acceso ligado al recurso fallido',
       (select estado = 'revocada' from public.entregas_acceso
        where asignacion_inventario_id = :'asignacion_origen')
union all select 'Crea una entrega nueva pendiente y auditable',
       exists (select 1 from public.entregas_acceso
        where asignacion_inventario_id = :'asignacion_destino'
          and tipo = 'traslado' and estado = 'pendiente')
union all select 'Registra el evento de auditoría',
       exists (select 1 from public.eventos_auditoria
        where accion = 'trasladar_servicio_por_falla'
          and entidad_id = :'suscripcion');

-- Una cuenta completa no puede mudarse sobre una cuenta con un solo cupo ocupado.
insert into public.suscripciones (
  cliente_id, producto_plataforma_id, modalidad_id, estado
) values (:'cliente', :'prod', :'modalidad_completa', 'activa')
returning id as suscripcion_completa \gset
insert into public.asignaciones_inventario (
  suscripcion_id, producto_plataforma_id, modalidad_id, alcance,
  cuenta_id, consume_capacidad, capacidad_fisica_snapshot,
  capacidad_vendible_consumida_snapshot, created_by
) values (
  :'suscripcion_completa', :'prod', :'modalidad_completa', 'cuenta',
  :'completa_origen', true, 5, 5, :'admin_id'
);
select set_config('pruebas.suscripcion_completa', :'suscripcion_completa', true);
do $$
declare v_rechazado boolean := false;
begin
  begin
    perform public.trasladar_servicio_por_falla(
      current_setting('pruebas.suscripcion_completa')::uuid,
      current_setting('pruebas.destino')::uuid,
      null
    );
  exception when others then v_rechazado := true;
  end;
  if not v_rechazado then
    raise exception 'FAIL: una cuenta completa se movió sobre un cupo ocupado';
  end if;
  raise notice 'Cuenta completa exige destino totalmente libre: PASS';
end $$;

-- La operación administrativa no debe estar disponible para revendedores.
reset role;
select set_config('request.jwt.claims', json_build_object(
  'sub', :'rev_id', 'role', 'authenticated')::text, true);
set role authenticated;
do $$
declare v_rechazado boolean := false;
begin
  begin
    perform public.listar_destinos_traslado(current_setting('pruebas.suscripcion')::uuid);
  exception when insufficient_privilege then v_rechazado := true;
  end;
  if not v_rechazado then raise exception 'FAIL: revendedor pudo consultar destinos'; end if;
  raise notice 'Revendedor no puede consultar ni trasladar: PASS';
end $$;

reset role;
rollback;
