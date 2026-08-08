import { describe, expect, it } from "vitest";
import { clasificarVentasRevendedor } from "@/features/revendedor/clasificacion";

type Venta = { id: string; estado: string; dias: number | null };

const venta = (id: string, estado: string, dias: number | null): Venta => ({
    id,
    estado,
    dias,
});

describe("clasificarVentasRevendedor", () => {
    it("una pausa vencida sale de la atención urgente y va a su grupo neutro", () => {
        const ventas = [
            venta("activa-vencida", "activa", -2),
            venta("pausada-vencida", "pausada", -8),
            venta("activa-hoy", "activa", 0),
        ];

        const c = clasificarVentasRevendedor(ventas);

        expect(c.activas.map((v) => v.id)).toEqual(["activa-vencida", "activa-hoy"]);
        expect(c.pausadas.map((v) => v.id)).toEqual(["pausada-vencida"]);
        // La pausa vencida NO cuenta como vencida ni como urgente.
        expect(c.vencidas).toBe(1);
        expect(c.vencenHoy).toBe(1);
        expect(c.urgentes).toBe(2);

        const grupoVencidos = c.grupos.find((g) => g.titulo.includes("Vencidos"));
        expect(grupoVencidos?.items.map((v) => v.id)).toEqual(["activa-vencida"]);
        const grupoPausas = c.grupos.find((g) => g.titulo.includes("En pausa"));
        expect(grupoPausas?.items.map((v) => v.id)).toEqual(["pausada-vencida"]);
    });

    it("mantiene las métricas y grupos de vencimiento solo sobre ventas activas", () => {
        const ventas = [
            venta("activa-8", "activa", 8),
            venta("activa-3", "activa", 3),
            venta("activa-hoy", "activa", 0),
            venta("activa-vencida", "activa", -1),
            venta("pausada-3", "pausada", 3),
            venta("pausada-vencida", "pausada", -5),
        ];

        const c = clasificarVentasRevendedor(ventas);

        expect(c.alDia).toBe(1);
        // El KPI «Por Vencer» conserva el umbral histórico (>= 0): cuenta hoy también.
        expect(c.porVencer).toBe(2);
        expect(c.vencidas).toBe(1);
        expect(c.vencenHoy).toBe(1);
        expect(c.urgentes).toBe(2);
        expect(c.pausadas.map((v) => v.id)).toEqual(["pausada-3", "pausada-vencida"]);

        const proximos = c.grupos.find((g) => g.titulo.includes("Próximos 5 días"));
        expect(proximos?.items.map((v) => v.id)).toEqual(["activa-3"]);
    });

    it("agrupa las activas sin fecha en «Sin fecha asignada» y las pausas al final", () => {
        const ventas = [
            venta("activa-sin-fecha", "activa", null),
            venta("activa-10", "activa", 10),
            venta("pausada-sin-fecha", "pausada", null),
        ];

        const c = clasificarVentasRevendedor(ventas);

        const sinFecha = c.grupos.find((g) => g.titulo.includes("Sin fecha"));
        expect(sinFecha?.items.map((v) => v.id)).toEqual(["activa-sin-fecha"]);

        // El grupo «En pausa · cupo reservado» es el último y contiene las pausas.
        const ultimo = c.grupos[c.grupos.length - 1];
        expect(ultimo.titulo).toContain("En pausa");
        expect(ultimo.items.map((v) => v.id)).toEqual(["pausada-sin-fecha"]);

        // Un servicio activo sin fecha no infla las métricas.
        expect(c.alDia).toBe(1);
        expect(c.vencidas).toBe(0);
        expect(c.urgentes).toBe(0);
    });

    it("ordena cada grupo por proximidad al vencimiento (primero lo que vence antes)", () => {
        const ventas = [
            venta("a-10", "activa", 10),
            venta("a-6", "activa", 6),
            venta("a-20", "activa", 20),
        ];

        const c = clasificarVentasRevendedor(ventas);

        const alDia = c.grupos.find((g) => g.titulo.includes("Vigentes"));
        expect(alDia?.items.map((v) => v.id)).toEqual(["a-6", "a-10", "a-20"]);
    });
});
