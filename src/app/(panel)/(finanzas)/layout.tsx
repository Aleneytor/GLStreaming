import { SubNavFinanzas } from "@/features/finanzas/sub-nav";

/**
 * Todas las pantallas de dinero comparten una misma cabecera de pestañas.
 * Son cinco vistas del mismo hecho —cobrar, pagar, ver el día, cerrar el mes y
 * la tasa con la que se convierte— y en el móvil conviene saltar entre ellas
 * sin volver al menú principal.
 *
 * El layout NO pone eyebrow propio: cada página hija ya trae el suyo («Caja del
 * día», «Cuentas por cobrar»…) y se apilaban dos seguidos. El segmented control
 * de abajo ya dice que estás en el bloque de finanzas.
 */
export default function FinanzasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      <SubNavFinanzas />
      {children}
    </div>
  );
}
