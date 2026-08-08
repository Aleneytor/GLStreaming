/**
 * Clasificación pura de las ventas del revendedor para el panel.
 *
 * La pausa que el administrador aplica conserva el cupo para el cliente, pero
 * deja de ser una alarma de renovación (la misma regla que aplica
 * `clasificarServiciosOperativos` del lado admin). Por eso aquí las métricas y
 * los grupos de vencimiento solo cuentan servicios ACTIVOS; los pausados viven
 * aparte, en su grupo neutro «En pausa · cupo reservado», sin botón de
 * renovación.
 */

export type VentaRevendedorClasificable = {
    estado: string;
    dias: number | null;
};

export type GrupoVentasRevendedor<T> = {
    titulo: string;
    acento: string;
    items: T[];
};

export type ClasificacionVentasRevendedor<T extends VentaRevendedorClasificable> = {
    /** Ventas activas (las únicas que generan atención por vencimiento). */
    activas: T[];
    /** Ventas pausadas por el administrador: cupo reservado, sin alarma. */
    pausadas: T[];
    /** KPI: activas que vencen en más de 5 días. */
    alDia: number;
    /** KPI: activas que vencen hoy o en los próximos 5 días (incluye hoy). */
    porVencer: number;
    /** KPI: activas ya vencidas. */
    vencidas: number;
    /** KPI: activas que vencen hoy. */
    vencenHoy: number;
    /** KPI: total a atender ya (vencidas + vencen hoy). */
    urgentes: number;
    /** Grupos de la vista «Operaciones»: los 5 de vencimiento (activas) + pausas. */
    grupos: GrupoVentasRevendedor<T>[];
};

const SIN_FECHA = 9999;

/** Dentro de cada grupo, primero lo que vence antes. */
function ordenarPorVencimiento<T extends VentaRevendedorClasificable>(arr: T[]): T[] {
    return [...arr].sort((a, b) => (a.dias ?? SIN_FECHA) - (b.dias ?? SIN_FECHA));
}

export function clasificarVentasRevendedor<T extends VentaRevendedorClasificable>(
    ventas: T[],
): ClasificacionVentasRevendedor<T> {
    const activas = ventas.filter((v) => v.estado === "activa");
    const pausadas = ventas.filter((v) => v.estado === "pausada");

    const vencidas = activas.filter((v) => v.dias !== null && v.dias < 0);
    const vencenHoy = activas.filter((v) => v.dias === 0);
    const porVencer = activas.filter((v) => v.dias !== null && v.dias > 0 && v.dias <= 5);
    const alDia = activas.filter((v) => v.dias !== null && v.dias > 5);
    const sinFecha = activas.filter((v) => v.dias === null);

    return {
        activas,
        pausadas,
        // El KPI «Por Vencer» conserva el umbral histórico (>= 0): cuenta hoy también.
        porVencer: activas.filter((v) => v.dias !== null && v.dias >= 0 && v.dias <= 5).length,
        alDia: alDia.length,
        vencidas: vencidas.length,
        vencenHoy: vencenHoy.length,
        urgentes: vencidas.length + vencenHoy.length,
        grupos: [
            {
                titulo: "Vencidos (Atención inmediata)",
                acento: "text-red-600 dark:text-red-400 font-bold",
                items: ordenarPorVencimiento(vencidas),
            },
            {
                titulo: "Vencen hoy",
                acento: "text-red-600 dark:text-red-400 font-bold",
                items: vencenHoy,
            },
            {
                titulo: "Próximos 5 días",
                acento: "text-amber-600 dark:text-amber-400 font-semibold",
                items: ordenarPorVencimiento(porVencer),
            },
            {
                titulo: "Vigentes / Al día",
                acento: "text-emerald-600 dark:text-emerald-400 font-semibold",
                items: ordenarPorVencimiento(alDia),
            },
            {
                titulo: "Sin fecha asignada",
                acento: "text-neutral-500 dark:text-neutral-400 font-semibold",
                items: sinFecha,
            },
            {
                titulo: "En pausa · cupo reservado",
                acento: "text-neutral-500 dark:text-neutral-400 font-semibold",
                items: pausadas,
            },
        ],
    };
}
