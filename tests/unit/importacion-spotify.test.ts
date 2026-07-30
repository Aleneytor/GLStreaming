import { describe, expect, it } from "vitest";
import { analizarFilas } from "@/domain/importacion";

/**
 * Familia de Spotify real: la madre da el Premium y cada miembro entra con SU
 * propio login («Correo Cliente» / «Clave Cliente»). No hay columna Perfil.
 *
 * Casos que trae esta familia:
 *   - Miembros con nombre de cliente escrito.
 *   - Un miembro SIN nombre (fila 4): el revendedor solo pasó correo y clave.
 *     El correo de acceso NO se usa como nombre del cliente; se cae al
 *     revendedor («Vendió») como cliente comercial provisional.
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

  it("detecta que la hoja es de Spotify (columnas Correo/Clave Cliente)", () => {
    expect(r.columnasSpotify).toBe(true);
  });

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

  it("sin nombre de cliente, cae al revendedor («Vendió») como provisional", () => {
    // El correo de acceso NO se usa como nombre del cliente: se toma el
    // revendedor como cliente comercial provisional (prioridad Cliente→Perfil→Vendió).
    expect(r.filas[3].datos.cliente).toBe("NubeDigital");
    expect(r.filas[3].datos.vendio).toBe("NubeDigital");
    expect(r.filas[3].avisos.join(" ")).toContain("provisional");
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

/**
 * Dos familias pegadas juntas. La trampa: el primer cupo de la SEGUNDA está
 * marcado «no se puede», y es justo la fila que lleva el correo de esa cuenta
 * madre (celda combinada). Si esa fila se descartara, las siguientes se
 * colgarían de la familia anterior y desbordarían sus cinco cupos.
 */
describe("Dos familias seguidas, con un cupo «no se puede»", () => {
  const CAB2 =
    "N°\tCorreo\tContraseña\tCorreo Cliente\tClave Cliente\tIngresos\tInicio\tDias\tVence\tAlerta\tCliente\tN° Celular\tVendio\tInversion\tProveedor\tRenovar\tAviso\tN° Ctas";

  const TEXTO2 = [
    CAB2,
    // Familia 1: su primer cupo tiene login preparado pero sin vender («Vacío»).
    "1\tspotifyfam005@glstreaming.org (YO)\t28266095Ale$\tspotify176@glstreaming.org\tspotify123*\t\t\t30\t29/1/1900\tVacio\t\t\t\t $ -   \t@annie_r12\t25/7/2026\tTienes 1 días\t1",
    "2\t\t\tttcreations206@glstreaming.org\tMajojojevi5!\t $ 2,00 \t28/6/2026\t30\t28/7/2026\tFalta 4 días\tVicente\t+58 412-4907249\t\t\t\t\t\t",
    "3\t\t\tspotify105@glstreaming.org\tpremium2026\t $ 2,00 \t4/7/2026\t30\t3/8/2026\tFalta 10 días\tMichel Romero\t+58 412-2862590\t\t\t\t\t\t",
    "4\t\t\tspotify152@glstreaming.org\tpremium2028\t $ 2,00 \t22/7/2026\t30\t21/8/2026\tFalta 28 días\tNelsito\t+58 424-3621063\tRoman\t\t\t\t\t",
    "5\t\t\tspotify149@glstreaming.org\tmusica1234\t $ 2,00 \t10/7/2026\t30\t9/8/2026\tFalta 16 días\tLucia\t+58 424-3550195\tAguaMiel_Store1\t\t\t\t\t",
    CAB2,
    // Familia 2: el cupo 1 dice «no se puede» PERO trae el correo de la madre.
    "1\tspotify260@glstreaming.org\tmusica1234\tno se puede\tno se puede\t $ -   \t24/3/2027\t90\t22/6/2027\tFalta 333 días\tno se puede\tno se puede\tno se puede\t $ -   \tyo(gpay usa) turidovakido@gmail.com\t7/8/2026\tFalta 14 días\t1",
    "2\t\t\teryckssantana57@gmail.com\tErick15102005\t $ 3,00 \t2/7/2026\t30\t1/8/2026\tFalta 8 días\t\t+58 424-3621063\tRoman\t\t\t\t\t",
    "3\t\t\tspotify303@glstreaming.org\tpremium2026\t $ 2,00 \t15/8/2026\t30\t14/9/2026\tFalta 52 días\tMaria Victoria\t+58 424-3017557\tPaola Cruz\t\t\t\t\t",
    "4\t\t\tmerianyelis9@gmail.com\tspotify123*\t $ 3,00 \t1/7/2026\t30\t31/7/2026\tFalta 7 días\t\t\t\t\t\t\t\t",
    "5\t\t\tjosbermolina7@gmail.com\tLaserLaser*03\t $ 3,00 \t1/7/2026\t30\t31/7/2026\tFalta 7 días\tJosber Molina\t\t\t\t\t\t\t",
  ].join("\n");

  const r = analizarFilas(TEXTO2, 5);

  it("reconoce DOS familias, no una", () => {
    expect(r.cuentas).toBe(2);
    // 1 error: hay una fila vendida sin Cliente/Perfil/Vendió (ver test de abajo).
    expect(r.conError).toBe(1);
    expect(r.filas).toHaveLength(10);
  });

  it("cada familia usa sus propios cinco cupos", () => {
    expect(r.filas.map((f) => f.slot)).toEqual([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
    expect(r.filas[5].datos.correo).toBe("spotify260@glstreaming.org");
    expect(r.filas[9].datos.correo).toBe("spotify260@glstreaming.org");
  });

  it("el cupo «no se puede» conserva la madre y marca el bloqueo familiar", () => {
    expect(r.filas[5].datos.correo).toBe("spotify260@glstreaming.org"); // la madre se salva
    expect(r.filas[5].datos.cliente).toBeNull(); // y nadie se llama «no se puede»
    expect(r.filas[5].datos.correoCliente).toBeNull();
    expect(r.filas[5].datos.vendio).toBeNull();
    expect(r.filas[5].datos.bloqueoAdmisionSpotify).toBe(true);
    expect(r.filas.slice(6, 10).every((fila) => !fila.datos.bloqueoAdmisionSpotify)).toBe(true);
  });

  it("un cupo con login preparado pero sin vender queda libre", () => {
    // Familia 1, fila 1: tiene «Correo Cliente» pero ni monto ni cliente.
    expect(r.filas[0].datos.correoCliente).toBe("spotify176@glstreaming.org");
    expect(r.filas[0].datos.cliente).toBeNull();
  });

  it("sin nombre cae al revendedor; sin nombre ni revendedor en una venta, es error", () => {
    // idx6: trae «Vendió» = Roman → cliente provisional Roman (no el correo).
    expect(r.filas[6].datos.cliente).toBe("Roman");
    // idx8: vendida ($3) pero sin Cliente, sin Perfil (Spotify) y sin Vendió → error.
    expect(r.filas[8].datos.cliente).toBeNull();
    expect(r.filas[8].errores.join(" ")).toContain("nombre comercial del cliente");
  });

  it("separa el Gmail pagador de la celda de proveedor de la segunda familia", () => {
    expect(r.filas[5].datos.proveedor).toBe("yo(gpay usa)");
    expect(r.filas[5].datos.gmailPagador).toBe("turidovakido@gmail.com");
  });
});
