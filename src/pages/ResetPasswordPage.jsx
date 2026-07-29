import React, { useState } from "react";
import { Link as RouterLink, useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider,
  Chip,
  Link,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { confirmPasswordReset } from "../api/passwordReset";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");
  const tenantCode = searchParams.get("tenant");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const linkValid = Boolean(token && tenantCode);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset({ tenant_code: tenantCode, token, newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo restablecer la contraseña. El enlace puede haber expirado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: (t) => t.palette.background.default,
        px: 2,
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 440,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 2.5, color: "primary.contrastText", bgcolor: "primary.main" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <AccountBalanceIcon />
            <Box>
              <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }} variant="h6">
                Credimaster
              </Typography>
              <Typography sx={{ opacity: 0.9 }} variant="body2">
                Acceso seguro a la plataforma
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 1.5 }}>
            <Chip
              size="small"
              label="Nueva contraseña"
              sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "white", fontWeight: 800 }}
            />
          </Box>
        </Box>

        <CardContent sx={{ p: 3 }}>
          {!linkValid ? (
            <>
              <Alert severity="error" variant="outlined">
                Este enlace de recuperación es inválido. Solicite uno nuevo desde la pantalla de inicio de sesión.
              </Alert>
              <Typography variant="body2" sx={{ textAlign: "center", mt: 3 }}>
                <Link component={RouterLink} to="/recuperar-password" underline="hover">
                  Solicitar un nuevo enlace
                </Link>
              </Typography>
            </>
          ) : success ? (
            <>
              <Alert severity="success" variant="outlined">
                Contraseña restablecida correctamente. Ya puede iniciar sesión con su nueva contraseña.
              </Alert>
              <Button
                variant="contained"
                fullWidth
                size="large"
                sx={{ mt: 3, py: 1.2, fontWeight: 900, borderRadius: 2 }}
                onClick={() => navigate("/login")}
              >
                Ir a iniciar sesión
              </Button>
            </>
          ) : (
            <>
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                Cree su nueva contraseña
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                Debe tener al menos 8 caracteres.
              </Typography>

              {error && (
                <Alert severity="error" variant="outlined" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                <TextField
                  label="Nueva contraseña"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  required
                  autoFocus
                  margin="normal"
                  autoComplete="new-password"
                  type={showPass ? "text" : "password"}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                          onClick={() => setShowPass((p) => !p)}
                          tabIndex={-1}
                        >
                          {showPass ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="Confirmar contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  required
                  margin="normal"
                  autoComplete="new-password"
                  type={showPass ? "text" : "password"}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />

                <Divider sx={{ my: 2 }} />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading}
                  sx={{ py: 1.2, fontWeight: 900, borderRadius: 2 }}
                >
                  {loading ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CircularProgress size={18} color="inherit" />
                      Guardando...
                    </Box>
                  ) : (
                    "Restablecer contraseña"
                  )}
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
