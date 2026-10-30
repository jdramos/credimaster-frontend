import React, { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import API from "../../api";

const URL = "/api/superadmin/conami-indicators";
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const periodLabel = (p) => {
  const [y, m] = String(p).slice(0, 7).split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
};

// Carga del reporte mensual "Indicadores Financieros" que publica la CONAMI
// (reporte_18.xls). Un solo archivo sirve de referencia del sector para todos
// los tenants: la pantalla Contabilidad > Indicadores financieros compara los
// indicadores de cada empresa con la mediana y los cuartiles de ese reporte.
export default function ConamiIndicatorsPanel() {
  const [reports, setReports] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const inputRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await API.get(URL);
      setReports(data?.data || []);
    } catch {
      // no bloquea el panel
    }
  };

  useEffect(() => { load(); }, []);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setUploading(true);
      setMessage(null);
      const form = new FormData();
      form.append("file", file);
      const { data } = await API.post(URL, form, { headers: { "Content-Type": "multipart/form-data" } });
      setMessage({ severity: "success", text: data.message });
      load();
    } catch (err) {
      setMessage({ severity: "error", text: err.response?.data?.message || "No se pudo cargar el reporte" });
    } finally {
      setUploading(false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`¿Eliminar el reporte de ${periodLabel(r.period)}? Las empresas dejarán de compararse con ese período.`)) return;
    try {
      await API.delete(`${URL}/${r.id}`);
      load();
    } catch (err) {
      setMessage({ severity: "error", text: err.response?.data?.message || "No se pudo eliminar" });
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid var(--cm-border, #E5E7EB)", background: "var(--cm-paper, #fff)" }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between">
        <Box>
          <Typography variant="subtitle1" fontWeight={800}>Indicadores financieros del sector (CONAMI)</Typography>
          <Typography variant="caption" color="text.secondary">
            Suba cada mes el reporte "Indicadores Financieros" publicado por la CONAMI (.xls). Sirve de referencia del
            sector para todas las empresas en Contabilidad &gt; Indicadores financieros.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          sx={{ textTransform: "none", flexShrink: 0 }}
        >
          {uploading ? "Procesando…" : "Subir reporte"}
        </Button>
        <input ref={inputRef} type="file" accept=".xls,.xlsx" hidden onChange={onFile} />
      </Stack>

      {message && <Alert severity={message.severity} sx={{ mt: 1.5 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

      {reports.length > 0 && (
        <Table size="small" sx={{ mt: 1.5 }}>
          <TableHead>
            <TableRow>
              <TableCell>Período</TableCell>
              <TableCell align="right">Instituciones</TableCell>
              <TableCell>Archivo</TableCell>
              <TableCell>Cargado</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell sx={{ textTransform: "capitalize", fontWeight: 700 }}>{periodLabel(r.period)}</TableCell>
                <TableCell align="right">{r.institutions_count}</TableCell>
                <TableCell>{r.source_filename || "—"}</TableCell>
                <TableCell>{String(r.uploaded_at || "").slice(0, 16).replace("T", " ")} · {r.uploaded_by || "—"}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Eliminar">
                    <IconButton size="small" onClick={() => remove(r)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
