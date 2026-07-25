import React from "react";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

// Shell simplificado para el módulo superadmin — a diferencia de
// AppLayoutMenu.jsx (menú lateral con muchas secciones por tenant), en v1
// solo hay una pantalla (Empresas), así que no hace falta un drawer de
// navegación completo.
export default function SuperAdminLayout({ children, onLogout }) {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: "#111827" }}>
        <Toolbar sx={{ gap: 1.5 }}>
          <AdminPanelSettingsIcon />
          <Typography variant="h6" fontWeight={800} sx={{ flexGrow: 1 }}>
            CrediMaster — Administración de la plataforma
          </Typography>
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
