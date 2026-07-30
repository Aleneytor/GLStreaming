-- ----------------------------------------------------------------------------
-- 0056 — Eliminar la verificación de hogar de Netflix del alcance (revierte DEC-95)
-- ----------------------------------------------------------------------------
-- La regla "No perteneces a este hogar" se especificó (DEC-95) y su tabla se
-- creó en 0006, pero nunca se construyó UI ni lógica de servidor: quedó como una
-- tabla vacía sin uso. Al cerrar el MVP el usuario decidió sacarla del alcance.
--
-- No se reescribe 0006 (historial inmutable): se elimina aquí con una migración
-- nueva. El `cascade` retira de paso su política RLS (`verif_hogar_admin_all`) y
-- su índice (`idx_verif_unidad`). Las FKs de la tabla apuntaban HACIA
-- unidades_inventario/asignaciones_inventario/usuarios, así que dropearla no
-- toca datos de esas tablas. El traslado por falla de cuenta completa sigue
-- existiendo por su cuenta, no dependía de esta tabla.
-- ============================================================================

drop table if exists public.verificaciones_hogar_netflix cascade;
