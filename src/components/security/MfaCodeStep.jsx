import React, { useState } from "react";
import { Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, Link, TextField, Typography } from "@mui/material";
import PhonelinkLockOutlinedIcon from "@mui/icons-material/PhonelinkLockOutlined";
import { apiErrorMessage, verifyLoginCode } from "../../api/mfa";

// Segundo paso del login: código de 6 dígitos de la app autenticadora o, si
// perdió el teléfono, uno de sus códigos de recuperación.
export default function MfaCodeStep({ mfaToken, fullName, rememberDays, onVerified, onCancel }) {
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  const clean = useRecovery ? code.trim() : code.replace(/\D/g, "");
  const canSubmit = useRecovery ? clean.replace(/[^0-9a-z]/gi, "").length === 10 : clean.length === 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setError(null);
    setLoading(true);
    try {
      const data = await verifyLoginCode({ mfa_token: mfaToken, code: clean, remember_device: remember });
      onVerified(data);
    } catch (err) {
      const errCode = err?.response?.data?.code;
      setError(apiErrorMessage(err, "No se pudo verificar el código."));
      if (errCode === "MFA_TOKEN_EXPIRED") setExpired(true);
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const toggleRecovery = () => {
    setUseRecovery((v) => !v);
    setCode("");
    setError(null);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <PhonelinkLockOutlinedIcon color="primary" />
        <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
          Verificación en dos pasos
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
        {fullName ? `${fullName}, ingrese` : "Ingrese"}{" "}
        {useRecovery
          ? "uno de sus códigos de recuperación (cada código sirve una sola vez)."
          : "el código de 6 dígitos que muestra su aplicación autenticadora."}
      </Typography>

      {error && (
        <Alert severity="error" variant="outlined" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {!expired && (
        <>
          <TextField
            label={useRecovery ? "Código de recuperación" : "Código de verificación"}
            value={code}
            onChange={(e) => setCode(useRecovery ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, "").slice(0, 6))}
            fullWidth
            autoFocus
            margin="normal"
            autoComplete="one-time-code"
            placeholder={useRecovery ? "XXXXX-XXXXX" : "123456"}
            inputProps={{
              inputMode: useRecovery ? "text" : "numeric",
              maxLength: useRecovery ? 11 : 6,
              "aria-label": useRecovery ? "Código de recuperación" : "Código de verificación",
              style: { letterSpacing: useRecovery ? 2 : 8, fontSize: 22, textAlign: "center", fontFamily: "monospace" },
            }}
          />

          {rememberDays > 0 && (
            <FormControlLabel
              control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
              label={`Recordar este equipo por ${rememberDays} días`}
            />
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={!canSubmit || loading}
            sx={{ mt: 1, py: 1.2, fontWeight: 900, borderRadius: 2 }}
          >
            {loading ? <CircularProgress size={18} color="inherit" /> : "Verificar"}
          </Button>

          <Typography variant="body2" sx={{ textAlign: "center", mt: 1.5 }}>
            <Link component="button" type="button" underline="hover" onClick={toggleRecovery}>
              {useRecovery ? "Usar el código de la aplicación" : "¿No tiene su teléfono? Use un código de recuperación"}
            </Link>
          </Typography>
        </>
      )}

      <Button fullWidth onClick={onCancel} sx={{ mt: 1, textTransform: "none" }}>
        Volver al inicio de sesión
      </Button>
    </Box>
  );
}
