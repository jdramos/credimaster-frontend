import React, { useContext, useEffect, useMemo, useState } from "react";
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
  TextField,
  Autocomplete,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import EditNoteIcon from "@mui/icons-material/EditNote";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { UserContext } from "../../contexts/UserContext";
import {
  getBudgets,
  getBudgetConcepts,
  getDepartmentLines,
  saveDepartmentLines,
  submitDepartmentBudget,
} from "../../api/budget";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", minimumFractionDigits: 2 }).format(Number(value || 0));

const STATUS_INFO = {
  DRAFT: { label: "Borrador", severity: "info" },
  SUBMITTED: { label: "Enviado — pendiente de aprobación", severity: "warning" },
  APPROVED: { label: "Aprobado", severity: "success" },
  REJECTED: { label: "Rechazado", severity: "error" },
};

export default function DepartmentBudgetEditor() {
  const { departmentId } = useContext(UserContext) || {};

  const [budgets, setBudgets] = useState([]);
  const [budgetId, setBudgetId] = useState("");
  const [conceptOptions, setConceptOptions] = useState([]);
  const [rows, setRows] = useState([]); // [{concept_id, concept_name, muc_code, months: [12]}]
  const [submission, setSubmission] = useState({ status: "DRAFT" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const isLocked = submission.status === "SUBMITTED" || submission.status === "APPROVED";

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
    getBudgetConcepts()
      .then((res) => setConceptOptions((res?.data || []).filter((c) => c.is_active)))
      .catch(() => {});
  }, []);

  const load = async () => {
    if (!budgetId) return;
    try {
      setLoading(true);
      const res = await getDepartmentLines(budgetId);
      const { lines = [], submission: sub } = res?.data || {};

      const byConcept = new Map();
      for (const line of lines) {
        if (!byConcept.has(line.concept_id)) {
          byConcept.set(line.concept_id, {
            concept_id: line.concept_id,
            concept_name: line.concept_name,
            muc_code: line.muc_code,
            months: Array(12).fill(0),
          });
        }
        byConcept.get(line.concept_id).months[line.month_no - 1] = Number(line.amount) || 0;
      }
      setRows([...byConcept.values()].sort((a, b) => a.concept_name.localeCompare(b.concept_name)));
      setSubmission(sub || { status: "DRAFT" });
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar el presupuesto del departamento", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetId]);

  const availableConcepts = useMemo(
    () => conceptOptions.filter((c) => !rows.some((r) => r.concept_id === c.id)),
    [conceptOptions, rows],
  );

  const handleAddConcept = (concept) => {
    if (!concept) return;
    setRows((prev) =>
      [
        ...prev,
        { concept_id: concept.id, concept_name: concept.name, muc_code: concept.muc_code, months: Array(12).fill(0) },
      ].sort((a, b) => a.concept_name.localeCompare(b.concept_name)),
    );
  };

  const handleRemoveRow = (conceptId) => {
    setRows((prev) => prev.filter((r) => r.concept_id !== conceptId));
  };

  const handleCellChange = (conceptId, monthIdx, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.concept_id !== conceptId) return r;
        const months = [...r.months];
        months[monthIdx] = value === "" ? 0 : Number(value);
        return { ...r, months };
      }),
    );
  };

  const handleSave = async () => {
    const lines = rows.flatMap((r) =>
      r.months.map((amount, idx) => ({ concept_id: r.concept_id, month_no: idx + 1, amount })),
    );
    if (!lines.length) {
      showAlert("Agrega al menos un concepto antes de guardar", "error");
      return;
    }
    try {
      setSaving(true);
      await saveDepartmentLines(budgetId, lines);
      showAlert("Guardado correctamente");
      load();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await submitDepartmentBudget(budgetId);
      showAlert("Presupuesto enviado a aprobación");
      setConfirmOpen(false);
      load();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al enviar el presupuesto", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const totalsByMonth = useMemo(() => {
    const totals = Array(12).fill(0);
    rows.forEach((r) => r.months.forEach((v, i) => { totals[i] += v; }));
    return totals;
  }, [rows]);

  if (!departmentId) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">No tiene un departamento asignado. Pídale al administrador que se lo asigne en su usuario.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <EditNoteIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Mi presupuesto de departamento</Typography>
              <Typography variant="body2" color="text.secondary">
                Llena los montos por concepto y mes, y envía a aprobación cuando esté listo
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="budget-select-label">Presupuesto</InputLabel>
              <Select labelId="budget-select-label" label="Presupuesto" value={budgetId} onChange={(e) => setBudgetId(e.target.value)}>
                {budgets.map((b) => (
                  <MenuItem key={b.id} value={b.id}>{b.name} ({b.year_no})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" startIcon={<SaveIcon />} disabled={saving || loading || isLocked} sx={{ textTransform: "none" }} onClick={handleSave}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              disabled={submitting || loading || isLocked || !rows.length}
              sx={{ textTransform: "none" }}
              onClick={() => setConfirmOpen(true)}
            >
              Enviar a aprobación
            </Button>
          </Box>
        </Box>

        <Alert severity={STATUS_INFO[submission.status]?.severity || "info"} sx={{ mb: 2 }}>
          Estado: {STATUS_INFO[submission.status]?.label || submission.status}
          {submission.status === "REJECTED" && submission.review_comment && (
            <> — Motivo: {submission.review_comment}</>
          )}
        </Alert>

        <Autocomplete
          options={availableConcepts}
          getOptionLabel={(c) => c.name}
          onChange={(_, value) => handleAddConcept(value)}
          value={null}
          disabled={isLocked}
          renderInput={(params) => <TextField {...params} size="small" label="Agregar concepto" />}
          sx={{ maxWidth: 480, mb: 2 }}
        />

        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 1200 }}>
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, backgroundColor: "#F8FAFC" } }}>
                <TableCell>Concepto</TableCell>
                {MONTH_LABELS.map((m) => (
                  <TableCell key={m} align="right">{m}</TableCell>
                ))}
                {!isLocked && <TableCell align="center">Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.concept_id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <Typography variant="body2" fontWeight={600}>{row.concept_name}</Typography>
                    {row.muc_code && <Chip size="small" label={row.muc_code} variant="outlined" sx={{ mt: 0.5 }} />}
                  </TableCell>
                  {row.months.map((value, idx) => (
                    <TableCell key={idx} align="right" sx={{ p: 0.5 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={value}
                        disabled={isLocked}
                        onChange={(e) => handleCellChange(row.concept_id, idx, e.target.value)}
                        inputProps={{ style: { textAlign: "right" }, min: 0, step: 0.01 }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                  ))}
                  {!isLocked && (
                    <TableCell align="center">
                      <Button size="small" color="error" onClick={() => handleRemoveRow(row.concept_id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}

              {rows.length > 0 && (
                <TableRow sx={{ "& td": { fontWeight: 700, borderTop: "2px solid #E5E7EB" } }}>
                  <TableCell>Total</TableCell>
                  {totalsByMonth.map((t, idx) => (
                    <TableCell key={idx} align="right">{formatCurrency(t)}</TableCell>
                  ))}
                  {!isLocked && <TableCell />}
                </TableRow>
              )}
            </TableBody>
          </Table>

          {!rows.length && !loading && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
              Agrega un concepto arriba para empezar a presupuestar.
            </Typography>
          )}
        </Box>
      </Paper>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Enviar presupuesto a aprobación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Una vez enviado, no podrás editarlo hasta que el financiero lo apruebe o lo rechace. ¿Deseas continuar?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting} sx={{ textTransform: "none" }}>
            {submitting ? "Enviando..." : "Sí, enviar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
