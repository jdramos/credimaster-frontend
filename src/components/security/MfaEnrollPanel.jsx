import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, TextField, Typography } from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import { apiErrorMessage } from "../../api/mfa";

// Configurar la app autenticadora: QR (o clave manual) + código de prueba.
// `start()` devuelve { qr_data_url, secret, account_name }; `confirm(code,
// remember)` activa y devuelve lo que corresponda al flujo (login o perfil).
export default function MfaEnrollPanel({ start, confirm, onEnrolled, onCancel, cancelLabel = "Cancelar", rememberDays = 0, intro }) {
  const [setup, setSetup] = useState(null);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(null);
  const [fatal, setFatal] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSetup = async () => {
    setLoadingSetup(true);
    setError(null);
    try {
      setSetup(await start());
      setFatal(false);
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo generar el código QR."));
      setFatal(true);
    } finally {
      setLoadingSetup(false);
    }
  };

  useEffect(() => {
    loadSetup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (code.length !== 6 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = await confirm(code, remember);
      onEnrolled(result);
    } catch (err) {
      const errCode = err?.response?.data?.code;
      setError(apiErrorMessage(err, "No se pudo activar la verificación."));
      if (errCode === "MFA_TOKEN_EXPIRED") setFatal(true);
      setCode("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleConfirm} noValidate>
      <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
        Configurar verificación en dos pasos
      </Typography>
      {intro && (
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {intro}
        </Typography>
      )}

      {error && (
        <Alert severity="error" variant="outlined" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {loadingSetup && (
        <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loadingSetup && setup && !fatal && (
        <>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <b>1.</b> Instale Google Authenticator, Microsoft Authenticator o Authy en su teléfono.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <b>2.</b> En la app, agregue una cuenta y escanee este código:
          </Typography>
          <Box sx={{ display: "grid", placeItems: "center", my: 1.5 }}>
            <img src={setup.qr_data_url} alt="Código QR para la app autenticadora" width={200} height={200} />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              CrediMaster · {setup.account_name}
            </Typography>
          </Box>
          <Typography variant="caption" component="div" sx={{ color: "text.secondary" }}>
            ¿No puede escanear? Ingrese esta clave manualmente (tipo: basada en tiempo):
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
            <Typography data-testid="mfa-secret" sx={{ fontFamily: "monospace", fontSize: 14, wordBreak: "break-all" }}>
              {setup.secret}
            </Typography>
            <Button
              size="small"
              onClick={() => navigator.clipboard?.writeText(setup.secret.replace(/\s/g, "")).catch(() => {})}
              sx={{ minWidth: 0 }}
              aria-label="Copiar clave"
            >
              <ContentCopyRoundedIcon fontSize="small" />
            </Button>
          </Box>

          <Typography variant="body2" sx={{ mt: 2 }}>
            <b>3.</b> Escriba el código de 6 dígitos que muestra la app:
          </Typography>
          <TextField
            label="Código de verificación"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            fullWidth
            margin="dense"
            autoComplete="one-time-code"
            inputProps={{
              inputMode: "numeric",
              maxLength: 6,
              "aria-label": "Código de verificación",
              style: { letterSpacing: 8, fontSize: 22, textAlign: "center", fontFamily: "monospace" },
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
            disabled={code.length !== 6 || saving}
            sx={{ mt: 1, fontWeight: 900 }}
          >
            {saving ? <CircularProgress size={18} color="inherit" /> : "Activar"}
          </Button>
        </>
      )}

      {!loadingSetup && fatal && !onCancel && (
        <Button fullWidth onClick={loadSetup} sx={{ mt: 1 }}>
          Reintentar
        </Button>
      )}

      {onCancel && (
        <Button fullWidth onClick={onCancel} sx={{ mt: 1, textTransform: "none" }}>
          {cancelLabel}
        </Button>
      )}
    </Box>
  );
}
