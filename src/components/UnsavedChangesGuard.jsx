import { useContext, useEffect, useRef } from "react";
import { UNSAFE_NavigationContext, useLocation } from "react-router-dom";
import API from "../api";
import { DEFAULT_MESSAGE, hasExplicitUnsavedGuard } from "../hooks/useUnsavedChangesWarning";

// Guardián global de "cambios sin guardar" para TODOS los formularios, sin
// tocar cada pantalla. Se monta una vez en cada layout (AppLayoutMenu de
// las empresas y SuperAdminLayout del panel de superadmin).
//
// Qué cuenta como "cambios": el usuario escribió o cambió un campo
// (eventos input/change, u opción elegida en un Select/Autocomplete) ...
//   - dentro de una ventana emergente (role="dialog"), en cualquier pantalla;
//   - o en el contenido de una página de captura (FORM_ROUTES: agregar,
//     editar, configuración...). En las demás páginas (listas, reportes) los
//     campos son filtros y no cuentan.
// Nunca cuentan: campos de búsqueda/filtro (type=search, o etiqueta o
// placeholder con "buscar"/"filtrar", y "Desde"/"Hasta" fuera de diálogos),
// ni nada dentro de [data-no-unsaved-guard].
//
// Se limpia solo cuando un guardado tiene éxito (cualquier POST/PUT/PATCH/
// DELETE 2xx que no sea una simulación/vista previa), al cambiar de página,
// o cuando el usuario confirma que quiere descartar.
//
// Pregunta antes de: navegar dentro de la app (menú, Volver...), cerrar o
// recargar la pestaña, y cerrar la ventana emergente con cambios (Cancelar,
// Cerrar, X, Escape o clic afuera).
//
// Las pantallas que usan el hook useUnsavedChangesWarning (comparación real
// de datos) tienen prioridad: mientras alguna esté activa, este guardián no
// interviene, para no preguntar dos veces.

const FORM_ROUTES = [
  /\/agregar$/,
  /\/editar\//,
  /^\/configuracion\//,
  /^\/creditos\/(politicas|evaluacion-financiera\/configuracion)$/,
  /^\/cumplimiento\/(matriz-riesgo|firma-preimpresa|oficial-cumplimiento)$/,
  /^\/(notificaciones|provisiones|conami\/tablas)$/,
  /^\/contabilidad\/notas-eeff$/,
  /^\/rrhh\/(configuracion|aprobadores-planilla)$/,
  /^\/(custom-reports|reports\/studio)$/,
  // Panel de superadmin (sus demás formularios son ventanas emergentes).
  /^\/superadmin\/tenants\/[^/]+\/migration$/,
];

// Requests que escriben pero NO son un guardado del formulario.
const NON_SAVE_URL = /simulate|simular|preview|vista-previa|calcul|validate|validar|search|buscar|login|logout|refresh|tracking|heartbeat/i;

const CLOSE_TEXT = /^(cancelar|cerrar|salir|descartar)$/i;
const SEARCH_TEXT = /buscar|search|filtr/i;
const RANGE_TEXT = /^(desde|hasta|fecha desde|fecha hasta)\b/i;

// CSS.escape no existe en todos los entornos (p. ej. jsdom en pruebas).
const cssEscape = (v) =>
  typeof window !== "undefined" && window.CSS?.escape
    ? window.CSS.escape(v)
    : String(v).replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);

// También lo usa KeyboardShortcuts (Ctrl+S) para saber si la página es de captura.
export const isFormRoute = (pathname) => FORM_ROUTES.some((re) => re.test(pathname));

const labelTextOf = (el) => {
  if (!el?.id) return "";
  const label = document.querySelector(`label[for="${cssEscape(el.id)}"]`);
  return label?.textContent?.trim() || "";
};

const isFilterLike = (el, inDialog) => {
  if (el.type === "search") return true;
  const hints = [el.placeholder, el.getAttribute?.("aria-label"), el.name, el.id, labelTextOf(el)].filter(Boolean).join(" ");
  if (SEARCH_TEXT.test(hints)) return true;
  if (!inDialog && RANGE_TEXT.test(labelTextOf(el))) return true;
  return false;
};

// Ventana emergente abierta más arriba (la última en el DOM).
const topmostDialog = () => {
  const all = document.querySelectorAll('.MuiDialog-root [role="dialog"]');
  return all.length ? all[all.length - 1] : null;
};

export default function UnsavedChangesGuard() {
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  const pageDirtyRef = useRef(false);
  const dirtyDialogsRef = useRef(new Set());

  pathRef.current = location.pathname;

  // Cambiar de página descarta el estado de la anterior.
  useEffect(() => {
    pageDirtyRef.current = false;
    dirtyDialogsRef.current.clear();
  }, [location.pathname]);

  useEffect(() => {
    const dirtyDialogs = dirtyDialogsRef.current;

    const pruneDialogs = () => {
      dirtyDialogs.forEach((d) => {
        if (!d.isConnected) dirtyDialogs.delete(d);
      });
    };
    const anyDirty = () => {
      if (hasExplicitUnsavedGuard()) return false;
      pruneDialogs();
      return pageDirtyRef.current || dirtyDialogs.size > 0;
    };
    const clearAll = () => {
      pageDirtyRef.current = false;
      dirtyDialogs.clear();
    };

    const markFrom = (el) => {
      if (!el || el.closest?.("[data-no-unsaved-guard]")) return;
      const dialog = el.closest?.('[role="dialog"]');
      if (isFilterLike(el, Boolean(dialog))) return;
      if (dialog) {
        dirtyDialogs.add(dialog);
      } else if (el.closest?.("main") && isFormRoute(pathRef.current)) {
        pageDirtyRef.current = true;
      }
    };

    // --- detectar cambios del usuario ---
    const onInput = (e) => {
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;
      if (el.matches("input, textarea, select, [contenteditable='true']")) markFrom(el);
    };
    // Opción elegida en Select/Autocomplete de MUI: la lista vive en un
    // portal, así que se busca el campo dueño de la lista.
    const onOptionClick = (e) => {
      const option = e.target?.closest?.('[role="option"]');
      if (!option) return;
      const listbox = option.closest('[role="listbox"]');
      const id = listbox?.id;
      const owner =
        (id && document.querySelector(`[aria-controls="${cssEscape(id)}"], [aria-owns="${cssEscape(id)}"]`)) ||
        (listbox?.getAttribute("aria-labelledby") &&
          document.getElementById(listbox.getAttribute("aria-labelledby").split(" ")[0]));
      if (owner) markFrom(owner);
      else if (topmostDialog()) dirtyDialogs.add(topmostDialog());
    };

    // --- preguntar antes de cerrar una ventana emergente con cambios ---
    const confirmDialogClose = (dialog, e) => {
      if (hasExplicitUnsavedGuard() || !dialog || !dirtyDialogs.has(dialog)) return;
      if (window.confirm(DEFAULT_MESSAGE)) {
        dirtyDialogs.delete(dialog);
      } else {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    const onClickCapture = (e) => {
      onOptionClick(e);
      const target = e.target;
      if (!(target instanceof Element)) return;

      // Clic afuera: el fondo o el contenedor de la ventana (no su contenido).
      if (target.classList.contains("MuiBackdrop-root") || target.classList.contains("MuiDialog-container")) {
        const root = target.closest(".MuiDialog-root");
        confirmDialogClose(root?.querySelector('[role="dialog"]'), e);
        return;
      }

      // Botón Cancelar / Cerrar / X dentro de la ventana.
      const button = target.closest("button");
      const dialog = button?.closest('[role="dialog"]');
      if (!button || !dialog) return;
      const text = button.textContent.trim();
      const aria = button.getAttribute("aria-label") || "";
      const isIconClose = !text && button.querySelector('[data-testid="CloseIcon"]');
      if (CLOSE_TEXT.test(text) || /^(cerrar|close)$/i.test(aria) || isIconClose) {
        confirmDialogClose(dialog, e);
      }
    };
    const onKeyDownCapture = (e) => {
      if (e.key !== "Escape") return;
      // Si hay una lista desplegable abierta, Escape solo la cierra.
      if (document.querySelector('[role="listbox"]')) return;
      confirmDialogClose(topmostDialog(), e);
    };

    // --- cerrar/recargar la pestaña ---
    const onBeforeUnload = (e) => {
      if (!anyDirty()) return;
      e.preventDefault();
      e.returnValue = "";
    };

    // --- navegación dentro de la app ---
    const { push, replace } = navigator;
    const guard = (fn) => (...args) => {
      if (anyDirty() && !window.confirm(DEFAULT_MESSAGE)) return;
      clearAll();
      fn.apply(navigator, args);
    };
    navigator.push = guard(push);
    navigator.replace = guard(replace);

    // --- un guardado exitoso limpia ---
    const interceptorId = API.interceptors.response.use((response) => {
      const method = String(response?.config?.method || "").toLowerCase();
      const url = String(response?.config?.url || "");
      if (["post", "put", "patch", "delete"].includes(method) && !NON_SAVE_URL.test(url)) clearAll();
      return response;
    });

    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("keydown", onKeyDownCapture, true);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
      document.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("keydown", onKeyDownCapture, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      navigator.push = push;
      navigator.replace = replace;
      API.interceptors.response.eject(interceptorId);
    };
  }, [navigator]);

  return null;
}
