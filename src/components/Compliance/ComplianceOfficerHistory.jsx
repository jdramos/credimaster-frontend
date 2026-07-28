import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import PersonPinIcon from "@mui/icons-material/PersonPin";
import API from "../../api";

const daysUntil = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target - today) / 86400000);
};

const emptyForm = { full_name: "", appointed_at: "", notes: "" };

export default function ComplianceOfficerHistory() {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notifyDays, setNotifyDays] = useState(5);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [{ data: currentData }, { data: historyData }] = await Promise.all([
        API.get("/api/aml/compliance-officer/current"),
        API.get("/api/aml/compliance-officer/history"),
      ]);
      setCurrent(currentData.officer);
      setNotifyDays(currentData.notify_days || 5);
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al cargar el historial", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleRegisterChange = async () => {
    if (!form.full_name.trim() || !form.appointed_at) {
      showAlert("Nombre y fecha de nombramiento son obligatorios", "error");
      return;
    }
    try {
      setSaving(true);
      await API.post("/api/aml/compliance-officer", form);
      showAlert("Cambio de Oficial de Cumplimiento registrado");
      setDialogOpen(false);
      setForm(emptyForm);
      await fetchAll();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al registrar el cambio", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkNotified = async (id) => {
    try {
      await API.put(`/api/aml/compliance-officer/${id}/mark-notified`);
      showAlert("Marcado como notificado a CONAMI");
      await fetchAll();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al marcar como notificado", "error");
    }
  };

  const notifyDeadline = current
    ? new Date(new Date(current.appointed_at).getTime() + notifyDays * 86400000)
    : null;
  const notifyDaysLeft = notifyDeadline ? daysUntil(notifyDeadline) : null;
  const needsNotification = current && !current.notified_conami_at;

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff", mb: 2 }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <PersonPinIcon sx={{ color: "#0F766E" }} />
          <Box flexGrow={1}>
            <Typography variant="h6" fontWeight={700}>
              Oficial de Cumplimiento LA/FT/FP
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Art. 42.3.2 CD-CONAMI-070-01OCT07-2025 — todo cambio debe notificarse a CONAMI dentro de {notifyDays} días.
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Registrar cambio
          </Button>
        </Box>

        {current ? (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Oficial vigente: {current.full_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Nombrado el {String(current.appointed_at).slice(0, 10)}
            </Typography>
            {needsNotification ? (
              <>
                <Alert severity={notifyDaysLeft < 0 ? "error" : notifyDaysLeft <= 2 ? "warning" : "info"} sx={{ mb: 1 }}>
                  {notifyDaysLeft < 0
                    ? `Notificación a CONAMI vencida hace ${Math.abs(notifyDaysLeft)} día(s).`
                    : `Notificar a CONAMI en ${notifyDaysLeft} día(s) (antes del ${notifyDeadline?.toISOString().slice(0, 10)}).`}
                </Alert>
                <Button size="small" variant="outlined" onClick={() => handleMarkNotified(current.id)}>
                  Marcar como notificado a CONAMI
                </Button>
              </>
            ) : (
              <Typography variant="body2" color="success.main">
                Notificado a CONAMI el {String(current.notified_conami_at).slice(0, 16).replace("T", " ")}
              </Typography>
            )}
          </Paper>
        ) : (
          !loading && (
            <Alert severity="warning">No hay un Oficial de Cumplimiento registrado. Registra el primero.</Alert>
          )
        )}
      </Paper>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Typography variant="subtitle1" fontWeight={700} mb={1}>
          Historial
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Nombramiento</TableCell>
                <TableCell>Fin</TableCell>
                <TableCell>Notificado a CONAMI</TableCell>
                <TableCell>Notas</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{h.full_name}</TableCell>
                  <TableCell>{String(h.appointed_at).slice(0, 10)}</TableCell>
                  <TableCell>{h.ended_at ? String(h.ended_at).slice(0, 10) : "Vigente"}</TableCell>
                  <TableCell>
                    {h.notified_conami_at ? String(h.notified_conami_at).slice(0, 16).replace("T", " ") : "Pendiente"}
                  </TableCell>
                  <TableCell>{h.notes || "-"}</TableCell>
                </TableRow>
              ))}
              {!loading && history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Sin registros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar cambio de Oficial de Cumplimiento</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre completo"
            fullWidth
            sx={{ mt: 1, mb: 2 }}
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <TextField
            label="Fecha de nombramiento"
            type="date"
            fullWidth
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
            value={form.appointed_at}
            onChange={(e) => setForm({ ...form, appointed_at: e.target.value })}
          />
          <TextField
            label="Notas (opcional)"
            multiline
            minRows={2}
            fullWidth
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleRegisterChange} disabled={saving}>
            Registrar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={alert.severity} onClose={() => setAlert((prev) => ({ ...prev, open: false }))}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
