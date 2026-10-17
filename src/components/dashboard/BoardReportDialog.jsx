import React, { useContext, useMemo, useState } from "react";
import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import dayjs from "dayjs";
import { getBoardReport } from "../../api/dashboardBalances";
import { openBlankReportWindow, writeReportToWindow } from "../../reports/reportViewer";
import { buildBoardReportHtml, monthYear } from "../../reports/boardReport";
import { UserContext } from "../../contexts/UserContext";
import { useAuth } from "../../contexts/AuthContext";

// Informe de gestión a la Junta Directiva: se elige el mes, quién firma y,
// si se quiere, comentarios propios de la gerencia; el resto lo redacta el
// sistema con las cifras del mes (GET /api/dashboard/board-report).

const SIGNER_KEY = "boardReportSigner";
const loadSigner = () => {
  try {
    return JSON.parse(localStorage.getItem(SIGNER_KEY) || "null");
  } catch {
    return null;
  }
};

// Últimos 12 meses; por omisión el último mes cerrado.
const monthOptions = () => {
  const out = [];
  for (let k = 0; k < 12; k += 1) out.push(dayjs().subtract(k, "month").format("YYYY-MM"));
  return out;
};

export default function BoardReportDialog({ open, onClose }) {
  const { user, fullName } = useContext(UserContext) || {};
  const { tenant } = useAuth() || {};
  const saved = loadSigner();
  const months = useMemo(monthOptions, []);
  const [period, setPeriod] = useState(months[1]);
  const [name, setName] = useState(saved?.name || fullName || user?.full_name || "");
  const [title, setTitle] = useState(saved?.title || "Gerente General");
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const company = {
    commercial_name: tenant?.commercial_name || tenant?.name || "",
    legal_name: tenant?.legal_name || tenant?.company_name || "",
    tax_id: tenant?.tax_id || tenant?.ruc || "",
    address: tenant?.address || "",
    phone: tenant?.phone || "",
    logo_url: tenant?.logo_url || "",
  };

  const generate = async () => {
    setError("");
    // La ventana se abre dentro del clic para que el navegador no la bloquee.
    const win = openBlankReportWindow();
    if (!win) return;
    setLoading(true);
    try {
      const res = await getBoardReport({ period, company_name: company.commercial_name || company.legal_name || undefined });
      try {
        localStorage.setItem(SIGNER_KEY, JSON.stringify({ name, title }));
      } catch {
        // sin almacenamiento local: se vuelve a escribir la próxima vez
      }
      writeReportToWindow(win, buildBoardReportHtml({ company, user, data: res.data, signer: { name, title }, comments }));
      onClose?.();
    } catch (err) {
      win.close();
      setError(err.response?.data?.message || "No se pudo preparar el informe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Informe de gestión a la Junta Directiva</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          El sistema redacta el informe del mes con las cifras de cartera, colocación, cobranza, resultados, presupuesto e
          indicadores, e incluye un anexo con las cifras principales. Puede agregar sus propios comentarios.
        </Typography>
        <Stack spacing={2}>
          <TextField select label="Mes del informe" value={period} onChange={(e) => setPeriod(e.target.value)} size="small">
            {months.map((m, idx) => (
              <MenuItem key={m} value={m}>
                {monthYear(m).replace(/^./, (c) => c.toUpperCase())}
                {idx === 0 ? " (en curso, cifras preliminares)" : ""}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="Firma" value={name} onChange={(e) => setName(e.target.value)} size="small" fullWidth />
            <TextField label="Cargo" value={title} onChange={(e) => setTitle(e.target.value)} size="small" fullWidth />
          </Stack>
          <TextField
            label="Comentarios adicionales de la Gerencia (opcional)"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            multiline
            minRows={3}
            placeholder="Por ejemplo: avances del plan estratégico, temas que requieren aprobación de la Junta…"
            inputProps={{ maxLength: 4000 }}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={generate}
          disabled={loading || !name.trim()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PrintIcon />}
        >
          Generar informe
        </Button>
      </DialogActions>
    </Dialog>
  );
}
