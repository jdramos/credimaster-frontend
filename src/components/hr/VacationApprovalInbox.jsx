import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Alert,
  Snackbar,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import API from "../../api";

export default function VacationApprovalInbox() {
  const [rows, setRows] = useState([]);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [decisionDialog, setDecisionDialog] = useState(null); // { request, decision }
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchInbox = async () => {
    try {
      const res = await API.get("/api/hr/vacation-requests/inbox");
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar la bandeja de solicitudes", "error");
    }
  };

  useEffect(() => { fetchInbox(); }, []);

  const openDecision = (request, decision) => {
    setComment("");
    setDecisionDialog({ request, decision });
  };

  const handleConfirmDecision = async () => {
    if (!decisionDialog) return;
    try {
      setSaving(true);
      await API.put(`/api/hr/vacation-requests/${decisionDialog.request.id}/decision`, {
        decision: decisionDialog.decision,
        comment: comment || null,
      });
      showAlert(`Solicitud ${decisionDialog.decision === "APROBADA" ? "aprobada" : "rechazada"} correctamente`);
      setDecisionDialog(null);
      fetchInbox();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al decidir la solicitud", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FactCheckIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Aprobar Vacaciones</Typography>
              <Typography variant="body2" color="text.secondary">
                Solicitudes pendientes de su equipo
              </Typography>
            </Box>
          </Box>
          <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchInbox}>
            Actualizar
          </Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Empleado</TableCell>
              <TableCell>Puesto</TableCell>
              <TableCell>Desde</TableCell>
              <TableCell>Hasta</TableCell>
              <TableCell>Días</TableCell>
              <TableCell>Solicitada</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={7}><Typography variant="body2" color="text.secondary">No hay solicitudes pendientes.</Typography></TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.employee_name}</TableCell>
                <TableCell>{r.position || "-"}</TableCell>
                <TableCell>{String(r.start_date).slice(0, 10)}</TableCell>
                <TableCell>{String(r.end_date).slice(0, 10)}</TableCell>
                <TableCell>{r.days_requested}</TableCell>
                <TableCell>{String(r.requested_at).slice(0, 10)}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Button size="small" color="success" startIcon={<CheckIcon />} sx={{ textTransform: "none" }} onClick={() => openDecision(r, "APROBADA")}>
                      Aprobar
                    </Button>
                    <Button size="small" color="error" startIcon={<CloseIcon />} sx={{ textTransform: "none" }} onClick={() => openDecision(r, "RECHAZADA")}>
                      Rechazar
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={Boolean(decisionDialog)} onClose={() => setDecisionDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {decisionDialog?.decision === "APROBADA" ? "Aprobar" : "Rechazar"} solicitud de {decisionDialog?.request?.employee_name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {decisionDialog && `${String(decisionDialog.request.start_date).slice(0, 10)} al ${String(decisionDialog.request.end_date).slice(0, 10)} (${decisionDialog.request.days_requested} días)`}
          </Typography>
          <TextField
            fullWidth size="small" label="Comentario (opcional)" multiline rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecisionDialog(null)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button
            variant="contained"
            color={decisionDialog?.decision === "APROBADA" ? "success" : "error"}
            disabled={saving}
            sx={{ textTransform: "none" }}
            onClick={handleConfirmDecision}
          >
            {saving ? "Guardando..." : decisionDialog?.decision === "APROBADA" ? "Confirmar aprobación" : "Confirmar rechazo"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
