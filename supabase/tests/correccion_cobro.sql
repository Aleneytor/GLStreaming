-- Corrección auditable de un ingreso equivocado. Todo se revierte al final.
begin;

insert into auth.users (id, email)
values (gen_random_uuid(), 'admin-correccion@test.local')
returning id as admin_id \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as prod from public.productos_plataforma where codigo = 'netflix-extra' \gset
select plataforma_id as plat from public.productos_plataforma where id = :'prod' \gset
select id as modalidad
from public.modalidades
where plataforma_id = :'plat' and tipo_modalidad = 'extra' \gset

insert into public.tasas_cambio (
  tipo, bs_por_usd, fecha_vigencia, fuente, fuente_registro_id,
  observada_fuente_at, revalidada_at, estado
) values (
  'bcv', 100, current_date, 'prueba', 'correccion-bcv', now(), now(), 'vigente'
);
insert into public.tasas_cambio (
  tipo, bs_por_usd, fuente, fuente_registro_id,
  observada_fuente_at, revalidada_at, estado
) values (
  'paralela', 120, 'prueba', 'correccion-par', now(), now(), 'vigente'
);

reset role;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'admin_id', 'role', 'authenticated')::text,
  true
);
set role authenticated;

select public.crear_cuenta_con_unidades(
  :'prod', 1, 'Corrección', null, 'login', 'huella-correccion', 'clave',
  null, null, 'Yo'
) as cuenta \gset
select id as unidad
from public.unidades_inventario
where cuenta_id = :'cuenta' and numero_slot = 1 \gset

select public.vender_unidad(
  p_cuenta_id => :'cuenta',
  p_unidad_id => :'unidad',
  p_modalidad_id => :'modalidad',
  p_cliente_nombre => 'Cliente Corrección',
  p_precio_usd => 1,
  p_monto_usd => 1,
  p_inicio => '2026-07-26'::date
) as suscripcion \gset
select id as periodo
from public.periodos_servicio
where suscripcion_id = :'suscripcion' \gset
select id as pago_original
from public.pagos_cliente
where periodo_servicio_id = :'periodo' and tipo = 'cobro' \gset

select public.corregir_cobro_cliente(
  :'periodo', 4, 'El Excel traía 1 y correspondían 4'
) as resultado \gset
select set_config('pruebas.correccion_periodo', :'periodo', true);
select count(*) as pagos_antes_reintento
from public.pagos_cliente where periodo_servicio_id = :'periodo' \gset
select public.corregir_cobro_cliente(
  :'periodo', 4, 'reintento con el mismo valor'
) as reintento \gset

select 'El período queda con ingreso de 4 USD' as prueba,
       (select precio_comercial_usd from public.periodos_servicio where id = :'periodo') = 4 as pass
union all
select 'El cobro equivocado conserva su fila original',
       exists(select 1 from public.pagos_cliente where id = :'pago_original')
union all
select 'Se agrega un reverso ligado al cobro equivocado',
       exists(
         select 1 from public.pagos_cliente
         where pago_original_id = :'pago_original' and tipo = 'reverso'
       )
union all
select 'El cobro sustituto usa la misma fecha del original',
       (
         select ocurrido_at from public.pagos_cliente
         where id = (:'resultado'::jsonb ->> 'pago_id')::uuid
       ) = (
         select ocurrido_at from public.pagos_cliente where id = :'pago_original'
       )
union all
select 'El ingreso neto del período queda en 400 Bs',
       (
         select sum(case when tipo = 'reverso' then -monto_ves else monto_ves end)
         from public.pagos_cliente where periodo_servicio_id = :'periodo'
       ) = 400
union all
select 'La corrección queda auditada',
       exists(
         select 1 from public.eventos_auditoria
         where accion = 'corregir_cobro_cliente' and entidad_id = :'periodo'
       )
union all
select 'Reintentar el mismo valor no duplica movimientos',
       (select count(*) from public.pagos_cliente where periodo_servicio_id = :'periodo')
       = :'pagos_antes_reintento'::integer;

reset role;
insert into auth.users (id, email)
values (gen_random_uuid(), 'rev-correccion@test.local')
returning id as rev_id \gset
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'rev_id', 'role', 'authenticated')::text,
  true
);
set role authenticated;
do $$
declare
  rechazado boolean := false;
begin
  begin
    perform public.corregir_cobro_cliente(
      current_setting('pruebas.correccion_periodo')::uuid, 5, 'intento revendedor'
    );
  exception when sqlstate '42501' then
    rechazado := true;
  end;
  if not rechazado then
    raise exception 'Un revendedor pudo corregir un cobro ajeno.';
  end if;
  raise notice 'Revendedor no puede corregir cobros: PASS';
end $$;

reset role;
rollback;
