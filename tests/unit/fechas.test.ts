import { describe, expect, it } from "vitest";
import {
  avisoProveedor,
  badgeVencimiento,
  calcularFechaRenovacion,
  diasParaRenovar,
  planificarRenovacionCliente,
  proximaRenovacionProveedor,
  ultimoDiaDelMes,
} from "@/domain/fechas";

describe("calcularFechaRenovacion — mes calendario", () => {
  it("caso base: 22/07 + 1 mes -> 22/08", () => {
    expect(calcularFechaRenovacion("2026-07-22", 1)).toBe("2026-08-22");
  });

  it("ajusta al último día: 31/05 + 1 mes -> 30/06", () => {
    expect(calcularFechaRenovacion("2026-05-31", 1)).toBe("2026-06-30");
  });

  it("febrero no bisiesto: 31/01/2026 + 1 mes -> 28/02", () => {
    expect(calcularFechaRenovacion("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("febrero bisiesto: 31/01/2024 + 1 mes -> 29/02", () => {
    expect(calcularFechaRenovacion("2024-01-31", 1)).toBe("2024-02-29");
  });

  it("Spotify multimes: 22/07 + 3 meses -> 22/10 (un solo período)", () => {
    expect(calcularFechaRenovacion("2026-07-22", 3)).toBe("2026-10-22");
  });

  it("Spotify 6 y 12 meses", () => {
    expect(calcularFechaRenovacion("2026-07-22", 6)).toBe("2027-01-22");
    expect(calcularFechaRenovacion("2026-07-22", 12)).toBe("2027-07-22");
  });

  it("cruce de año: 15/12 + 1 mes -> 15/01 del año siguiente", () => {
    expect(calcularFechaRenovacion("2026-12-15", 1)).toBe("2027-01-15");
  });

  it("fin de mes + varios meses: 30/11 + 3 meses -> 28/02", () => {
    expect(calcularFechaRenovacion("2026-11-30", 3)).toBe("2027-02-28");
  });

  it("rechaza cantidad de períodos inválida", () => {
    expect(() => calcularFechaRenovacion("2026-07-22", 0)).toThrow();
  });
});

describe("ultimoDiaDelMes", () => {
  it("febrero según año", () => {
    expect(ultimoDiaDelMes(2026, 2)).toBe(28);
    expect(ultimoDiaDelMes(2024, 2)).toBe(29);
  });
  it("meses de 30 y 31", () => {
    expect(ultimoDiaDelMes(2026, 6)).toBe(30);
    expect(ultimoDiaDelMes(2026, 7)).toBe(31);
  });
});

describe("diasParaRenovar", () => {
  it("venta 22/07, renovación 22/08: vencida el 23/08", () => {
    const renov = calcularFechaRenovacion("2026-07-22", 1); // 2026-08-22
    expect(diasParaRenovar(renov, "2026-08-22")).toBe(0); // renueva hoy
    expect(diasParaRenovar(renov, "2026-08-23")).toBe(-1); // vencido hace 1 día
    expect(diasParaRenovar(renov, "2026-08-16")).toBe(6); // faltan 6
  });
});

describe("planificarRenovacionCliente", () => {
  it("encadena una renovación anticipada al vencimiento actual", () => {
    expect(planificarRenovacionCliente("2026-07-29", "2026-07-27")).toEqual({
      inicio: "2026-07-29",
      tardia: false,
    });
    expect(calcularFechaRenovacion("2026-07-29", 1)).toBe("2026-08-29");
  });

  it("permite renovar el mismo día sin marcarla tardía", () => {
    expect(planificarRenovacionCliente("2026-07-29", "2026-07-29")).toEqual({
      inicio: "2026-07-29",
      tardia: false,
    });
  });

  it("una renovación vencida comienza hoy y se marca tardía", () => {
    expect(planificarRenovacionCliente("2026-07-20", "2026-07-27")).toEqual({
      inicio: "2026-07-27",
      tardia: true,
    });
  });
});

describe("proximaRenovacionProveedor — el día ancla se recupera", () => {
  it("ancla 31: 31/01 -> 28/02 -> 31/03 (no se queda en 28)", () => {
    const feb = proximaRenovacionProveedor("2026-01-31", 31);
    expect(feb).toBe("2026-02-28");
    // Lo clave: desde febrero recupera el 31, no sigue en 28.
    expect(proximaRenovacionProveedor(feb, 31)).toBe("2026-03-31");
  });

  it("ancla 31 en año bisiesto ajusta a 29/02 y recupera", () => {
    const feb = proximaRenovacionProveedor("2024-01-31", 31);
    expect(feb).toBe("2024-02-29");
    expect(proximaRenovacionProveedor(feb, 31)).toBe("2024-03-31");
  });

  it("ancla 31 en mes de 30 días", () => {
    expect(proximaRenovacionProveedor("2026-03-31", 31)).toBe("2026-04-30");
    expect(proximaRenovacionProveedor("2026-04-30", 31)).toBe("2026-05-31");
  });

  it("ancla normal se mantiene", () => {
    expect(proximaRenovacionProveedor("2026-01-15", 15)).toBe("2026-02-15");
  });

  it("cruce de año", () => {
    expect(proximaRenovacionProveedor("2026-12-31", 31)).toBe("2027-01-31");
  });

  it("rechaza anclas inválidas", () => {
    expect(() => proximaRenovacionProveedor("2026-01-15", 0)).toThrow();
    expect(() => proximaRenovacionProveedor("2026-01-15", 32)).toThrow();
  });
});

describe("avisoProveedor — umbrales 6/5/0/-1", () => {
  it("6 días: aviso normal", () => {
    expect(avisoProveedor(6).nivel).toBe("ok");
  });
  it("5 días: entra en zona de aviso próximo", () => {
    expect(avisoProveedor(5).nivel).toBe("proximo");
    expect(avisoProveedor(1).nivel).toBe("proximo");
  });
  it("0 días: renueva hoy", () => {
    expect(avisoProveedor(0)).toEqual({ nivel: "hoy", etiqueta: "Renueva hoy" });
  });
  it("-1 día: vencido", () => {
    expect(avisoProveedor(-1)).toEqual({
      nivel: "vencido",
      etiqueta: "Vencido hace 1 días",
    });
  });
});

describe("badgeVencimiento — umbrales 6/5/0/-1", () => {
  it("verde cuando faltan más de 5 días", () => {
    expect(badgeVencimiento(6)).toEqual({ color: "verde", etiqueta: "Faltan 6 días" });
  });
  it("amarillo entre 1 y 5", () => {
    expect(badgeVencimiento(5).color).toBe("amarillo");
    expect(badgeVencimiento(1).color).toBe("amarillo");
  });
  it("amarillo el día de renovación", () => {
    expect(badgeVencimiento(0)).toEqual({
      color: "amarillo",
      etiqueta: "Renueva hoy · acceso todo el día",
    });
  });
  it("rojo cuando ya venció", () => {
    expect(badgeVencimiento(-1)).toEqual({ color: "rojo", etiqueta: "Vencido hace 1 días" });
  });
});
