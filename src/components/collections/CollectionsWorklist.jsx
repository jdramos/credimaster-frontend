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
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import GavelIcon from "@mui/icons-material/Gavel";
import AddCommentIcon from "@mui/icons-material/AddComment";
import API from "../../api";
import ReportBranchFilter from "../accounting/ReportBranchFilter";

const money = (v) =>
  Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateStr = (v) => (v ? String(v).slice(0, 10) : "");
const today = () => new Date().toISOString().slice(0, 10);

const ACTION_TYPES = [
  ["CALL", "Llamada"],
  ["VISIT", "Visita"],
  ["WHATSAPP", "WhatsApp"],
  ["MESSAGE", "Mensaje/SMS"],
  ["EMAIL", "Correo"],
  ["LETTER", "Carta/Notificación"],
  ["OTHER", "Otro"],
];
const RESULTS = [
  ["CONTACTED", "Contactado"],
  ["PROMISE", "Promesa de pago"],
  ["PARTIAL_PAYMENT", "Pago parcial"],
  ["NO_ANSWER", "No contesta"],
  ["NOT_LOCATED", "No localizado"],
  ["REFUSED", "Se niega a pagar"],
  ["OTHER", "Otro"],
];
const STAGES = [
  ["PREVENTIVE", "Preventiva"],
  ["ADMINISTRATIVE", "Administrativa"],
  ["LEGAL", "Judicial"],
];
const label = (list, val) => list.find(([k]) => k === val)?.[1] || val || "";

const emptyForm = {
  action_type: "CALL",
  action_date: today(),
  result: "CONTACTED",
  stage: "ADMINISTRATIVE",
  notes: "",
  promised_amount: "",
  promised_date: "",
  next_action_date: "",
};

export default function CollectionsWorklist() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ loans: 0, overdue_amount: 0, open_promises: 0 });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    branch_id: "",
    min_days: 1,
    search: "",
    only_promises: false,
  });

  const [dialogLoan, setDialogLoan] = useState(null);
  const [actions, setActions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const notify = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchWorklist = async () => {
    setLoading(true);
    try {
      const params = { min_days: filters.min_days || 1 };
      if (filters.branch_id) params.branch_id = filters.branch_id;
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.only_promises) params.only_promises = "1";
      const res = await API.get("/api/collections/worklist", { params });
      setRows(res.data?.data || []);
      setSummary(res.data?.summary || { loans: 0, overdue_amount: 0, open_promises: 0 });
    } catch (e) {
      notify(e.response?.data?.message || "Error cargando cartera en mora", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorklist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openManage = async (loan) => {
    setDialogLoan(loan);
    setForm({ ...emptyForm, action_date: today() });
    setActions([]);
    try {
      const res = await API.get(`/api/collections/loans/${loan.loan_id}/actions`);
      setActions(res.data?.data || []);
    } catch (e) {
      notify(e.response?.data?.message || "Error cargando bitácora", "error");
    }
  };

  const saveAction = async () => {
    if (!dialogLoan) return;
    setSaving(true);
    try {
      await API.post("/api/collections/actions", {
        loan_id: dialogLoan.loan_id,
        action_type: form.action_type,
        action_date: form.action_date,
        result: form.result,
        stage: form.stage,
        notes: form.notes,
        promised_amount: form.promised_amount ? Number(form.promised_amount) : null,
        promised_date: form.promised_date || null,
        next_action_date: form.next_action_date || null,
      });
      notify("Gestión registrada");
      const res = await API.get(`/api/collections/loans/${dialogLoan.loan_id}/actions`);
      setActions(res.data?.data || []);
      setForm({ ...emptyForm, action_date: today() });
      fetchWorklist();
    } catch (e) {
      notify(e.response?.data?.message || "Error registrando gestión", "error");
    } finally {
      setSaving(false);
    }
  };

  const openLegalCase = async () => {
    if (!dialogLoan) return;
    try {
      await API.post("/api/collections/legal-cases", { loan_id: dialogLoan.loan_id });
      notify("Caso judicial abierto — véalo en la pestaña Judicial");
      const res = await API.get(`/api/collections/loans/${dialogLoan.loan_id}/actions`);
      setActions(res.data?.data || []);
      fetchWorklist();
    } catch (e) {
      notify(e.response?.data?.message || "Error abriendo caso judicial", "error");
    }
  };

  const markPromise = async (actionId, status) => {
    try {
      await API.put(`/api/collections/actions/${actionId}/promise`, { promise_status: status });
      notify("Promesa actualizada");
      if (dialogLoan) {
        const res = await API.get(`/api/collections/loans/${dialogLoan.loan_id}/actions`);
        setActions(res.data?.data || []);
      }
      fetchWorklist();
    } catch (e) {
      notify(e.response?.data?.message || "Error actualizando promesa", "error");
    }
  };

  const columns = useMemo(
    () => [
      { field: "credit_code", headerName: "Crédito", width: 120 },
      { field: "customer_name", headerName: "Cliente", flex: 1, minWidth: 200 },
      { field: "branch_name", headerName: "Sucursal", width: 140 },
      { field: "collector_name", headerName: "Gestor", width: 140 },
      {
        field: "days_overdue",
        headerName: "Días mora",
        width: 110,
        type: "number",
        renderCell: (p) => {
          const d = Number(p.value || 0);
          const color = d > 30 ? "error" : d > 7 ? "warning" : "default";
          return <Chip size="small" color={color} label={`${d} d`} />;
        },
      },
      {
        field: "overdue_amount",
        headerName: "Monto vencido",
        width: 140,
        type: "number",
        valueFormatter: (p) => money(p.value),
      },
      { field: "overdue_installments", headerName: "Cuotas", width: 90, type: "number" },
      {
        field: "last_action_date",
        headerName: "Última gestión",
        width: 130,
        valueGetter: (p) => (p.value ? `${dateStr(p.value)}` : "—"),
      },
      {
        field: "promise_status",
        headerName: "Promesa",
        width: 130,
        renderCell: (p) => {
          if (p.value !== "PENDING") return "—";
          const overdue = p.row.promised_date && p.row.promised_date < today();
          return (
            <Chip
              size="small"
              color={overdue ? "error" : "info"}
              label={`${overdue ? "Vencida " : ""}${dateStr(p.row.promised_date)}`}
            />
          );
        },
      },
      {
        field: "actions",
        headerName: "",
        width: 130,
        sortable: false,
        filterable: false,
        renderCell: (p) => (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCommentIcon fontSize="small" />}
            onClick={() => openManage(p.row)}
            sx={{ textTransform: "none" }}
          >
            Gestionar
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const setF = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <GavelIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Cobranza</Typography>
            <Typography variant="body2" color="text.secondary">
              Cartera en mora, gestión de cobro y promesas de pago
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
          <ReportBranchFilter
            value={filters.branch_id}
            onChange={(id) => setFilters((p) => ({ ...p, branch_id: id }))}
          />
          <TextField
            size="small"
            type="number"
            label="Días de mora ≥"
            value={filters.min_days}
            onChange={(e) => setFilters((p) => ({ ...p, min_days: e.target.value }))}
            sx={{ width: 140 }}
          />
          <TextField
            size="small"
            label="Buscar cliente / crédito"
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && fetchWorklist()}
            sx={{ minWidth: 220 }}
          />
          <TextField
            select
            size="small"
            label="Promesas"
            value={filters.only_promises ? "1" : "0"}
            onChange={(e) => setFilters((p) => ({ ...p, only_promises: e.target.value === "1" }))}
            sx={{ width: 180 }}
          >
            <MenuItem value="0">Todas</MenuItem>
            <MenuItem value="1">Solo con promesa abierta</MenuItem>
          </TextField>
          <Button variant="outlined" onClick={fetchWorklist} sx={{ textTransform: "none" }}>
            Buscar
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
          <Chip color="error" label={`Créditos en mora: ${summary.loans}`} />
          <Chip color="warning" label={`Monto vencido: C$ ${money(summary.overdue_amount)}`} />
          <Chip color="info" label={`Promesas abiertas: ${summary.open_promises}`} />
        </Stack>

        <Box sx={{ height: 600 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(r) => r.loan_id}
            density="compact"
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            disableRowSelectionOnClick
            sx={{
              border: "1px solid #E5E7EB",
              borderRadius: 2,
              "& .MuiDataGrid-columnHeaders": { backgroundColor: "#F8FAFC", fontWeight: 700 },
            }}
          />
        </Box>
      </Paper>

      {/* Diálogo de gestión */}
      <Dialog open={Boolean(dialogLoan)} onClose={() => setDialogLoan(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Gestión de cobro — {dialogLoan?.customer_name} (crédito {dialogLoan?.credit_code})
        </DialogTitle>
        <DialogContent dividers>
          {dialogLoan && (
            <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
              <Chip size="small" color="error" label={`${dialogLoan.days_overdue} días de mora`} />
              <Chip size="small" label={`Vencido: C$ ${money(dialogLoan.overdue_amount)}`} />
              {dialogLoan.cellphone && <Chip size="small" variant="outlined" label={`Cel: ${dialogLoan.cellphone}`} />}
              {dialogLoan.telephone && <Chip size="small" variant="outlined" label={`Tel: ${dialogLoan.telephone}`} />}
              <Box sx={{ flex: 1 }} />
              <Button size="small" color="error" variant="outlined" startIcon={<GavelIcon fontSize="small" />}
                onClick={openLegalCase} sx={{ textTransform: "none" }}>
                Abrir caso judicial
              </Button>
            </Stack>
          )}

          <Typography variant="subtitle2" sx={{ mb: 1 }}>Nueva gestión</Typography>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField select size="small" label="Tipo" value={form.action_type}
                onChange={(e) => setF("action_type", e.target.value)} sx={{ minWidth: 160 }}>
                {ACTION_TYPES.map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
              <TextField size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }}
                value={form.action_date} onChange={(e) => setF("action_date", e.target.value)} />
              <TextField select size="small" label="Resultado" value={form.result}
                onChange={(e) => setF("result", e.target.value)} sx={{ minWidth: 180 }}>
                {RESULTS.map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Etapa" value={form.stage}
                onChange={(e) => setF("stage", e.target.value)} sx={{ minWidth: 160 }}>
                {STAGES.map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField size="small" label="Notas" multiline minRows={2}
              value={form.notes} onChange={(e) => setF("notes", e.target.value)} />
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField size="small" type="number" label="Promesa: monto" value={form.promised_amount}
                onChange={(e) => setF("promised_amount", e.target.value)} sx={{ minWidth: 160 }} />
              <TextField size="small" type="date" label="Promesa: fecha" InputLabelProps={{ shrink: true }}
                value={form.promised_date} onChange={(e) => setF("promised_date", e.target.value)} />
              <TextField size="small" type="date" label="Próxima acción" InputLabelProps={{ shrink: true }}
                value={form.next_action_date} onChange={(e) => setF("next_action_date", e.target.value)} />
            </Stack>
            <Box>
              <Button variant="contained" onClick={saveAction} disabled={saving}
                sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" }, textTransform: "none" }}>
                {saving ? "Guardando..." : "Registrar gestión"}
              </Button>
            </Box>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>Historial de gestiones</Typography>
          {actions.length === 0 && (
            <Typography variant="body2" color="text.secondary">Sin gestiones registradas.</Typography>
          )}
          <Stack spacing={1}>
            {actions.map((a) => (
              <Paper key={a.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Chip size="small" label={dateStr(a.action_date)} />
                  <Chip size="small" color="primary" variant="outlined" label={label(ACTION_TYPES, a.action_type)} />
                  <Chip size="small" label={label(RESULTS, a.result)} />
                  <Chip size="small" variant="outlined" label={label(STAGES, a.stage)} />
                  <Box sx={{ flex: 1 }} />
                  {a.created_by_name && (
                    <Typography variant="caption" color="text.secondary">{a.created_by_name}</Typography>
                  )}
                </Stack>
                {a.notes && <Typography variant="body2" sx={{ mt: 0.5 }}>{a.notes}</Typography>}
                {a.promise_status && a.promise_status !== "NONE" && (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                    <Chip
                      size="small"
                      color={
                        a.promise_status === "KEPT" ? "success" :
                        a.promise_status === "BROKEN" ? "error" : "info"
                      }
                      label={`Promesa C$ ${money(a.promised_amount)} el ${dateStr(a.promised_date)} — ${a.promise_status}`}
                    />
                    {a.promise_status === "PENDING" && (
                      <>
                        <Button size="small" color="success" onClick={() => markPromise(a.id, "KEPT")}>Cumplida</Button>
                        <Button size="small" color="error" onClick={() => markPromise(a.id, "BROKEN")}>Rota</Button>
                      </>
                    )}
                  </Stack>
                )}
                {a.next_action_date && (
                  <Typography variant="caption" color="text.secondary">
                    Próxima acción: {dateStr(a.next_action_date)}
                  </Typography>
                )}
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogLoan(null)} sx={{ textTransform: "none" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
