import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Alert,
  Snackbar,
  Button,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  getBudgets,
  getDepartmentSubmissions,
  getDepartmentSubmissionLines,
  approveDepartmentSubmission,
  rejectDepartmentSubmission,
} from "../../api/budget";
import { UserContext } from "../../contexts/UserContext";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", minimumFractionDigits: 2 }).format(Number(value || 0));

const STATUS_CHIP = {
  DRAFT: { label: "Borrador", color: "default" },
  SUBMITTED: { label: "Enviado", color: "warning" },
  APPROVED: { label: "Aprobado", color: "success" },
  REJECTED: { label: "Rechazado", color: "error" },
};

export default function DepartmentBudgetApprovalInbox() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canApproveDeptBudget =
    role === 1 ||
    permissions.includes("presupuesto.departamento.aprobar") ||
    permissions.includes("presupuesto.gestionar");
  const [budgets, setBudgets] = useState([]);
  const [budgetId, setBudgetId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDept, setDetailDept] = useState(null);
  const [detailLines, setDetailLines] = useState([]);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectDept, setRejectDept] = useState(null);
  const [rejectComment, setRejectComment] = useState("");
  const [acting, setActing] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const loadBudgets = async () => {
    try {
      const res = await getBudgets();
      const list = res?.data || [];
      setBudgets(list);
      const active = list.find((b) => b.status === "ACTIVE") || list[0];
      if (active) setBudgetId(active.id);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar presupuestos", "error");
    }
  };

  useEffect(() => {
    loadBudgets();
  }, []);

  const load = async () => {
    if (!budgetId) return;
    try {
      setLoading(true);
      const res = await getDepartmentSubmissions(budgetId);
      setRows(res?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar el estado de los departamentos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetId]);

  const handleViewDetail = async (row) => {
    try {
      const res = await getDepartmentSubmissionLines(budgetId, row.department_id);
      setDetailLines(res?.data || []);
      setDetailDept(row);
      setDetailOpen(true);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar el detalle", "error");
    }
  };

  const handleApprove = async (row) => {
    try {
      setActing(true);
      await approveDepartmentSubmission(budgetId, row.department_id);
      showAlert(`Presupuesto de ${row.department_name} aprobado`);
      load();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al aprobar", "error");
    } finally {
      setActing(false);
    }
  };

  const openReject = (row) => {
    setRejectDept(row);
    setRejectComment("");
    setRejectOpen(true);
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      showAlert("Debe indicar el motivo del rechazo", "error");
      return;
    }
    try {
      setActing(true);
      await rejectDepartmentSubmission(budgetId, rejectDept.department_id, rejectComment.trim());
      showAlert(`Presupuesto de ${rejectDept.department_name} rechazado`);
      setRejectOpen(false);
      load();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al rechazar", "error");
    } finally {
      setActing(false);
    }
  };

  const detailTotals = useMemo(() => {
    const totals = Array(12).fill(0);
    const byConcept = new Map();
    for (const line of detailLines) {
      if (!byConcept.has(line.concept_id)) {
        byConcept.set(line.concept_id, { ...line, months: Array(12).fill(0) });
      }
      byConcept.get(line.concept_id).months[line.month_no - 1] = Number(line.amount) || 0;
    }
    const conceptRows = [...byConcept.values()];
    conceptRows.forEach((r) => r.months.forEach((v, i) => { totals[i] += v; }));
    return { conceptRows, totals };
  }, [detailLines]);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FactCheckIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Aprobación de presupuesto por departamento</Typography>
              <Typography variant="body2" color="text.secondary">
                Revisa y aprueba o rechaza lo enviado por cada departamento
              </Typography>
            </Box>
          </Box>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="budget-select-label">Presupuesto</InputLabel>
            <Select labelId="budget-select-label" label="Presupuesto" value={budgetId} onChange={(e) => setBudgetId(e.target.value)}>
              {budgets.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name} ({b.year_no})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 700, backgroundColor: "#F8FAFC" } }}>
              <TableCell>Departamento</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Enviado por</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.department_id} hover>
                <TableCell>{row.department_name}</TableCell>
                <TableCell align="right">{formatCurrency(row.total_amount)}</TableCell>
                <TableCell>
                  <Chip size="small" color={STATUS_CHIP[row.status]?.color} label={STATUS_CHIP[row.status]?.label || row.status} />
                </TableCell>
                <TableCell>{row.submitted_by_name || "—"}</TableCell>
                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                  <Tooltip title="Ver detalle">
                    <IconButton size="small" onClick={() => handleViewDetail(row)} disabled={!row.total_amount}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {row.status === "SUBMITTED" && canApproveDeptBudget && (
                    <>
                      <Tooltip title="Aprobar">
                        <IconButton size="small" color="success" disabled={acting} onClick={() => handleApprove(row)}>
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Rechazar">
                        <IconButton size="small" color="error" disabled={acting} onClick={() => openReject(row)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && !loading && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                    No hay departamentos activos
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{detailDept?.department_name} — detalle por concepto</DialogTitle>
        <DialogContent>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 1100 }}>
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700 } }}>
                  <TableCell>Concepto</TableCell>
                  {MONTH_LABELS.map((m) => <TableCell key={m} align="right">{m}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {detailTotals.conceptRows.map((row) => (
                  <TableRow key={row.concept_id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{row.concept_name}</Typography>
                      <Chip size="small" label={row.muc_code} variant="outlined" />
                    </TableCell>
                    {row.months.map((v, idx) => <TableCell key={idx} align="right">{formatCurrency(v)}</TableCell>)}
                  </TableRow>
                ))}
                <TableRow sx={{ "& td": { fontWeight: 700, borderTop: "2px solid #E5E7EB" } }}>
                  <TableCell>Total</TableCell>
                  {detailTotals.totals.map((t, idx) => <TableCell key={idx} align="right">{formatCurrency(t)}</TableCell>)}
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)} sx={{ textTransform: "none" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Rechazar presupuesto de {rejectDept?.department_name}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            El departamento podrá corregirlo y volver a enviarlo.
          </DialogContentText>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Motivo del rechazo"
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={acting} sx={{ textTransform: "none" }}>
            {acting ? "Rechazando..." : "Rechazar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
