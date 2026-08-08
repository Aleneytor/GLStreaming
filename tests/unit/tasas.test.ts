import { describe, expect, it } from "vitest";
import {
  antiguedadEnMinutos,
  confirmadaAt,
  evaluarFrescura,
  validarFechaVigencia,
  validarValorTasa,
} from "@/domain/tasas";

describe("validarValorTasa", () => {
  it("acepta un valor razonable", () => {
    expect(validarValorTasa(36.5).valida).toBe(true);
  });

  it("rechaza lo que no es número, cero o negativo", () => {
    expect(validarValorTasa("36.5").valida).toBe(false);
    expect(validarValorTasa(null).valida).toBe(false);
    expect(validarValorTasa(0).valida).toBe(false);
    expect(validarValorTasa(-1).valida).toBe(false);
    expect(validarValorTasa(Number.NaN).valida).toBe(false);
  });

  it("acepta una variación normal frente a la última conocida", () => {
    // De 40 a 42 es un 5%: movimiento cotidiano.
    expect(validarValorTasa(42, 40).valida).toBe(true);
  });

  it("RECHAZA un salto absurdo (dato corrupto o inyectado)", () => {
    // Alguien escribe 400 donde debería haber ~40.
    const r = validarValorTasa(400, 40);
    expect(r.valida).toBe(false);
    if (!r.valida) expect(r.motivo).toContain("se desvía");
  });

  it("rechaza también un desplome absurdo", () => {
    expect(validarValorTasa(1, 40).valida).toBe(false);
  });

  it("sin referencia previa, acepta cualquier valor positivo", () => {
    expect(validarValorTasa(400, null).valida).toBe(true);
  });
});

describe("frescura de la tasa", () => {
  const ahora = new Date("2026-07-23T12:00:00Z");

  it("mide la antigüedad en minutos", () => {
    expect(antiguedadEnMinutos("2026-07-23T11:30:00Z", ahora)).toBe(30);
  });

  it("recién obtenida es fresca", () => {
    expect(evaluarFrescura("2026-07-23T11:59:00Z", ahora).nivel).toBe("fresca");
  });

  it("pasado el umbral, advierte", () => {
    expect(evaluarFrescura("2026-07-23T11:20:00Z", ahora).nivel).toBe("vieja");
  });

  it("más de un día, inservible para confirmar operaciones", () => {
    expect(evaluarFrescura("2026-07-22T10:00:00Z", ahora).nivel).toBe("inservible");
  });

  it("una fecha inválida se trata como inservible", () => {
    expect(evaluarFrescura("no-es-fecha", ahora).nivel).toBe("inservible");
  });
});

describe("validarFechaVigencia (BCV)", () => {
  it("acepta una fecha con formato correcto", () => {
    expect(validarFechaVigencia("2026-07-23").valida).toBe(true);
  });

  it("rechaza que falte la fecha", () => {
    // La fuente sustituye la fecha oficial por la del día si no la encuentra;
    // sin fecha válida no se acepta la publicación.
    expect(validarFechaVigencia(undefined).valida).toBe(false);
    expect(validarFechaVigencia("").valida).toBe(false);
    expect(validarFechaVigencia("23/07/2026").valida).toBe(false);
  });
});

describe("confirmadaAt", () => {
  // La BCV publica de lunes a viernes: el domingo su observación es
  // legítimamente de hace dos días. Lo que decide si la tasa sirve es cuándo
  // confirmamos por última vez que seguía siendo la más reciente.
  it("prefiere la revalidación sobre la fecha de obtención", () => {
    expect(
      confirmadaAt({ obtenida_at: "2026-07-17T21:00:00Z", revalidada_at: "2026-07-20T13:00:00Z" }),
    ).toBe("2026-07-20T13:00:00Z");
  });

  it("cae a la fecha de obtención cuando nunca se revalidó", () => {
    expect(confirmadaAt({ obtenida_at: "2026-07-17T21:00:00Z", revalidada_at: null })).toBe(
      "2026-07-17T21:00:00Z",
    );
    expect(confirmadaAt({ obtenida_at: "2026-07-17T21:00:00Z" })).toBe("2026-07-17T21:00:00Z");
  });

  it("una tasa del viernes revalidada hoy sigue siendo utilizable", () => {
    const ahora = new Date("2026-07-20T14:00:00Z");
    const tasa = { obtenida_at: "2026-07-17T21:00:00Z", revalidada_at: "2026-07-20T13:30:00Z" };
    expect(evaluarFrescura(confirmadaAt(tasa), ahora).nivel).not.toBe("inservible");
    // Sin la revalidación, la misma tasa quedaría bloqueada.
    expect(evaluarFrescura(tasa.obtenida_at, ahora).nivel).toBe("inservible");
  });
});

describe("validarValorTasa (límites de desviación)", () => {
  it("una desviación exacta del 50% todavía se acepta", () => {
    // DESVIACION_MAXIMA = 0.5 y la regla es `>` (no `>=`): 40 -> 60 es justo el borde.
    expect(validarValorTasa(60, 40).valida).toBe(true);
  });

  it("una desviación superior al 50% se rechaza", () => {
    expect(validarValorTasa(60.1, 40).valida).toBe(false);
    expect(validarValorTasa(19.9, 40).valida).toBe(false);
  });
});

describe("antiguedadEnMinutos (casos límite)", () => {
  const ahora = new Date("2026-07-23T12:00:00Z");

  it("acepta una instancia Date", () => {
    expect(antiguedadEnMinutos(new Date("2026-07-23T11:30:00Z"), ahora)).toBe(30);
  });

  it("una observación futura no da antigüedad negativa", () => {
    expect(antiguedadEnMinutos("2026-07-23T12:30:00Z", ahora)).toBe(0);
  });

  it("una fecha ilegible se trata como infinitamente vieja", () => {
    expect(antiguedadEnMinutos("no-es-fecha", ahora)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("evaluarFrescura (umbrales exactos y etiquetas)", () => {
  const ahora = new Date("2026-07-23T12:00:00Z");

  it("a los 30 minutos exactos pasa a «vieja»", () => {
    const r = evaluarFrescura("2026-07-23T11:30:00Z", ahora);
    expect(r.nivel).toBe("vieja");
    expect(r.etiqueta).toContain("30 min");
  });

  it("a las 24 horas exactas pasa a «inservible»", () => {
    const r = evaluarFrescura("2026-07-22T12:00:00Z", ahora);
    expect(r.nivel).toBe("inservible");
    expect(r.etiqueta).toContain("24 h");
  });

  it("recién obtenida dice «Ahora mismo»", () => {
    expect(evaluarFrescura("2026-07-23T11:59:59Z", ahora).etiqueta).toBe("Ahora mismo");
  });
});

describe("validarFechaVigencia (calendario)", () => {
  it("rechaza fechas que no existen en el calendario", () => {
    expect(validarFechaVigencia("2026-13-45").valida).toBe(false);
    expect(validarFechaVigencia("2026-02-30").valida).toBe(false);
  });
});
