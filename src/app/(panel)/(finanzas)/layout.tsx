import { SubNavFinanzas } from "@/features/finanzas/sub-nav";

/**
 * Todas las pantallas de dinero comparten una misma cabecera de pestañas.
 * Son cinco vistas del mismo hecho —cobrar, pagar, ver el día, cerrar el mes y
 * la tasa con la que se convierte— y en el móvil conviene saltar entre ellas
 * sin volver al menú principal.
 */
export default function FinanzasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
        Finanzas del negocio
      </p>
      <SubNavFinanzas />
      {children}
    </div>
  );
}
