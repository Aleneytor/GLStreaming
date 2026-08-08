begin;

insert into auth.users (id, email)
values (gen_random_uuid(), 'admin-personal@test.local') returning id as admin_id \gset
insert into auth.users (id, email)
values (gen_random_uuid(), 'rev-personal@test.local') returning id as rev_id \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

insert into public.tasas_cambio (
  tipo, bs_por_usd, fecha_vigencia, fuente, fuente_registro_id,
  observada_fuente_at, revalidada_at, estado
) values (
  'bcv', 100, current_date, 'prueba', 'personal-bcv',
  now(), now(), 'vigente'
), (
  'paralela', 120, current_date, 'prueba', 'personal-paralela',
  now(), now(), 'vigente'
);

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

select public.registrar_gasto_personal(
  current_date, 'Hamburguesa', 'Combo', 'BCV', 'usd', 5, 'bcv'
) as gasto1 \gset

select public.registrar_gasto_personal(
  current_date, 'Taxi', null, null, 'ves', 240, 'paralela'
) as gasto2 \gset

select 'USD a BCV congela ambos montos' as prueba,
       exists (
         select 1 from public.gastos_personales
         where id = :'gasto1'
           and monto_original = 5
           and monto_usd = 5
           and monto_ves = 500
           and tasa_tipo = 'bcv'
       ) as pass
union all
select 'VES a paralela deriva USD',
       exists (
         select 1 from public.gastos_personales
         where id = :'gasto2'
           and monto_original = 240
           and monto_ves = 240
           and monto_usd = 2
           and tasa_tipo = 'paralela'
       );

select public.editar_gasto_personal(
  :'gasto2',
  current_date,
  'Taxi editado',
  'Regreso',
  'Noche',
  'usd',
  3,
  'bcv'
);

select 'Editar recalcula y reemplaza snapshots' as prueba,
       exists (
         select 1 from public.gastos_personales
         where id = :'gasto2'
           and concepto = 'Taxi editado'
           and descripcion = 'Regreso'
           and nota = 'Noche'
           and moneda_original = 'usd'
           and monto_original = 3
           and monto_usd = 3
           and monto_ves = 300
           and tasa_tipo = 'bcv'
           and tasa_bs_por_usd_snapshot = 100
       ) as pass;

select public.archivar_gasto_personal(:'gasto1');

select 'Archivar no borra, solo oculta' as prueba,
       exists (
         select 1 from public.gastos_personales
         where id = :'gasto1' and archived_at is not null
       ) as pass;

select public.eliminar_gasto_personal(:'gasto2');

select 'Eliminar borra definitivamente' as prueba,
       not exists (
         select 1 from public.gastos_personales
         where id = :'gasto2'
       ) as pass;

-- Endurecimiento (migración 0060): las funciones corren con search_path vacío
select 'editar_gasto_personal corre con search_path vacío' as prueba,
       exists (
         select 1
         from pg_proc p, unnest(p.proconfig) as e
         where p.proname = 'editar_gasto_personal'
           and p.pronamespace = 'public'::regnamespace
           and e like 'search_path=%'
           and e not like '%public%'
       ) as pass
union all select 'eliminar_gasto_personal corre con search_path vacío',
       exists (
         select 1
         from pg_proc p, unnest(p.proconfig) as e
         where p.proname = 'eliminar_gasto_personal'
           and p.pronamespace = 'public'::regnamespace
           and e like 'search_path=%'
           and e not like '%public%'
       );

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'rev_id', 'role', 'authenticated')::text, true);
set role authenticated;

do $$
declare ok boolean := false;
begin
  begin
    perform public.registrar_gasto_personal(current_date, 'No autorizado', null, null, 'usd', 1, 'bcv');
  exception when others then ok := true;
  end;
  raise notice 'Revendedor no puede registrar gasto personal: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

reset role;
rollback;
