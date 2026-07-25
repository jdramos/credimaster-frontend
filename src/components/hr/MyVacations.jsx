import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Chip,
  Alert,
  Snackbar,
  Button,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { printColillaDePagoReport } from "../../reports/printColillaDePagoReport";

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const daysBetweenInclusive = (start, end) => {
  if (!start || !end) return "";
  const a = new Date(start);
  const b = new Date(end);
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : "";
};

const STATUS_LABEL = { PENDIENTE: "Pendiente", APROBADA: "Aprobada", RECHAZADA: "Rechazada" };
const STATUS_COLOR = { PENDIENTE: "warning", APROBADA: "success", RECHAZADA: "error" };

export default function MyVacations() {
  const { tenant } = useAuth();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [employee, setEmployee] = useState(null);
  const [notLinked, setNotLinked] = useState(false);
  const [requests, setRequests] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ start_date: "", end_date: "", days_requested: "" });
  const [saving, setSaving] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchAll = async () => {
    try {
      const res = await API.get("/api/hr/me/employee");
      setEmployee(res.data?.data || null);
      setNotLinked(false);

      const [reqRes, paysRes] = await Promise.all([
        API.get("/api/hr/me/vacation-requests"),
        API.get("/api/hr/me/payslips"),
      ]);
      setRequests(reqRes.data?.data || []);
      setPayslips(paysRes.data?.data || []);
    } catch (error) {
      if (error.response?.status === 404) {
        setNotLinked(true);
      } else {
        showAlert(error.response?.data?.message || "Error al cargar sus datos de RRHH", "error");
      }
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleOpenRequest = () => {
    setForm({ start_date: "", end_date: "", days_requested: "" });
    setDialogOpen(true);
  };

  const handleDateChange = (field, value) => {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (next.start_date && next.end_date) {
        next.days_requested = daysBetweenInclusive(next.start_date, next.end_date);
      }
      return next;
    });
  };

  const handleSubmitRequest = async () => {
    if (!form.start_date || !form.end_date || !form.days_requested) {
      showAlert("Complete las fechas y los días solicitados", "error");
      return;
    }
    try {
      setSaving(true);
      await API.post("/api/hr/me/vacation-requests", {
        start_date: form.start_date,
        end_date: form.end_date,
        days_requested: Number(form.days_requested),
      });
      showAlert("Solicitud de vacaciones enviada correctamente");
      setDialogOpen(false);
      fetchAll();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al enviar la solicitud", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePrintPayslip = async (runId) => {
    try {
      const res = await API.get(`/api/hr/me/payslips/${runId}`);
      const { run, item, concepts } = res.data?.data || {};
      printColillaDePagoReport({ company: tenant, user: currentUser, run, item, concepts });
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al generar la colilla", "error");
    }
  };

  if (notLinked) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          Su usuario no está vinculado a un registro de empleado en RRHH. Contacte a Recursos Humanos para habilitar su acceso de autoservicio.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BeachAccessIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Mis Vacaciones</Typography>
              <Typography variant="body2" color="text.secondary">{employee?.full_name}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Chip color="primary" label={`Saldo disponible: ${Number(employee?.vacation_balance || 0).toFixed(2)} días`} />
            <Button variant="contained" sx={{ textTransform: "none" }} onClick={handleOpenRequest}>
              Solicitar vacaciones
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Mis solicitudes</Typography>
        <Divider sx={{ mb: 1 }} />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Desde</TableCell>
              <TableCell>Hasta</TableCell>
              <TableCell>Días</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Comentario</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.length === 0 && (
              <TableRow><TableCell colSpan={5}><Typography variant="body2" color="text.secondary">Aún no ha hecho solicitudes.</Typography></TableCell></TableRow>
            )}
            {requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{String(r.start_date).slice(0, 10)}</TableCell>
                <TableCell>{String(r.end_date).slice(0, 10)}</TableCell>
                <TableCell>{r.days_requested}</TableCell>
                <TableCell><Chip size="small" color={STATUS_COLOR[r.status]} label={STATUS_LABEL[r.status]} /></TableCell>
                <TableCell>{r.comment || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Mis colillas</Typography>
        <Divider sx={{ mb: 1 }} />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Período</TableCell>
              <TableCell>Fecha de pago</TableCell>
              <TableCell>Neto</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payslips.length === 0 && (
              <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">Aún no tiene colillas generadas.</Typography></TableCell></TableRow>
            )}
            {payslips.map((p) => (
              <TableRow key={p.run_item_id}>
                <TableCell>{String(p.period_start).slice(0, 10)} al {String(p.period_end).slice(0, 10)}</TableCell>
                <TableCell>{String(p.pay_date).slice(0, 10)}</TableCell>
                <TableCell>C$ {money(p.net_pay)}</TableCell>
                <TableCell>
                  <Button size="small" startIcon={<PrintIcon />} sx={{ textTransform: "none" }} onClick={() => handlePrintPayslip(p.run_id)}>
                    Imprimir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Solicitar vacaciones</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }}
                value={form.start_date}
                onChange={(e) => handleDateChange("start_date", e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }}
                value={form.end_date}
                onChange={(e) => handleDateChange("end_date", e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" type="number" label="Días solicitados"
                value={form.days_requested}
                onChange={(e) => setForm((f) => ({ ...f, days_requested: e.target.value }))}
                helperText={`Saldo disponible: ${Number(employee?.vacation_balance || 0).toFixed(2)} días`}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmitRequest} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Enviando..." : "Enviar solicitud"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
