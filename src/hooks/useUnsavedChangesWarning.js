import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { UNSAFE_NavigationContext } from "react-router-dom";

export const DEFAULT_MESSAGE = "Tiene cambios sin guardar. Si sale de esta pantalla se perderán. ¿Desea salir de todas formas?";

// Cuántos formularios con este hook están activos ahora mismo. El guardián
// global (components/UnsavedChangesGuard) se hace a un lado mientras haya
// alguno, para no preguntar dos veces: este hook compara datos reales y es
// más preciso que la detección genérica.
let activeExplicitGuards = 0;
export const hasExplicitUnsavedGuard = () => activeExplicitGuards > 0;

// Avisa antes de abandonar un formulario con cambios sin guardar:
// - al cerrar/recargar la pestaña (beforeunload, el navegador muestra su
//   propio mensaje genérico);
// - al navegar dentro de la app (clic en el menú, "Volver", etc.);
// - al cerrar un formulario en diálogo (Cancelar, X, Escape, clic afuera),
//   si el componente envuelve su cierre con confirmDiscard().
//
// La app usa <BrowserRouter> (no un data router), así que useBlocker no está
// disponible: se intercepta push/replace del navigator del router. El botón
// "atrás" del navegador no se puede interceptar con este enfoque.
//
// "Con cambios" = el usuario ya interactuó con la pantalla (escribió o
// cambió algo) Y los datos son distintos de como estaban justo antes de
// esa primera interacción. Mientras el usuario no toca nada, la línea base
// se sigue actualizando, así que las cargas asíncronas (modo edición) y
// los cálculos automáticos no cuentan como cambios.
//
// `disabled` (modo "ver", cargando, o diálogo cerrado) reinicia todo: al
// volver a habilitarse se toma una línea base nueva. Así un diálogo que se
// reabre con otros datos no arranca "con cambios".
//
// Uso: const { allowNavigation, confirmDiscard } = useUnsavedChangesWarning({ data, disabled });
// - allowNavigation(): justo antes de un navigate() intencional (después de
//   guardar, o tras confirmar "Cancelar" en un diálogo propio).
// - confirmDiscard(): devuelve true si se puede descartar (no hay cambios o
//   el usuario confirmó); para envolver el cierre de un diálogo.
export default function useUnsavedChangesWarning({ data, disabled = false, message = DEFAULT_MESSAGE }) {
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const [touched, setTouched] = useState(false);
  const baselineRef = useRef(null);
  const allowRef = useRef(false);

  const serialized = JSON.stringify(data ?? null);

  useEffect(() => {
    if (disabled) return undefined;
    activeExplicitGuards += 1;
    return () => {
      activeExplicitGuards -= 1;
    };
  }, [disabled]);

  useEffect(() => {
    if (disabled) {
      setTouched(false);
      allowRef.current = false;
      baselineRef.current = null;
      return;
    }
    if (!touched || baselineRef.current === null) baselineRef.current = serialized;
  }, [serialized, touched, disabled]);

  // Fase de captura: marca "tocado" en el mismo evento que dispara el
  // onChange de React, así ambos cambios de estado entran en el mismo render
  // y la línea base queda con el valor ANTERIOR al cambio.
  useEffect(() => {
    if (disabled || touched) return undefined;
    const markTouched = () => setTouched(true);
    const events = ["input", "change", "keydown"];
    events.forEach((evt) => document.addEventListener(evt, markTouched, true));
    // Opciones de Select/Autocomplete de MUI (se renderizan en un portal y
    // no disparan input/change nativos).
    const onClick = (e) => {
      if (e.target?.closest?.('[role="option"], [role="checkbox"], [role="radio"], [role="switch"]')) {
        setTouched(true);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => {
      events.forEach((evt) => document.removeEventListener(evt, markTouched, true));
      document.removeEventListener("click", onClick, true);
    };
  }, [disabled, touched]);

  const isDirty = !disabled && touched && baselineRef.current !== null && serialized !== baselineRef.current;

  useEffect(() => {
    if (!isDirty) return undefined;

    const onBeforeUnload = (e) => {
      if (allowRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    const { push, replace } = navigator;
    const guard = (fn) => (...args) => {
      if (allowRef.current || window.confirm(message)) {
        allowRef.current = true;
        fn.apply(navigator, args);
      }
    };
    navigator.push = guard(push);
    navigator.replace = guard(replace);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      navigator.push = push;
      navigator.replace = replace;
    };
  }, [isDirty, navigator, message]);

  const allowNavigation = useCallback(() => {
    allowRef.current = true;
  }, []);

  const confirmDiscard = useCallback(
    () => !isDirty || allowRef.current || window.confirm(message),
    [isDirty, message],
  );

  return { isDirty, allowNavigation, confirmDiscard };
}
