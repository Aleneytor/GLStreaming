import { describe, expect, it } from "vitest";
import {
  analizarFilas,
  normalizarFecha,
  normalizarMonto,
  restarUnMes,
} from "@/domain/importacion";

describe("normalizarFecha", () => {
  it("entiende el orden venezolano día/mes/año", () => {
    expect(normalizarFecha("23/07/2026")).toBe("2026-07-23");
    expect(normalizarFecha("5-3-2026")).toBe("2026-03-05");
    expect(normalizarFecha("05.03.26")).toBe("2026-03-05");
  });

  it("acepta también el formato ISO", () => {
    expect(normalizarFecha("2026-07-23")).toBe("2026-07-23");
  });

  it("rechaza fechas que no existen", () => {
    // Sin esta comprobación, el 31 de febrero se convertiría en marzo en
    // silencio y el cliente quedaría con un vencimiento equivocado.
    expect(normalizarFecha("31/02/2026")).toBeNull();
    expect(normalizarFecha("hola")).toBeNull();
  });

  it("una celda vacía no es un error, es ausencia", () => {
    expect(normalizarFecha("")).toBeNull();
    expect(normalizarFecha("   ")).toBeNull();
  });
});

describe("normalizarMonto", () => {
  it("acepta el formato venezolano con punto de miles", () => {
    expect(normalizarMonto("2.500,00")).toBe(2500);
    expect(normalizarMonto("1.234.567,89")).toBe(1234567.89);
  });

  it("acepta el formato con punto decimal", () => {
    expect(normalizarMonto("2500.50")).toBe(2500.5);
    expect(normalizarMonto("2500")).toBe(2500);
  });

  it("ignora el símbolo Bs y los espacios", () => {
    expect(normalizarMonto(" Bs 2.500,00 ")).toBe(2500);
  });

  it("distingue vacío de inválido", () => {
    expect(normalizarMonto("")).toBeNull();
    expect(normalizarMonto("abc")).toBe("invalido");
    expect(normalizarMonto("-5")).toBe("invalido");
  });
});

describe("restarUnMes", () => {
  it("resta un mes calendario", () => {
    expect(restarUnMes("2026-07-23")).toBe("2026-06-23");
  });

  it("recorta al último día válido del mes destino", () => {
    // Un vencimiento el 31 de marzo empezó el 28 de febrero, no el 31.
    expect(restarUnMes("2026-03-31")).toBe("2026-02-28");
    expect(restarUnMes("2024-03-31")).toBe("2024-02-29");
  });

  it("cruza el cambio de año", () => {
    expect(restarUnMes("2026-01-15")).toBe("2025-12-15");
  });
});

describe("analizarFilas", () => {
  const fila = (...c: string[]) => c.join("\t");

  it("entiende una fila completa pegada desde Excel", () => {
    const r = analizarFilas(
      fila("net1@gmail.com", "clave123", "Ana", "1234", "Ana Pérez", "04141234567", "23/07/2026", "2.500,00"),
      5,
    );
    expect(r.filas).toHaveLength(1);
    expect(r.conError).toBe(0);
    expect(r.filas[0].datos).toMatchObject({
      correo: "net1@gmail.com",
      contrasena: "clave123",
      perfil: "Ana",
      pin: "1234",
      cliente: "Ana Pérez",
      vence: "2026-07-23",
      montoVes: 2500,
    });
  });

  it("agrupa por correo y numera los perfiles de cada cuenta", () => {
    const texto = [
      fila("net1@gmail.com", "c1", "P1", "", "Ana", "", "23/07/2026", "2500"),
      fila("net1@gmail.com", "c1", "P2", "", "Beto", "", "23/07/2026", "2500"),
      fila("net2@gmail.com", "c2", "P1", "", "Caro", "", "23/07/2026", "2500"),
    ].join("\n");
    const r = analizarFilas(texto, 5);

    expect(r.cuentas).toBe(2);
    expect(r.filas.map((f) => f.slot)).toEqual([1, 2, 1]);
  });

  it("no deja meter más perfiles que la capacidad de la cuenta", () => {
    const texto = Array.from({ length: 6 }, (_, i) =>
      fila("net1@gmail.com", "c1", `P${i + 1}`, "", `Cliente ${i}`, "", "23/07/2026", "2500"),
    ).join("\n");
    const r = analizarFilas(texto, 5);

    expect(r.filas[4].errores).toHaveLength(0);
    expect(r.filas[5].errores[0]).toContain("máximo");
    expect(r.conError).toBe(1);
  });

  it("un perfil sin cliente se carga como inventario libre", () => {
    const r = analizarFilas(fila("net1@gmail.com", "c1", "P3", "1234", "", "", "", ""), 5);
    expect(r.conError).toBe(0);
    expect(r.filas[0].datos.cliente).toBeNull();
    expect(r.filas[0].avisos).toHaveLength(0);
  });

  it("avisa (sin bloquear) cuando hay cliente pero falta el monto", () => {
    const r = analizarFilas(
      fila("net1@gmail.com", "c1", "P1", "", "Ana", "", "23/07/2026", ""),
      5,
    );
    expect(r.conError).toBe(0);
    expect(r.filas[0].avisos.join(" ")).toContain("Por cobrar");
  });

  it("exige correo y contraseña", () => {
    const r = analizarFilas(fila("", "", "P1", "", "Ana", "", "", ""), 5);
    expect(r.filas[0].errores).toContain("Falta el correo.");
    expect(r.filas[0].errores).toContain("Falta la contraseña.");
  });

  it("descarta la fila de cabecera si la pegan sin querer", () => {
    const texto = [
      fila("correo", "contraseña", "perfil", "pin", "cliente", "whatsapp", "vence", "bs"),
      fila("net1@gmail.com", "c1", "P1", "", "Ana", "", "23/07/2026", "2500"),
    ].join("\n");
    expect(analizarFilas(texto, 5).filas).toHaveLength(1);
  });

  it("ignora líneas en blanco entre bloques", () => {
    const texto = [
      fila("net1@gmail.com", "c1", "P1", "", "Ana", "", "23/07/2026", "2500"),
      "",
      "   ",
      fila("net2@gmail.com", "c2", "P1", "", "Beto", "", "23/07/2026", "2500"),
    ].join("\n");
    expect(analizarFilas(texto, 5).filas).toHaveLength(2);
  });

  it("marca la fecha ilegible como error, no la adivina", () => {
    const r = analizarFilas(
      fila("net1@gmail.com", "c1", "P1", "", "Ana", "", "el martes", "2500"),
      5,
    );
    expect(r.conError).toBe(1);
    expect(r.filas[0].errores[0]).toContain("Fecha no entendida");
  });
});
