import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Divider, Grid, Snackbar, Stack, TextField, Typography } from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import API from "../api";
import HelpButton from "./help/HelpButton";

const FIELDS = [
  "representative_name",
  "representative_marital_status",
  "representative_occupation",
  "representative_address",
  "representative_id_number",
  "representative_capacity",
  "constitution_deed_text",
  "constitution_notary",
  "constitution_registry_data",
  "conami_resolution_number",
  "conami_gazette_data",
  "power_of_attorney_text",
];

const emptyForm = () => Object.fromEntries(FIELDS.map((f) => [f, ""]));

export default function InstitutionalLegalDataManager() {
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ open: false, type: "success", text: "" });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/api/institutional-legal-data");
      setForm({ ...emptyForm(), ...Object.fromEntries(FIELDS.map((f) => [f, data[f] || ""])) });
    } catch {
      setMessage({ open: true, type: "error", text: "No fue posible cargar los datos legales." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await API.put("/api/institutional-legal-data", form);
      setMessage({ open: true, type: "success", text: "Datos legales guardados." });
    } catch (err) {
      setMessage({ open: true, type: "error", text: err.response?.data?.error || "No fue posible guardar." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <GavelRoundedIcon color="primary" />
          <Typography variant="h5" fontWeight={900}>Datos legales de la IMF</Typography>
          <HelpButton screenKey="configuracion.datos_legales_imf" />
        </Stack>
        <Typography color="text.secondary">
          Datos institucionales usados para llenar el preámbulo del Contrato Estándar para las IMF (modelo oficial CONAMI):
          quién representa a la institución y con qué facultad, y los datos de constitución legal de la IMF. Se configuran
          una sola vez y se reutilizan en cada contrato generado.
        </Typography>
      </Box>

      {loading ? (
        <Box textAlign="center" py={4}><CircularProgress size={28} /></Box>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={3}>
              <Typography variant="h6" fontWeight={800}>Representante autorizado</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Nombre completo" size="small" value={form.representative_name} onChange={set("representative_name")} />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth label="Estado civil" size="small" value={form.representative_marital_status} onChange={set("representative_marital_status")} />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth label="Profesión u oficio" size="small" value={form.representative_occupation} onChange={set("representative_occupation")} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Dirección de domicilio" size="small" value={form.representative_address} onChange={set("representative_address")} />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth label="Documento de identidad (cédula)" size="small" value={form.representative_id_number} onChange={set("representative_id_number")} />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth label="Calidad en que comparece" size="small" placeholder="Ej. Representante Legal" value={form.representative_capacity} onChange={set("representative_capacity")} />
                </Grid>
              </Grid>

              <Divider />

              <Typography variant="h6" fontWeight={800}>Constitución legal de la IMF</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth multiline minRows={2} label="Escritura Pública de Constitución"
                    placeholder="Número (en letras y guarismo), hora, día, mes, año y lugar de celebración"
                    value={form.constitution_deed_text} onChange={set("constitution_deed_text")} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Notario autorizante" size="small" value={form.constitution_notary} onChange={set("constitution_notary")} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Datos registrales de inscripción" size="small" value={form.constitution_registry_data} onChange={set("constitution_registry_data")} />
                </Grid>
              </Grid>

              <Divider />

              <Typography variant="h6" fontWeight={800}>Resolución CONAMI</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Número de resolución" size="small" placeholder="Resolución No. CD-CONAMI-XXX-XXXXX-XXXX" value={form.conami_resolution_number} onChange={set("conami_resolution_number")} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Gaceta Diario Oficial" size="small" placeholder="Número y fecha de publicación" value={form.conami_gazette_data} onChange={set("conami_gazette_data")} />
                </Grid>
              </Grid>

              <Divider />

              <Typography variant="h6" fontWeight={800}>Poder del representante</Typography>
              <TextField fullWidth multiline minRows={2} label="Testimonio de Escritura Pública que acredita su mandato"
                placeholder="Datos de la escritura de poder: número, notario, fecha, lugar y datos registrales"
                value={form.power_of_attorney_text} onChange={set("power_of_attorney_text")} />

              <Alert severity="info">
                Los datos que varían por cada firma (el notario que autoriza esa operación en particular, los datos
                registrales de una garantía puntual) no se configuran aquí — el contrato generado los deja como espacio en
                blanco, igual que el propio modelo oficial de CONAMI.
              </Alert>

              <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
                disabled={saving} onClick={save} sx={{ alignSelf: "flex-end" }}>
                Guardar datos legales
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
