/**
 * Validación de tasas de cambio.
 *
 * Estas comprobaciones son la defensa de GL Streaming frente a un dato malo de
 * la fuente. Importan especialmente porque una operación CONGELA la tasa para
 * siempre: si entra un valor manipulado o erróneo, queda grabado en el
 * historial financiero y ya no se puede recalcular (docs/01-alcance-y-reglas.md).
 *
 * Contexto (DEC-98): el usuario decidió no rotar el secreto expuesto del
 * proyecto que publica la tasa paralela. Como no se puede confiar plenamente en
 * que nadie escriba ahí, se valida en este lado.
 */

/** Desviación máxima aceptada frente a la última tasa conocida. */
export const DESVIACION_MAXIMA = 0.5; // 50%

/** A partir de aquí se advierte al usuario de que la tasa está vieja. */
export const MINUTOS_ADVERTENCIA = 30;
/** A partir de aquí se considera inservible para confirmar una operación. */
export const MINUTOS_BLOQUEO = 24 * 60;

export type ResultadoValidacion =
  | { valida: true; advertencia?: string }
  | { valida: false; motivo: string };

/**
 * Comprueba que un valor de tasa sea utilizable.
 * `ultimaConocida` permite detectar saltos absurdos (dato corrupto o inyectado).
 */
export function validarValorTasa(
  bsPorUsd: unknown,
  ultimaConocida?: number | null,
): ResultadoValidacion {
  if (typeof bsPorUsd !== "number" || !Number.isFinite(bsPorUsd)) {
    return { valida: false, motivo: "La tasa no es un número válido." };
  }
  if (bsPorUsd <= 0) {
    return { valida: false, motivo: "La tasa debe ser mayor que cero." };
  }

  if (ultimaConocida && ultimaConocida > 0) {
    const desviacion = Math.abs(bsPorUsd - ultimaConocida) / ultimaConocida;
    if (desviacion > DESVIACION_MAXIMA) {
      return {
        valida: false,
        motivo:
          `La tasa (${bsPorUsd}) se desvía un ${Math.round(desviacion * 100)}% ` +
          `de la última conocida (${ultimaConocida}). Se rechaza por seguridad.`,
      };
    }
  }

  return { valida: true };
}

/** Minutos transcurridos desde una observación. */
export function antiguedadEnMinutos(observadaAt: string | Date, ahora = new Date()): number {
  const t = observadaAt instanceof Date ? observadaAt : new Date(observadaAt);
  if (Number.isNaN(t.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((ahora.getTime() - t.getTime()) / 60_000));
}

export type EstadoFrescura = {
  nivel: "fresca" | "vieja" | "inservible";
  minutos: number;
  etiqueta: string;
};

/** Clasifica la frescura de una tasa para mostrarla y decidir si bloquea. */
export function evaluarFrescura(
  observadaAt: string | Date,
  ahora = new Date(),
): EstadoFrescura {
  const minutos = antiguedadEnMinutos(observadaAt, ahora);

  if (minutos >= MINUTOS_BLOQUEO) {
    return {
      nivel: "inservible",
      minutos,
      etiqueta: `Sin actualizar desde hace ${Math.floor(minutos / 60)} h`,
    };
  }
  if (minutos >= MINUTOS_ADVERTENCIA) {
    return { nivel: "vieja", minutos, etiqueta: `Hace ${minutos} min` };
  }
  return {
    nivel: "fresca",
    minutos,
    etiqueta: minutos <= 1 ? "Ahora mismo" : `Hace ${minutos} min`,
  };
}

/** Valida la fecha de vigencia que publica la fuente BCV. */
export function validarFechaVigencia(fecha: unknown): ResultadoValidacion {
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    // La fuente BCV sustituye la fecha oficial por la del día si no la
    // encuentra; sin fecha válida no se acepta la publicación.
    return { valida: false, motivo: "La fuente no entregó una fecha de vigencia válida." };
  }
  const t = new Date(`${fecha}T00:00:00Z`).getTime();
  if (Number.isNaN(t)) {
    return { valida: false, motivo: `Fecha de vigencia inválida: ${fecha}` };
  }
  return { valida: true };
}
