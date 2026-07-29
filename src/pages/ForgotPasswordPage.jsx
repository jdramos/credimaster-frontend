import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  CircularProgress,
  Divider,
  Chip,
  Link,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import { requestPasswordReset } from "../api/passwordReset";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await requestPasswordReset(email.trim());
      setResult({ severity: "success", message: res?.message || "Si el correo está registrado, recibirá un enlace de recuperación en breve." });
    } catch (err) {
      setResult({
        severity: "error",
        message: err.response?.data?.message || "No se pudo procesar la solicitud. Intente de nuevo.",
      });
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
              label="Recuperación de contraseña"
              sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "white", fontWeight: 800 }}
            />
          </Box>
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            ¿Olvidó su contraseña?
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Ingrese el correo asociado a su cuenta y le enviaremos un enlace para restablecer su contraseña.
          </Typography>

          {result && (
            <Alert severity={result.severity} variant="outlined" sx={{ mt: 2 }}>
              {result.message}
            </Alert>
          )}

          {!result || result.severity === "error" ? (
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <TextField
                label="Correo"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                autoFocus
                margin="normal"
                autoComplete="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutlineIcon fontSize="small" />
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
                    Enviando...
                  </Box>
                ) : (
                  "Enviar enlace de recuperación"
                )}
              </Button>
            </Box>
          ) : null}

          <Typography variant="body2" sx={{ textAlign: "center", mt: 3 }}>
            <Link component={RouterLink} to="/login" underline="hover">
              Volver a iniciar sesión
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
