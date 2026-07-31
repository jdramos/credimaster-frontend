import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
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

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function PayrollApprovalInbox() {
  const [rows, setRows] = useState([]);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [decisionDialog, setDecisionDialog] = useState(null); // { item, decision }
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchInbox = async () => {
    try {
      const res = await API.get("/api/hr/payroll-approvals/inbox");
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar la bandeja de aprobación de planilla", "error");
    }
  };

  useEffect(() => { fetchInbox(); }, []);

  const openDecision = (item, decision) => {
    setComment("");
    setDecisionDialog({ item, decision });
  };

  const handleConfirmDecision = async () => {
    if (!decisionDialog) return;
    try {
      setSaving(true);
      const res = await API.put(`/api/hr/payroll-approvals/${decisionDialog.item.approval_id}/decision`, {
        status: decisionDialog.decision,
        comment: comment || null,
      });
      showAlert(res.data?.message || "Decisión registrada correctamente");
      setDecisionDialog(null);
      fetchInbox();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al decidir la aprobación", "error");
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
              <Typography variant="h6" fontWeight={700}>Aprobar Planillas</Typography>
              <Typography variant="body2" color="text.secondary">
                Corridas de nómina pendientes de su autorización — el comprobante contable no se aplica hasta que se apruebe.
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
              <TableCell>Período</TableCell>
              <TableCell>Fecha de pago</TableCell>
              <TableCell>Sucursal</TableCell>
              <TableCell>Empleados</TableCell>
              <TableCell>Total neto</TableCell>
              <TableCell>Aprobación</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={7}><Typography variant="body2" color="text.secondary">No hay planillas pendientes de su aprobación.</Typography></TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.approval_id}>
                <TableCell>{String(r.period_start).slice(0, 10)} al {String(r.period_end).slice(0, 10)}</TableCell>
                <TableCell>{String(r.pay_date).slice(0, 10)}</TableCell>
                <TableCell>{r.branch_name || "Todas"}</TableCell>
                <TableCell>{r.employee_count}</TableCell>
                <TableCell>C$ {money(r.total_net)}</TableCell>
                <TableCell>
                  <Chip size="small" label={`${r.approvers_approved}/${r.approvers_total} aprobado`} />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Button size="small" color="success" startIcon={<CheckIcon />} sx={{ textTransform: "none" }} onClick={() => openDecision(r, "APPROVED")}>
                      Aprobar
                    </Button>
                    <Button size="small" color="error" startIcon={<CloseIcon />} sx={{ textTransform: "none" }} onClick={() => openDecision(r, "REJECTED")}>
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
          {decisionDialog?.decision === "APPROVED" ? "Aprobar" : "Rechazar"} planilla
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {decisionDialog && `${String(decisionDialog.item.period_start).slice(0, 10)} al ${String(decisionDialog.item.period_end).slice(0, 10)} · C$ ${money(decisionDialog.item.total_net)}`}
          </Typography>
          {decisionDialog?.decision === "APPROVED" && Number(decisionDialog.item.approvers_total) > 1 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Esta planilla requiere la aprobación de los {decisionDialog.item.approvers_total} aprobadores configurados.
              Se contabilizará solo cuando todos hayan aprobado.
            </Alert>
          )}
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
            color={decisionDialog?.decision === "APPROVED" ? "success" : "error"}
            disabled={saving}
            sx={{ textTransform: "none" }}
            onClick={handleConfirmDecision}
          >
            {saving ? "Guardando..." : decisionDialog?.decision === "APPROVED" ? "Confirmar aprobación" : "Confirmar rechazo"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
