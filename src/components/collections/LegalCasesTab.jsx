import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import API from "../../api";
import ReportBranchFilter from "../accounting/ReportBranchFilter";

const money = (v) =>
  Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateStr = (v) => (v ? String(v).slice(0, 10) : "");
const today = () => new Date().toISOString().slice(0, 10);

const STATUSES = [
  ["OPEN", "Abierto"],
  ["IN_PROGRESS", "En proceso"],
  ["JUDGMENT", "Sentencia"],
  ["SETTLED", "Arreglo/Conciliado"],
  ["CLOSED", "Cerrado"],
  ["WITHDRAWN", "Retirado"],
];
const statusLabel = (v) => STATUSES.find(([k]) => k === v)?.[1] || v;
const statusColor = (v) =>
  ({ OPEN: "warning", IN_PROGRESS: "info", JUDGMENT: "secondary", SETTLED: "success", CLOSED: "default", WITHDRAWN: "default" }[v] || "default");

export default function LegalCasesTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ branch_id: "", status: "", search: "" });

  const [detail, setDetail] = useState(null); // caso + expenses
  const [expenseForm, setExpenseForm] = useState({ expense_date: today(), concept: "", amount: "" });
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const notify = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.branch_id) params.branch_id = filters.branch_id;
      if (filters.status) params.status = filters.status;
      if (filters.search.trim()) params.search = filters.search.trim();
      const res = await API.get("/api/collections/legal-cases", { params });
      setRows(res.data?.data || []);
    } catch (e) {
      notify(e.response?.data?.message || "Error cargando casos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (id) => {
    try {
      const res = await API.get(`/api/collections/legal-cases/${id}`);
      setDetail(res.data?.data || null);
      setExpenseForm({ expense_date: today(), concept: "", amount: "" });
    } catch (e) {
      notify(e.response?.data?.message || "Error cargando caso", "error");
    }
  };

  const setCaseField = (k, v) => setDetail((prev) => ({ ...prev, [k]: v }));

  const saveCase = async () => {
    if (!detail) return;
    try {
      await API.put(`/api/collections/legal-cases/${detail.id}`, {
        case_number: detail.case_number,
        court: detail.court,
        lawyer_name: detail.lawyer_name,
        filed_date: detail.filed_date ? dateStr(detail.filed_date) : null,
        claim_amount: detail.claim_amount ? Number(detail.claim_amount) : null,
        status: detail.status,
        notes: detail.notes,
      });
      notify("Caso actualizado");
      fetchCases();
    } catch (e) {
      notify(e.response?.data?.message || "Error guardando caso", "error");
    }
  };

  const addExpense = async () => {
    if (!detail || !expenseForm.concept || !expenseForm.amount) return;
    try {
      await API.post(`/api/collections/legal-cases/${detail.id}/expenses`, {
        expense_date: expenseForm.expense_date,
        concept: expenseForm.concept,
        amount: Number(expenseForm.amount),
      });
      await openDetail(detail.id);
      fetchCases();
    } catch (e) {
      notify(e.response?.data?.message || "Error agregando gasto", "error");
    }
  };

  const deleteExpense = async (expenseId) => {
    try {
      await API.delete(`/api/collections/legal-expenses/${expenseId}`);
      await openDetail(detail.id);
      fetchCases();
    } catch (e) {
      notify(e.response?.data?.message || "Error eliminando gasto", "error");
    }
  };

  const columns = useMemo(
    () => [
      { field: "credit_code", headerName: "Crédito", width: 120 },
      { field: "customer_name", headerName: "Cliente", flex: 1, minWidth: 180 },
      { field: "branch_name", headerName: "Sucursal", width: 130 },
      { field: "case_number", headerName: "Expediente", width: 130, valueGetter: (p) => p.value || "—" },
      { field: "court", headerName: "Juzgado", width: 150, valueGetter: (p) => p.value || "—" },
      { field: "lawyer_name", headerName: "Abogado", width: 150, valueGetter: (p) => p.value || "—" },
      {
        field: "status",
        headerName: "Estado",
        width: 140,
        renderCell: (p) => <Chip size="small" color={statusColor(p.value)} label={statusLabel(p.value)} />,
      },
      { field: "claim_amount", headerName: "Demandado", width: 130, type: "number", valueFormatter: (p) => money(p.value) },
      { field: "total_expenses", headerName: "Gastos", width: 120, type: "number", valueFormatter: (p) => money(p.value) },
      {
        field: "actions",
        headerName: "",
        width: 120,
        sortable: false,
        renderCell: (p) => (
          <Button size="small" variant="outlined" onClick={() => openDetail(p.row.id)} sx={{ textTransform: "none" }}>
            Ver
          </Button>
        ),
      },
    ],
    [],
  );

  const totalExpenses = (detail?.expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
        <ReportBranchFilter value={filters.branch_id} onChange={(id) => setFilters((p) => ({ ...p, branch_id: id }))} />
        <TextField select size="small" label="Estado" value={filters.status}
          onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} sx={{ minWidth: 170 }}>
          <MenuItem value="">Todos</MenuItem>
          {STATUSES.map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Buscar cliente / expediente" value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && fetchCases()} sx={{ minWidth: 240 }} />
        <Button variant="outlined" onClick={fetchCases} sx={{ textTransform: "none" }}>Buscar</Button>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        Los casos judiciales se abren desde "Cartera en mora" → Gestionar → "Abrir caso judicial". Aquí se les da seguimiento (estado, juzgado, abogado y gastos).
      </Alert>

      <Box sx={{ height: 560 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={(r) => r.id}
          density="compact"
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Caso judicial — {detail?.customer_name} (crédito {detail?.credit_code})
        </DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={1.5}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <TextField size="small" label="N° de expediente" value={detail.case_number || ""}
                  onChange={(e) => setCaseField("case_number", e.target.value)} sx={{ minWidth: 180 }} />
                <TextField select size="small" label="Estado" value={detail.status || "OPEN"}
                  onChange={(e) => setCaseField("status", e.target.value)} sx={{ minWidth: 180 }}>
                  {STATUSES.map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </TextField>
                <TextField size="small" type="date" label="Fecha de demanda" InputLabelProps={{ shrink: true }}
                  value={dateStr(detail.filed_date)} onChange={(e) => setCaseField("filed_date", e.target.value)} />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <TextField size="small" label="Juzgado" value={detail.court || ""}
                  onChange={(e) => setCaseField("court", e.target.value)} sx={{ flex: 1 }} />
                <TextField size="small" label="Abogado" value={detail.lawyer_name || ""}
                  onChange={(e) => setCaseField("lawyer_name", e.target.value)} sx={{ flex: 1 }} />
                <TextField size="small" type="number" label="Monto demandado" value={detail.claim_amount || ""}
                  onChange={(e) => setCaseField("claim_amount", e.target.value)} sx={{ minWidth: 160 }} />
              </Stack>
              <TextField size="small" label="Notas" multiline minRows={2} value={detail.notes || ""}
                onChange={(e) => setCaseField("notes", e.target.value)} />
              <Box>
                <Button variant="contained" onClick={saveCase}
                  sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" }, textTransform: "none" }}>
                  Guardar caso
                </Button>
              </Box>

              <Divider />

              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2">Gastos legales</Typography>
                <Box sx={{ flex: 1 }} />
                <Chip label={`Total: C$ ${money(totalExpenses)}`} />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <TextField size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }}
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, expense_date: e.target.value }))} />
                <TextField size="small" label="Concepto" value={expenseForm.concept}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, concept: e.target.value }))} sx={{ flex: 1 }} />
                <TextField size="small" type="number" label="Monto" value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))} sx={{ width: 140 }} />
                <Button variant="outlined" onClick={addExpense} disabled={!expenseForm.concept || !expenseForm.amount}
                  sx={{ textTransform: "none" }}>Agregar</Button>
              </Stack>
              <Stack spacing={0.5}>
                {(detail.expenses || []).map((e) => (
                  <Paper key={e.id} variant="outlined" sx={{ p: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" sx={{ width: 110 }}>{dateStr(e.expense_date)}</Typography>
                    <Typography variant="body2" sx={{ flex: 1 }}>{e.concept}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>C$ {money(e.amount)}</Typography>
                    <IconButton size="small" color="error" onClick={() => deleteExpense(e.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Paper>
                ))}
                {(detail.expenses || []).length === 0 && (
                  <Typography variant="body2" color="text.secondary">Sin gastos registrados.</Typography>
                )}
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)} sx={{ textTransform: "none" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={4000}
        onClose={() => setAlert((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
