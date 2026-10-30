import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// Abre el formulario de "nuevo" de una pantalla cuando se llega con ?nuevo=1
// (acceso rápido "+ Nuevo" de la barra superior) y quita el parámetro de la
// URL, para que recargar o volver atrás no lo abra otra vez.
export default function useOpenOnNuevo(open) {
  const [params, setParams] = useSearchParams();
  const requested = params.get("nuevo") === "1";

  useEffect(() => {
    if (!requested) return;
    open();
    const next = new URLSearchParams(params);
    next.delete("nuevo");
    setParams(next, { replace: true });
    // Solo reacciona al parámetro; `open` cambia en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested]);
}
