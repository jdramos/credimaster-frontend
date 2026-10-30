import React, { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
import DeleteIcon from "@mui/icons-material/Delete";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import API from "../api";
import HelpButton from "./help/HelpButton";

// El logo del tenant lo consume toda la app (web y la app móvil, en
// estado de cuenta/recibos de pago) -- antes solo el superadmin de
// plataforma podía pegar una URL a mano, sin ninguna pantalla real. Acá
// cualquier usuario con configuracion.editar puede subir/quitar el suyo.
export default function CompanyProfileManager() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState({ open: false, type: "success", text: "" });

  const notify = (text, type = "success") => setMessage({ open: true, type, text });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/api/company/profile");
      setProfile(data?.data || null);
    } catch (err) {
      notify(err.response?.data?.message || "No se pudo cargar el perfil de la empresa", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("logo", file);

    try {
      setUploadingLogo(true);
      const { data } = await API.post("/api/company/logo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile((p) => ({ ...p, logo_url: data?.logo_url || null }));
      notify("Logo actualizado");
    } catch (err) {
      notify(err.response?.data?.message || "Error al subir el logo", "error");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm("¿Quitar el logo de la empresa?")) return;
    try {
      await API.delete("/api/company/logo");
      setProfile((p) => ({ ...p, logo_url: null }));
      notify("Logo eliminado");
    } catch (err) {
      notify(err.response?.data?.message || "Error al eliminar el logo", "error");
    }
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <BusinessRoundedIcon color="primary" />
          <Typography variant="h5" fontWeight={900}>Perfil de la empresa</Typography>
          <HelpButton screenKey="configuracion.perfil_empresa" />
        </Stack>
        <Typography color="text.secondary">
          El logo que subas acá aparece en el estado de cuenta y en los recibos de pago, tanto en la web como en la
          app móvil de los cobradores.
        </Typography>
      </Box>

      {loading ? (
        <Box textAlign="center" py={4}><CircularProgress size={28} /></Box>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Razón social" size="small" value={profile?.legal_name || ""} disabled />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Nombre comercial" size="small" value={profile?.commercial_name || ""} disabled />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="RUC / identificación" size="small" value={profile?.tax_id || ""} disabled />
                </Grid>
              </Grid>

              <Alert severity="info">
                Estos datos los administra el superadministrador de la plataforma. Si necesitás corregir alguno,
                contactanos.
              </Alert>

              <Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Logo de la empresa
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar src={profile?.logo_url || undefined} variant="rounded" sx={{ width: 72, height: 72, bgcolor: "var(--cm-surface, #F1F5F9)" }}>
                    <ImageIcon sx={{ color: "var(--cm-text-3, #94A3B8)" }} />
                  </Avatar>
                  <Button size="small" variant="outlined" component="label" disabled={uploadingLogo} sx={{ textTransform: "none" }}>
                    {uploadingLogo ? "Subiendo..." : profile?.logo_url ? "Cambiar logo" : "Subir logo"}
                    <input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} />
                  </Button>
                  {profile?.logo_url && (
                    <IconButton size="small" onClick={handleRemoveLogo} title="Quitar logo">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  JPG, PNG o WEBP, hasta 2MB.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Snackbar open={message.open} autoHideDuration={4000} onClose={() => setMessage((m) => ({ ...m, open: false }))}>
        <Alert severity={message.type} variant="filled">{message.text}</Alert>
      </Snackbar>
    </Stack>
  );
}
