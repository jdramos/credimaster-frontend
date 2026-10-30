// src/pages/LoginPage.js
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link as RouterLink } from "react-router-dom";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
} from "@mui/material";
import BrandMark from "../components/BrandMark";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import MfaCodeStep from "../components/security/MfaCodeStep";
import MfaEnrollPanel from "../components/security/MfaEnrollPanel";
import RecoveryCodesPanel from "../components/security/RecoveryCodesPanel";
import { startLoginEnrollment, confirmLoginEnrollment } from "../api/mfa";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";

// Colores de marca del login (panel izquierdo). Fijos, no del tema: el panel
// es azul en modo claro y oscuro, y el isotipo trae el navy horneado.
const BRAND = {
  navy: "#003E8A",
  deep: "#042C53",
  sky: "#85B7EB",
  mist: "#D6E4F5",
  gold: "#FAC775",
};

// Áreas del producto (no módulos sueltos): junto con "+20 módulos" muestran
// lo amplio del sistema sin dar a entender que eso es todo.
const AREAS = [
  { label: "Crédito y cobranza", color: "#378ADD", Icon: PaymentsOutlinedIcon },
  { label: "Finanzas y contabilidad", color: "#D85A30", Icon: CalculateOutlinedIcon },
  { label: "Cumplimiento CONAMI", color: "#7F77DD", Icon: VerifiedUserOutlinedIcon },
  { label: "Gestión administrativa", color: "#BA7517", Icon: ApartmentOutlinedIcon },
];

export default function LoginPage() {
  const { login, completeMfaLogin } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Segundo paso de 2FA: { mode: 'verify' | 'enroll', mfa_token, ... }.
  const [mfa, setMfa] = useState(null);
  // Tras configurar 2FA en el login: sesión lista + códigos por mostrar.
  const [enrolledLogin, setEnrolledLogin] = useState(null);

  const [sessionDialog, setSessionDialog] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");

  useEffect(() => {
    const msg = localStorage.getItem("sessionExpiredMessage");

    if (msg) {
      setSessionMessage(msg);
      setSessionDialog(true);
      localStorage.removeItem("sessionExpiredMessage");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(username.trim(), password);
      if (result?.mfa) {
        setMfa(result.mfa);
        setPassword("");
      } else if (result) {
        navigate(result.type === "SUPERADMIN" ? "/superadmin" : "/");
      } else {
        setError(
          "Ingreso fallido. Verifique sus credenciales e intente nuevamente.",
        );
      }
    } catch (err) {
      console.error(err);
      setError(
        "Ingreso fallido. Verifique sus credenciales e intente nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const goHome = (type) => navigate(type === "SUPERADMIN" ? "/superadmin" : "/");

  const backToPassword = () => {
    setMfa(null);
    setEnrolledLogin(null);
    setError(null);
  };

  const finishMfaLogin = (data) => {
    const result = completeMfaLogin(data, mfa?.username);
    goHome(result?.type);
  };

  let mfaContent = null;
  if (enrolledLogin) {
    mfaContent = (
      <RecoveryCodesPanel
        codes={enrolledLogin.recovery_codes}
        doneLabel="Entrar a CrediMaster"
        onDone={() => finishMfaLogin(enrolledLogin)}
      />
    );
  } else if (mfa?.mode === "verify") {
    mfaContent = (
      <MfaCodeStep
        mfaToken={mfa.mfa_token}
        fullName={mfa.full_name}
        rememberDays={mfa.remember_device_days}
        onVerified={finishMfaLogin}
        onCancel={backToPassword}
      />
    );
  } else if (mfa?.mode === "enroll") {
    mfaContent = (
      <MfaEnrollPanel
        intro="Su usuario requiere verificación en dos pasos. Configúrela ahora para entrar; solo toma un minuto."
        rememberDays={mfa.remember_device_days}
        start={() => startLoginEnrollment(mfa.mfa_token)}
        confirm={(code, remember) => confirmLoginEnrollment({ mfa_token: mfa.mfa_token, code, remember_device: remember })}
        onEnrolled={setEnrolledLogin}
        onCancel={backToPassword}
        cancelLabel="Volver al inicio de sesión"
      />
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: (t) => t.palette.background.default,
        px: 2,
        py: 3,
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: { xs: 460, md: 980 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" },
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        {/* Panel de marca: en celular queda como franja superior con logo y lema. */}
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            bgcolor: BRAND.deep,
            color: "#FFFFFF",
            p: { xs: 2.5, md: 4 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: { xs: 1.5, md: 3 },
          }}
        >
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              right: -70,
              top: -70,
              width: 220,
              height: 220,
              borderRadius: "50%",
              bgcolor: "#7F77DD",
              opacity: 0.2,
            }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, position: "relative" }}>
            <BrandMark size={52} sx={{ border: "2px solid rgba(255,255,255,0.35)" }} />
            <Box>
              <Typography sx={{ fontWeight: 900, lineHeight: 1.1, fontSize: 22 }}>
                CrediMaster
              </Typography>
              <Typography variant="caption" sx={{ color: BRAND.sky }}>
                ERP para microfinanzas
              </Typography>
            </Box>
          </Box>

          <Box sx={{ position: "relative" }}>
            <Typography
              component="h1"
              sx={{ fontWeight: 800, lineHeight: 1.25, fontSize: { xs: 20, md: 28 } }}
            >
              El ERP para microfinanzas{" "}
              <Box component="span" sx={{ color: BRAND.gold }}>más completo</Box>{" "}
              de Nicaragua
            </Typography>

            <Typography variant="body2" sx={{ color: BRAND.mist, mt: 1.5 }}>
              <Box component="span" sx={{ color: BRAND.gold, fontWeight: 800 }}>+20 módulos</Box>{" "}
              integrados en una sola plataforma
            </Typography>

            <Box
              sx={{
                display: { xs: "none", sm: "grid" },
                gridTemplateColumns: "1fr 1fr",
                gap: 1.5,
                mt: 2.5,
              }}
            >
              {AREAS.map(({ label, color, Icon }) => (
                <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 2,
                      bgcolor: color,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Typography
            variant="caption"
            sx={{ color: BRAND.sky, position: "relative", display: { xs: "none", md: "flex" }, alignItems: "center", gap: 0.5 }}
          >
            <LockOutlinedIcon sx={{ fontSize: 14 }} />
            Conexión cifrada · Verificación en dos pasos
          </Typography>
        </Box>

        {/* Formulario */}
        <Box sx={{ display: "flex", flexDirection: "column", bgcolor: "background.paper" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", height: 5 }}>
            {AREAS.map(({ label, color }) => (
              <Box key={label} sx={{ bgcolor: color }} />
            ))}
          </Box>
          <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
        <CardContent sx={{ p: { xs: 3, md: 4 }, width: "100%" }}>
          {mfaContent || (
          <>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Bienvenido
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Ingrese con su usuario de la institución.
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
                      aria-label={
                        showPass ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                      onClick={() => setShowPass((p) => !p)}
                      tabIndex={-1}
                    >
                      {showPass ? (
                        <VisibilityOffOutlinedIcon />
                      ) : (
                        <VisibilityOutlinedIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Typography variant="body2" sx={{ textAlign: "right", mt: 0.5 }}>
              <Link component={RouterLink} to="/recuperar-password" underline="hover">
                ¿Olvidó su contraseña?
              </Link>
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{
                py: 1.2,
                fontWeight: 900,
                borderRadius: 2,
                bgcolor: BRAND.navy,
                color: "#FFFFFF",
                "&:hover": { bgcolor: BRAND.deep },
              }}
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
              sx={{
                display: "block",
                textAlign: "center",
                mt: 2,
                color: "text.secondary",
              }}
            >
              Por seguridad, no comparta sus credenciales. Si detecta actividad
              inusual, contacte al administrador.
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: "block", textAlign: "center", mt: 1, color: "text.disabled" }}
            >
              © {new Date().getFullYear()} CrediMaster
            </Typography>
          </Box>
          </>
          )}
        </CardContent>
          </Box>
        </Box>
      </Card>

      <Dialog open={sessionDialog} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            bgcolor: "var(--cm-warning-soft, #FFF3CD)",
            color: "var(--cm-error-text, #851104)",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          Sesión Expirada
        </DialogTitle>

        <DialogContent sx={{ py: 4 }}>
          <Typography variant="h6" align="center">
            {sessionMessage}
          </Typography>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
          <Button variant="contained" onClick={() => setSessionDialog(false)}>
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
