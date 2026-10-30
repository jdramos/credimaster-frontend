import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import PointOfSaleOutlinedIcon from "@mui/icons-material/PointOfSaleOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";

// Acceso rápido "+ Nuevo" de la barra superior: solo lo que se crea en el día
// a día. Cada opción aparece si el usuario ve su pantalla en el menú lateral
// (`parent` en visiblePaths: mismos permisos, módulos y paquete) y además tiene
// el permiso de crear. `?nuevo=1` abre el formulario al llegar (ver
// hooks/useOpenOnNuevo); las pantallas que primero piden elegir algo (caja,
// crédito, pestaña de facturas) solo se abren.
export const QUICK_CREATE_GROUPS = [
  {
    label: "Operación diaria",
    color: "#378ADD",
    items: [
      { label: "Registrar pago", to: "/pagos?nuevo=1", parent: "/pagos", permission: "pagos.insertar", Icon: PaymentsOutlinedIcon },
      { label: "Solicitud de crédito", to: "/creditos/agregar", parent: "/creditos", permission: "creditos.insertar", keys: "Alt+S", Icon: NoteAddOutlinedIcon },
      { label: "Cliente", to: "/clientes/agregar", parent: "/clientes", permission: "clientes.insertar", keys: "Alt+N", Icon: PersonAddAltOutlinedIcon },
      { label: "Gestión de cobro", to: "/cobranza", parent: "/cobranza", permission: "cobranza.gestionar", Icon: SupportAgentOutlinedIcon },
    ],
  },
  {
    label: "Caja y finanzas",
    color: "#D85A30",
    items: [
      { label: "Movimiento de caja", to: "/caja/movimientos", parent: "/caja/movimientos", permission: "caja.movimientos.registrar", Icon: PointOfSaleOutlinedIcon },
      { label: "Factura de proveedor", to: "/cuentas-por-pagar", parent: "/cuentas-por-pagar", permission: "cxp.gestionar", Icon: ReceiptLongOutlinedIcon },
      { label: "Comprobante contable", to: "/contabilidad/libro-diario?nuevo=1", parent: "/contabilidad/libro-diario", permission: "contabilidad.asientos.crear", Icon: MenuBookOutlinedIcon },
    ],
  },
  {
    label: "Administración",
    color: "#7F77DD",
    items: [
      { label: "Nota de crédito o débito", to: "/creditos/notas?nuevo=1", parent: "/creditos/notas", permission: "creditos.ajustes.crear", Icon: TuneOutlinedIcon },
      { label: "Empleado", to: "/rrhh/empleados?nuevo=1", parent: "/rrhh/empleados", permission: "rrhh.empleados.gestionar", Icon: BadgeOutlinedIcon },
    ],
  },
];

export const visibleQuickCreateGroups = (visiblePaths, hasPermission) =>
  QUICK_CREATE_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => visiblePaths.has(i.parent) && hasPermission(i.permission)),
  })).filter((g) => g.items.length > 0);

export default function QuickCreateMenu({ visiblePaths = new Set(), hasPermission = () => false, compact = false }) {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const groups = useMemo(() => visibleQuickCreateGroups(visiblePaths, hasPermission), [visiblePaths, hasPermission]);

  // Alt+Shift+N abre el menú (Alt+N y Alt+S ya son "Nuevo cliente" y "Nueva solicitud").
  const buttonId = "quick-create-button";
  const openFromKeyboard = useCallback(() => {
    const el = document.getElementById(buttonId);
    if (el) setAnchor(el);
  }, []);
  useEffect(() => {
    if (!groups.length) return undefined;
    const onKeyDown = (e) => {
      if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === "KeyN") {
        e.preventDefault();
        openFromKeyboard();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [groups.length, openFromKeyboard]);

  if (!groups.length) return null;

  const go = (to) => {
    setAnchor(null);
    navigate(to);
  };

  return (
    <>
      <Tooltip title="Nuevo (Alt+Shift+N)">
        {compact ? (
          <IconButton
            id={buttonId}
            aria-label="Nuevo"
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={{ bgcolor: "#003E8A", color: "#FFFFFF", "&:hover": { bgcolor: "#042C53" } }}
          >
            <AddIcon />
          </IconButton>
        ) : (
          <Button
            id={buttonId}
            variant="contained"
            startIcon={<AddIcon />}
            endIcon={<KeyboardArrowDownIcon />}
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              borderRadius: 2,
              bgcolor: "#003E8A",
              color: "#FFFFFF",
              "&:hover": { bgcolor: "#042C53" },
              whiteSpace: "nowrap",
            }}
          >
            Nuevo
          </Button>
        )}
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { minWidth: 280, borderRadius: 2, mt: 0.5 } }}
        MenuListProps={{ dense: true }}
      >
        {groups.flatMap((g, gi) => [
          gi > 0 ? <Divider key={`d-${g.label}`} /> : null,
          <ListSubheader key={`h-${g.label}`} sx={{ lineHeight: "28px", fontSize: 11, fontWeight: 800, bgcolor: "transparent" }}>
            {g.label}
          </ListSubheader>,
          ...g.items.map(({ label, to, keys, Icon }) => (
            <MenuItem key={to} onClick={() => go(to)}>
              <ListItemIcon sx={{ color: g.color }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={label} />
              {keys ? (
                <Box component="kbd" sx={{ fontFamily: "inherit", ml: 2 }}>
                  <Typography variant="caption" color="text.secondary">{keys}</Typography>
                </Box>
              ) : null}
            </MenuItem>
          )),
        ])}
      </Menu>
    </>
  );
}
