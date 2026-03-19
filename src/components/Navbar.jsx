import React, { useContext, useMemo, useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";

import { UserContext } from "../contexts/UserContext";

function Navbar({ toggleSidebar, handleLogout, notificationsCount = 0 }) {

  const { user, fullName } = useContext(UserContext);

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const initials = useMemo(() => {
    const s = String(fullName || "").trim();
    if (!s) return "?";
    return s.charAt(0).toUpperCase();
  }, [fullName]);

  const branchLabel = useMemo(() => {
    return (
      user?.branch_name ||
      user?.branchName ||
      (user?.branch_id ? `Sucursal ${user.branch_id}` : "")
    );
  }, [user]);

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogoutClick = () => {
    handleLogout();
    handleMenuClose();
  };

  return (
    <Box sx={{ flexGrow: 1 }}>

      <AppBar position="sticky" className="bac-appbar">

        <Toolbar className="bac-toolbar">

          {/* Botón hamburguesa */}
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            sx={{ mr: 1.5, display: { md: "none" } }}
            onClick={toggleSidebar}
          >
            <MenuIcon />
          </IconButton>

          {/* Nombre sistema */}
          <Typography
            variant="h6"
            className="bac-brand"
            sx={{ flexGrow: 1 }}
          >
            CrediMaster Web
          </Typography>

          {/* Sucursal */}
          {branchLabel && (
            <Box sx={{ mr: 2 }}>
              <span className="bac-branch-badge">
                {branchLabel}
              </span>
            </Box>
          )}

          {/* Notificaciones */}
          <IconButton color="inherit" className="bac-notify" sx={{ mr: 1 }}>
            <Badge badgeContent={notificationsCount} max={99}>
              <NotificationsNoneOutlinedIcon />
            </Badge>
          </IconButton>

          {/* Usuario */}
          {user && (
            <>
              <Typography
                variant="body2"
                className="bac-user"
                sx={{ mr: 1 }}
              >
                {fullName} · {user.role}
              </Typography>

              <IconButton onClick={handleMenuOpen} color="inherit">
                <Avatar className="bac-avatar">
                  {initials}
                </Avatar>
              </IconButton>

              <Menu
                className="bac-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >

                <Box sx={{ px: 2, py: 1 }}>

                  <Typography sx={{ fontWeight: 900 }}>
                    {fullName}
                  </Typography>

                  <Typography sx={{ fontSize: 12, color: "var(--bac-muted)" }}>
                    {user.role}
                  </Typography>

                </Box>

                <Divider />

                <MenuItem
                  onClick={handleLogoutClick}
                  className="bac-menu-item-danger"
                >
                  <LogoutOutlinedIcon
                    fontSize="small"
                    style={{ marginRight: 10 }}
                  />
                  Cerrar sesión
                </MenuItem>

              </Menu>
            </>
          )}

        </Toolbar>

      </AppBar>

    </Box>
  );
}

export default Navbar;