import { describe, expect, it } from "vitest";
import {
  analizarFilas,
  enmascararTarjeta,
  normalizarFecha,
  normalizarMonto,
  parsearTabla,
  restarUnMes,
  separarPagador,
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

  it("«$ -» y un guion suelto son cero contable (servicio de cortesía)", () => {
    expect(normalizarMonto("$ -")).toBe(0);
    expect(normalizarMonto("-")).toBe(0);
    expect(normalizarMonto("—")).toBe(0);
    expect(normalizarMonto("0")).toBe(0);
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

describe("parsearTabla", () => {
  it("mantiene junta una celda que trae saltos de línea dentro", () => {
    // Excel envuelve en comillas la celda escrita con Alt+Enter y conserva los
    // saltos: la fila llega repartida en varias líneas físicas.
    const texto = 'a\tb\t"linea1\nlinea2\nlinea3"\td\ne\tf\tg\th';
    const filas = parsearTabla(texto);

    expect(filas).toHaveLength(2); // dos filas, no cuatro
    expect(filas[0]).toEqual(["a", "b", "linea1\nlinea2\nlinea3", "d"]);
    expect(filas[1]).toEqual(["e", "f", "g", "h"]);
  });

  it("entiende la comilla escapada («\"\"»)", () => {
    expect(parsearTabla('x\t"dijo ""hola"""')[0]).toEqual(["x", 'dijo "hola"']);
  });

  it("descarta las filas totalmente vacías", () => {
    expect(parsearTabla("a\tb\n\n\nc\td")).toHaveLength(2);
  });
});

describe("enmascararTarjeta", () => {
  it("oculta el número completo y deja solo los últimos 4", () => {
    // Lo que el usuario tenía anotado: número + vencimiento + CVV.
    const r = enmascararTarjeta("4130371000040477 01/28 766");
    expect(r.oculto).toBe(true);
    expect(r.valor).toBe("tarjeta ···0477");
    expect(r.valor).not.toContain("766"); // el CVV no se guarda
    expect(r.valor).not.toContain("4130371000040477");
  });

  it("conserva el banco si viene delante del número", () => {
    // Escrito en grupos de cuatro, como en las tarjetas.
    expect(enmascararTarjeta("Bancamiga 4130 3710 0004 0477").valor).toBe(
      "Bancamiga ···0477",
    );
  });

  it("no toca un proveedor normal ni unos últimos 4 ya escritos a mano", () => {
    expect(enmascararTarjeta("Bancamiga 4477")).toEqual({
      valor: "Bancamiga 4477",
      oculto: false,
    });
    expect(enmascararTarjeta("@CapyVentas")).toEqual({
      valor: "@CapyVentas",
      oculto: false,
    });
    expect(enmascararTarjeta("yo bancamiga").oculto).toBe(false);
  });
});

describe("separarPagador", () => {
  it("saca el Gmail pagador de dentro de la celda de proveedor", () => {
    // Familias de Spotify con GPay propio: la hoja pone el rótulo y el correo
    // juntos, a veces en dos líneas dentro de la misma celda.
    expect(separarPagador("yo(gpay usa) ettermendoza6@gmail.com")).toEqual({
      proveedor: "yo(gpay usa)",
      pagador: "ettermendoza6@gmail.com",
    });
    expect(separarPagador("yo(gpay usa)\nettermendoza6@gmail.com").pagador).toBe(
      "ettermendoza6@gmail.com",
    );
  });

  it("deja intacto un proveedor sin correo", () => {
    expect(separarPagador("@CapyVentas")).toEqual({
      proveedor: "@CapyVentas",
      pagador: null,
    });
    expect(separarPagador("+57 324 3017900").pagador).toBeNull();
    expect(separarPagador("")).toEqual({ proveedor: "", pagador: null });
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

  it("un servicio de costo 0 (familiar) no es error: es cortesía", () => {
    // La fila de Abigail: ingresos «$ -», inversión «$ -», proveedor «yo».
    const r = analizarFilas(
      fila("netab@gls.org", "gls2020", "Abigail", "0", "$ -", "23/4/2027", "23/5/2027", "", "", "", "$ -", "yo"),
      1,
    );
    expect(r.conError).toBe(0);
    expect(r.filas[0].datos.monto).toBe(0);
    expect(r.filas[0].datos.inversion).toBe(0);
    expect(r.filas[0].datos.cliente).toBe("Abigail"); // el perfil es la clienta
    expect(r.filas[0].avisos.join(" ")).toContain("Cortesía");
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

  it("reconoce las columnas por su encabezado, en cualquier orden", () => {
    // Encabezados del Excel real, con columnas calculadas (Días, Alerta…) que
    // deben ignorarse, y sin columna Inicio (se deriva del vencimiento).
    const texto = [
      fila("Correo", "Contraseña", "Perfil", "Pin", "Ingresos", "Días", "Vence", "Alerta", "Cliente", "Nº Celular", "Vendió", "Inversión", "Proveedor", "Renovar", "Aviso"),
      fila("allyson@trxpal.com", "gls4545", "Cristofer Marquez", "0", "$ 4,00", "30", "2/8/2026", "Falta 10 días", "", "+58 412-4067449", "Gabriel Nadales", "$ 3,50", "@CapyVentas", "9/8/2026", "Falta 17 días"),
    ].join("\n");
    const r = analizarFilas(texto, 1);

    expect(r.conError).toBe(0);
    expect(r.filas[0].datos).toMatchObject({
      correo: "allyson@trxpal.com",
      contrasena: "gls4545",
      perfil: "Cristofer Marquez",
      pin: "0",
      monto: 4,
      vence: "2026-08-02",
      cliente: "Cristofer Marquez", // sin columna Cliente, se toma el perfil
      whatsapp: "+58 412-4067449",
      vendio: "Gabriel Nadales",
      inversion: 3.5,
      proveedor: "@CapyVentas",
      renovarProveedor: "2026-08-09",
    });
  });

  it("salta las filas de títulos de VARIOS bloques pegados juntos", () => {
    // Cada cuenta completa se pega con su propia fila de encabezados (y con la
    // columna N° al inicio y columnas ocultas al final, como en el Excel real).
    const cab = fila("N°", "Correo", "Contraseña", "Perfil", "Pin", "Ingresos", "Inicio", "Dias", "Vence", "Alerta", "Cliente", "N° Celular", "Vendio", "Inversion", "Proveedor", "Renovar", "Aviso");
    const texto = [
      cab,
      fila("1", "palio@gls.org", "gls2020", "Estefani", "4444", "$ 3,00", "5/7/2026", "30", "4/8/2026", "Falta 12", "", "", "Diju", "$ 8,00", "yo bancamiga", "22/08/2026", "Falta 30"),
      fila("2", "", "", "Felito", "1111", "$ 3,00", "10/7/2026", "30", "9/8/2026", "Falta 17", "Salvador Russo", "", "", "", "", "", ""),
      cab, // segundo bloque: su fila de títulos NO debe leerse como dato
      fila("1", "pesa1@gls.org", "gls3030", "Maurifred", "7449", "$ 2,50", "24/7/2026", "30", "23/8/2026", "Falta 31", "", "+58 412", "Gabriel Nadales", "$ -", "yo", "9/8/2026", "Falta 17"),
      fila("2", "", "", "Nana", "3334", "$ 5,00", "10/7/2026", "30", "9/8/2026", "Falta 17", "Nana", "", "", "", "", "", ""),
    ].join("\n");
    const r = analizarFilas(texto, 5);

    expect(r.conError).toBe(0); // la fila de títulos intermedia no genera error
    expect(r.filas).toHaveLength(4); // 4 datos, sin contar los 2 encabezados
    expect(r.cuentas).toBe(2); // palio y pesa1
    // Cada bloque hereda su propia cuenta madre (no se contamina con el otro).
    expect(r.filas.map((f) => f.datos.correo)).toEqual([
      "palio@gls.org",
      "palio@gls.org",
      "pesa1@gls.org",
      "pesa1@gls.org",
    ]);
    // No se cuela un revendedor fantasma llamado "Vendio".
    expect(r.vendedores).not.toContain("Vendio");
    expect(r.filas[2].datos.inversion).toBe(0); // Maurifred: «$ -» = cortesía en costo
  });

  it("una hoja normal (sin columnas de Spotify) no se marca como Spotify", () => {
    const r = analizarFilas(
      [
        fila("Correo", "Contraseña", "Perfil", "Pin", "Ingresos", "Vence", "Cliente"),
        fila("a@gls.org", "c1", "P1", "", "5", "23/07/2026", "Ana"),
      ].join("\n"),
      5,
    );
    expect(r.columnasSpotify).toBe(false);
  });

  it("avisa cuando NO se pegó la fila de títulos", () => {
    // Sin encabezado se adivina por posición: una columna de más al principio
    // corre todo un puesto. Hay que poder avisarlo en pantalla.
    const conCab = analizarFilas(
      [
        fila("Correo", "Contraseña", "Perfil", "Pin", "Ingresos", "Inicio", "Vence", "Cliente"),
        fila("a@gls.org", "c1", "P1", "", "5", "", "23/07/2026", "Ana"),
      ].join("\n"),
      5,
    );
    expect(conCab.hayCabecera).toBe(true);

    const sinCab = analizarFilas(
      fila("a@gls.org", "c1", "P1", "", "5", "", "23/07/2026", "Ana"),
      5,
    );
    expect(sinCab.hayCabecera).toBe(false);
  });

  it("sin encabezado, usa el orden posicional por defecto", () => {
    const r = analizarFilas(
      fila("a@gls.org", "c1", "P1", "", "5", "", "23/07/2026", "Ana", "", ""),
      5,
    );
    expect(r.filas).toHaveLength(1);
    expect(r.filas[0].datos.cliente).toBe("Ana");
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
