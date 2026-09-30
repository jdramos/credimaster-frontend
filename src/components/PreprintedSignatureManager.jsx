import React, { useEffect, useRef, useState } from "react";
import { Alert, Avatar, Box, Button, Card, CardContent, CircularProgress, Divider, FormControlLabel, Grid, Snackbar, Stack, Switch, TextField, Typography } from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import BorderColorRoundedIcon from "@mui/icons-material/BorderColorRounded";
import API from "../api";
import HelpButton from "./help/HelpButton";

const emptyForm = () => ({
  representative_name: "",
  representative_title: "Representante autorizado de la IFIM",
  board_approval_date: "",
  conami_notification_date: "",
  max_amount_usd: 1000,
  enabled: false,
});

export default function PreprintedSignatureManager() {
  const [form, setForm] = useState(emptyForm());
  const [imageUrl, setImageUrl] = useState(null);
  const [hasImage, setHasImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ open: false, type: "success", text: "" });
  const fileInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/api/preprinted-signature");
      setForm({
        representative_name: data.representative_name || "",
        representative_title: data.representative_title || "Representante autorizado de la IFIM",
        board_approval_date: data.board_approval_date ? String(data.board_approval_date).slice(0, 10) : "",
        conami_notification_date: data.conami_notification_date ? String(data.conami_notification_date).slice(0, 10) : "",
        max_amount_usd: data.max_amount_usd || 1000,
        enabled: Boolean(data.enabled),
      });
      setImageUrl(data.signature_image_url || null);
      setHasImage(Boolean(data.signature_image_key));
    } catch {
      setMessage({ open: true, type: "error", text: "No fue posible cargar la configuración." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await API.put("/api/preprinted-signature", form);
      setMessage({ open: true, type: "success", text: "Configuración guardada." });
      await load();
    } catch (err) {
      setMessage({ open: true, type: "error", text: err.response?.data?.error || "No fue posible guardar." });
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await API.post("/api/preprinted-signature/image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setImageUrl(data.signature_image_url);
      setHasImage(true);
      setMessage({ open: true, type: "success", text: "Imagen de firma actualizada." });
    } catch (err) {
      setMessage({ open: true, type: "error", text: err.response?.data?.error || "No fue posible subir la imagen." });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const prerequisitesMet = hasImage && form.representative_name && form.board_approval_date && form.conami_notification_date;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <BorderColorRoundedIcon color="primary" />
          <Typography variant="h5" fontWeight={900}>Firma pre-impresa en contratos</Typography>
          <HelpButton screenKey="cumplimiento.firma_preimpresa" />
        </Stack>
        <Typography color="text.secondary">
          Conforme a la Norma CD-CONAMI-021-2020 (reformada por CD-CONAMI-008-2021), permite estampar la firma digitalizada
          del representante autorizado en vez de exigir firma manuscrita, únicamente en créditos cuyo monto sea equivalente
          a {form.max_amount_usd || 1000} dólares o menos y sin garantías reales pactadas. Requiere aprobación previa de junta
          directiva y notificación a la CONAMI.
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
                  <TextField fullWidth label="Nombre del representante" size="small" value={form.representative_name}
                    onChange={(e) => setForm((f) => ({ ...f, representative_name: e.target.value }))} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Cargo" size="small" value={form.representative_title}
                    onChange={(e) => setForm((f) => ({ ...f, representative_title: e.target.value }))} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth type="date" label="Aprobación de junta directiva" size="small" InputLabelProps={{ shrink: true }}
                    value={form.board_approval_date} onChange={(e) => setForm((f) => ({ ...f, board_approval_date: e.target.value }))} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth type="date" label="Notificación a CONAMI" size="small" InputLabelProps={{ shrink: true }}
                    value={form.conami_notification_date} onChange={(e) => setForm((f) => ({ ...f, conami_notification_date: e.target.value }))} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth type="number" label="Monto máximo (US$)" size="small" value={form.max_amount_usd}
                    onChange={(e) => setForm((f) => ({ ...f, max_amount_usd: e.target.value }))} />
                </Grid>
              </Grid>

              <Divider />

              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar variant="rounded" src={imageUrl} sx={{ width: 120, height: 60, bgcolor: "grey.100" }}>
                  {!imageUrl && <BorderColorRoundedIcon color="disabled" />}
                </Avatar>
                <Button variant="outlined" component="label" startIcon={uploading ? <CircularProgress size={16} /> : <UploadFileRoundedIcon />} disabled={uploading}>
                  {hasImage ? "Reemplazar imagen de firma" : "Subir imagen de firma"}
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={uploadImage} />
                </Button>
                <Typography variant="caption" color="text.secondary">PNG, JPG o WEBP, hasta 2 MB.</Typography>
              </Stack>

              <Divider />

              <FormControlLabel
                control={<Switch checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} />}
                label="Activar firma pre-impresa en créditos elegibles"
              />
              {!prerequisitesMet && (
                <Alert severity="warning">
                  Antes de activar, complete: nombre del representante, fecha de aprobación de junta directiva, fecha de
                  notificación a CONAMI e imagen de la firma.
                </Alert>
              )}
              {prerequisitesMet && form.enabled && (
                <Alert severity="success">
                  Activo. Los contratos de créditos elegibles (monto ≤ {form.max_amount_usd} US$ equivalentes y sin garantías
                  reales) se generarán con esta firma en vez de la línea en blanco.
                </Alert>
              )}

              <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
                disabled={saving} onClick={save} sx={{ alignSelf: "flex-end" }}>
                Guardar configuración
              </Button>
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
