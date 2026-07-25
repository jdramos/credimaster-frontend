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
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  Alert,
  Snackbar,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";

import { UserContext } from "../contexts/UserContext";
import API from "../api";

const emptyPasswordForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

function Navbar({ toggleSidebar, handleLogout, notificationsCount = 0 }) {

  const { user, fullName } = useContext(UserContext);

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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

  const handleOpenPasswordDialog = () => {
    setPasswordForm(emptyPasswordForm);
    setPasswordError("");
    setShowPasswords(false);
    setPasswordDialogOpen(true);
    handleMenuClose();
  };

  const handleClosePasswordDialog = () => {
    if (savingPassword) return;
    setPasswordDialogOpen(false);
  };

  const handlePasswordFieldChange = (field) => (e) => {
    setPasswordForm((f) => ({ ...f, [field]: e.target.value }));
    setPasswordError("");
  };

  const handleSubmitPasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword) {
      setPasswordError("Ingrese su contraseña actual.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("La nueva contraseña debe ser diferente a la actual.");
      return;
    }

    try {
      setSavingPassword(true);
      setPasswordError("");

      await API.put(`/api/users/${user}/reset-password`, {
        currentPassword,
        newPassword,
      });

      setPasswordDialogOpen(false);
      setPasswordSuccess(true);
    } catch (err) {
      setPasswordError(
        err.response?.data?.message ||
          err.response?.data?.errors ||
          "No se pudo actualizar la contraseña.",
      );
    } finally {
      setSavingPassword(false);
    }
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

                <MenuItem onClick={handleOpenPasswordDialog}>
                  <LockOutlinedIcon
                    fontSize="small"
                    style={{ marginRight: 10 }}
                  />
                  Cambiar contraseña
                </MenuItem>

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

      <Dialog open={passwordDialogOpen} onClose={handleClosePasswordDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Cambiar contraseña</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Contraseña actual"
              type={showPasswords ? "text" : "password"}
              value={passwordForm.currentPassword}
              onChange={handlePasswordFieldChange("currentPassword")}
              autoFocus
            />
            <TextField
              fullWidth
              size="small"
              label="Nueva contraseña"
              type={showPasswords ? "text" : "password"}
              value={passwordForm.newPassword}
              onChange={handlePasswordFieldChange("newPassword")}
              helperText="Mínimo 8 caracteres"
            />
            <TextField
              fullWidth
              size="small"
              label="Confirmar nueva contraseña"
              type={showPasswords ? "text" : "password"}
              value={passwordForm.confirmPassword}
              onChange={handlePasswordFieldChange("confirmPassword")}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPasswords((v) => !v)}
                      edge="end"
                    >
                      {showPasswords ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {passwordError && <Alert severity="error">{passwordError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordDialog} disabled={savingPassword} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitPasswordChange}
            disabled={savingPassword}
            sx={{ textTransform: "none" }}
          >
            {savingPassword ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={passwordSuccess}
        autoHideDuration={4000}
        onClose={() => setPasswordSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity="success" onClose={() => setPasswordSuccess(false)}>
          Contraseña actualizada correctamente.
        </Alert>
      </Snackbar>

    </Box>
  );
}

export default Navbar;