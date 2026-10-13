import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import { isFormRoute } from "./UnsavedChangesGuard";

// Atajos de teclado de la app (montado una vez en AppLayoutMenu).
//
// Alt + letra para ir a pantallas. Se usa e.code (tecla física) para que
// funcione igual en Mac (Option) y con cualquier distribución. Se exige Alt
// SIN Ctrl: en teclados en español AltGr llega como Ctrl+Alt (AltGr+Q = @),
// y no se le debe robar esa tecla a nadie que esté escribiendo. Se evitan
// Alt+F / Alt+E / Alt+D, que abren menús o la barra de direcciones del
// navegador.
//
// Cada atajo de navegación solo funciona si el usuario ve esa opción en su
// menú (mismos permisos/módulos que el menú lateral).

export const NAV_SHORTCUTS = [
  { code: "KeyI", keys: "Alt+I", label: "Inicio", to: "/", always: true },
  { code: "KeyC", keys: "Alt+C", label: "Clientes", to: "/clientes" },
  { code: "KeyR", keys: "Alt+R", label: "Créditos", to: "/creditos" },
  { code: "KeyP", keys: "Alt+P", label: "Pagos", to: "/pagos" },
  { code: "KeyB", keys: "Alt+B", label: "Cobranza", to: "/cobranza" },
  { code: "KeyA", keys: "Alt+A", label: "Bandeja de aprobación", to: "/bandeja-de-aprobacion" },
  { code: "KeyO", keys: "Alt+O", label: "Día operativo", to: "/cierre-del-dia" },
  { code: "KeyM", keys: "Alt+M", label: "Movimientos de caja", to: "/caja/movimientos" },
  { code: "KeyG", keys: "Alt+G", label: "Dashboard de saldos", to: "/dashboard/saldos" },
  { code: "KeyN", keys: "Alt+N", label: "Nuevo cliente", to: "/clientes/agregar", parent: "/clientes", permission: "clientes.insertar" },
  { code: "KeyS", keys: "Alt+S", label: "Nueva solicitud de crédito", to: "/creditos/agregar", parent: "/creditos", permission: "creditos.insertar" },
];

export const SHORTCUT_BY_PATH = Object.fromEntries(NAV_SHORTCUTS.map((s) => [s.to, s.keys]));

export const ACTION_SHORTCUTS = [
  { keys: "Ctrl+K  o  /", label: "Búsqueda general (clientes, cédulas, créditos, pagos…)" },
  { keys: "↑ ↓  y  Enter", label: "Moverse y abrir un resultado de la búsqueda" },
  { keys: "Ctrl+S", label: "Guardar el formulario o la ventana abierta" },
  { keys: "Esc", label: "Cerrar la ventana abierta o la búsqueda" },
  { keys: "?", label: "Ver esta lista de atajos" },
];

// Panel de superadmin: Alt + número en el orden de la barra superior.
export const SUPERADMIN_NAV_SHORTCUTS = [
  { code: "Digit1", keys: "Alt+1", label: "Empresas", to: "/superadmin", always: true },
  { code: "Digit2", keys: "Alt+2", label: "Facturas", to: "/superadmin/facturas", always: true },
  { code: "Digit3", keys: "Alt+3", label: "Soporte", to: "/superadmin/soporte", always: true },
  { code: "Digit4", keys: "Alt+4", label: "Ayuda de pantallas", to: "/superadmin/ayuda", always: true },
  { code: "KeyN", keys: "Alt+N", label: "Nueva empresa", to: "/superadmin?nueva=1", always: true },
];

export const SUPERADMIN_ACTION_SHORTCUTS = ACTION_SHORTCUTS.filter(
  (a) => !/búsqueda/i.test(a.label),
);

// "Guardar", "Guardar cambios", "Registrar pago", "Grabar", "Crear"...
const SAVE_RE = /^(guardar|registrar|grabar|crear)\b/i;

const isEditable = (el) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName));

const topmostDialog = () => {
  const all = document.querySelectorAll('.MuiDialog-root [role="dialog"]');
  return all.length ? all[all.length - 1] : null;
};

// Ctrl+S: presiona el botón de guardar de la ventana abierta (o de la
// página, solo en pantallas de captura -- en una lista "Registrar..." suele
// abrir otra cosa). Prefiere el botón principal (contained) y, si hay
// varios, el último (el de la barra de acciones).
export const triggerSave = (pathname) => {
  const dialog = topmostDialog();
  const scope = dialog || (isFormRoute(pathname) ? document.querySelector("main") : null);
  if (!scope) {
    toast.info("No hay un formulario para guardar en esta pantalla.");
    return false;
  }
  const buttons = [...scope.querySelectorAll("button")].filter(
    (b) => !b.disabled && !b.closest('[hidden], [aria-hidden="true"]') && SAVE_RE.test(b.textContent.trim()),
  );
  if (!buttons.length) {
    toast.info("No hay un botón Guardar disponible en esta pantalla.");
    return false;
  }
  const contained = buttons.filter((b) => b.classList.contains("MuiButton-contained"));
  const target = (contained.length ? contained : buttons)[(contained.length ? contained : buttons).length - 1];
  target.click();
  return true;
};

export default function KeyboardShortcuts({
  visiblePaths = new Set(),
  hasPermission = () => false,
  helpOpen,
  onHelpOpenChange,
  pathname,
  shortcuts = NAV_SHORTCUTS,
  actions = ACTION_SHORTCUTS,
}) {
  const navigate = useNavigate();
  const [localHelp, setLocalHelp] = useState(false);
  const open = helpOpen ?? localHelp;
  const setOpen = useCallback((v) => (onHelpOpenChange ? onHelpOpenChange(v) : setLocalHelp(v)), [onHelpOpenChange]);

  const isAllowed = useCallback(
    (s) => {
      if (s.always) return true;
      if (s.parent) return visiblePaths.has(s.parent) && (!s.permission || hasPermission(s.permission));
      return visiblePaths.has(s.to);
    },
    [visiblePaths, hasPermission],
  );

  const allowedNav = useMemo(() => shortcuts.filter(isAllowed), [shortcuts, isAllowed]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.defaultPrevented || e.repeat) return;

      // "?" -- lista de atajos (no mientras se escribe).
      if (e.key === "?" && !e.ctrlKey && !e.altKey && !e.metaKey && !isEditable(e.target)) {
        e.preventDefault();
        setOpen(true);
        return;
      }

      // Ctrl+S / Cmd+S -- guardar.
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.code === "KeyS") {
        e.preventDefault();
        triggerSave(pathname);
        return;
      }

      // Alt + letra -- ir a una pantalla (Alt sin Ctrl: no es AltGr).
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const s = shortcuts.find((x) => x.code === e.code);
        if (!s) return;
        e.preventDefault();
        if (!isAllowed(s)) {
          toast.info(`No tiene acceso a "${s.label}".`);
          return;
        }
        navigate(s.to);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, isAllowed, setOpen, pathname, shortcuts]);

  const Row = ({ keys, label }) => (
    <TableRow>
      <TableCell sx={{ width: 170, py: 0.9, borderBottom: "1px solid", borderColor: "divider" }}>
        <Box
          component="kbd"
          sx={{
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 800,
            px: 1,
            py: 0.4,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "action.hover",
            whiteSpace: "pre",
          }}
        >
          {keys}
        </Box>
      </TableCell>
      <TableCell sx={{ py: 0.9, fontSize: 13.5, borderBottom: "1px solid", borderColor: "divider" }}>{label}</TableCell>
    </TableRow>
  );

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>Atajos de teclado</DialogTitle>
      <DialogContent dividers>
        <Typography fontSize={12} fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.6, mb: 0.5 }}>
          Ir a
        </Typography>
        <Table size="small" sx={{ mb: 2.5 }}>
          <TableBody>
            {allowedNav.map((s) => (
              <Row key={s.code} keys={s.keys} label={s.label} />
            ))}
          </TableBody>
        </Table>
        <Typography fontSize={12} fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.6, mb: 0.5 }}>
          Acciones
        </Typography>
        <Table size="small">
          <TableBody>
            {actions.map((s) => (
              <Row key={s.keys} keys={s.keys} label={s.label} />
            ))}
          </TableBody>
        </Table>
        <Typography fontSize={12} color="text.secondary" sx={{ mt: 2 }}>
          En Mac use Option en lugar de Alt, y Cmd en lugar de Ctrl.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)} sx={{ textTransform: "none" }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
