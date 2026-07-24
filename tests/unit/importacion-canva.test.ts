import { describe, expect, it } from "vitest";
import { analizarFilas, modoDeProducto } from "@/domain/importacion";

/**
 * Canva es un PANEL educativo con 500 asientos, y su hoja tiene otra forma:
 *   - la PRIMERA fila es la cuenta del panel, con «correo:contraseña» juntos
 *     en una sola celda (esa hoja no tiene columna Contraseña);
 *   - todas las de abajo son CLIENTES: el correo de cada fila es el que se
 *     invitó al panel, no otra cuenta.
 */
const CAB =
  "Correo\tIngresos\tInicio\tDias\tVence\tAlerta\tCliente\tN° Celular\tVendio\tInversion\tProveedor\tN° Ctas";

const TEXTO = [
  CAB,
  // Fila del panel: correo y clave juntos, con su costo y proveedor.
  "camiloyutsuo@gmail.com:Cuenta123+\t $ -   \t23/3/2025\t365\t23/3/2026\tVencido hace 123 días\t\t\t\t $ 3,00 \t@coatie19\t1",
  // Clientes invitados al panel.
  "paolavalentinacruzmer@gmail.com\t $ 1,00 \t19/7/2026\t30\t18/8/2026\tFalta 25 días\t\t+58 424-3017557\tPaola Cruz\t\t\t",
  "Pedrolegariabarquisimeto@esclavasdecristorey.com\t $ 1,00 \t9/8/2026\t30\t8/9/2026\tFalta 46 días\tLuis Pacheco\t+58 424-5418417\t\t\t\t",
  "navasdemarin24@gmail.com\t $ 3,00 \t7/1/2027\t30\t6/2/2027\tFalta 197 días\t\t+58 424-3556479\tYuselyn\t\t\t",
  "roxirn97@gmail.com\t $ 1,00 \t9/1/2026\t365\t9/1/2027\tFalta 169 días\tRoximar\t\t\t\t\t",
  // Filas en blanco de la hoja (asientos aun libres).
  "\t\t\t30\t29/1/1900\tVacio\t\t\t\t\t\t",
  "\t\t\t30\t29/1/1900\tVacio\t\t\t\t\t\t",
  "cesarjhocel@gmail.com\t $ 1,00 \t4/8/2026\t30\t3/9/2026\tFalta 41 días\tCesar Reina\t+58 424-1618558\t\t\t\t",
].join("\n");

describe("Canva: un panel y sus asientos invitados", () => {
  it("el producto canva usa la hoja tipo panel", () => {
    expect(modoDeProducto("canva")).toBe("panel");
    expect(modoDeProducto("netflix")).toBe("estandar");
  });

  const r = analizarFilas(TEXTO, 500, "panel");

  it("lee el panel y sus clientes sin errores, como UNA sola cuenta", () => {
    expect(r.conError).toBe(0);
    expect(r.cuentas).toBe(1);
    expect(r.filas).toHaveLength(6); // 1 panel + 5 clientes (las «Vacío» fuera)
  });

  it("parte «correo:contraseña» de la celda del panel", () => {
    expect(r.filas[0].datos.correo).toBe("camiloyutsuo@gmail.com");
    expect(r.filas[0].datos.contrasena).toBe("Cuenta123+");
    expect(r.filas[0].datos.cliente).toBeNull(); // el panel no es una venta
  });

  it("la fila del panel NO ocupa asiento: el primer cliente es el 1", () => {
    expect(r.filas.map((f) => f.slot)).toEqual([1, 1, 2, 3, 4, 5]);
  });

  it("cada cliente hereda el panel y su correo queda como el asiento", () => {
    expect(r.filas.slice(1).every((f) => f.datos.correo === "camiloyutsuo@gmail.com")).toBe(true);
    expect(r.filas.slice(1).every((f) => f.datos.contrasena === "Cuenta123+")).toBe(true);
    expect(r.filas[1].datos.perfil).toBe("paolavalentinacruzmer@gmail.com");
    expect(r.filas[2].datos.perfil).toBe("Pedrolegariabarquisimeto@esclavasdecristorey.com");
  });

  it("sin nombre, el cliente es su propio correo; con nombre, manda el nombre", () => {
    expect(r.filas[1].datos.cliente).toBe("paolavalentinacruzmer@gmail.com");
    expect(r.filas[2].datos.cliente).toBe("Luis Pacheco");
    expect(r.filas[5].datos.cliente).toBe("Cesar Reina");
  });

  it("el costo y el proveedor del panel salen de su propia fila", () => {
    expect(r.filas[0].datos.inversion).toBe(3);
    expect(r.filas[0].datos.proveedor).toBe("@coatie19");
    // En el panel, «Vence» es cuándo toca renovarlo con el proveedor (es anual).
    expect(r.filas[0].datos.renovarProveedor).toBe("2026-03-23");
  });

  it("lee montos, fechas y vendedores de los clientes", () => {
    expect(r.filas[1].datos.monto).toBe(1);
    expect(r.filas[1].datos.vence).toBe("2026-08-18");
    expect(r.filas[3].datos.monto).toBe(3);
    expect(r.vendedores.sort()).toEqual(["Paola Cruz", "Yuselyn"]);
  });
});
