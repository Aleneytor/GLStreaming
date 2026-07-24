import { describe, expect, it } from "vitest";
import { analizarFilas } from "@/domain/importacion";

/**
 * Familia de Spotify real: la madre da el Premium y cada miembro entra con SU
 * propio login («Correo Cliente» / «Clave Cliente»). No hay columna Perfil.
 *
 * Casos que trae esta familia:
 *   - Miembros con nombre de cliente escrito.
 *   - Un miembro SIN nombre (fila 4): el revendedor solo pasó correo y clave,
 *     así que el cliente queda identificado por su propio correo.
 *   - El Gmail pagador metido dentro de la celda de proveedor.
 */
const CAB =
  "N°\tCorreo\tContraseña\tCorreo Cliente\tClave Cliente\tIngresos\tInicio\tDias\tVence\tAlerta\tCliente\tN° Celular\tVendio\tInversion\tProveedor\tRenovar\tAviso\tN° Ctas";

const TEXTO = [
  CAB,
  "1\tcolmena57juarez@gmail.com\tmusica1234\tspotify306@glstreaming.org\tpremium2026\t $ 2,50 \t19/6/2026\t90\t17/9/2026\tFalta 55 días\tKarlianys Perez\t\t\t $ -   \ttg\t22/8/2026\tFalta 29 días\t1",
  "2\t\t\tspotify089@glstreaming.org\tpremium2026\t $ 2,00 \t16/7/2026\t30\t15/8/2026\tFalta 22 días\tMaria Centeno\t+58 424-3482990\t\t\t\t\t\t",
  "3\t\t\tDavidalejandropea75@gmail.com\t28356416Anto\t $ 3,00 \t24/6/2026\t90\t22/9/2026\tFalta 60 días\tDavid Peña\t+58 424-3009949\t\t\t\t\t\t",
  // Fila 4: venta de un revendedor, SIN nombre de cliente.
  "4\t\t\tguerrakatherine504@gmail.com\t31714135may\t $ 3,00 \t19/7/2026\t30\t18/8/2026\tFalta 25 días\t\t+58 412-1895049\tNubeDigital\t\t\t\t\t",
  "5\t\t\tspotify295@glstreaming.org\tspotify123*\t $ 2,00 \t15/7/2026\t30\t14/8/2026\tFalta 21 días\tGaled Salek\t+58 412-4067449\tGabriel Nadales\t\t\t\t\t",
].join("\n");

describe("Familia de Spotify: miembros con su propio login", () => {
  const r = analizarFilas(TEXTO, 5);

  it("no da error, ni siquiera la fila sin nombre de cliente", () => {
    expect(r.conError).toBe(0);
    expect(r.filas).toHaveLength(5);
    expect(r.cuentas).toBe(1); // una sola familia
  });

  it("todas las filas cuelgan de la misma cuenta madre", () => {
    expect(r.filas.every((f) => f.datos.correo === "colmena57juarez@gmail.com")).toBe(true);
    expect(r.filas.every((f) => f.datos.contrasena === "musica1234")).toBe(true);
    expect(r.filas.map((f) => f.slot)).toEqual([1, 2, 3, 4, 5]);
  });

  it("cada miembro trae SU propio login, distinto del de la madre", () => {
    expect(r.filas[0].datos.correoCliente).toBe("spotify306@glstreaming.org");
    expect(r.filas[0].datos.claveCliente).toBe("premium2026");
    expect(r.filas[3].datos.correoCliente).toBe("guerrakatherine504@gmail.com");
    expect(r.filas[3].datos.claveCliente).toBe("31714135may");
  });

  it("sin nombre de cliente, lo identifica por su propio correo", () => {
    // El revendedor solo pasó correo y clave: el correo ES el cliente.
    expect(r.filas[3].datos.cliente).toBe("guerrakatherine504@gmail.com");
    expect(r.filas[3].datos.vendio).toBe("NubeDigital");
    expect(r.filas[3].avisos.join(" ")).toContain("identificado por su correo");
  });

  it("respeta el nombre cuando sí viene escrito", () => {
    expect(r.filas[0].datos.cliente).toBe("Karlianys Perez");
    expect(r.filas[4].datos.cliente).toBe("Galed Salek");
  });

  it("no confunde «Clave Cliente» con el nombre del cliente", () => {
    // «Clave Cliente» contiene la palabra «cliente»: si se resolviera con las
    // columnas genéricas, la contraseña acabaría siendo el nombre.
    expect(r.filas.map((f) => f.datos.cliente)).not.toContain("premium2026");
  });

  it("lee el costo y el proveedor de la cuenta (solo en la primera fila)", () => {
    expect(r.filas[0].datos.inversion).toBe(0); // «$ -»
    expect(r.filas[0].datos.proveedor).toBe("tg");
    expect(r.filas[0].datos.renovarProveedor).toBe("2026-08-22");
    expect(r.vendedores.sort()).toEqual(["Gabriel Nadales", "NubeDigital"]);
  });
});
