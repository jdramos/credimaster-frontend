import React, { useState } from "react";
import { Box, CssBaseline, AppBar, Toolbar, IconButton, Typography, useMediaQuery } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Sidebar from "./Sidebar";

const drawerWidth = 240;

function ResponsiveSidebar({ children, themeMode, setThemeMode }) {
  const isMobile = useMediaQuery("(max-width:900px)");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* AppBar solo en mobile */}
      {isMobile && (
        <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
          <Toolbar>
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 800 }}>
              Credimaster
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Drawer */}
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }} aria-label="menu">
        {/* Drawer temporal (mobile) */}
        {isMobile && (
          <Sidebar
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            drawerWidth={drawerWidth}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
          />
        )}

        {/* Drawer permanente (desktop) */}
        {!isMobile && (
          <Sidebar
            variant="permanent"
            open
            onClose={() => {}}
            drawerWidth={drawerWidth}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
          />
        )}
      </Box>

      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: isMobile ? 8 : 0,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default ResponsiveSidebar;