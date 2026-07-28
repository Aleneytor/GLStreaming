export type ServicioConEstadoYVencimiento = {
  estado: string;
  dias: number | null;
};

/**
 * Separa el trabajo urgente de los servicios que el administrador pausó.
 * Una pausa conserva el cupo, pero deja de ser una alarma de renovación.
 */
export function clasificarServiciosOperativos<
  T extends ServicioConEstadoYVencimiento,
>(servicios: T[]) {
  const activos = servicios.filter((servicio) => servicio.estado === "activa");
  const pausados = servicios.filter((servicio) => servicio.estado === "pausada");

  return {
    vencidos: activos.filter((servicio) => (servicio.dias ?? 0) < 0),
    hoy: activos.filter((servicio) => servicio.dias === 0),
    proximos: activos.filter(
      (servicio) => (servicio.dias ?? 0) > 0 && (servicio.dias ?? 0) <= 5,
    ),
    resto: activos.filter((servicio) => (servicio.dias ?? 0) > 5),
    pausados,
  };
}
