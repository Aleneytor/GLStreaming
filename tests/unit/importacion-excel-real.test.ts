import { describe, expect, it } from "vitest";
import { analizarFilas } from "@/domain/importacion";

// Datos reales del usuario: dos cuentas completas de Netflix pagadas con Amex,
// cada bloque con su fila de títulos y la columna N° al inicio.
const CAB =
  "N°\tCorreo\tContraseña\tPerfil\tPin\tIngresos\tInicio\tDias\tVence\tAlerta\tCliente\tN° Celular\tVendio\tInversion\tProveedor\tRenovar\tAviso\tN° Ctas";

const TEXTO = [
  CAB,
  "1\tall22@glcuenta.com\tgls9090\tYuli González\t1111\t $ 4,50 \t17/7/2026\t30\t16/8/2026\tFalta 23 días\tYuli González\t+58 426-7379475\t\t $ -   \tAmex 2003\t30/07/2026\tFalta 6 días\t1",
  "2\t\t\tAnivela Hernández\t7449\t $ 2,50 \t29/6/2026\t30\t29/7/2026\tFalta 5 días\t\t+58 412-4067449\tGabriel Nadales\t\t\t\t\t",
  "3\t\t\tCarlos Camacho\t7449\t $ 2,50 \t24/6/2026\t30\t24/7/2026\tVence hoy\t\t+58 412-4067449\tGabriel Nadales\t\t\t\t\t",
  "4\t\t\tRomán\t1111\t $ 3,00 \t10/7/2026\t30\t9/8/2026\tFalta 16 días\t\t+58 424-3621063\tRoman\t\t\t\t\t",
  "5\t\t\tMiguel Herrera\t7449\t $ 2,50 \t23/7/2026\t30\t22/8/2026\tFalta 29 días\t\t+58 412-4067449\tGabriel Nadales\t\t\t\t\t",
  CAB,
  "1\taleado@glcuenta.com\tgls2020\tNami\t1111\t $ 3,00 \t9/7/2026\t30\t8/8/2026\tFalta 15 días\t\t\tEder\t $ -   \tAmex 1007\t1/8/2026\tFalta 8 días\t1",
  "2\t\t\tAngel Manzon\t7449\t $ 2,50 \t24/6/2026\t30\t24/7/2026\tVence hoy\t\t+58 412-4067449\tGabriel Nadales\t\t\t\t\t",
  "3\t\t\tMalia\t4444\t $ 5,00 \t24/6/2026\t30\t24/7/2026\tVence hoy\tKristian Goncalvez\t+58 424-8881428\tGabriel Nadales\t\t\t\t\t",
  "4\t\t\tJanivit Marín\t7449\t $ 2,50 \t24/7/2026\t30\t23/8/2026\tFalta 30 días\t\t+58 412-4067449\tGabriel Nadales\t\t\t\t\t",
  "5\t\t\tMirna\t7449\t $ 2,50 \t29/6/2026\t30\t29/7/2026\tFalta 5 días\t\t+58 412-4067449\tGabriel Nadales\t\t\t\t\t",
].join("\n");

describe("Excel real con tarjeta anotada como «Amex 2003»", () => {
  const r = analizarFilas(TEXTO, 5);

  it("lee las 10 filas y 2 cuentas, sin errores", () => {
    expect(r.conError).toBe(0);
    expect(r.filas).toHaveLength(10);
    expect(r.cuentas).toBe(2);
  });

  it("cada bloque hereda su propia cuenta madre", () => {
    expect(r.filas.slice(0, 5).every((f) => f.datos.correo === "all22@glcuenta.com")).toBe(true);
    expect(r.filas.slice(5).every((f) => f.datos.correo === "aleado@glcuenta.com")).toBe(true);
    expect(r.filas.map((f) => f.slot)).toEqual([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
  });

  it("la tarjeta se conserva tal cual (no la toca el enmascarado)", () => {
    expect(r.filas[0].datos.proveedor).toBe("Amex 2003");
    expect(r.filas[5].datos.proveedor).toBe("Amex 1007");
    expect(r.filas.every((f) => !f.avisos.join(" ").includes("ocultó"))).toBe(true);
  });

  it("toma el cliente del perfil cuando la columna Cliente va vacía", () => {
    expect(r.filas[0].datos.cliente).toBe("Yuli González"); // venía escrito
    expect(r.filas[1].datos.cliente).toBe("Anivela Hernández"); // del perfil
    // Cuando la columna Cliente SÍ trae nombre, ese manda sobre el perfil.
    expect(r.filas[7].datos.cliente).toBe("Kristian Goncalvez");
  });

  it("lee montos, fechas, vendedores y la renovación del proveedor", () => {
    expect(r.filas[0].datos.monto).toBe(4.5);
    expect(r.filas[0].datos.vence).toBe("2026-08-16");
    expect(r.filas[0].datos.renovarProveedor).toBe("2026-07-30");
    expect(r.filas[0].datos.inversion).toBe(0); // «$ -»
    expect(r.vendedores.sort()).toEqual(["Eder", "Gabriel Nadales", "Roman"]);
  });
});
