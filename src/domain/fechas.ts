/**
 * Lógica de fechas comerciales de GL Streaming.
 *
 * Regla central (docs/01-alcance-y-reglas.md): los servicios se venden por
 * MES CALENDARIO, no por bloques de 30 días. La fecha de renovación es el mismo
 * día del mes, N meses después; si el mes destino no tiene ese día, se usa el
 * último día válido de ese mes.
 *
 * Ejemplos confirmados:
 *   22/07 + 1 mes  -> 22/08
 *   31/05 + 1 mes  -> 30/06  (junio no tiene 31)
 *   31/01 + 1 mes  -> 28/02  (2026 no bisiesto)
 *   31/01 + 1 mes  -> 29/02  (2024 bisiesto)
 *   22/07 + 3 meses-> 22/10  (Spotify 3/6/12 meses = un solo período)
 *
 * Todas las fechas son "date" (sin hora). Se trabajan como cadenas
 * "YYYY-MM-DD" para evitar cualquier corrimiento por zona horaria.
 */

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function parseFecha(fecha: string): { y: number; m: number; d: number } {
  if (!RE_FECHA.test(fecha)) {
    throw new Error(`Fecha inválida (se espera YYYY-MM-DD): ${fecha}`);
  }
  const [y, m, d] = fecha.split("-").map(Number);
  return { y, m, d };
}

/** Último día (28-31) del mes dado (mes 1-12). */
export function ultimoDiaDelMes(anio: number, mes: number): number {
  // Día 0 del mes siguiente = último día del mes actual. Uso UTC para leer
  // las partes sin que la zona horaria local altere el resultado.
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/**
 * Fecha de renovación = inicio + `cantidadPeriodos` meses calendario,
 * ajustando al último día válido del mes destino.
 */
export function calcularFechaRenovacion(inicio: string, cantidadPeriodos = 1): string {
  if (!Number.isInteger(cantidadPeriodos) || cantidadPeriodos < 1) {
    throw new Error(`cantidadPeriodos debe ser un entero >= 1: ${cantidadPeriodos}`);
  }
  const { y, m, d } = parseFecha(inicio);

  // Índice de mes 0-based acumulado.
  const totalMeses = m - 1 + cantidadPeriodos;
  const anioDestino = y + Math.floor(totalMeses / 12);
  const mesDestino = (totalMeses % 12) + 1; // volver a 1-based

  const dia = Math.min(d, ultimoDiaDelMes(anioDestino, mesDestino));
  return `${anioDestino}-${pad2(mesDestino)}-${pad2(dia)}`;
}

/**
 * Días hasta la fecha de renovación desde `hoy` (ambas "YYYY-MM-DD").
 *   > 0  faltan días
 *   = 0  renueva hoy (el cliente puede usar/pagar todo el día)
 *   < 0  vencido hace |n| días (NO implica corte automático)
 */
export function diasParaRenovar(fechaRenovacion: string, hoy: string): number {
  const a = parseFecha(fechaRenovacion);
  const b = parseFecha(hoy);
  const msRenov = Date.UTC(a.y, a.m - 1, a.d);
  const msHoy = Date.UTC(b.y, b.m - 1, b.d);
  return Math.round((msRenov - msHoy) / 86_400_000);
}

/**
 * Decide desde cuándo comienza el período nuevo.
 * - Anticipada o el mismo día: se encadena al fin actual para no solapar ni
 *   regalar/quitar días.
 * - Ya vencida: comienza hoy y se registra como renovación tardía.
 */
export function planificarRenovacionCliente(
  fechaRenovacionActual: string | null,
  hoy: string,
): { inicio: string; tardia: boolean } {
  parseFecha(hoy);
  if (!fechaRenovacionActual) return { inicio: hoy, tardia: false };
  parseFecha(fechaRenovacionActual);
  return fechaRenovacionActual < hoy
    ? { inicio: hoy, tardia: true }
    : { inicio: fechaRenovacionActual, tardia: false };
}

/**
 * Próxima renovación con el PROVEEDOR.
 *
 * A diferencia del cliente (fecha flexible que se recalcula desde el pago real),
 * el proveedor tiene un DÍA ANCLA FIJO que se conserva: si el mes destino no
 * tiene ese día se usa el último válido, pero el ancla NO se pierde y se
 * recupera en el siguiente mes que sí lo tenga.
 *
 *   ancla 31: 31/01 -> 28/02 -> 31/03  (no se queda en 28)
 */
export function proximaRenovacionProveedor(
  renovacionActual: string,
  diaAncla: number,
): string {
  if (!Number.isInteger(diaAncla) || diaAncla < 1 || diaAncla > 31) {
    throw new Error(`Día ancla inválido (1-31): ${diaAncla}`);
  }
  const { y, m } = parseFecha(renovacionActual);

  const totalMeses = m - 1 + 1; // mes siguiente, base 0
  const anioDestino = y + Math.floor(totalMeses / 12);
  const mesDestino = (totalMeses % 12) + 1;

  // El ancla manda; solo se recorta si el mes no llega a ese día.
  const dia = Math.min(diaAncla, ultimoDiaDelMes(anioDestino, mesDestino));
  return `${anioDestino}-${pad2(mesDestino)}-${pad2(dia)}`;
}

export type AvisoProveedor = {
  nivel: "ok" | "proximo" | "hoy" | "vencido";
  etiqueta: string;
};

/**
 * Aviso de renovación del proveedor según los días restantes.
 * Umbrales confirmados en el roadmap (Fase 2): 6, 5, 0 y -1.
 * Es una obligación fija: no hay cortesía como con el cliente.
 */
export function avisoProveedor(dias: number): AvisoProveedor {
  if (dias > 5) return { nivel: "ok", etiqueta: `Renueva en ${dias} días` };
  if (dias >= 1) return { nivel: "proximo", etiqueta: `Renueva en ${dias} días` };
  if (dias === 0) return { nivel: "hoy", etiqueta: "Renueva hoy" };
  return { nivel: "vencido", etiqueta: `Vencido hace ${Math.abs(dias)} días` };
}

export type BadgeVencimiento =
  | { color: "verde"; etiqueta: string }
  | { color: "amarillo"; etiqueta: string }
  | { color: "rojo"; etiqueta: string };

/**
 * Etiqueta y color del badge de vencimiento según los días restantes.
 * Umbrales confirmados (docs/01-alcance-y-reglas.md):
 *   > 5   verde    "Faltan X días"
 *   1..5  amarillo "Renueva en X días"
 *   = 0   amarillo "Renueva hoy · acceso todo el día"
 *   < 0   rojo     "Vencido hace X días"
 */
export function badgeVencimiento(dias: number): BadgeVencimiento {
  if (dias > 5) return { color: "verde", etiqueta: `Faltan ${dias} días` };
  if (dias >= 1) return { color: "amarillo", etiqueta: `Renueva en ${dias} días` };
  if (dias === 0) return { color: "amarillo", etiqueta: "Renueva hoy · acceso todo el día" };
  return { color: "rojo", etiqueta: `Vencido hace ${Math.abs(dias)} días` };
}
