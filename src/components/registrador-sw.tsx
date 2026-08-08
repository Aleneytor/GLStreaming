"use client";

import { useEffect } from "react";

/**
 * Registra el service worker de GL Streaming.
 *
 * Solo se registra en producción (`next start`): en desarrollo (`next dev`)
 * el SW cachea recursos que cambian constantemente y causa confusión (hay que
 * hacer hard refresh para ver cambios). El SW vive en `/public/sw.js` y Next lo
 * sirve en `/sw.js`.
 *
 * Se monta una sola vez desde el layout raíz (`src/app/layout.tsx`).
 */
export function RegistradorSW() {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production") return;
        if (!("serviceWorker" in navigator)) return;

        navigator.serviceWorker
            .register("/sw.js")
            .catch(() => {
                // Fallar silenciosamente: el SW es una mejora (PWA instalable),
                // no una funcionalidad crítica.
            });
    }, []);

    return null;
}
