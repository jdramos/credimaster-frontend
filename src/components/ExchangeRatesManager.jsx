import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Grid, IconButton, MenuItem, Snackbar, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import CurrencyExchangeRoundedIcon from "@mui/icons-material/CurrencyExchangeRounded";
import API from "../api";
import HelpButton from "./help/HelpButton";

const TYPE_LABELS = { DATE: "Fecha específica", MONTH: "Mes completo", YEAR: "Año completo" };
const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const formatPeriod = (row) => {
  if (row.rate_type === "DATE") return new Date(`${row.rate_date}T00:00:00`).toLocaleDateString("es-NI");
  if (row.rate_type === "MONTH") return `${monthNames[row.month - 1] || row.month} ${row.year}`;
  return `Año ${row.year}`;
};

const emptyForm = () => ({ rate_type: "MONTH", year: new Date().getFullYear(), month: new Date().getMonth() + 1, rate_date: "", rate: "", notes: "" });

export default function ExchangeRatesManager() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [message, setMessage] = useState({ open: false, type: "success", text: "" });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/api/exchange-rates");
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setMessage({ open: true, type: "error", text: "No fue posible cargar los tipos de cambio." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.rate || Number(form.rate) <= 0) {
      return setMessage({ open: true, type: "error", text: "Indique un tipo de cambio válido." });
    }
    setSaving(true);
    try {
      await API.post("/api/exchange-rates", form);
      setMessage({ open: true, type: "success", text: "Tipo de cambio guardado." });
      setForm(emptyForm());
      await load();
    } catch (err) {
      setMessage({ open: true, type: "error", text: err.response?.data?.error || "No fue posible guardar." });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await API.delete(`/api/exchange-rates/${id}`);
      setMessage({ open: true, type: "success", text: "Tipo de cambio eliminado." });
      await load();
    } catch (err) {
      setMessage({ open: true, type: "error", text: err.response?.data?.error || "No fue posible eliminar." });
    }
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <CurrencyExchangeRoundedIcon color="primary" />
          <Typography variant="h5" fontWeight={900}>Tipos de cambio C$/US$</Typography>
          <HelpButton screenKey="configuracion.tipos_cambio" />
        </Stack>
        <Typography color="text.secondary">
          Configure el tipo de cambio por fecha exacta, mes o año. Al buscar un tipo de cambio para una fecha, gana la entrada más específica: fecha exacta &gt; mes &gt; año.
        </Typography>
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={800}>Agregar tipo de cambio</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <TextField select fullWidth label="Aplica a" size="small" value={form.rate_type}
                  onChange={(e) => setForm((f) => ({ ...f, rate_type: e.target.value }))}>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                </TextField>
              </Grid>

              {form.rate_type === "DATE" && (
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth type="date" label="Fecha" size="small" InputLabelProps={{ shrink: true }}
                    value={form.rate_date} onChange={(e) => setForm((f) => ({ ...f, rate_date: e.target.value }))} />
                </Grid>
              )}

              {form.rate_type !== "DATE" && (
                <Grid item xs={6} sm={2}>
                  <TextField fullWidth type="number" label="Año" size="small" value={form.year}
                    onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
                </Grid>
              )}

              {form.rate_type === "MONTH" && (
                <Grid item xs={6} sm={2}>
                  <TextField select fullWidth label="Mes" size="small" value={form.month}
                    onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}>
                    {monthNames.map((name, idx) => <MenuItem key={idx} value={idx + 1}>{name}</MenuItem>)}
                  </TextField>
                </Grid>
              )}

              <Grid item xs={6} sm={2}>
                <TextField fullWidth type="number" label="Tipo de cambio" size="small" inputProps={{ step: "0.0001" }}
                  value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField fullWidth label="Notas (opcional)" size="small" value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </Grid>

              <Grid item xs={12} sm={2}>
                <Button fullWidth variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddRoundedIcon />}
                  disabled={saving} onClick={create}>
                  Agregar
                </Button>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <Box textAlign="center" py={4}><CircularProgress size={28} /></Box>
      ) : (
        <TableContainer component={Card} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Periodo</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell align="right">Tipo de cambio</TableCell>
                <TableCell>Notas</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatPeriod(row)}</TableCell>
                  <TableCell>{TYPE_LABELS[row.rate_type]}</TableCell>
                  <TableCell align="right">{Number(row.rate).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</TableCell>
                  <TableCell>{row.notes || "—"}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => remove(row.id)}>
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow><TableCell colSpan={5}><Alert severity="info">No hay tipos de cambio configurados.</Alert></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar open={message.open} autoHideDuration={4000} onClose={() => setMessage((m) => ({ ...m, open: false }))}>
        <Alert severity={message.type} variant="filled">{message.text}</Alert>
      </Snackbar>
    </Stack>
  );
}
