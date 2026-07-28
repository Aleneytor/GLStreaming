export type AsignacionParaResumen = {
  fin: string | null;
  alcance?: string | null;
  consume_capacidad?: boolean | null;
  capacidad_vendible_consumida_snapshot?: number | null;
};

/**
 * Capacidad/ocupación física de una cuenta para el tablero de Inventario.
 *
 * - Un recurso indivisible sin unidades sigue aportando un cupo vendible.
 * - Una venta completa consume su snapshot completo, no «una venta».
 * - El uso principal de Spotify no consume cupos de miembro.
 */
export function resumirCuentaInventario(
  cantidadUnidades: number,
  asignaciones: AsignacionParaResumen[],
): { capacidad: number; ocupados: number } {
  const capacidad = Math.max(cantidadUnidades, 1);
  const ocupadosSinLimite = asignaciones.reduce((total, asignacion) => {
    if (asignacion.fin !== null || asignacion.consume_capacidad === false) return total;
    const consumo =
      asignacion.capacidad_vendible_consumida_snapshot ??
      (asignacion.alcance === "cuenta" ? capacidad : 1);
    return total + Math.max(consumo, 0);
  }, 0);

  return { capacidad, ocupados: Math.min(ocupadosSinLimite, capacidad) };
}

