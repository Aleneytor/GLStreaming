-- ============================================================================
-- Criterios de salida de la Fase 2 (docs/05-roadmap.md)
-- ----------------------------------------------------------------------------
-- Comprueba explícitamente los criterios que aún no tenían prueba propia:
--   * La vertical Netflix reproduce capacidades 1 y 5 y distingue estándar/extra.
--   * La grilla nace configurable: una prueba sintética de capacidad SIETE
--     evita que se haya hardcodeado el cinco.
--   * Editar un proveedor no reescribe los ciclos históricos (guardan snapshot).
-- Se ejecuta en una transacción y se revierte.
-- ============================================================================
begin;

insert into auth.users (id, email) values (gen_random_uuid(), 'admin-f2@test.local') returning id as admin_id \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

select id as p_net    from public.productos_plataforma where codigo = 'netflix' \gset
select id as p_extra  from public.productos_plataforma where codigo = 'netflix-extra' \gset
select id as p_disney from public.productos_plataforma where codigo = 'disney-plus' \gset

-- ---------------------------------------------------------------------------
-- 1. Vertical Netflix: capacidades 5 (estándar) y 1 (extra), productos distintos
-- ---------------------------------------------------------------------------
select public.crear_cuenta_con_unidades(:'p_net',   5, 'Net estandar', null, 'A', 'ha', 'p', null, null, 'Yo') as c_net \gset
select public.crear_cuenta_con_unidades(:'p_extra', 1, 'Net extra',    null, 'B', 'hb', 'p', null, null, 'Yo') as c_ext \gset

select 'Netflix estandar crea 5 unidades' as prueba,
       (select count(*) from public.unidades_inventario where cuenta_id = :'c_net') = 5 as pass
union all select 'Netflix extra crea 1 unidad',
       (select count(*) from public.unidades_inventario where cuenta_id = :'c_ext') = 1
union all select 'Son productos DISTINTOS de la misma plataforma',
       (select producto_plataforma_id from public.cuentas where id = :'c_net')
       <> (select producto_plataforma_id from public.cuentas where id = :'c_ext')
union all select 'El extra NO es un sexto perfil de la estandar',
       (select count(*) from public.unidades_inventario where cuenta_id = :'c_net') = 5;

-- ---------------------------------------------------------------------------
-- 2. Prueba sintética de capacidad SIETE: la grilla no hardcodea cinco
-- ---------------------------------------------------------------------------
select public.crear_cuenta_con_unidades(:'p_disney', 7, 'Disney 7', null, 'C', 'hc', 'p', null, null, 'Yo') as c_dis \gset

select 'Capacidad 7 crea exactamente 7 unidades' as prueba,
       (select count(*) from public.unidades_inventario where cuenta_id = :'c_dis') = 7 as pass
union all select 'Los slots van del 1 al 7 sin huecos',
       (select array_agg(numero_slot order by numero_slot)
        from public.unidades_inventario where cuenta_id = :'c_dis')
       = array[1,2,3,4,5,6,7]
union all select 'La capacidad vendible tambien es 7',
       (select capacidad_vendible_habilitada from public.cuentas where id = :'c_dis') = 7;

-- Y una capacidad que NO corresponde al producto se rechaza (no hay "5 magico").
do $$
declare ok boolean := false;
begin
  begin
    perform public.crear_cuenta_con_unidades(
      (select id from public.productos_plataforma where codigo = 'disney-plus'),
      5, 'Disney mal', null, null, null, null, null, null, 'Yo');
  exception when others then ok := true;
  end;
  raise notice 'Disney+ rechaza capacidad 5 (su regla es 7): %',
    case when ok then 'PASS' else 'FAIL' end;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Editar un proveedor NO reescribe los ciclos históricos
-- ---------------------------------------------------------------------------
select public.registrar_ciclo_proveedor(:'c_net', 9.99, '2026-01-10'::date, 10, null) as ciclo \gset

select proveedor_id as prov from public.ciclos_proveedor where id = :'ciclo' \gset

-- Se renombra el proveedor DESPUÉS de haber registrado el ciclo.
update public.proveedores set nombre_o_alias = 'Nombre Cambiado' where id = :'prov';

select 'El ciclo conserva el nombre del proveedor de entonces' as prueba,
       (select proveedor_nombre_snapshot from public.ciclos_proveedor where id = :'ciclo') = 'Yo' as pass
union all select 'Y el proveedor si quedo renombrado',
       (select nombre_o_alias from public.proveedores where id = :'prov') = 'Nombre Cambiado'
union all select 'El ciclo sigue apuntando al mismo proveedor',
       (select proveedor_id from public.ciclos_proveedor where id = :'ciclo') = :'prov';

reset role;
rollback;
