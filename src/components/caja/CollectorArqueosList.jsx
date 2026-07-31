import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Chip,
  Alert,
  Snackbar,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Divider,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import CancelIcon from "@mui/icons-material/Cancel";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";

const API_URL = "/api/caja/arqueos";

const STATUS_CHIP = {
  REGISTRADO: { label: "Registrado", color: "success" },
  ANULADO: { label: "Anulado", color: "default" },
};

const emptyForm = {
  collector_id: "",
  period_end: new Date().toISOString().slice(0, 10),
  cash_register_id: "",
  cash_amount: "",
  bank_account_id: "",
  bank_amount: "",
  notes: "",
};

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function CollectorArqueosList() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canRegisterArqueo = role === 1 || permissions.includes("caja.arqueos.registrar");
  const canVoidArqueo = role === 1 || permissions.includes("caja.arqueos.anular");
  const [rows, setRows] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [collectorFilter, setCollectorFilter] = useState("");
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchArqueos = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (collectorFilter) params.collector_id = collectorFilter;
      const res = await API.get(API_URL, { params });
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar los arqueos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArqueos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, collectorFilter]);

  useEffect(() => {
    API.get("/api/collectors").then((res) => setCollectors(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    API.get("/api/caja/registers", { params: { status: "ACTIVA" } }).then((res) => setCashRegisters(res.data?.data || [])).catch(() => {});
    API.get("/api/banks/accounts", { params: { status: "ACTIVA" } }).then((res) => setBankAccounts(res.data?.data || [])).catch(() => {});
  }, []);

  const handleOpenDialog = () => {
    setForm(emptyForm);
    setPreview(null);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!dialogOpen || !form.collector_id || !form.period_end) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    API.get(`${API_URL}/preview`, { params: { collector_id: form.collector_id, period_end: form.period_end } })
      .then((res) => { if (!cancelled) setPreview(res.data?.data || null); })
      .catch((error) => {
        if (!cancelled) {
          setPreview(null);
          showAlert(error.response?.data?.message || "No se pudo calcular el monto esperado", "error");
        }
      })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, form.collector_id, form.period_end]);

  const currencySymbol = "C$";

  const bankAmount = Number(form.bank_amount) || 0;
  const cashAmount = Number(form.cash_amount) || 0;

  // Lo que queda esperado para la parte de caja, DESPUÉS de restar lo que se
  // vaya a depositar al banco en esta misma liquidación.
  const expectedForCaja = useMemo(() => {
    if (!preview) return null;
    return Number((Number(preview.expected_amount) - bankAmount).toFixed(2));
  }, [preview, bankAmount]);

  const cajaDifference = useMemo(() => {
    if (expectedForCaja === null || form.cash_amount === "") return null;
    return Number((cashAmount - expectedForCaja).toFixed(2));
  }, [expectedForCaja, cashAmount, form.cash_amount]);

  const remaining = useMemo(() => {
    if (!preview) return null;
    return Number((Number(preview.expected_amount) - bankAmount - cashAmount).toFixed(2));
  }, [preview, bankAmount, cashAmount]);

  const handleSave = async () => {
    if (!form.collector_id || !form.period_end) {
      showAlert("Complete cobrador y fecha de corte", "error");
      return;
    }
    if (cashAmount <= 0 && bankAmount <= 0) {
      showAlert("Indique un monto para caja, para depositar al banco, o ambos", "error");
      return;
    }
    if (cashAmount > 0 && !form.cash_register_id) {
      showAlert("Elija la caja que recibe el efectivo", "error");
      return;
    }
    if (bankAmount > 0 && !form.bank_account_id) {
      showAlert("Elija la cuenta bancaria del depósito", "error");
      return;
    }
    if (!preview || Number(preview.expected_amount) <= 0) {
      showAlert("Este cobrador no tiene efectivo pendiente de liquidar", "error");
      return;
    }
    if (bankAmount > Number(preview.expected_amount)) {
      showAlert(`El monto a depositar no puede exceder lo pendiente (${currencySymbol} ${money(preview.expected_amount)})`, "error");
      return;
    }

    try {
      setSaving(true);
      const res = await API.post(API_URL, {
        collector_id: form.collector_id,
        period_end: form.period_end,
        cash_register_id: cashAmount > 0 ? form.cash_register_id : undefined,
        cash_amount: cashAmount > 0 ? cashAmount : undefined,
        bank_account_id: bankAmount > 0 ? form.bank_account_id : undefined,
        bank_amount: bankAmount > 0 ? bankAmount : undefined,
        notes: form.notes || undefined,
      });

      const parts = [];
      if (res.data?.data?.bank) parts.push(`depósito al banco ${currencySymbol} ${money(res.data.data.bank.amount)} (${res.data.data.bank.entry_no})`);
      if (res.data?.data?.caja) parts.push(`arqueo a caja ${currencySymbol} ${money(res.data.data.caja.counted_amount)} (${res.data.data.caja.entry_no})`);
      showAlert(`Liquidación registrada — ${parts.join(" · ")}`);
      setDialogOpen(false);
      fetchArqueos();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al registrar la liquidación", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmVoid = async () => {
    if (!voidTarget) return;
    const confirmed = window.confirm(`¿Confirma anular el arqueo de "${voidTarget.collector_name}" (esperado C$ ${money(voidTarget.expected_amount)}, contado C$ ${money(voidTarget.counted_amount)})?\n\nEsta acción anula el comprobante contable asociado y vuelve a dejar ese efectivo pendiente de liquidar. Si esta liquidación también incluyó un depósito al banco, ese depósito debe anularse por separado desde Bancos → Movimientos.`);
    if (!confirmed) return;

    try {
      setVoiding(true);
      await API.put(`${API_URL}/${voidTarget.id}/void`, { void_reason: voidReason || null });
      showAlert("Arqueo anulado");
      setVoidTarget(null);
      setVoidReason("");
      fetchArqueos();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al anular el arqueo", "error");
    } finally {
      setVoiding(false);
    }
  };

  const columns = useMemo(() => [
    { field: "collector_name", headerName: "Cobrador", width: 200 },
    { field: "cash_register_name", headerName: "Caja", width: 180 },
    { field: "period_end", headerName: "Corte", width: 110, renderCell: (p) => String(p.value || "").slice(0, 10) },
    { field: "expected_amount", headerName: "Esperado", width: 130, renderCell: (p) => money(p.value) },
    { field: "counted_amount", headerName: "Contado", width: 130, renderCell: (p) => money(p.value) },
    {
      field: "difference",
      headerName: "Diferencia",
      width: 130,
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={700} color={Number(p.value) === 0 ? "text.primary" : Number(p.value) > 0 ? "info.main" : "error.main"}>
          {money(p.value)}
        </Typography>
      ),
    },
    { field: "entry_no", headerName: "Comprobante", width: 130 },
    {
      field: "status",
      headerName: "Estado",
      width: 120,
      renderCell: (p) => <Chip size="small" color={STATUS_CHIP[p.value]?.color || "default"} label={STATUS_CHIP[p.value]?.label || p.value} />,
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        params.row.status === "REGISTRADO" && canVoidArqueo && (
          <Tooltip title="Anular arqueo">
            <IconButton size="small" color="error" onClick={() => { setVoidTarget(params.row); setVoidReason(""); }}>
              <CancelIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FactCheckIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Arqueo de Cobradores</Typography>
              <Typography variant="body2" color="text.secondary">
                Liquida el efectivo de cada cobrador — parte a caja, parte al banco, o ambos
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            {canRegisterArqueo && (
              <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenDialog}>
                Nueva liquidación
              </Button>
            )}
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchArqueos}>
              Actualizar
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <TextField select size="small" label="Cobrador" value={collectorFilter} onChange={(e) => setCollectorFilter(e.target.value)} sx={{ width: 220 }}>
            <MenuItem value="">Todos</MenuItem>
            {collectors.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 160 }}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="REGISTRADO">Registrado</MenuItem>
            <MenuItem value="ANULADO">Anulado</MenuItem>
          </TextField>
        </Box>

        <Box sx={{ height: 560, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            disableRowSelectionOnClick
            sx={{
              border: "1px solid #E5E7EB",
              borderRadius: 2,
              "& .MuiDataGrid-columnHeaders": { backgroundColor: "#F8FAFC", fontWeight: 700 },
            }}
          />
        </Box>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva liquidación de cobrador</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={7}>
              <TextField
                select fullWidth size="small" label="Cobrador"
                value={form.collector_id}
                onChange={(e) => setForm((f) => ({ ...f, collector_id: e.target.value }))}
              >
                {collectors.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}{c.branch_name ? ` — ${c.branch_name}` : ""}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth size="small" type="date" label="Fecha de corte" InputLabelProps={{ shrink: true }}
                value={form.period_end}
                onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))}
              />
            </Grid>

            {form.collector_id && (
              <Grid item xs={12}>
                <Divider sx={{ my: 0.5 }} />
                {previewLoading && (
                  <Typography variant="body2" color="text.secondary">Calculando monto pendiente...</Typography>
                )}
                {!previewLoading && preview && (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                    <Chip label={`Total cobrado: ${currencySymbol} ${money(preview.total_collected)}`} variant="outlined" />
                    {Number(preview.already_settled_banco) > 0 && (
                      <Chip label={`Ya depositado a banco: ${currencySymbol} ${money(preview.already_settled_banco)}`} color="info" variant="outlined" />
                    )}
                    {Number(preview.already_settled_caja) > 0 && (
                      <Chip label={`Ya arqueado: ${currencySymbol} ${money(preview.already_settled_caja)}`} variant="outlined" />
                    )}
                    <Chip
                      color={Number(preview.expected_amount) > 0 ? "primary" : "default"}
                      label={`Pendiente de liquidar: ${currencySymbol} ${money(preview.expected_amount)}`}
                    />
                  </Box>
                )}
                {!previewLoading && preview && Number(preview.expected_amount) <= 0 && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Este cobrador no tiene efectivo pendiente de liquidar.
                  </Alert>
                )}
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700}>¿Cuánto va al banco?</Typography>
            </Grid>
            <Grid item xs={12} sm={7}>
              <TextField
                select fullWidth size="small" label="Cuenta bancaria (si deposita)"
                value={form.bank_account_id}
                onChange={(e) => setForm((f) => ({ ...f, bank_account_id: e.target.value }))}
              >
                <MenuItem value="">— No deposita al banco —</MenuItem>
                {bankAccounts.map((b) => <MenuItem key={b.id} value={b.id}>{b.account_alias}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth size="small" type="number" label="Monto a depositar"
                value={form.bank_amount}
                onChange={(e) => setForm((f) => ({ ...f, bank_amount: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700}>¿Cuánto va a caja?</Typography>
            </Grid>
            <Grid item xs={12} sm={7}>
              <TextField
                select fullWidth size="small" label="Caja que recibe el efectivo (si arquea)"
                value={form.cash_register_id}
                onChange={(e) => setForm((f) => ({ ...f, cash_register_id: e.target.value }))}
              >
                <MenuItem value="">— No arquea en caja —</MenuItem>
                {cashRegisters.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth size="small" type="number" label="Monto contado"
                value={form.cash_amount}
                onChange={(e) => setForm((f) => ({ ...f, cash_amount: e.target.value }))}
              />
            </Grid>

            {preview && (bankAmount > 0 || cashAmount > 0) && (
              <Grid item xs={12}>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {cashAmount > 0 && expectedForCaja !== null && cajaDifference !== null && (
                    <Chip
                      color={cajaDifference === 0 ? "success" : cajaDifference > 0 ? "info" : "error"}
                      label={
                        cajaDifference === 0
                          ? "Caja cuadra exacto"
                          : cajaDifference > 0
                            ? `Sobrante en caja: ${currencySymbol} ${money(cajaDifference)}`
                            : `Faltante en caja: ${currencySymbol} ${money(-cajaDifference)}`
                      }
                    />
                  )}
                  {remaining !== null && (
                    <Chip
                      variant="outlined"
                      color={remaining > 0 ? "warning" : "default"}
                      label={remaining > 0 ? `Quedará pendiente: ${currencySymbol} ${money(remaining)}` : "Liquida todo lo pendiente"}
                    />
                  )}
                </Box>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Notas (opcional)" multiline minRows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : "Registrar liquidación"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(voidTarget)} onClose={() => setVoidTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Anular arqueo</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth size="small" label="Motivo de anulación (opcional)" multiline minRows={2} sx={{ mt: 1 }}
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoidTarget(null)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmVoid} disabled={voiding} sx={{ textTransform: "none" }}>
            {voiding ? "Anulando..." : "Anular arqueo"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
