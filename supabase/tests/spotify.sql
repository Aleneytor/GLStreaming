-- ============================================================================
-- Pruebas de importación de Spotify: familias, individuales y uso de la madre.
-- Transacción con rollback: no deja datos.
--
-- Spotify tiene DOS capas: la cobertura (de dónde sale el Premium) y la
-- identidad (el login con el que entra el cliente). Una familia admite SEIS
-- ventas: los cinco cupos de miembro más el uso de la propia cuenta madre.
-- ============================================================================
begin;

insert into auth.users (id, email) values (gen_random_uuid(), 'admin-sp@test.local') returning id as admin_id \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as p_fam from public.productos_plataforma where codigo = 'spotify-familiar' \gset
select id as p_ind from public.productos_plataforma where codigo = 'spotify-individual' \gset
select id as m_miembro from public.modalidades where alcance_asignacion = 'unidad'
  and id in (select modalidad_id from public.producto_modalidades where producto_plataforma_id = :'p_fam') \gset
select id as m_madre from public.modalidades where alcance_asignacion = 'principal'
  and id in (select modalidad_id from public.producto_modalidades where producto_plataforma_id = :'p_fam') \gset
select id as m_ind from public.modalidades where alcance_asignacion = 'cuenta'
  and id in (select modalidad_id from public.producto_modalidades where producto_plataforma_id = :'p_ind') \gset

insert into public.tasas_cambio (tipo, bs_por_usd, fecha_vigencia, fuente, fuente_registro_id, observada_fuente_at, revalidada_at, estado)
values ('bcv', 100, current_date, 'prueba', 'sp-bcv', now(), now(), 'vigente');
insert into public.tasas_cambio (tipo, bs_por_usd, fuente, fuente_registro_id, observada_fuente_at, revalidada_at, estado)
values ('paralela', 50, 'prueba', 'sp-par', now(), now(), 'vigente');

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

select public.abrir_sesion_carga(:'p_fam', 'prueba spotify') as sesion \gset

-- ---------------------------------------------------------------------------
-- 1. Familia: la madre da el Premium; cada miembro entra con SU propio login
-- ---------------------------------------------------------------------------
-- Familia pagada con GPay propio: el Gmail pagador va aparte (aunque en la
-- hoja venga escrito dentro de la celda de proveedor).
select public.importar_spotify_familiar(
  :'sesion', :'p_fam', 5,
  'cif-madre', 'huella-madre', 'cif-clave-madre',
  'cif-miembro1', 'huella-miembro1', 'cif-clave-m1', 'dominio_gl',
  1, :'m_miembro', 'Andrea Rodriguez', '04241413882',
  '2026-06-07'::date, '2026-09-05'::date, 200, null,
  5.00, 'yo(gpay usa)', '2026-07-07'::date,
  'cif-pagador-fam', 'huella-pagador-fam', 'gpay_usa'
) as r1 \gset

select public.importar_spotify_familiar(
  :'sesion', :'p_fam', 5,
  'cif-madre', 'huella-madre', 'cif-clave-madre',
  'cif-miembro2', 'huella-miembro2', 'cif-clave-m2', 'gmail_propio',
  2, :'m_miembro', 'Arantxa Torres', '04124067449',
  '2026-06-24'::date, '2026-07-24'::date, 200, null,
  null, null, null
) as r2 \gset

select set_config('pruebas.cuentaFam', (:'r1'::jsonb ->> 'cuenta_id'), true);
select set_config('pruebas.susc1', (:'r1'::jsonb ->> 'suscripcion_id'), true);

select 'La primera fila crea la cuenta madre' as prueba,
       (:'r1'::jsonb ->> 'cuenta_creada')::boolean = true as pass
union all select 'La segunda reutiliza la misma familia',
       (:'r2'::jsonb ->> 'cuenta_creada')::boolean = false
       and (:'r1'::jsonb ->> 'cuenta_id') = (:'r2'::jsonb ->> 'cuenta_id')
union all select 'La familia tiene sus 5 cupos',
       (select count(*) from public.unidades_inventario
        where cuenta_id = current_setting('pruebas.cuentaFam')::uuid) = 5
union all select 'Queda registrada como cobertura familiar',
       (select tipo from public.coberturas_spotify
        where cuenta_id = current_setting('pruebas.cuentaFam')::uuid) = 'familiar'
union all select 'Se guarda la identidad de la madre en la cobertura',
       (select identidad_madre_id from public.coberturas_spotify
        where cuenta_id = current_setting('pruebas.cuentaFam')::uuid) is not null
union all select 'Cada miembro queda enlazado a SU identidad',
       (select identidad_spotify_id from public.vinculos_identidad_spotify
        where suscripcion_id = current_setting('pruebas.susc1')::uuid)
       = (:'r1'::jsonb ->> 'identidad_id')::uuid
union all select 'Las identidades de los dos miembros son distintas',
       (:'r1'::jsonb ->> 'identidad_id') <> (:'r2'::jsonb ->> 'identidad_id')
union all select 'El miembro ocupa un cupo (alcance unidad)',
       (select alcance from public.asignaciones_inventario
        where suscripcion_id = current_setting('pruebas.susc1')::uuid) = 'unidad'
union all select 'La familia guarda su Gmail pagador (no vendida como individual)',
       (select origen from public.controles_pago_spotify
        where cobertura_cuenta_id = current_setting('pruebas.cuentaFam')::uuid) = 'gpay_usa';

-- ---------------------------------------------------------------------------
-- 2. El USO DE LA MADRE: misma cuenta, sin gastar cupo de miembro
-- ---------------------------------------------------------------------------
-- Se importa como «individual», pero la huella coincide con la familia.
select public.importar_spotify_individual(
  :'sesion', :'p_ind',
  'cif-madre', 'huella-madre', 'cif-clave-madre',
  :'m_ind', 'individual_gpay_propio', null, null, null,
  'Cliente Madre', '04120000000',
  '2026-07-01'::date, '2026-08-01'::date, 300, null, null, null, null
) as rm \gset

select set_config('pruebas.suscMadre', (:'rm'::jsonb ->> 'suscripcion_id'), true);

select 'Se reconoce que ese correo ya es una familia' as prueba,
       (:'rm'::jsonb ->> 'es_uso_madre')::boolean = true as pass
union all select 'NO se duplica la cuenta: es la misma familia',
       (:'rm'::jsonb ->> 'cuenta_id') = current_setting('pruebas.cuentaFam')
union all select 'Se registra con alcance principal',
       (:'rm'::jsonb ->> 'alcance') = 'principal'
union all select 'El uso de la madre NO consume cupo de miembro',
       (select consume_capacidad from public.asignaciones_inventario
        where suscripcion_id = current_setting('pruebas.suscMadre')::uuid) = false
union all select 'Siguen quedando 3 cupos de miembro libres',
       (select count(*) from public.unidades_inventario u
        where u.cuenta_id = current_setting('pruebas.cuentaFam')::uuid
          and not exists (select 1 from public.asignaciones_inventario a
                          where a.unidad_id = u.id and a.fin is null)) = 3
union all select 'Se cobro la venta de la madre (300 Bs)',
       (select monto_ves from public.pagos_cliente pc
        join public.periodos_servicio ps on ps.id = pc.periodo_servicio_id
        where ps.suscripcion_id = current_setting('pruebas.suscMadre')::uuid
          and pc.tipo = 'cobro') = 300;

-- No se puede vender dos veces el uso de la madre.
select set_config('pruebas.sesion', :'sesion', true);
select set_config('pruebas.pind', :'p_ind', true);
select set_config('pruebas.mind', :'m_ind', true);

do $$
declare ok boolean := false;
begin
  begin
    perform public.importar_spotify_individual(
      current_setting('pruebas.sesion')::uuid, current_setting('pruebas.pind')::uuid,
      'cif-madre', 'huella-madre', 'cif-clave-madre',
      current_setting('pruebas.mind')::uuid, 'individual_gpay_propio', null, null, null,
      'Otro', null, null, null, null, null, null, null, null);
  exception when others then ok := true;
  end;
  raise notice 'El uso de la madre no se vende dos veces: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Individual de verdad (GPay propio) con su Gmail pagador
-- ---------------------------------------------------------------------------
select public.importar_spotify_individual(
  :'sesion', :'p_ind',
  'cif-ind1', 'huella-ind1', 'cif-clave-ind1',
  :'m_ind', 'individual_gpay_propio',
  'cif-gmail-pagador', 'huella-gmail-pagador', 'gpay_usa',
  'Diego Mujica', '04245840932',
  '2026-06-25'::date, '2026-07-25'::date, 300, null, null, 'yo(gpay usa)', null
) as ri \gset

select set_config('pruebas.cuentaInd', (:'ri'::jsonb ->> 'cuenta_id'), true);

select 'El individual crea su propia cuenta' as prueba,
       (:'ri'::jsonb ->> 'cuenta_creada')::boolean = true
       and (:'ri'::jsonb ->> 'es_uso_madre')::boolean = false as pass
union all select 'Su cobertura es individual por GPay propio',
       (select tipo from public.coberturas_spotify
        where cuenta_id = current_setting('pruebas.cuentaInd')::uuid) = 'individual_gpay_propio'
union all select 'Se guarda el Gmail pagador como referencia (con su origen)',
       (select origen from public.controles_pago_spotify
        where cobertura_cuenta_id = current_setting('pruebas.cuentaInd')::uuid) = 'gpay_usa'
union all select 'Se vende como cuenta completa (alcance cuenta)',
       (:'ri'::jsonb ->> 'alcance') = 'cuenta';

-- ---------------------------------------------------------------------------
-- 4. Un revendedor no puede importar Spotify
-- ---------------------------------------------------------------------------
reset role;
insert into auth.users (id, email) values (gen_random_uuid(), 'rev-sp@test.local') returning id as rev_id \gset
select set_config('request.jwt.claims', json_build_object('sub', :'rev_id', 'role', 'authenticated')::text, true);
set role authenticated;

do $$
declare ok boolean := false;
begin
  begin
    perform public.importar_spotify_familiar(
      current_setting('pruebas.sesion')::uuid, current_setting('pruebas.pind')::uuid, 5,
      'x', 'y', 'z');
  exception when others then ok := true;
  end;
  raise notice 'El revendedor no puede importar Spotify: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

reset role;
rollback;
