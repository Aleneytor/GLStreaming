const NOMBRES_LEGADOS_CUENTA_COMPLETA = new Set([
  "cuenta completa",
  "completa",
]);

/**
 * Reconoce ventas completas importadas antes de que existiera
 * `asignaciones_inventario.alcance = 'cuenta'`.
 *
 * El formato legado guardó la asignación en la primera unidad. La comprobación
 * queda restringida a inventarios divisibles y a nombres exactos para no tomar
 * como cuenta completa un perfil o cliente cuyo nombre solo contenga esas
 * palabras.
 */
export function esCuentaCompletaLegada({
  tipoInventario,
  numeroSlot,
  nombreVisible,
}: {
  tipoInventario: string;
  numeroSlot: number;
  nombreVisible: string | null | undefined;
}): boolean {
  if (tipoInventario !== "cuenta_con_unidades" || numeroSlot !== 1) {
    return false;
  }

  return NOMBRES_LEGADOS_CUENTA_COMPLETA.has(
    nombreVisible?.trim().toLowerCase() ?? "",
  );
}
