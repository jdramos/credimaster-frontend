import React, { useState } from "react";
import { AppBar, Box, Button, IconButton, Toolbar, Tooltip, Typography } from "@mui/material";
import KeyboardRoundedIcon from "@mui/icons-material/KeyboardRounded";
import KeyboardShortcuts, { SUPERADMIN_NAV_SHORTCUTS, SUPERADMIN_ACTION_SHORTCUTS } from "./KeyboardShortcuts";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import BusinessIcon from "@mui/icons-material/Business";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import HandshakeIcon from "@mui/icons-material/Handshake";
import { useLocation, useNavigate } from "react-router-dom";

// Shell del módulo superadmin. Barra superior con navegación entre las
// secciones de la administración de la plataforma (Empresas y Soporte).
export default function SuperAdminLayout({ children, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const shortcutFor = (to) => SUPERADMIN_NAV_SHORTCUTS.find((sc) => sc.to === to)?.keys;

  const navItems = [
    { label: "Empresas", to: "/superadmin", icon: <BusinessIcon /> },
    { label: "Facturas", to: "/superadmin/facturas", icon: <ReceiptLongIcon /> },
    { label: "Aliados", to: "/superadmin/aliados", icon: <HandshakeIcon /> },
    { label: "Soporte", to: "/superadmin/soporte", icon: <HeadsetMicIcon /> },
    { label: "Ayuda de pantallas", to: "/superadmin/ayuda", icon: <HelpOutlineIcon /> },
    { label: "Seguridad", to: "/superadmin/seguridad", icon: <SecurityRoundedIcon /> },
  ];

  const isActive = (to) =>
    to === "/superadmin"
      ? location.pathname === "/superadmin" || location.pathname === "/superadmin/"
      : location.pathname.startsWith(to);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: "#111827" }}>
        <Toolbar sx={{ gap: 1.5, flexWrap: "wrap" }}>
          <AdminPanelSettingsIcon />
          <Typography variant="h6" fontWeight={800}>
            CrediMaster — Administración de la plataforma
          </Typography>

          <Box sx={{ display: "flex", gap: 0.5, ml: { xs: 0, md: 2 } }}>
            {navItems.map((item) => (
              <Tooltip key={item.to} title={shortcutFor(item.to) || ""}>
                <Button
                  color="inherit"
                  startIcon={item.icon}
                  onClick={() => navigate(item.to)}
                  sx={{
                    textTransform: "none",
                    fontWeight: isActive(item.to) ? 800 : 500,
                    borderBottom: isActive(item.to) ? "2px solid #90caf9" : "2px solid transparent",
                    borderRadius: 0,
                  }}
                >
                  {item.label}
                </Button>
              </Tooltip>
            ))}
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Atajos de teclado (?)">
            <IconButton color="inherit" onClick={() => setShortcutsOpen(true)} aria-label="Atajos de teclado">
              <KeyboardRoundedIcon />
            </IconButton>
          </Tooltip>

          <Button
            color="inherit"
            startIcon={<LogoutRoundedIcon />}
            onClick={onLogout}
            sx={{ textTransform: "none" }}
          >
            Salir
          </Button>
        </Toolbar>
      </AppBar>

      {/* component="main": UnsavedChangesGuard distingue así el contenido
          de la página de la barra superior. */}
      <Box component="main" sx={{ p: 2 }}>{children}</Box>

      <KeyboardShortcuts
        shortcuts={SUPERADMIN_NAV_SHORTCUTS}
        actions={SUPERADMIN_ACTION_SHORTCUTS}
        helpOpen={shortcutsOpen}
        onHelpOpenChange={setShortcutsOpen}
        pathname={location.pathname}
      />
    </Box>
  );
}
