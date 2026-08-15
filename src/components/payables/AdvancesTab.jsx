import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Autocomplete, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Snackbar, Stack, TextField, Typography,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { DataGrid } from "@mui/x-data-grid";
import API from "../../api";

const money = (v) => Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateStr = (v) => (v ? String(v).slice(0, 10) : "");
const today = () => new Date().toISOString().slice(0, 10);
const METHOD = { CASH: "Efectivo", TRANSFER: "Transferencia", CHECK: "Cheque" };

export default function AdvancesTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(true);

  const [apply, setApply] = useState({ open: false, advance: null });
  const [invoices, setInvoices] = useState([]);
  const [sel, setSel] = useState({});
  const [applyDate, setApplyDate] = useState(today());
  const [saving, setSaving] = useState(false);

  const [config, setConfig] = useState(null);
  const [cfg, setCfg] = useState({ open: false, account: null, apAccount: null, timing: "PAYMENT" });
  const [accounts, setAccounts] = useState([]);

  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const notify = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchConfig = async () => {
    try {
      const res = await API.get("/api/payables/config");
      setConfig(res.data || null);
    } catch (e) { /* opcional */ }
  };

  const openConfig = async () => {
    if (!accounts.length) {
      try {
        const res = await API.get("/api/accounting/accounts", { params: { is_active: 1 } });
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setAccounts(list.filter((a) => Number(a.is_movement) === 1));
      } catch (e) { /* opcional */ }
    }
    setCfg({
      open: true,
      account: config?.advance_account || null,
      apAccount: config?.ap_account || null,
      timing: config?.retention_timing || "PAYMENT",
    });
  };

  const saveConfig = async () => {
    try {
      await API.put("/api/payables/config", {
        advance_account_id: cfg.account?.id || null,
        ap_account_id: cfg.apAccount?.id || null,
        retention_timing: cfg.timing,
      });
      notify("Parámetros actualizados");
      setCfg({ open: false, account: null, apAccount: null, timing: "PAYMENT" });
      fetchConfig();
    } catch (e) { notify(e.response?.data?.message || "Error", "error"); }
  };

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await API.get("/api/payables/advances", { params: onlyOpen ? { open: 1 } : {} });
      setRows(res.data?.data || []);
    } catch (e) { notify(e.response?.data?.message || "Error cargando anticipos", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, [onlyOpen]);
  useEffect(() => { fetchConfig(); }, []);

  const openApply = async (adv) => {
    setApply({ open: true, advance: adv }); setSel({}); setApplyDate(today()); setInvoices([]);
    try {
      const res = await API.get("/api/payables/invoices", { params: { provider_id: adv.provider_id, open: 1 } });
      setInvoices(res.data?.data || []);
    } catch (e) { setInvoices([]); }
  };

  const selTotal = useMemo(
    () => Object.values(sel).reduce((s, a) => s + (Number(a) || 0), 0),
    [sel],
  );

  const doApply = async () => {
    const payments = Object.entries(sel).map(([id, amt]) => ({ invoice_id: Number(id), amount: Number(amt) || 0 })).filter((p) => p.amount > 0);
    if (!payments.length) { notify("Seleccione facturas", "warning"); return; }
    if (selTotal > Number(apply.advance.balance) + 0.009) { notify("La aplicación excede el saldo del anticipo", "warning"); return; }
    setSaving(true);
    try {
      await API.post(`/api/payables/advances/${apply.advance.id}/apply`, { payments, apply_date: applyDate });
      notify("Anticipo aplicado");
      setApply({ open: false, advance: null });
      fetchRows();
    } catch (e) { notify(e.response?.data?.message || "Error aplicando anticipo", "error"); }
    finally { setSaving(false); }
  };

  const columns = useMemo(() => [
    { field: "provider_name", headerName: "Proveedor", flex: 1, minWidth: 200 },
    { field: "payment_date", headerName: "Fecha", width: 110, valueGetter: (p) => dateStr(p.value) },
    { field: "method", headerName: "Forma", width: 120, valueGetter: (p) => METHOD[p.value] || p.value },
    { field: "reference", headerName: "Referencia", width: 130, valueGetter: (p) => p.value || "—" },
    { field: "amount", headerName: "Monto", width: 120, type: "number", valueFormatter: (p) => money(p.value) },
    { field: "applied_amount", headerName: "Aplicado", width: 120, type: "number", valueFormatter: (p) => money(p.value) },
    { field: "balance", headerName: "Disponible", width: 130, type: "number", valueFormatter: (p) => money(p.value) },
    {
      field: "actions", headerName: "", width: 110, sortable: false,
      renderCell: (p) => (Number(p.row.balance) > 0.009 ? (
        <Button size="small" variant="outlined" onClick={() => openApply(p.row)} sx={{ textTransform: "none" }}>Aplicar</Button>
      ) : <Chip size="small" color="success" label="Aplicado" />),
    },
  ], []);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
        <Button variant="outlined" onClick={() => setOnlyOpen((v) => !v)} sx={{ textTransform: "none" }}>
          {onlyOpen ? "Ver todos" : "Solo con saldo"}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Chip color="primary" label={`Disponible total: C$ ${money(rows.reduce((s, r) => s + Number(r.balance || 0), 0))}`} />
      </Stack>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap">
        <Typography variant="body2" color="text.secondary">
          Retención se contabiliza:{" "}
          <strong>{config?.retention_timing === "INVOICE" ? "a la factura" : "al pago"}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Cuenta de anticipos:{" "}
          <strong>{config?.advance_account ? config.advance_account.muc_code : "—"}</strong>
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<SettingsIcon />} onClick={openConfig}>Parámetros</Button>
      </Stack>
      <Alert severity="info" sx={{ mb: 2 }}>
        Los anticipos se registran desde "Registrar pago" marcando "Registrar como anticipo". Aquí se aplican a las facturas del proveedor.
      </Alert>

      <Box sx={{ height: 540 }}>
        <DataGrid rows={rows} columns={columns} loading={loading} getRowId={(r) => r.id}
          density="compact" pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} disableRowSelectionOnClick />
      </Box>

      <Dialog open={apply.open} onClose={() => setApply({ open: false, advance: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Aplicar anticipo — {apply.advance?.provider_name} (disponible C$ {money(apply.advance?.balance)})
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField size="small" type="date" label="Fecha de aplicación" InputLabelProps={{ shrink: true }}
              value={applyDate} onChange={(e) => setApplyDate(e.target.value)} sx={{ width: 200 }} />
            {invoices.length === 0 && <Alert severity="info">El proveedor no tiene facturas pendientes.</Alert>}
            <Stack spacing={0.5}>
              {invoices.map((inv) => {
                const on = sel[inv.id] != null;
                return (
                  <Stack key={inv.id} direction="row" spacing={1} alignItems="center">
                    <Checkbox size="small" checked={on} sx={{ p: 0.5 }}
                      onChange={(e) => setSel((m) => {
                        const n = { ...m };
                        if (e.target.checked) n[inv.id] = String(Math.min(Number(inv.balance), Number(apply.advance.balance)));
                        else delete n[inv.id];
                        return n;
                      })} />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {inv.document_number || `#${inv.id}`} · saldo C$ {money(inv.balance)}
                    </Typography>
                    {on && (
                      <TextField size="small" type="number" label="Aplicar" value={sel[inv.id]}
                        onChange={(e) => setSel((m) => ({ ...m, [inv.id]: e.target.value }))} sx={{ width: 120 }} />
                    )}
                  </Stack>
                );
              })}
            </Stack>
            <Stack direction="row" justifyContent="flex-end">
              <Chip color={selTotal > Number(apply.advance?.balance || 0) + 0.009 ? "error" : "primary"}
                label={`A aplicar: C$ ${money(selTotal)}`} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApply({ open: false, advance: null })} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={doApply} disabled={saving}
            sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" }, textTransform: "none" }}>
            {saving ? "Aplicando..." : "Aplicar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cfg.open} onClose={() => setCfg((c) => ({ ...c, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Parámetros de Cuentas por Pagar</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField select size="small" label="Momento de contabilización de la retención"
              value={cfg.timing} onChange={(e) => setCfg((c) => ({ ...c, timing: e.target.value }))}>
              <MenuItem value="PAYMENT">Al pago (se contabiliza al pagar la factura)</MenuItem>
              <MenuItem value="INVOICE">A la factura (se contabiliza al registrar la factura)</MenuItem>
            </TextField>
            <Alert severity="info">
              En modo "a la factura" el asiento (gasto, retención por pagar y cuentas por pagar por el neto) se genera al registrar la factura; el pago solo cancela la cuenta por pagar.
            </Alert>
            <Autocomplete size="small" options={accounts} value={cfg.apAccount}
              getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              onChange={(_, v) => setCfg((c) => ({ ...c, apAccount: v }))}
              renderInput={(params) => <TextField {...params} label="Cuenta por pagar a proveedores (MUC 2601.99)" />} />
            <Autocomplete size="small" options={accounts} value={cfg.account}
              getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              onChange={(_, v) => setCfg((c) => ({ ...c, account: v }))}
              renderInput={(params) => <TextField {...params} label="Cuenta de anticipos a proveedores (MUC 1602.01)" />} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCfg((c) => ({ ...c, open: false }))} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={saveConfig}
            sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" }, textTransform: "none" }}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={4000}
        onClose={() => setAlert((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
