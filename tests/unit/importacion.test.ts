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
    expect(normalizarFecha("31/02/2026")).toBeNull();
    expect(normalizarFecha("hola")).toBeNull();
  });

  it("una celda vacía no es un error, es ausencia", () => {
    expect(normalizarFecha("")).toBeNull();
    expect(normalizarFecha("   ")).toBeNull();
  });
});

describe("normalizarMonto", () => {
  it("acepta montos en dólares con punto decimal y símbolo $", () => {
    expect(normalizarMonto("$ 5.50")).toBe(5.5);
    expect(normalizarMonto("4.00")).toBe(4);
    expect(normalizarMonto("2.50")).toBe(2.5);
  });

  it("acepta el formato venezolano con punto de miles", () => {
    expect(normalizarMonto("2.500,00")).toBe(2500);
    expect(normalizarMonto("1.234.567,89")).toBe(1234567.89);
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
    expect(restarUnMes("2026-03-31")).toBe("2026-02-28");
    expect(restarUnMes("2024-03-31")).toBe("2024-02-29");
  });

  it("cruza el cambio de año", () => {
    expect(restarUnMes("2026-01-15")).toBe("2025-12-15");
  });
});

describe("analizarFilas", () => {
  // correo·contraseña·perfil·pin·monto·inicio·vence·cliente·whatsapp·vendió·inversión·proveedor
  const fila = (...c: string[]) => c.join("\t");

  it("entiende una fila de perfil extra completa", () => {
    const r = analizarFilas(
      fila("net1@gmail.com", "clave123", "Ana", "1234", "5.00", "24/6/2026", "24/7/2026", "Ana Pérez", "04141234567", "Gabriel Nadales", "3.50", "@CapyVentas"),
      1,
    );
    expect(r.conError).toBe(0);
    expect(r.filas[0].datos).toMatchObject({
      correo: "net1@gmail.com",
      contrasena: "clave123",
      perfil: "Ana",
      pin: "1234",
      cliente: "Ana Pérez",
      vendio: "Gabriel Nadales",
      inicio: "2026-06-24",
      vence: "2026-07-24",
      monto: 5,
      inversion: 3.5,
      proveedor: "@CapyVentas",
    });
    expect(r.vendedores).toEqual(["Gabriel Nadales"]);
  });

  it("lee la inversión (costo) y el proveedor solo donde vienen", () => {
    // En una cuenta completa el costo va en la primera fila; las demás vacías.
    const texto = [
      fila("m@gls.org", "p", "P1", "", "2.50", "", "23/8/2026", "Ana", "", "", "3.50", "@CapyVentas"),
      fila("", "", "P2", "", "5.00", "", "9/8/2026", "Beto", "", "", "", ""),
    ].join("\n");
    const r = analizarFilas(texto, 5);
    expect(r.filas[0].datos.inversion).toBe(3.5);
    expect(r.filas[0].datos.proveedor).toBe("@CapyVentas");
    expect(r.filas[1].datos.inversion).toBeNull();
  });

  it("un costo ilegible avisa pero no bloquea la fila", () => {
    const r = analizarFilas(
      fila("m@gls.org", "p", "P1", "", "5", "", "23/8/2026", "Ana", "", "", "gratis", ""),
      5,
    );
    expect(r.conError).toBe(0);
    expect(r.filas[0].datos.inversion).toBeNull();
    expect(r.filas[0].avisos.join(" ")).toContain("Costo no entendido");
  });

  it("hereda la cuenta madre de la fila anterior (celdas combinadas)", () => {
    // Cuenta completa: correo y contraseña solo en la primera fila.
    const texto = [
      fila("madre@gls.org", "gls3030", "Maurifred", "7449", "2.50", "24/7/2026", "23/8/2026", "", "+58 412-4067449", "Gabriel Nadales"),
      fila("", "", "Nana", "3334", "5.00", "10/7/2026", "9/8/2026", "Nana", "", ""),
      fila("", "", "Norelys", "5555", "3.00", "27/6/2026", "27/7/2026", "", "", "Edgar Espinoza"),
    ].join("\n");
    const r = analizarFilas(texto, 5);

    expect(r.conError).toBe(0);
    expect(r.cuentas).toBe(1); // una sola cuenta madre
    expect(r.filas.map((f) => f.datos.correo)).toEqual([
      "madre@gls.org",
      "madre@gls.org",
      "madre@gls.org",
    ]);
    expect(r.filas.map((f) => f.datos.contrasena)).toEqual(["gls3030", "gls3030", "gls3030"]);
    expect(r.filas.map((f) => f.slot)).toEqual([1, 2, 3]);
    expect(r.filas[1].heredaCuenta).toBe(true);
  });

  it("toma el nombre del perfil como cliente cuando la columna Cliente está vacía", () => {
    // Maurifred: sin Cliente, pero con monto, teléfono y vendedor → está vendido.
    const r = analizarFilas(
      fila("m@gls.org", "p", "Maurifred", "7449", "2.50", "24/7/2026", "23/8/2026", "", "+58 412-4067449", "Gabriel Nadales"),
      5,
    );
    expect(r.conError).toBe(0);
    expect(r.filas[0].datos.cliente).toBe("Maurifred");
    expect(r.filas[0].avisos.join(" ")).toContain("tomado del perfil");
  });

  it("un perfil sin ninguna señal de venta se carga libre", () => {
    // Sin cliente, sin monto, sin teléfono, sin vendedor.
    const r = analizarFilas(fila("m@gls.org", "p", "Libre", "1234", "", "", "", "", "", ""), 5);
    expect(r.conError).toBe(0);
    expect(r.filas[0].datos.cliente).toBeNull();
  });

  it("el monto queda sin moneda: lo interpreta el importador", () => {
    // 2.50 se lee como 2.5 (dólares); la conversión a Bs se hace fuera.
    const r = analizarFilas(fila("m@gls.org", "p", "Ana", "", "2.50", "", "24/7/2026", "Ana", "", ""), 5);
    expect(r.filas[0].datos.monto).toBe(2.5);
  });

  it("agrupa por correo y cuenta las cuentas madre distintas", () => {
    const texto = [
      fila("a@gls.org", "c1", "P1", "", "5", "", "23/07/2026", "Ana", "", ""),
      fila("a@gls.org", "c1", "P2", "", "5", "", "23/07/2026", "Beto", "", ""),
      fila("b@gls.org", "c2", "P1", "", "5", "", "23/07/2026", "Caro", "", ""),
    ].join("\n");
    const r = analizarFilas(texto, 5);
    expect(r.cuentas).toBe(2);
    expect(r.filas.map((f) => f.slot)).toEqual([1, 2, 1]);
  });

  it("no deja meter más perfiles que la capacidad de la cuenta", () => {
    const texto = Array.from({ length: 6 }, (_, i) =>
      fila("a@gls.org", "c1", `P${i + 1}`, "", "5", "", "23/07/2026", `Cli ${i}`, "", ""),
    ).join("\n");
    const r = analizarFilas(texto, 5);
    expect(r.filas[4].errores).toHaveLength(0);
    expect(r.filas[5].errores[0]).toContain("máximo");
  });

  it("reúne los vendedores distintos que aparecen", () => {
    const texto = [
      fila("a@gls.org", "c", "P1", "", "5", "", "23/07/2026", "Ana", "", "Gabriel Nadales"),
      fila("b@gls.org", "c", "P1", "", "5", "", "23/07/2026", "Beto", "", "gabriel nadales"),
      fila("c@gls.org", "c", "P1", "", "5", "", "23/07/2026", "Caro", "", "Edgar Espinoza"),
    ].join("\n");
    const r = analizarFilas(texto, 1);
    // "Gabriel Nadales" y "gabriel nadales" son el mismo (sin distinguir mayúsculas).
    expect(r.vendedores).toHaveLength(2);
  });

  it("exige correo y contraseña en la primera fila", () => {
    const r = analizarFilas(fila("", "", "P1", "", "5", "", "23/07/2026", "Ana", "", ""), 5);
    expect(r.filas[0].errores.join(" ")).toContain("Falta el correo");
  });

  it("descarta la fila de cabecera si la pegan sin querer", () => {
    const texto = [
      fila("correo", "contraseña", "perfil", "pin", "monto", "inicio", "vence", "cliente", "whatsapp", "vendió"),
      fila("a@gls.org", "c1", "P1", "", "5", "", "23/07/2026", "Ana", "", ""),
    ].join("\n");
    expect(analizarFilas(texto, 5).filas).toHaveLength(1);
  });

  it("marca la fecha de vencimiento ilegible como error, no la adivina", () => {
    const r = analizarFilas(
      fila("a@gls.org", "c1", "P1", "", "5", "", "el martes", "Ana", "", ""),
      5,
    );
    expect(r.conError).toBe(1);
    expect(r.filas[0].errores[0]).toContain("vencimiento no entendida");
  });
});
