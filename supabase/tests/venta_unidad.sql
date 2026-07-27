-- ============================================================================
-- Pruebas de `vender_unidad` — atomicidad, exclusión y fechas
-- Se ejecuta en una transacción y se revierte.
-- ============================================================================
begin;

insert into auth.users (id, email) values (gen_random_uuid(), 'admin-v@test.local') returning id as admin_id \gset
insert into auth.users (id, email) values (gen_random_uuid(), 'rev-v@test.local')   returning id as rev_id   \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as prod from public.productos_plataforma where codigo = 'netflix' \gset
select plataforma_id as plat from public.productos_plataforma where id = :'prod' \gset
select id as m_perfil   from public.modalidades where plataforma_id = :'plat' and tipo_modalidad = 'perfil' \gset
select id as m_completa from public.modalidades where plataforma_id = :'plat' and tipo_modalidad = 'cuenta_completa' \gset

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

insert into public.clientes (nombre) values ('Ana') returning id as ana \gset
insert into public.clientes (nombre) values ('Beto') returning id as beto \gset

select public.crear_cuenta_con_unidades(:'prod', 5, 'Net-1', null, 'A', 'ha', 'p', null, null, 'Yo') as cta \gset
select id as u1 from public.unidades_inventario where cuenta_id = :'cta' and numero_slot = 1 \gset
select id as u2 from public.unidades_inventario where cuenta_id = :'cta' and numero_slot = 2 \gset

-- ---------------------------------------------------------------------------
-- 1. Fechas: mes calendario con ajuste de fin de mes
-- ---------------------------------------------------------------------------
select 'Venta 22/07 renueva 22/08' as prueba,
       public.fecha_renovacion_cliente('2026-07-22'::date, 1) = '2026-08-22' as pass
union all select 'Venta 31/01 renueva 28/02 (no bisiesto)',
       public.fecha_renovacion_cliente('2026-01-31'::date, 1) = '2026-02-28'
union all select 'Venta 31/01/2024 renueva 29/02 (bisiesto)',
       public.fecha_renovacion_cliente('2024-01-31'::date, 1) = '2024-02-29'
union all select 'Multimes: 22/07 + 3 meses = 22/10',
       public.fecha_renovacion_cliente('2026-07-22'::date, 3) = '2026-10-22';

-- ---------------------------------------------------------------------------
-- 2. Venta de un perfil
-- ---------------------------------------------------------------------------
select public.vender_unidad(
  p_cliente_id => :'ana', p_cuenta_id => :'cta', p_modalidad_id => :'m_perfil',
  p_unidad_id => :'u1', p_precio_usd => 3.50, p_inicio => '2026-07-22'::date,
  p_cantidad_periodos => 1
) as susc \gset

select 'Crea la suscripcion activa' as prueba,
       (select estado from public.suscripciones where id = :'susc') = 'activa' as pass
union all select 'Crea la asignacion abierta sobre el perfil',
       (select count(*) from public.asignaciones_inventario
        where suscripcion_id = :'susc' and unidad_id = :'u1' and fin is null) = 1
union all select 'El periodo guarda el precio en USD',
       (select precio_comercial_usd from public.periodos_servicio where suscripcion_id = :'susc') = 3.50
union all select 'La fecha de renovacion es 22/08',
       (select fecha_renovacion from public.periodos_servicio where suscripcion_id = :'susc') = '2026-08-22'
union all select 'Queda registrado en el historial de estados',
       (select count(*) from public.historial_estado_suscripcion where suscripcion_id = :'susc') = 1;

-- ---------------------------------------------------------------------------
-- 3. El mismo perfil NO se puede vender dos veces
-- ---------------------------------------------------------------------------
do $$
declare ok boolean := false;
begin
  begin
    perform public.vender_unidad(
      p_cliente_id => (select id from public.clientes where nombre = 'Beto'),
      p_cuenta_id => (select id from public.cuentas where alias = 'Net-1'),
      p_modalidad_id => (select id from public.modalidades m join public.productos_plataforma p
         on p.plataforma_id = m.plataforma_id
       where p.codigo = 'netflix' and m.tipo_modalidad = 'perfil'),
      p_unidad_id => (select id from public.unidades_inventario
       where cuenta_id = (select id from public.cuentas where alias = 'Net-1') and numero_slot = 1),
      p_precio_usd => 3.50, p_inicio => current_date, p_cantidad_periodos => 1);
  exception when others then ok := true;
  end;
  raise notice 'Rechaza vender dos veces el mismo perfil: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Exclusión: con un perfil ocupado no se puede vender la cuenta completa
-- ---------------------------------------------------------------------------
do $$
declare ok boolean := false;
begin
  begin
    perform public.vender_unidad(
      p_cliente_id => (select id from public.clientes where nombre = 'Beto'),
      p_cuenta_id => (select id from public.cuentas where alias = 'Net-1'),
      p_modalidad_id => (select id from public.modalidades m join public.productos_plataforma p
         on p.plataforma_id = m.plataforma_id
       where p.codigo = 'netflix' and m.tipo_modalidad = 'cuenta_completa'),
      p_unidad_id => null, p_precio_usd => 15, p_inicio => current_date,
      p_cantidad_periodos => 1);
  exception when others then ok := true;
  end;
  raise notice 'Con un perfil ocupado NO deja vender la cuenta completa: %',
    case when ok then 'PASS' else 'FAIL' end;
end $$;

-- Otro perfil libre de la misma cuenta sí se puede vender.
select public.vender_unidad(
  p_cliente_id => :'beto', p_cuenta_id => :'cta', p_modalidad_id => :'m_perfil',
  p_unidad_id => :'u2', p_precio_usd => 3.50, p_inicio => current_date, p_cantidad_periodos => 1
) as susc2 \gset
select 'Otro perfil libre si se vende' as prueba,
       (select count(*) from public.asignaciones_inventario
        where cuenta_id = :'cta' and fin is null) = 2 as pass;

-- ---------------------------------------------------------------------------
-- 5. Exclusión inversa: cuenta completa bloquea los perfiles
-- ---------------------------------------------------------------------------
select public.crear_cuenta_con_unidades(:'prod', 5, 'Net-2', null, 'B', 'hb', 'p', null, null, 'Yo') as cta2 \gset
select id as v1 from public.unidades_inventario where cuenta_id = :'cta2' and numero_slot = 1 \gset

select public.vender_unidad(
  p_cliente_id => :'ana', p_cuenta_id => :'cta2', p_modalidad_id => :'m_completa',
  p_unidad_id => null, p_precio_usd => 15, p_inicio => current_date, p_cantidad_periodos => 1
) as susc3 \gset
select 'Venta completa consume la capacidad vendible' as prueba,
       (select capacidad_vendible_consumida_snapshot from public.asignaciones_inventario
        where suscripcion_id = :'susc3') = 5 as pass;

do $$
declare ok boolean := false;
begin
  begin
    perform public.vender_unidad(
      p_cliente_id => (select id from public.clientes where nombre = 'Beto'),
      p_cuenta_id => (select id from public.cuentas where alias = 'Net-2'),
      p_modalidad_id => (select id from public.modalidades m join public.productos_plataforma p
         on p.plataforma_id = m.plataforma_id
       where p.codigo = 'netflix' and m.tipo_modalidad = 'perfil'),
      p_unidad_id => (select id from public.unidades_inventario
       where cuenta_id = (select id from public.cuentas where alias = 'Net-2') and numero_slot = 1),
      p_precio_usd => 3.50, p_inicio => current_date, p_cantidad_periodos => 1);
  exception when others then ok := true;
  end;
  raise notice 'Vendida completa, NO deja vender sus perfiles: %',
    case when ok then 'PASS' else 'FAIL' end;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Modalidad no permitida para el producto
-- ---------------------------------------------------------------------------
do $$
declare ok boolean := false;
begin
  begin
    perform public.vender_unidad(
      p_cliente_id => (select id from public.clientes where nombre = 'Ana'),
      p_cuenta_id => (select id from public.cuentas where alias = 'Net-1'),
      p_modalidad_id => (select id from public.modalidades where tipo_modalidad = 'miembro_familiar' limit 1),
      p_unidad_id => (select id from public.unidades_inventario
       where cuenta_id = (select id from public.cuentas where alias = 'Net-1') and numero_slot = 3),
      p_precio_usd => 3.50, p_inicio => current_date, p_cantidad_periodos => 1);
  exception when others then ok := true;
  end;
  raise notice 'Rechaza una modalidad ajena al producto: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Venta en UN PASO: crea el cliente y nombra el perfil sobre la marcha
-- ---------------------------------------------------------------------------
select id as u3 from public.unidades_inventario where cuenta_id = :'cta' and numero_slot = 3 \gset

select public.vender_unidad(
  p_cuenta_id => :'cta', p_modalidad_id => :'m_perfil', p_unidad_id => :'u3',
  p_cliente_nombre => 'Luis QA-Prueba', p_cliente_whatsapp => '+58 414-0377887',
  p_precio_usd => 5.50, p_inicio => '2026-07-15'::date
) as susc_luis \gset

select 'Crea el cliente nuevo sobre la marcha' as prueba,
       (select count(*) from public.clientes where nombre = 'Luis QA-Prueba') = 1 as pass
union all select 'Guarda su WhatsApp',
       (select whatsapp_original from public.clientes where nombre = 'Luis QA-Prueba') = '+58 414-0377887'
union all select 'El perfil toma el nombre del cliente',
       (select nombre_visible from public.unidades_inventario where id = :'u3') = 'Luis QA-Prueba'
union all select 'Renueva el 15/08',
       (select fecha_renovacion from public.periodos_servicio where suscripcion_id = :'susc_luis') = '2026-08-15';

-- Un segundo servicio del MISMO cliente reutiliza su ficha (no la duplica)
select id as u4 from public.unidades_inventario where cuenta_id = :'cta' and numero_slot = 4 \gset
select public.vender_unidad(
  p_cuenta_id => :'cta', p_modalidad_id => :'m_perfil', p_unidad_id => :'u4',
  p_cliente_nombre => 'luis qa-prueba',   -- distinto uso de mayúsculas
  p_nombre_perfil => 'Luis (HBO)', p_precio_usd => 5.00
) as susc_luis2 \gset

select 'Mismo cliente NO se duplica' as prueba,
       (select count(*) from public.clientes where lower(nombre) = 'luis qa-prueba') = 1 as pass
union all select 'Respeta un nombre de perfil distinto',
       (select nombre_visible from public.unidades_inventario where id = :'u4') = 'Luis (HBO)'
union all select 'El cliente queda con dos servicios',
       (select count(*) from public.suscripciones s join public.clientes c on c.id = s.cliente_id
        where lower(c.nombre) = 'luis qa-prueba') = 2;

-- ======================= COMO REVENDEDOR =======================
reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'rev_id', 'role', 'authenticated')::text, true);
set role authenticated;

do $$
declare ok boolean := false;
begin
  begin
    perform public.vender_unidad(
      p_cliente_id => (select id from public.clientes limit 1),
      p_cuenta_id => (select id from public.cuentas limit 1),
      p_modalidad_id => (select id from public.modalidades limit 1),
      p_unidad_id => null, p_precio_usd => 1, p_inicio => current_date,
      p_cantidad_periodos => 1);
  exception when others then ok := true;
  end;
  raise notice 'Un revendedor NO puede registrar ventas: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

reset role;
rollback;
