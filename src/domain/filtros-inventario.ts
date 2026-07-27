export type FiltroOperativoInventario =
  | ""
  | "disponibles"
  | "proximas"
  | "hoy"
  | "vencidas"
  | "suspendida";

const FILTROS_VALIDOS = new Set<FiltroOperativoInventario>([
  "",
  "disponibles",
  "proximas",
  "hoy",
  "vencidas",
  "suspendida",
]);

export function normalizarFiltroInventario(
  valor: string | undefined,
): FiltroOperativoInventario {
  return FILTROS_VALIDOS.has((valor ?? "") as FiltroOperativoInventario)
    ? ((valor ?? "") as FiltroOperativoInventario)
    : "";
}

export function coincideFiltroInventario(
  fila: { suscripcionId?: string | null; dias: number | null },
  filtro: FiltroOperativoInventario,
  estadoCuenta: string,
): boolean {
  if (!filtro) return true;
  if (filtro === "suspendida") return estadoCuenta === "suspendida";
  if (filtro === "disponibles") {
    return estadoCuenta === "activa" && !fila.suscripcionId;
  }
  if (!fila.suscripcionId || fila.dias === null) return false;
  if (filtro === "proximas") return fila.dias >= 1 && fila.dias <= 5;
  if (filtro === "hoy") return fila.dias === 0;
  return fila.dias < 0;
}
