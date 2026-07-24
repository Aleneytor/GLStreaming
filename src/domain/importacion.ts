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

/**
 * Convierte el texto pegado en filas de celdas.
 *
 * NO basta con partir por saltos de línea: una celda de Excel puede contener
 * saltos dentro (por ejemplo un dato escrito con Alt+Enter). Al copiarla, Excel
 * la envuelve en comillas y conserva esos saltos, así que una sola fila llega
 * repartida en varias líneas físicas. Partir a lo bruto descuadraba la tabla
 * entera. Aquí se respeta el entrecomillado (`""` es una comilla literal).
 */
export function parsearTabla(texto: string): string[][] {
  const delim = texto.includes("\t") ? "\t" : texto.includes(";") ? ";" : ",";

  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let enComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];

    if (enComillas) {
      if (ch === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          enComillas = false;
        }
      } else {
        campo += ch;
      }
      continue;
    }

    if (ch === '"') enComillas = true;
    else if (ch === delim) {
      fila.push(campo);
      campo = "";
    } else if (ch === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else if (ch !== "\r") {
      campo += ch;
    }
  }
  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  // Cada celda se limpia, y las filas totalmente vacías se descartan.
  return filas
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c !== ""));
}

/**
 * Oculta un número de tarjeta si aparece en el texto (red de seguridad).
 *
 * Para recordar CON QUÉ tarjeta se pagó una cuenta basta el banco y los últimos
 * cuatro dígitos. Guardar el número completo —y menos aún el CVV— es un riesgo
 * innecesario: no aporta nada para identificarla y sí es peligroso si los datos
 * se filtran. Así que si alguien pega el número entero, aquí se recorta.
 */
export function enmascararTarjeta(valor: string): { valor: string; oculto: boolean } {
  const t = valor.replace(/\s+/g, " ").trim();
  if (!t) return { valor: t, oculto: false };

  // Tramos de dígitos (admite espacios o guiones entre grupos, como se escriben
  // las tarjetas). Interesa el más largo: el número, no el CVV ni la fecha.
  const tramos = t.match(/\d[\d -]*\d/g) ?? [];
  let mejor = "";
  let mejorDigitos = "";
  for (const tramo of tramos) {
    const digitos = tramo.replace(/\D/g, "");
    if (digitos.length > mejorDigitos.length) {
      mejor = tramo;
      mejorDigitos = digitos;
    }
  }
  if (mejorDigitos.length < 13) return { valor: t, oculto: false };

  // Una tarjeta tiene 13-19 dígitos; si el tramo arrastró la fecha o el CVV,
  // los de más se ignoran quedándose con los primeros 16.
  const ultimos = mejorDigitos.slice(0, 16).slice(-4);

  // Se conserva el texto anterior al número (el banco o apodo, si lo hay).
  const antes = t.slice(0, t.indexOf(mejor)).replace(/[^\p{L}\p{N} .]/gu, "").trim();
  return { valor: `${antes || "tarjeta"} ···${ultimos}`, oculto: true };
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
 * ¿Esta fila es una fila de TÍTULOS? (no de datos). Sirve tanto para detectar
 * el encabezado inicial como para saltar los encabezados intermedios cuando se
 * pegan VARIOS bloques de una vez, cada uno con su propia fila de títulos.
 */
function esFilaCabecera(celdas: string[]): boolean {
  // Una fila de datos empieza por el correo o por el N° de fila, no por un
  // título; y una de títulos reconoce varias columnas por su nombre.
  const primeraEsCorreo = (celdas[0] ?? "").includes("@");
  const cuantos = celdas.filter((t) => campoDeCabecera(t) !== null).length;
  return !primeraEsCorreo && cuantos >= 4;
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
  const hayCabecera = esFilaCabecera(primeraLinea);

  const mapa: Partial<Record<Campo, number>> = {};
  if (hayCabecera) {
    primeraLinea.forEach((titulo, i) => {
      const campo = campoDeCabecera(titulo);
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
  // Respeta las celdas con saltos de línea dentro (ver `parsearTabla`).
  const filasCrudas = parsearTabla(texto);

  // Las columnas se reconocen por su título si se pegó la fila de encabezados;
  // así el orden y las columnas de más (días, alerta, renovar…) no importan.
  const { mapa } = resolverColumnas(filasCrudas[0] ?? []);

  // Lee una columna por su campo, sin depender de la posición absoluta.
  const leer = (c: string[], campo: Campo): string => {
    const idx = mapa[campo];
    return idx === undefined ? "" : (c[idx] ?? "").trim();
  };

  const datos = filasCrudas.filter((c) => {
    // Fuera TODAS las filas de títulos: al pegar varios bloques, cada uno trae
    // la suya, y una fila de títulos en medio no es un dato.
    if (esFilaCabecera(c)) return false;

    // Fuera las filas de RELLENO del Excel (las marcadas «Vacío»): no traen
    // cuenta propia ni dato alguno de servicio, solo fórmulas de la hoja
    // (días, alerta, aviso). Si se colaran, heredarían la cuenta de arriba y
    // ocuparían un cupo que no existe — que es justo lo que rompía FlujoTV,
    // con sus 3 cupos y una línea en blanco de separación.
    const sinDatos =
      !leer(c, "correo") &&
      !leer(c, "perfil") &&
      !leer(c, "cliente") &&
      !leer(c, "monto") &&
      !leer(c, "whatsapp") &&
      !leer(c, "vendio");
    return !sinDatos;
  });

  const slotsPorCuenta = new Map<string, number>();
  const vendedores = new Map<string, string>(); // clave en minúsculas → nombre visible
  const filas: FilaAnalizada[] = [];

  // Cuenta madre "en curso": el correo/contraseña se arrastran a las filas que
  // vienen sin ellos (celdas combinadas de una cuenta completa).
  let ultimoCorreo = "";
  let ultimaContrasena = "";

  datos.forEach((c, i) => {
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
    // El proveedor a veces es la tarjeta con la que se pagó: si viene el número
    // completo, se guarda solo el final (ver `enmascararTarjeta`).
    const proveedorCrudo = enmascararTarjeta(leer(c, "proveedor"));
    const proveedor = proveedorCrudo.valor || null;
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

    // Puede ser un correo o un USUARIO: plataformas como FlujoTV o Telelatino
    // se identifican con usuario y contraseña, no con un correo.
    if (!correo) {
      errores.push("Falta el correo o usuario (y no hay una cuenta madre arriba de dónde heredarlo).");
    }
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

    if (proveedorCrudo.oculto) {
      avisos.push(
        `Se ocultó el número de tarjeta por seguridad: se guarda «${proveedorCrudo.valor}».`,
      );
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
