-- ============================================================================
-- Pruebas de edición de cuenta y rotación de credenciales
-- Se ejecuta en una transacción y se revierte.
-- ============================================================================
begin;

insert into auth.users (id, email) values (gen_random_uuid(), 'admin-ed@test.local') returning id as admin_id \gset
insert into auth.users (id, email) values (gen_random_uuid(), 'rev-ed@test.local')   returning id as rev_id   \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as prod from public.productos_plataforma where codigo = 'netflix' \gset

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

select public.crear_cuenta_con_unidades(
  :'prod', 5, 'Original', null, 'CIF_A', 'huella-A', 'PASS_A', null, 'nota vieja', 'Yo'
) as cta \gset

-- Segunda cuenta, para probar el choque de correos
select public.crear_cuenta_con_unidades(
  :'prod', 5, 'Otra', null, 'CIF_B', 'huella-B', 'PASS_B', null, null, 'Yo'
) as cta2 \gset

-- 1. Editar datos
select public.actualizar_cuenta(:'cta', 'Renombrada', 'Distribuidor Ana', 'nota nueva', 'mantenimiento');

select 'Alias actualizado' as prueba,
       (select alias from public.cuentas where id = :'cta') = 'Renombrada' as pass
union all select 'Notas actualizadas',
       (select notas from public.cuentas where id = :'cta') = 'nota nueva'
union all select 'Estado actualizado',
       (select estado from public.cuentas where id = :'cta') = 'mantenimiento'
union all select 'Proveedor nuevo enlazado',
       (select p.nombre_o_alias from public.cuentas c
          join public.proveedores p on p.id = c.proveedor_operativo_id
        where c.id = :'cta') = 'Distribuidor Ana';

select 'Mantenimiento baja también los cupos' as prueba,
       not exists (
         select 1 from public.unidades_inventario
         where cuenta_id = :'cta' and estado_operativo <> 'mantenimiento'
       ) as pass;

update public.unidades_inventario
set estado_preparacion = 'pendiente_limpieza'
where cuenta_id = :'cta' and numero_slot = 5;

select public.actualizar_cuenta(:'cta', 'Renombrada', 'Distribuidor Ana', 'nota nueva', 'activa');

select 'Reactivar habilita los cupos preparados' as prueba,
       not exists (
         select 1 from public.unidades_inventario
         where cuenta_id = :'cta' and estado_preparacion = 'lista'
           and estado_operativo <> 'habilitada'
       ) as pass
union all select 'Reactivar no publica un cupo por limpiar',
       (select estado_operativo = 'mantenimiento'
        from public.unidades_inventario
        where cuenta_id = :'cta' and numero_slot = 5);

-- 2. Rotar credenciales
select public.rotar_credenciales_cuenta(:'cta', 'CIF_NUEVO', 'huella-NUEVA', 'PASS_NUEVO');

select 'Correo cifrado actualizado' as prueba,
       (select login_cifrado from public.credenciales_cuenta where cuenta_id = :'cta') = 'CIF_NUEVO' as pass
union all select 'Contrasena cifrada actualizada',
       (select contrasena_cifrada from public.credenciales_cuenta where cuenta_id = :'cta') = 'PASS_NUEVO'
union all select 'Queda marcado rotada_at',
       (select rotada_at is not null from public.credenciales_cuenta where cuenta_id = :'cta');

-- 3. Cambiar solo la contraseña conserva el correo
select public.rotar_credenciales_cuenta(:'cta', null, null, 'SOLO_PASS');
select 'Cambiar solo contrasena conserva el correo' as prueba,
       (select login_cifrado from public.credenciales_cuenta where cuenta_id = :'cta') = 'CIF_NUEVO' as pass;

-- 4. No se puede rotar al correo de OTRA cuenta de la misma plataforma
do $$
declare ok boolean := false;
begin
  begin
    perform public.rotar_credenciales_cuenta(
      (select id from public.cuentas where alias = 'Renombrada'),
      'X', 'huella-B', 'Y');   -- huella-B ya es de la otra cuenta
  exception when others then ok := true;
  end;
  raise notice 'Rechaza rotar al correo de otra cuenta de la misma plataforma: %',
    case when ok then 'PASS' else 'FAIL' end;
end $$;

-- 5. Producto y capacidad siguen intactos tras editar
select 'Capacidad intacta tras editar' as prueba,
       (select capacidad from public.cuentas where id = :'cta') = 5 as pass
union all select 'Unidades intactas tras editar',
       (select count(*) from public.unidades_inventario where cuenta_id = :'cta') = 5;

-- ======================= COMO REVENDEDOR =======================
reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'rev_id', 'role', 'authenticated')::text, true);
set role authenticated;

do $$
declare ok boolean := false;
begin
  begin
    perform public.actualizar_cuenta(
      (select id from public.cuentas limit 1), 'hackeada', null, null, 'activa');
  exception when others then ok := true;
  end;
  raise notice 'Un revendedor NO puede editar cuentas: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

do $$
declare ok boolean := false;
begin
  begin
    perform public.rotar_credenciales_cuenta(
      (select id from public.cuentas limit 1), 'X', 'Y', 'Z');
  exception when others then ok := true;
  end;
  raise notice 'Un revendedor NO puede rotar credenciales: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

reset role;
rollback;
