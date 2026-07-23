import { SubNavFinanzas } from "@/features/finanzas/sub-nav";

/**
 * Todas las pantallas de dinero comparten una misma cabecera de pestañas.
 * Son cinco vistas del mismo hecho —cobrar, pagar, ver el día, cerrar el mes y
 * la tasa con la que se convierte— y en el móvil conviene saltar entre ellas
 * sin volver al menú principal.
 */
export default function FinanzasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <SubNavFinanzas />
      {children}
    </div>
  );
}
