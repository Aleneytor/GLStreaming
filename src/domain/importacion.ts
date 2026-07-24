/**
 * Analizador de las filas pegadas desde el Excel (migración de la cartera).
 *
 * Es lógica PURA a propósito: la usan tanto la vista previa del navegador como
 * la acción de servidor que guarda. Si fueran dos analizadores distintos, la
 * previsualización podría enseñar una cosa y guardarse otra — que es
 * exactamente lo que no puede pasar cuando se migran cientos de filas.
 *
 * Columnas esperadas, en este orden (el del Excel del negocio, sin las columnas
 * calculadas: días, alerta, renovar, aviso):
 *   correo · contraseña · perfil · pin · monto · inicio · vence · cliente ·
 *   whatsapp · vendió · inversión · proveedor
 *
 * DOS FORMAS DE CARTERA, distinguidas por el PRODUCTO que se elija arriba:
 *   - PERFILES EXTRA: cada fila es su propia cuenta madre (correo propio,
 *     capacidad 1).
 *   - CUENTA COMPLETA: una cuenta madre con varios perfiles. En el Excel el
 *     correo y la contraseña van SOLO en la primera fila (celdas combinadas);
 *     las filas siguientes los HEREDAN. Aquí se arrastran hacia abajo.
 *
 * El `monto` es un número SIN moneda: quien decide si son dólares o bolívares es
 * el importador (el Excel lleva todo en divisas, así que por defecto se
 * interpretan como USD y se convierten a Bs con la BCV del momento).
 *
 * Reglas:
 *   - Cliente vacío pero con señal de venta (monto, teléfono o vendedor) = el
 *     nombre del PERFIL es el cliente (así está en el Excel del negocio).
 *   - Sin ninguna señal de venta = el perfil se carga libre (inventario).
 *   - Monto vacío = queda pendiente de cobro (aparece en «Por cobrar»).
 *   - Vendió vacío = venta directa (sin revendedor).
 */

export type FilaImportacion = {
  correo: string;
  contrasena: string;
  /** Nombre del perfil dentro de la cuenta. */
  perfil: string | null;
  pin: string | null;
  /** Cliente efectivo: la columna Cliente o, si falta, el nombre del perfil. */
  cliente: string | null;
  whatsapp: string | null;
  /** Nombre del revendedor que hizo la venta (columna «Vendió»). */
  vendio: string | null;
  /** Inicio del período, en ISO (YYYY-MM-DD). */
  inicio: string | null;
  /** Fecha de la próxima renovación, en ISO (YYYY-MM-DD). */
  vence: string | null;
  /** Importe tal cual venía, sin moneda: el importador decide USD o Bs. */
  monto: number | null;
  /** Costo del proveedor por la CUENTA (divisas). Es por cuenta, no por perfil. */
  inversion: number | null;
  /** Proveedor al que se le compra la cuenta (columna «Proveedor»). */
  proveedor: string | null;
  /** Cuándo toca pagarle al proveedor (columna «Renovar»), en ISO. Por cuenta. */
  renovarProveedor: string | null;
};

export type FilaAnalizada = {
  /** Número de línea tal como lo ve el usuario (empieza en 1). */
  numero: number;
  /** Slot dentro de su cuenta madre: 1..N según el orden de aparición. */
  slot: number;
  /** true si el correo se heredó de una fila anterior (celda combinada). */
  heredaCuenta: boolean;
  datos: FilaImportacion;
  errores: string[];
  avisos: string[];
};

export type ResultadoAnalisis = {
  filas: FilaAnalizada[];
  /** Cuentas madre distintas detectadas (por correo). */
  cuentas: number;
  validas: number;
  conError: number;
  /** Nombres distintos de la columna «Vendió» que aparecen. */
  vendedores: string[];
};

/** Divide respetando tabulador (Excel), punto y coma o coma. */
function separar(linea: string): string[] {
  if (linea.includes("\t")) return linea.split("\t");
  if (linea.includes(";")) return linea.split(";");
  return linea.split(",");
}

type Campo =
  | "correo"
  | "contrasena"
  | "perfil"
  | "pin"
  | "monto"
  | "inicio"
  | "vence"
  | "cliente"
  | "whatsapp"
  | "vendio"
  | "inversion"
  | "proveedor"
  | "renovar";

/** Orden por defecto cuando NO se pega la fila de títulos. */
const ORDEN_POSICIONAL: Campo[] = [
  "correo", "contrasena", "perfil", "pin", "monto", "inicio",
  "vence", "cliente", "whatsapp", "vendio", "inversion", "proveedor", "renovar",
];

/** Normaliza un texto para comparar: minúsculas y sin acentos ni signos. */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita los acentos combinados
    .toLowerCase()
    .trim();
}

/**
 * Traduce el título de una columna del Excel al campo interno. Devuelve null
 * para las columnas calculadas que no se importan (días, alerta, renovar…).
 */
function campoDeCabecera(titulo: string): Campo | null {
  const h = norm(titulo);
  if (!h) return null;
  if (/(dias|alerta|aviso)/.test(h)) return null; // columnas calculadas
  if (/(correo|e-?mail|gmail)/.test(h)) return "correo";
  if (/(contrase|clave|password|pass)/.test(h)) return "contrasena";
  if (h.includes("perfil")) return "perfil";
  if (h === "pin") return "pin";
  if (/(ingreso|monto|precio)/.test(h)) return "monto";
  if (h.includes("inicio") || h.includes("desde")) return "inicio";
  if (/(vence|vencim|hasta)/.test(h)) return "vence";
  if (h.includes("cliente")) return "cliente";
  if (/(celular|whatsapp|telefono|movil|numero|\btel\b)/.test(h)) return "whatsapp";
  if (h.includes("vend")) return "vendio"; // vendió / vendedor
  if (/(inversion|costo)/.test(h) || h === "inv") return "inversion";
  if (h.includes("proveedor")) return "proveedor";
  if (h.includes("renov")) return "renovar"; // fecha de pago al proveedor
  return null;
}

/**
 * Decide el mapa columna→campo. Si la primera línea es una fila de títulos, se
 * mapea POR NOMBRE (así el orden y las columnas de más no importan). Si no, se
 * usa el orden posicional por defecto.
 */
function resolverColumnas(primeraLinea: string[]): {
  mapa: Partial<Record<Campo, number>>;
  hayCabecera: boolean;
} {
  const reconocidos = primeraLinea.map((t) => campoDeCabecera(t));
  const cuantos = reconocidos.filter(Boolean).length;
  // Es cabecera si la primera celda no es un correo y reconoce varias columnas.
  const primeraEsCorreo = (primeraLinea[0] ?? "").includes("@");
  const hayCabecera = !primeraEsCorreo && cuantos >= 4;

  const mapa: Partial<Record<Campo, number>> = {};
  if (hayCabecera) {
    reconocidos.forEach((campo, i) => {
      if (campo && mapa[campo] === undefined) mapa[campo] = i;
    });
  } else {
    ORDEN_POSICIONAL.forEach((campo, i) => {
      mapa[campo] = i;
    });
  }
  return { mapa, hayCabecera };
}

/**
 * Fechas como las escribe la gente: 23/07/2026, 23-07-2026 o 2026-07-23.
 * Devuelve ISO o null.
 */
export function normalizarFecha(valor: string): string | null {
  const v = valor.trim();
  if (!v) return null;

  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, a, m, d] = iso;
    return armar(Number(a), Number(m), Number(d));
  }

  // En Venezuela el orden es día/mes/año.
  const dmy = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    const [, d, m, a] = dmy;
    const anio = a.length === 2 ? 2000 + Number(a) : Number(a);
    return armar(anio, Number(m), Number(d));
  }

  return null;
}

function armar(anio: number, mes: number, dia: number): string | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const f = new Date(Date.UTC(anio, mes - 1, dia));
  // Rechaza fechas que no existen (31 de febrero acaba siendo marzo).
  if (f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== dia) return null;
  return f.toISOString().slice(0, 10);
}

/**
 * Acepta "5.50", "4.00", "$ 5,50" y "2.500,00". Devuelve null si está vacío,
 * o "invalido" si no es un número. El símbolo $ y "Bs" se ignoran.
 */
export function normalizarMonto(valor: string): number | null | "invalido" {
  const v = valor.trim().replace(/\s|Bs\.?|\$/gi, "");
  if (!v) return null;

  // En Excel, "$ -" (o un guion suelto) es el cero contable: servicio gratis.
  if (/^[-–—]+$/.test(v)) return 0;

  // Si hay coma, se asume formato con coma decimal (VE): el punto separa miles.
  const limpio = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
  const n = Number(limpio);
  if (!Number.isFinite(n) || n < 0) return "invalido";
  return n;
}

/** Resta un mes calendario, recortando al último día válido del mes destino. */
export function restarUnMes(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const destinoMes = m === 1 ? 12 : m - 1;
  const destinoAnio = m === 1 ? a - 1 : a;
  const ultimoDia = new Date(Date.UTC(destinoAnio, destinoMes, 0)).getUTCDate();
  return armar(destinoAnio, destinoMes, Math.min(d, ultimoDia))!;
}

export function analizarFilas(texto: string, capacidad: number): ResultadoAnalisis {
  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== "");

  // Las columnas se reconocen por su título si se pegó la fila de encabezados;
  // así el orden y las columnas de más (días, alerta, renovar…) no importan.
  const { mapa, hayCabecera } = resolverColumnas(
    lineas.length > 0 ? separar(lineas[0]).map((x) => x.trim()) : [],
  );
  if (hayCabecera) lineas.shift();

  const slotsPorCuenta = new Map<string, number>();
  const vendedores = new Map<string, string>(); // clave en minúsculas → nombre visible
  const filas: FilaAnalizada[] = [];

  // Cuenta madre "en curso": el correo/contraseña se arrastran a las filas que
  // vienen sin ellos (celdas combinadas de una cuenta completa).
  let ultimoCorreo = "";
  let ultimaContrasena = "";

  // Lee una columna por su campo, sin depender de la posición absoluta.
  const leer = (c: string[], campo: Campo): string => {
    const idx = mapa[campo];
    return idx === undefined ? "" : (c[idx] ?? "").trim();
  };

  lineas.forEach((linea, i) => {
    const c = separar(linea).map((x) => x.trim());
    const errores: string[] = [];
    const avisos: string[] = [];

    let correo = leer(c, "correo");
    let contrasena = leer(c, "contrasena");
    const perfil = leer(c, "perfil") || null;
    const pin = leer(c, "pin") || null;
    const montoCrudo = leer(c, "monto");
    const inicioCrudo = leer(c, "inicio");
    const venceCrudo = leer(c, "vence");
    const clienteCol = leer(c, "cliente") || null;
    const whatsapp = leer(c, "whatsapp") || null;
    const vendio = leer(c, "vendio") || null;
    const inversionCruda = leer(c, "inversion");
    const proveedor = leer(c, "proveedor") || null;
    const renovarCrudo = leer(c, "renovar");

    // --- Arrastre de la cuenta madre (celda combinada del Excel) -------------
    let heredaCuenta = false;
    if (!correo && ultimoCorreo) {
      correo = ultimoCorreo;
      if (!contrasena) contrasena = ultimaContrasena;
      heredaCuenta = true;
    } else if (correo) {
      ultimoCorreo = correo;
      ultimaContrasena = contrasena;
    }

    if (!correo) errores.push("Falta el correo (y no hay una cuenta madre arriba de dónde heredarlo).");
    else if (!heredaCuenta && !correo.includes("@")) avisos.push("El correo no parece un correo.");
    if (!contrasena) errores.push("Falta la contraseña.");

    const inicio = normalizarFecha(inicioCrudo);
    if (inicioCrudo && !inicio) {
      avisos.push(`Inicio no entendido («${inicioCrudo}»): se derivará del vencimiento.`);
    }

    const vence = normalizarFecha(venceCrudo);
    if (venceCrudo && !vence) errores.push(`Fecha de vencimiento no entendida: «${venceCrudo}».`);

    const monto = normalizarMonto(montoCrudo);
    if (monto === "invalido") errores.push(`Monto no entendido: «${montoCrudo}».`);

    // El costo es secundario: si no se entiende, se avisa pero no se bloquea.
    const inversion = normalizarMonto(inversionCruda);
    if (inversion === "invalido") avisos.push(`Costo no entendido («${inversionCruda}»): se importará sin costo.`);

    const renovarProveedor = normalizarFecha(renovarCrudo);
    if (renovarCrudo && !renovarProveedor) {
      avisos.push(`Renovación del proveedor no entendida («${renovarCrudo}»): se calculará sola.`);
    }

    // --- Cliente: la columna, o el nombre del perfil si hay señal de venta ---
    const haySenalVenta = Boolean(
      clienteCol || typeof monto === "number" || whatsapp || vendio,
    );
    const cliente = clienteCol ?? (haySenalVenta ? perfil : null);
    if (!clienteCol && cliente) {
      avisos.push(`Cliente tomado del perfil: «${cliente}».`);
    }
    if (haySenalVenta && !cliente) {
      errores.push("Parece una venta pero no hay ni cliente ni nombre de perfil.");
    }
    if (cliente && !vence) avisos.push("Sin vencimiento: se calculará como inicio + 1 mes.");
    if (cliente && monto === null) avisos.push("Sin monto: quedará en «Por cobrar».");
    if (cliente && monto === 0) avisos.push("Cortesía: se registra sin cobro.");

    if (vendio) {
      const clave = vendio.toLowerCase();
      if (!vendedores.has(clave)) vendedores.set(clave, vendio);
    }

    // El slot se asigna por orden de aparición dentro de cada cuenta madre.
    const claveCuenta = correo.toLowerCase();
    const slot = claveCuenta ? (slotsPorCuenta.get(claveCuenta) ?? 0) + 1 : 0;
    if (claveCuenta) slotsPorCuenta.set(claveCuenta, slot);
    if (slot > capacidad) {
      errores.push(
        `Esta cuenta ya tiene ${capacidad} perfiles (el máximo): sobra esta fila.`,
      );
    }

    filas.push({
      numero: i + 1,
      slot,
      heredaCuenta,
      datos: {
        correo,
        contrasena,
        perfil,
        pin,
        cliente,
        whatsapp,
        vendio,
        inicio,
        vence,
        monto: monto === "invalido" ? null : monto,
        inversion: inversion === "invalido" ? null : inversion,
        proveedor,
        renovarProveedor,
      },
      errores,
      avisos,
    });
  });

  return {
    filas,
    cuentas: slotsPorCuenta.size,
    validas: filas.filter((f) => f.errores.length === 0).length,
    conError: filas.filter((f) => f.errores.length > 0).length,
    vendedores: [...vendedores.values()],
  };
}
