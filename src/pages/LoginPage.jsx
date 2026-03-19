// src/pages/LoginPage.js
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
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
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const success = await login(username.trim(), password);
      if (success) {
        navigate("/");
      } else {
        setError("Ingreso fallido. Verifique sus credenciales e intente nuevamente.");
      }
    } catch (err) {
      console.error(err);
      setError("Ingreso fallido. Verifique sus credenciales e intente nuevamente.");
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
        {/* Header bancario */}
        <Box
          sx={{
            p: 2.5,
            color: "primary.contrastText",
            bgcolor: "primary.main",
          }}
        >
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
              label="Autenticación"
              sx={{
                bgcolor: "rgba(255,255,255,0.18)",
                color: "white",
                fontWeight: 800,
              }}
            />
          </Box>
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            Iniciar sesión
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Ingrese sus credenciales para continuar.
          </Typography>

          {error && (
            <Alert severity="error" variant="outlined" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              label="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              required
              autoFocus
              margin="normal"
              autoComplete="username"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              margin="normal"
              autoComplete="current-password"
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
                  Validando acceso...
                </Box>
              ) : (
                "Acceder"
              )}
            </Button>

            <Typography
              variant="caption"
              sx={{ display: "block", textAlign: "center", mt: 2, color: "text.secondary" }}
            >
              Por seguridad, no comparta sus credenciales. Si detecta actividad inusual, contacte al administrador.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}