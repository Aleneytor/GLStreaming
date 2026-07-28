-- ============================================================================
-- Deshacer la última renovación: período, cobro, pausa y vendedor
-- Se ejecuta en transacción y hace rollback.
-- ============================================================================
begin;

insert into auth.users (id, email) values (gen_random_uuid(), 'admin-dr@test.local') returning id as admin_id \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as prod from public.productos_plataforma where codigo = 'netflix' \gset
select plataforma_id as plat from public.productos_plataforma where id = :'prod' \gset
select id as m_perfil from public.modalidades where plataforma_id = :'plat' and tipo_modalidad = 'perfil' \gset

insert into public.tasas_cambio (tipo, bs_por_usd, fecha_vigencia, fuente, fuente_registro_id, observada_fuente_at, revalidada_at, estado)
values ('bcv', 100, current_date, 'prueba', 'dr-bcv-1', now(), now(), 'vigente') returning id as tasa_bcv \gset
insert into public.tasas_cambio (tipo, bs_por_usd, fuente, fuente_registro_id, observada_fuente_at, revalidada_at, estado)
values ('paralela', 50, 'prueba', 'dr-par-1', now(), now(), 'vigente') returning id as tasa_par \gset

insert into public.vendedores (nombre, activo, tipo, cobra_en_paralela)
values ('Vendedor viejo QA', true, 'intermediario', false) returning id as vend_viejo \gset
insert into public.vendedores (nombre, activo, tipo, cobra_en_paralela)
values ('Vendedor nuevo QA', true, 'revendedor', true) returning id as vend_nuevo \gset

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

insert into public.clientes (nombre) values ('Cristal QA') returning id as cli \gset
select public.crear_cuenta_con_unidades(:'prod', 5, 'UndoRen-1', null, 'A', 'ha', 'p', null, null, 'Yo') as cta \gset
select id as u1 from public.unidades_inventario where cuenta_id = :'cta' and numero_slot = 1 \gset

select public.vender_unidad(
  p_cliente_id => :'cli',
  p_cuenta_id => :'cta',
  p_modalidad_id => :'m_perfil',
  p_unidad_id => :'u1',
  p_precio_usd => 4,
  p_inicio => '2026-06-26'::date,
  p_cantidad_periodos => 1,
  p_vendedor_id => :'vend_viejo',
  p_monto_usd => 4
) as susc \gset

select set_config('pruebas.susc', :'susc', true);

select id as periodo_base
from public.periodos_servicio
where suscripcion_id = :'susc'
order by fecha_renovacion desc
limit 1 \gset

select public.cambiar_estado_suscripcion(:'susc', 'pausada', 'esperando pago');

select public.renovar_y_cobrar(
  p_suscripcion_id => :'susc',
  p_inicio => '2026-07-26'::date,
  p_meses => 1,
  p_monto_usd => 4,
  p_vendedor_id => :'vend_nuevo',
  p_actualizar_vendedor => true
) as periodo_renovado \gset

select id as pago_renovado
from public.pagos_cliente
where periodo_servicio_id = :'periodo_renovado'
  and tipo = 'cobro'
limit 1 \gset

select public.revertir_cobro_cliente(:'pago_renovado', 'cliente no pagó') as reverso_renovado \gset

select public.deshacer_ultima_renovacion(:'susc', 'renovación accidental') as periodo_deshacer \gset

select 'Devuelve el id del periodo eliminado' as prueba,
       :'periodo_deshacer'::uuid = :'periodo_renovado'::uuid as pass
union all select 'El periodo renovado ya no existe',
       not exists (select 1 from public.periodos_servicio where id = :'periodo_renovado')
union all select 'El cobro de la renovación se elimina',
       not exists (select 1 from public.pagos_cliente where id = :'pago_renovado')
union all select 'El reverso de la renovación se elimina',
       not exists (select 1 from public.pagos_cliente where id = :'reverso_renovado')
union all select 'Se restaura la fecha de renovación anterior',
       (select max(fecha_renovacion) from public.periodos_servicio where suscripcion_id = :'susc') = '2026-07-26'
union all select 'La suscripción vuelve a pausada',
       (select estado from public.suscripciones where id = :'susc') = 'pausada'
union all select 'Se restaura el vendedor anterior',
       (select vendedor_origen_id from public.suscripciones where id = :'susc') = :'vend_viejo'
union all select 'Deja auditoría del deshacer',
       exists (
         select 1
         from public.eventos_auditoria
         where accion = 'deshacer_ultima_renovacion'
           and entidad = 'periodos_servicio'
           and entidad_id = :'periodo_renovado'
       );

do $$
declare ok boolean := false;
begin
  begin
    perform public.deshacer_ultima_renovacion(current_setting('pruebas.susc', true)::uuid, 'segunda vez');
  exception when others then ok := true;
  end;
  raise notice 'No permite deshacer dos veces la misma renovación: %',
    case when ok then 'PASS' else 'FAIL' end;
end $$;

rollback;
