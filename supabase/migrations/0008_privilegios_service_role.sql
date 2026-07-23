-- ============================================================================
-- 0008 — Privilegios para `service_role`
-- ----------------------------------------------------------------------------
-- La 0006 concedió privilegios de tabla a `authenticated`, pero olvidó a
-- `service_role`. Sin ellos, cualquier operación del servidor con la clave
-- privilegiada falla con "permission denied", aunque `service_role` tenga el
-- atributo BYPASSRLS: saltarse RLS no sustituye al permiso de tabla.
--
-- `service_role` es el rol de backend: la clave NUNCA llega al navegador y se
-- usa solo en acciones de servidor acotadas y auditadas (por ejemplo, entregar
-- el paquete de acceso al revendedor tras verificar que la venta es suya).
-- ============================================================================

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant execute on functions to service_role;
