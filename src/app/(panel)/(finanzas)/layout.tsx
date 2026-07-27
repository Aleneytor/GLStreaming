import { SubNavFinanzas } from "@/features/finanzas/sub-nav";

/**
 * Todas las pantallas de dinero comparten una misma cabecera de pestañas.
 * Son cinco vistas del mismo hecho —cobrar, pagar, ver el día, cerrar el mes y
 * la tasa con la que se convierte— y en el móvil conviene saltar entre ellas
 * sin volver al menú principal.
 */
export default function FinanzasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5 pb-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Finanzas del negocio</p>
      </div>
      <SubNavFinanzas />
      {children}
    </div>
  );
}
