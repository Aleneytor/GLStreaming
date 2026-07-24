import { describe, expect, it } from "vitest";
import { analizarFilas } from "@/domain/importacion";

/**
 * FlujoTV se identifica con USUARIO y contraseña (no con un correo), tiene 3
 * cupos por cuenta, y en el Excel cada cuenta va seguida de una fila de relleno
 * marcada «Vacío» (solo fórmulas de la hoja). Esa fila no es un cupo: si se
 * colara, heredaría la cuenta de arriba y desbordaría la capacidad.
 *
 * Ojo también: aquí el usuario/contraseña se REPITEN en cada fila (no son
 * celdas combinadas como en Netflix), y no hay columna Pin.
 */
const CAB =
  "N°\tCorreo\tContraseña\tPerfil\tIngresos\tInicio\tDias\tVence\tAlerta\tCliente\tN° Celular\tVendio\tInversion\tProveedor\tRenovacion\tAviso\tN° Ctas";

const TEXTO = [
  CAB,
  "3\tGLFlujo07\t121212a\tJavier Palencia\t $ 2,50 \t3/7/2026\t30\t2/8/2026\tFalta 9 días\tJavier Palencia\t+58 424-3621063\tRoman\t $ 2,50 \t+57 324 3017900\t22/8/2026\tFalta 29 días\t",
  "3\tGLFlujo07\t121212a\tPablo Estanga\t $ 3,50 \t12/7/2026\t30\t11/8/2026\tFalta 18 días\tPablo Estanga\t\t\t $ -   \t+57 324 3017900\t22/8/2026\tFalta 29 días\t",
  "3\tGLFlujo07\t121212a\tJesús\t $ 2,50 \t17/7/2026\t30\t16/8/2026\tFalta 23 días\tJesus\t+58 424-3621063\tRoman\t $ -   \t+57 324 3017900\t22/8/2026\tFalta 29 días\t",
  // Fila de relleno del Excel: sin usuario ni datos, solo fórmulas.
  "3\t\t\t\t\t\t30\t29/1/1900\tVacio\t\t\t\t\t\t\tVencido hace 46227 días\t",
  "3\tGLFlujo08\t252525\tQuijada M\t $ 3,50 \t20/6/2026\t30\t20/7/2026\tVencido hace 4 días\tOscar Quijada\t+58 416-0964035\t\t $ 2,50 \t+57 324 3017900\t22/8/2026\tFalta 29 días\t",
  "3\tGLFlujo08\t252525\tPatricia Rios\t $ 3,50 \t24/7/2026\t30\t23/8/2026\tFalta 30 días\tPatricia Rios\t+34 643 31 70 54\t\t $ -   \t+57 324 3017900\t22/8/2026\tFalta 29 días\t",
  "3\tGLFlujo08\t252525\tHenry Rojas\t $ 3,50 \t17/7/2026\t30\t16/8/2026\tFalta 23 días\tVane\t+34 623 36 59 64\t\t $ -   \t+57 324 3017900\t22/8/2026\tFalta 29 días\t",
  "3\t\t\t\t\t\t30\t29/1/1900\tVacio\t\t\t\t\t\t\tVencido hace 46227 días\t",
].join("\n");

describe("FlujoTV: usuario en vez de correo y filas «Vacío» de relleno", () => {
  const r = analizarFilas(TEXTO, 3); // capacidad 3 (la del catálogo)

  it("no da error: las filas de relleno no ocupan cupo", () => {
    expect(r.conError).toBe(0);
    expect(r.filas).toHaveLength(6); // 3 + 3, sin contar las dos «Vacío»
    expect(r.cuentas).toBe(2);
  });

  it("respeta los 3 cupos de cada cuenta", () => {
    expect(r.filas.map((f) => f.slot)).toEqual([1, 2, 3, 1, 2, 3]);
  });

  it("acepta un USUARIO como identificador de la cuenta", () => {
    expect(r.filas[0].datos.correo).toBe("GLFlujo07");
    expect(r.filas[3].datos.correo).toBe("GLFlujo08");
    expect(r.filas[0].datos.contrasena).toBe("121212a");
    // No se queja de que no sea un correo: hay plataformas con usuario.
    expect(r.filas.every((f) => !f.avisos.join(" ").includes("no parece"))).toBe(true);
  });

  it("lee el resto de columnas aunque no exista la de Pin", () => {
    expect(r.filas[0].datos.pin).toBeNull();
    expect(r.filas[0].datos.monto).toBe(2.5);
    expect(r.filas[0].datos.cliente).toBe("Javier Palencia");
    expect(r.filas[0].datos.vence).toBe("2026-08-02");
    expect(r.filas[0].datos.inversion).toBe(2.5);
    expect(r.filas[0].datos.renovarProveedor).toBe("2026-08-22");
    expect(r.vendedores).toEqual(["Roman"]);
  });

  it("el teléfono del proveedor no se confunde con una tarjeta", () => {
    // 12 dígitos: por debajo del umbral de un número de tarjeta.
    expect(r.filas[0].datos.proveedor).toBe("+57 324 3017900");
  });
});
