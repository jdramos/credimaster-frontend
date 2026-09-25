import React from "react";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import BusinessIcon from "@mui/icons-material/Business";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useLocation, useNavigate } from "react-router-dom";

// Shell del módulo superadmin. Barra superior con navegación entre las
// secciones de la administración de la plataforma (Empresas y Soporte).
export default function SuperAdminLayout({ children, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: "Empresas", to: "/superadmin", icon: <BusinessIcon /> },
    { label: "Facturas", to: "/superadmin/facturas", icon: <ReceiptLongIcon /> },
    { label: "Soporte", to: "/superadmin/soporte", icon: <HeadsetMicIcon /> },
    { label: "Ayuda de pantallas", to: "/superadmin/ayuda", icon: <HelpOutlineIcon /> },
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
              <Button
                key={item.to}
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
            ))}
          </Box>

          <Box sx={{ flexGrow: 1 }} />

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

      <Box sx={{ p: 2 }}>{children}</Box>
    </Box>
  );
}
