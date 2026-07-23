-- ============================================================================
-- Pruebas del ciclo de vida: renovar, pausar, cancelar y liberar
-- Se ejecuta en una transacción y se revierte.
-- ============================================================================
begin;

insert into auth.users (id, email) values (gen_random_uuid(), 'admin-cv@test.local') returning id as admin_id \gset
insert into auth.users (id, email) values (gen_random_uuid(), 'rev-cv@test.local')   returning id as rev_id   \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as prod from public.productos_plataforma where codigo = 'netflix' \gset
select plataforma_id as plat from public.productos_plataforma where id = :'prod' \gset
select id as m_perfil from public.modalidades where plataforma_id = :'plat' and tipo_modalidad = 'perfil' \gset

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

insert into public.clientes (nombre) values ('Ana') returning id as ana \gset
select public.crear_cuenta_con_unidades(:'prod', 5, 'N1', null, 'A', 'ha', 'p', null, null, 'Yo') as cta \gset
select id as u1 from public.unidades_inventario where cuenta_id = :'cta' and numero_slot = 1 \gset

select public.vender_unidad(:'ana', :'cta', :'m_perfil', :'u1', 3.5, '2026-07-22'::date, 1, null, null) as susc \gset

-- Se expone a los bloques DO, que no ven las variables de psql.
select set_config('pruebas.susc', :'susc', true);

-- ---------------------------------------------------------------------------
-- 1. Renovación normal: agrega un período, no sobrescribe
-- ---------------------------------------------------------------------------
select public.renovar_suscripcion(:'susc', '2026-08-22'::date, 1, 3.5, false) as per2 \gset

select 'Renovar AGREGA un periodo (no sobrescribe)' as prueba,
       (select count(*) from public.periodos_servicio where suscripcion_id = :'susc') = 2 as pass
union all select 'El periodo nuevo renueva el 22/09',
       (select fecha_renovacion from public.periodos_servicio where id = :'per2') = '2026-09-22'
union all select 'Queda marcado como renovacion',
       (select tipo_operacion from public.periodos_servicio where id = :'per2') = 'renovacion';

-- 2. Una renovación que empezaría antes de terminar la actual se rechaza.
--    Se apunta a la suscripción DE ESTA PRUEBA (la base puede tener datos reales).
do $$
declare ok boolean := false;
begin
  begin
    perform public.renovar_suscripcion(
      current_setting('pruebas.susc')::uuid, '2026-09-01'::date, 1, 3.5, false);
  exception when others then ok := true;
  end;
  raise notice 'Rechaza renovar solapando el periodo vigente: %',
    case when ok then 'PASS' else 'FAIL' end;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Pausar conserva la asignación (el perfil sigue apartado)
-- ---------------------------------------------------------------------------
select public.cambiar_estado_suscripcion(:'susc', 'pausada', 'no contesta');

select 'Pausar cambia el estado' as prueba,
       (select estado from public.suscripciones where id = :'susc') = 'pausada' as pass
union all select 'Pausar NO cierra la asignacion',
       (select count(*) from public.asignaciones_inventario
        where suscripcion_id = :'susc' and fin is null) = 1
union all select 'El perfil NO vuelve al stock',
       (select estado_preparacion from public.unidades_inventario where id = :'u1') = 'lista';

-- Y el perfil sigue sin poder venderse a otro
do $$
declare ok boolean := false;
begin
  begin
    perform public.vender_unidad(
      (select id from public.clientes where nombre = 'Ana'),
      (select id from public.cuentas where alias = 'N1'),
      (select id from public.modalidades m join public.productos_plataforma p
        on p.plataforma_id = m.plataforma_id
       where p.codigo = 'netflix' and m.tipo_modalidad = 'perfil'),
      (select id from public.unidades_inventario
       where cuenta_id = (select id from public.cuentas where alias = 'N1') and numero_slot = 1),
      3.5, current_date, 1, null, null);
  exception when others then ok := true;
  end;
  raise notice 'Un perfil pausado sigue ocupado (no se revende): %',
    case when ok then 'PASS' else 'FAIL' end;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Renovación TARDÍA sobre una suscripción pausada la reactiva
-- ---------------------------------------------------------------------------
select public.renovar_suscripcion(:'susc', '2026-09-25'::date, 1, 3.5, true) as per3 \gset

select 'La renovacion tardia reactiva al cliente' as prueba,
       (select estado from public.suscripciones where id = :'susc') = 'activa' as pass
union all select 'Se marca como renovacion_tardia',
       (select tipo_operacion from public.periodos_servicio where id = :'per3') = 'renovacion_tardia'
union all select 'Empieza en la fecha real del pago (25/09)',
       (select inicio from public.periodos_servicio where id = :'per3') = '2026-09-25'
union all select 'Y renueva el 25/10',
       (select fecha_renovacion from public.periodos_servicio where id = :'per3') = '2026-10-25';

-- ---------------------------------------------------------------------------
-- 5. Cancelar y liberar: DOS pasos
-- ---------------------------------------------------------------------------
select public.cancelar_y_liberar(:'susc', 'no_renovacion') as oper \gset

select 'La suscripcion queda cancelada' as prueba,
       (select estado from public.suscripciones where id = :'susc') = 'cancelada' as pass
union all select 'La asignacion queda en cierre_pendiente',
       (select estado_cierre from public.asignaciones_inventario
        where suscripcion_id = :'susc') = 'cierre_pendiente'
union all select 'El perfil queda pendiente de limpieza',
       (select estado_preparacion from public.unidades_inventario where id = :'u1') = 'pendiente_limpieza'
union all select 'Se crea la operacion remota pendiente',
       (select estado from public.operaciones_remotas where id = :'oper') = 'pendiente';

-- Mientras no se confirme la limpieza, el perfil NO se puede vender
do $$
declare ok boolean := false;
begin
  begin
    perform public.vender_unidad(
      (select id from public.clientes where nombre = 'Ana'),
      (select id from public.cuentas where alias = 'N1'),
      (select id from public.modalidades m join public.productos_plataforma p
        on p.plataforma_id = m.plataforma_id
       where p.codigo = 'netflix' and m.tipo_modalidad = 'perfil'),
      (select id from public.unidades_inventario
       where cuenta_id = (select id from public.cuentas where alias = 'N1') and numero_slot = 1),
      3.5, current_date, 1, null, null);
  exception when others then ok := true;
  end;
  raise notice 'Sin confirmar limpieza el perfil NO se revende: %',
    case when ok then 'PASS' else 'FAIL' end;
end $$;

-- Paso 2: confirmar la limpieza devuelve el perfil al stock
select public.confirmar_limpieza(:'oper', 'perfil eliminado en la plataforma');

select 'Confirmada la limpieza, el perfil vuelve a lista' as prueba,
       (select estado_preparacion from public.unidades_inventario where id = :'u1') = 'lista' as pass
union all select 'La operacion queda confirmada',
       (select estado from public.operaciones_remotas where id = :'oper') = 'confirmada';

-- Y ahora sí se puede vender a otro cliente
insert into public.clientes (nombre) values ('Beto') returning id as beto \gset
select public.vender_unidad(:'beto', :'cta', :'m_perfil', :'u1', 4, current_date, 1, null, null) as susc2 \gset
select 'El perfil saneado se vuelve a vender' as prueba,
       (select count(*) from public.asignaciones_inventario
        where unidad_id = :'u1' and fin is null) = 1 as pass;

-- 6. Recordatorio comercial
select public.fijar_recordatorio(:'susc2', '2026-08-24'::date, 'prometio pagar el 24');
select 'Guarda el recordatorio' as prueba,
       (select recontactar_el from public.suscripciones where id = :'susc2') = '2026-08-24' as pass;

-- ======================= COMO REVENDEDOR =======================
reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'rev_id', 'role', 'authenticated')::text, true);
set role authenticated;

do $$
declare ok boolean := false;
begin
  begin
    perform public.cancelar_y_liberar((select id from public.suscripciones limit 1), 'otro');
  exception when others then ok := true;
  end;
  raise notice 'Un revendedor NO puede cancelar: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

reset role;
rollback;
