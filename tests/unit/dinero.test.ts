import { describe, expect, it } from "vitest";
import {
  calcularMontoVesEsperado,
  costoDiarioPorUnidad,
  diasEntre,
  diasInterseccion,
  prorratear,
  parsearMontoFormulario,
  redondearMitadArriba,
  valorEconomicoUsdParalela,
  valorSegunBcvUsd,
} from "@/domain/dinero";

describe("parsearMontoFormulario", () => {
  it("conserva decimales con punto o coma", () => {
    expect(parsearMontoFormulario("13.00")).toBe(13);
    expect(parsearMontoFormulario("13,00")).toBe(13);
  });

  it("acepta miles en formato latino y decimal internacional", () => {
    expect(parsearMontoFormulario("2.500,00")).toBe(2500);
    expect(parsearMontoFormulario("2500.00")).toBe(2500);
    expect(parsearMontoFormulario("2.500")).toBe(2500);
  });
});

describe("redondearMitadArriba", () => {
  it("redondea a 2 decimales mitad hacia arriba (trampa de punto flotante)", () => {
    expect(redondearMitadArriba(1.005, 2)).toBe(1.01);
    expect(redondearMitadArriba(2.675, 2)).toBe(2.68);
  });
  it("no altera valores ya redondos", () => {
    expect(redondearMitadArriba(36.5, 2)).toBe(36.5);
    expect(redondearMitadArriba(100, 2)).toBe(100);
  });
  it("funciona con negativos (reversos)", () => {
    expect(redondearMitadArriba(-1.005, 2)).toBe(-1.01);
  });
});

describe("calcularMontoVesEsperado", () => {
  it("precio * bcv redondeado a 2 decimales", () => {
    expect(calcularMontoVesEsperado(1, 36.5)).toBe(36.5);
    expect(calcularMontoVesEsperado(2.5, 36.4567)).toBe(91.14);
  });
  it("rechaza tasa no positiva y precio negativo", () => {
    expect(() => calcularMontoVesEsperado(1, 0)).toThrow();
    expect(() => calcularMontoVesEsperado(-1, 36.5)).toThrow();
  });
});

describe("valorEconomicoUsdParalela", () => {
  it("ves cobrado / paralela", () => {
    expect(valorEconomicoUsdParalela(400, 40)).toBe(10);
  });
});

describe("prorrateo por intersección de días", () => {
  const inicio = "2026-07-22";
  const fin = "2026-08-22"; // fecha_renovacion; período semiabierto [22/07, 22/08)

  it("el período dura 31 días", () => {
    expect(diasEntre(inicio, fin)).toBe(31);
  });

  it("reparte 10 días a julio y 21 a agosto", () => {
    const julio = diasInterseccion(inicio, fin, "2026-07-01", "2026-08-01");
    const agosto = diasInterseccion(inicio, fin, "2026-08-01", "2026-09-01");
    expect(julio).toBe(10);
    expect(agosto).toBe(21);
    expect(julio + agosto).toBe(31);
  });

  it("prorratea un monto según los días del mes", () => {
    const dias = diasEntre(inicio, fin); // 31
    // Un precio de 310 se reparte 100 a julio (10/31) y 210 a agosto (21/31).
    expect(prorratear(310, 10, dias)).toBeCloseTo(100, 6);
    expect(prorratear(310, 21, dias)).toBeCloseTo(210, 6);
  });

  it("intersección nula si no hay solape", () => {
    expect(diasInterseccion(inicio, fin, "2026-09-01", "2026-10-01")).toBe(0);
  });
});

describe("costoDiarioPorUnidad", () => {
  it("costo del ciclo repartido entre días y capacidad vendible", () => {
    // Ciclo de 30 días, costo 30 USDT, 5 unidades vendibles -> 0.2 por unidad/día.
    expect(costoDiarioPorUnidad(30, 30, 5)).toBeCloseTo(0.2, 6);
  });
  it("rechaza divisores no positivos", () => {
    expect(() => costoDiarioPorUnidad(30, 0, 5)).toThrow();
    expect(() => costoDiarioPorUnidad(30, 30, 0)).toThrow();
  });
});

describe("parsearMontoFormulario (casos límite)", () => {
  it("un número simple sin separadores", () => {
    expect(parsearMontoFormulario("13")).toBe(13);
    expect(parsearMontoFormulario("0")).toBe(0);
  });

  it("una coma decimal queda como fracción", () => {
    expect(parsearMontoFormulario("0,5")).toBe(0.5);
  });

  it("mezcla miles y decimales en ambos formatos", () => {
    expect(parsearMontoFormulario("1.234,56")).toBe(1234.56);
    expect(parsearMontoFormulario("1,234.56")).toBe(1234.56);
  });

  it("una celda vacía o de solo espacios es ausencia (NaN)", () => {
    expect(parsearMontoFormulario("")).toBeNaN();
    expect(parsearMontoFormulario("   ")).toBeNaN();
  });
});

describe("redondearMitadArriba (casos límite)", () => {
  it("funciona con otras precisiones", () => {
    expect(redondearMitadArriba(1.5, 0)).toBe(2);
    expect(redondearMitadArriba(2.5, 0)).toBe(3);
    expect(redondearMitadArriba(2.25, 1)).toBe(2.3);
  });

  it("rechaza valores no finitos", () => {
    expect(() => redondearMitadArriba(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => redondearMitadArriba(Number.NaN)).toThrow();
  });
});

describe("calcularMontoVesEsperado (casos límite)", () => {
  it("un precio de cero devuelve cero sin importar la tasa", () => {
    expect(calcularMontoVesEsperado(0, 36.5)).toBe(0);
  });

  it("rechaza una tasa BCV negativa", () => {
    expect(() => calcularMontoVesEsperado(5, -36.5)).toThrow();
  });
});

describe("valorSegunBcvUsd", () => {
  it("lee el cobro a BCV: ves_cobrado / bcv", () => {
    expect(valorSegunBcvUsd(400, 40)).toBe(10);
  });

  it("rechaza una tasa BCV no positiva", () => {
    expect(() => valorSegunBcvUsd(400, 0)).toThrow();
    expect(() => valorSegunBcvUsd(400, -1)).toThrow();
  });
});

describe("fechas y prorrateo (casos límite)", () => {
  it("diasEntre rechaza un formato de fecha inválido", () => {
    expect(() => diasEntre("22/07/2026", "2026-08-22")).toThrow();
  });

  it("dos rangos que solo se tocan no se solapan (semiabiertos)", () => {
    expect(diasInterseccion("2026-07-22", "2026-08-22", "2026-08-22", "2026-09-01")).toBe(0);
  });

  it("prorratear rechaza un período de días no positivo", () => {
    expect(() => prorratear(100, 10, 0)).toThrow();
    expect(() => prorratear(100, 10, -5)).toThrow();
  });

  it("un monto cero prorratea a cero", () => {
    expect(prorratear(0, 10, 31)).toBe(0);
  });
});

describe("costoDiarioPorUnidad (casos límite)", () => {
  it("un costo cero cuesta cero por unidad", () => {
    expect(costoDiarioPorUnidad(0, 30, 5)).toBe(0);
  });

  it("una capacidad vendible de uno no cambia el costo diario", () => {
    expect(costoDiarioPorUnidad(30, 30, 1)).toBeCloseTo(1, 6);
  });
});
