import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/auth";
import { diasParaRenovar } from "@/domain/fechas";
import { PanelRevendedor, type VentaRevendedor } from "./panel-revendedor";

/**
 * Portal del revendedor (Fase 5, DEC-97).
 *
 * Su única ventana es `v_mis_ventas_revendedor`: ve SOLO sus ventas, nunca el
 * stock ni las finanzas. Este componente de servidor trae los datos (y resuelve
 * los días para vencer en la zona horaria del negocio); la presentación —dos
 * vistas, color por plataforma, paquete de acceso— vive en `PanelRevendedor`.
 *
 * OJO: aquí el «cliente» es el propio revendedor (a él se le anota nombre y
 * teléfono al venderle). No se conoce al cliente FINAL, así que no hay contacto
 * de WhatsApp que ofrecer: el revendedor atiende a los suyos por su cuenta.
 */

function hoyCaracas(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function MisVentasRevendedor({ q }: { q?: string }) {
  const hoy = hoyCaracas();
  const usuario = await obtenerUsuarioActual();
  const supabase = await createClient();

  const { data } = await supabase
    .from("v_mis_ventas_revendedor")
    .select(
      "suscripcion_id, estado, cliente, plataforma, producto, modalidad, fecha_renovacion",
    )
    // El revendedor atiende lo que está vivo; lo cancelado no le estorba.
    .in("estado", ["activa", "pausada"]);

  const ventas: VentaRevendedor[] = ((data ?? []) as VentaRevendedor[]).map((v) => ({
    ...v,
    dias: v.fecha_renovacion ? diasParaRenovar(v.fecha_renovacion, hoy) : null,
  }));

  const nombreUsuario = usuario?.nombre ?? usuario?.email?.split("@")[0] ?? "Revendedor";

  if (ventas.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-gradient-to-r from-neutral-900 to-neutral-800 p-6 text-white dark:border-neutral-800 shadow-md">
          <h1 className="text-xl font-bold">¡Hola, {nombreUsuario}! 👋</h1>
          <p className="mt-1 text-sm text-neutral-300">
            Bienvenido a tu panel de control de revendedor en GL Streaming.
          </p>
        </div>
        <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          Todavía no tienes ventas registradas a tu nombre. Cuando el administrador registre o asigne una venta, aparecerá inmediatamente en este panel.
        </p>
      </div>
    );
  }

  // Número de WhatsApp del negocio (admin) para que el revendedor pida la
  // renovación. Configurable por env; por defecto, el del negocio.
  const whatsappNegocio =
    process.env.NEXT_PUBLIC_WHATSAPP_NEGOCIO?.trim() || "+584125628256";

  return (
    <PanelRevendedor
      ventas={ventas}
      initialQ={q}
      nombreUsuario={nombreUsuario}
      whatsappNegocio={whatsappNegocio}
    />
  );
}
