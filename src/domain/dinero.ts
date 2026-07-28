/**
 * Fórmulas de dinero de GL Streaming (docs/01-alcance-y-reglas.md §9).
 *
 * Tres monedas:
 *   USD  = precio comercial que fija el administrador (congelado por operación).
 *   VES  = bolívares realmente cobrados al cliente (a tasa BCV).
 *   USDT = costos/gastos hacia proveedores (valorizados a tasa paralela).
 *
 * Convención interna: 1 USDT = 1 USD de referencia.
 * Los importes se guardan en `numeric` en Postgres; aquí se calculan como number
 * para la vista previa y el devengo. El redondeo comercial es a 2 decimales,
 * mitad hacia arriba (round half up).
 */

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Interpreta montos escritos como 13.00, 13,00, 2500.00 o 2.500,00. */
export function parsearMontoFormulario(valor: string): number {
  const limpio = valor.trim().replace(/\s/g, "");
  if (!limpio) return Number.NaN;

  const tieneComa = limpio.includes(",");
  const tienePunto = limpio.includes(".");
  let normalizado = limpio;

  if (tieneComa && tienePunto) {
    normalizado = limpio.lastIndexOf(",") > limpio.lastIndexOf(".")
      ? limpio.replace(/\./g, "").replace(",", ".")
      : limpio.replace(/,/g, "");
  } else if (tieneComa) {
    normalizado = limpio.replace(",", ".");
  } else if (tienePunto) {
    const decimales = limpio.length - limpio.lastIndexOf(".") - 1;
    normalizado = decimales === 3 ? limpio.replace(/\./g, "") : limpio;
  }

  return Number(normalizado);
}

function fechaAMillis(fecha: string): number {
  if (!RE_FECHA.test(fecha)) {
    throw new Error(`Fecha inválida (se espera YYYY-MM-DD): ${fecha}`);
  }
  const [y, m, d] = fecha.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * Redondeo a `decimales` posiciones, mitad hacia arriba (alejándose de cero).
 * Corrige la representación en punto flotante para que 1.005 -> 1.01.
 */
export function redondearMitadArriba(valor: number, decimales = 2): number {
  if (!Number.isFinite(valor)) throw new Error(`Valor no finito: ${valor}`);
  const factor = 10 ** decimales;
  const escalado = valor * factor;
  const redondeado = Math.sign(escalado) * Math.round(Math.abs(escalado) + 1e-6);
  return redondeado / factor;
}

/**
 * Monto en Bs que se espera cobrar al cliente:
 *   round_half_up(precio_comercial_usd * bcv, 2)
 * El cobro confirmado debe igualar exactamente este valor (no hay abonos).
 */
export function calcularMontoVesEsperado(precioComercialUsd: number, bcvBsPorUsd: number): number {
  if (precioComercialUsd < 0) throw new Error("El precio no puede ser negativo.");
  if (bcvBsPorUsd <= 0) throw new Error("La tasa BCV debe ser positiva.");
  return redondearMitadArriba(precioComercialUsd * bcvBsPorUsd, 2);
}

/** Lectura económica del cobro a tasa paralela: ves_cobrado / paralela. */
export function valorEconomicoUsdParalela(vesCobrado: number, paralelaBsPorUsd: number): number {
  if (paralelaBsPorUsd <= 0) throw new Error("La tasa paralela debe ser positiva.");
  return vesCobrado / paralelaBsPorUsd;
}

/** Lectura del cobro según BCV: ves_cobrado / bcv. */
export function valorSegunBcvUsd(vesCobrado: number, bcvBsPorUsd: number): number {
  if (bcvBsPorUsd <= 0) throw new Error("La tasa BCV debe ser positiva.");
  return vesCobrado / bcvBsPorUsd;
}

/** Días de un rango semiabierto [inicio, fin). */
export function diasEntre(inicio: string, fin: string): number {
  return (fechaAMillis(fin) - fechaAMillis(inicio)) / 86_400_000;
}

/**
 * Días de intersección entre dos rangos semiabiertos [inicio, fin).
 * Se usa para el prorrateo del cierre: intersección de un período con un mes.
 */
export function diasInterseccion(
  inicioA: string,
  finA: string,
  inicioB: string,
  finB: string,
): number {
  const inicio = Math.max(fechaAMillis(inicioA), fechaAMillis(inicioB));
  const fin = Math.min(fechaAMillis(finA), fechaAMillis(finB));
  const dias = (fin - inicio) / 86_400_000;
  return dias > 0 ? dias : 0;
}

/**
 * Devenga un monto por la fracción de días que caen dentro del mes:
 *   monto * dias_en_mes / dias_periodo
 */
export function prorratear(monto: number, diasEnMes: number, diasPeriodo: number): number {
  if (diasPeriodo <= 0) throw new Error("dias_periodo debe ser > 0.");
  return (monto * diasEnMes) / diasPeriodo;
}

/**
 * Costo diario por unidad vendible de un ciclo de proveedor:
 *   costo_ciclo / dias_ciclo / capacidad_vendible
 * Base para calcular el costo de la capacidad ociosa.
 */
export function costoDiarioPorUnidad(
  costoCiclo: number,
  diasCiclo: number,
  capacidadVendible: number,
): number {
  if (diasCiclo <= 0) throw new Error("dias_ciclo debe ser > 0.");
  if (capacidadVendible <= 0) throw new Error("capacidad_vendible debe ser > 0.");
  return costoCiclo / diasCiclo / capacidadVendible;
}
