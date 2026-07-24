/**
 * Analizador de las filas pegadas desde el Excel (migración de la cartera).
 *
 * Es lógica PURA a propósito: la usan tanto la vista previa del navegador como
 * la acción de servidor que guarda. Si fueran dos analizadores distintos, la
 * previsualización podría enseñar una cosa y guardarse otra — que es
 * exactamente lo que no puede pasar cuando se migran cientos de filas.
 *
 * Columnas esperadas, en este orden:
 *   correo · contraseña · perfil · pin · cliente · whatsapp · vence · bs
 *
 * Reglas:
 *   - Cliente vacío  = el perfil se carga libre (inventario sin vender).
 *   - Bs vacío       = queda pendiente de cobro (aparece en «Por cobrar»).
 *   - Filas con el MISMO correo se agrupan en una sola cuenta madre.
 */

export type FilaImportacion = {
  correo: string;
  contrasena: string;
  perfil: string | null;
  pin: string | null;
  cliente: string | null;
  whatsapp: string | null;
  /** Fecha de la próxima renovación, en ISO (YYYY-MM-DD). */
  vence: string | null;
  montoVes: number | null;
};

export type FilaAnalizada = {
  /** Número de línea tal como lo ve el usuario (empieza en 1). */
  numero: number;
  /** Slot dentro de su cuenta madre: 1..N según el orden de aparición. */
  slot: number;
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
};

const CABECERAS = ["correo", "contrasena", "contraseña", "email", "e-mail"];

/** Divide respetando tabulador (Excel), punto y coma o coma. */
function separar(linea: string): string[] {
  if (linea.includes("\t")) return linea.split("\t");
  if (linea.includes(";")) return linea.split(";");
  return linea.split(",");
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

/** Acepta "2.500,00", "2500.00" y "2500". Devuelve null si está vacío. */
export function normalizarMonto(valor: string): number | null | "invalido" {
  const v = valor.trim().replace(/\s|Bs\.?/gi, "");
  if (!v) return null;

  // Si hay coma, se asume formato venezolano: el punto separa miles.
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

  // Si la primera línea parece una cabecera, se descarta.
  if (lineas.length > 0) {
    const primera = separar(lineas[0])[0]?.trim().toLowerCase() ?? "";
    if (CABECERAS.includes(primera)) lineas.shift();
  }

  const slotsPorCuenta = new Map<string, number>();
  const filas: FilaAnalizada[] = [];

  lineas.forEach((linea, i) => {
    const c = separar(linea).map((x) => x.trim());
    const errores: string[] = [];
    const avisos: string[] = [];

    const correo = c[0] ?? "";
    const contrasena = c[1] ?? "";
    const perfil = c[2] || null;
    const pin = c[3] || null;
    const cliente = c[4] || null;
    const whatsapp = c[5] || null;
    const venceCrudo = c[6] ?? "";
    const bsCrudo = c[7] ?? "";

    if (!correo) errores.push("Falta el correo.");
    else if (!correo.includes("@")) avisos.push("El correo no parece un correo.");
    if (!contrasena) errores.push("Falta la contraseña.");

    const vence = normalizarFecha(venceCrudo);
    if (venceCrudo && !vence) errores.push(`Fecha no entendida: «${venceCrudo}».`);
    if (cliente && !vence) avisos.push("Sin fecha de vencimiento: se usará hoy + 1 mes.");

    const monto = normalizarMonto(bsCrudo);
    if (monto === "invalido") errores.push(`Monto no entendido: «${bsCrudo}».`);
    if (cliente && monto === null) avisos.push("Sin monto: quedará en «Por cobrar».");
    if (!cliente && monto !== null && monto !== undefined) {
      avisos.push("Hay monto pero no hay cliente: no se registrará cobro.");
    }

    // El slot se asigna por orden de aparición dentro de cada cuenta madre.
    const clave = correo.toLowerCase();
    const slot = (slotsPorCuenta.get(clave) ?? 0) + 1;
    slotsPorCuenta.set(clave, slot);
    if (slot > capacidad) {
      errores.push(
        `Esta cuenta ya tiene ${capacidad} perfiles (el máximo): sobra esta fila.`,
      );
    }

    filas.push({
      numero: i + 1,
      slot,
      datos: {
        correo,
        contrasena,
        perfil,
        pin,
        cliente,
        whatsapp,
        vence,
        montoVes: monto === "invalido" ? null : monto,
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
  };
}
