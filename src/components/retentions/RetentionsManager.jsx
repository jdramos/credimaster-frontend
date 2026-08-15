import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import DownloadIcon from "@mui/icons-material/Download";
import AddIcon from "@mui/icons-material/Add";
import GroupsIcon from "@mui/icons-material/Groups";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SettingsIcon from "@mui/icons-material/Settings";
import DescriptionIcon from "@mui/icons-material/Description";
import API from "../../api";
import { printRetentionCertificate } from "./printRetentionCertificate";

const money = (v) =>
  Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateStr = (v) => (v ? String(v).slice(0, 10) : "");
const thisMonth = () => new Date().toISOString().slice(0, 7);

const emptyForm = {
  id: null,
  retention_code: "",
  rate: "",
  ruc: "",
  name: "",
  document_number: "",
  document_date: "",
  base_amount: "",
  gross_income: "",
  inss: "",
  retained_amount: "",
};

export default function RetentionsManager() {
  const [period, setPeriod] = useState(thisMonth());
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ count: 0, base: 0, retained: 0 });
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState([]);
  const [providers, setProviders] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);

  // Proveedores/personas con retenciones en el período (para las constancias).
  const certParties = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!r.ruc) continue;
      const cur = map.get(r.ruc) || { ruc: r.ruc, name: r.name, count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(r.retained_amount || 0);
      map.set(r.ruc, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const printCertificate = async (ruc) => {
    try {
      const res = await API.get("/api/retentions/certificate", { params: { period, ruc } });
      printRetentionCertificate(res.data);
    } catch (e) {
      notify(e.response?.data?.message || "Error generando constancia", "error");
    }
  };

  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const notify = (message, severity = "success") => setAlert({ open: true, severity, message });

  const isPayroll = String(form.retention_code) === "11";

  const fetchCodes = async () => {
    try {
      const res = await API.get("/api/retentions/codes");
      setCodes(res.data?.data || []);
    } catch (e) {
      notify(e.response?.data?.message || "Error cargando catálogo", "error");
    }
  };

  const fetchRetentions = async () => {
    setLoading(true);
    try {
      const res = await API.get("/api/retentions", { params: { period } });
      setRows(res.data?.data || []);
      setSummary(res.data?.summary || { count: 0, base: 0, retained: 0 });
    } catch (e) {
      notify(e.response?.data?.message || "Error cargando retenciones", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const res = await API.get("/api/providers", { params: { active: 1 } });
      setProviders(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (e) {
      /* proveedores es opcional para el registro manual */
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await API.get("/api/accounting/accounts", { params: { is_active: 1 } });
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAccounts(list.filter((a) => Number(a.is_movement) === 1));
    } catch (e) {
      /* opcional */
    }
  };

  useEffect(() => {
    fetchCodes();
    fetchProviders();
    fetchAccounts();
    fetchRetentions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadDmi = async () => {
    try {
      const res = await API.get("/api/retentions/dmi", {
        params: { period },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `DMI_${period}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      notify("Error generando el DMI", "error");
    }
  };

  const importPayroll = async () => {
    if (!window.confirm(`Importar retenciones de IR salario (código 11) de la planilla del período ${period}? Reemplaza lo importado antes de planilla en ese mes.`)) return;
    try {
      const res = await API.post("/api/retentions/import-payroll", null, { params: { period } });
      notify(`Importadas ${res.data?.inserted || 0} retenciones de planilla`);
      fetchRetentions();
    } catch (e) {
      notify(e.response?.data?.message || "Error importando de planilla", "error");
    }
  };

  const importChecks = async () => {
    if (!window.confirm(`Importar retenciones de proveedores desde los cheques del período ${period}? Usa el mapeo de cuentas configurado. Reemplaza lo importado antes de cheques en ese mes.`)) return;
    try {
      const res = await API.post("/api/retentions/import-checks", null, { params: { period } });
      let msg = `Importadas ${res.data?.inserted || 0} retenciones de cheques`;
      if (res.data?.skipped_no_rate) msg += ` · ${res.data.skipped_no_rate} omitidas (código sin alícuota)`;
      notify(msg);
      fetchRetentions();
    } catch (e) {
      notify(e.response?.data?.message || "Error importando de cheques", "error");
    }
  };

  const setF = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const onPickCode = (code) => {
    const c = codes.find((x) => x.code === code);
    setForm((prev) => ({
      ...prev,
      retention_code: code,
      rate: c?.default_rate ?? "",
    }));
  };

  // Retenido calculado en vivo para no-planilla (base × alícuota).
  const computedRetained = useMemo(() => {
    if (isPayroll) return Number(form.retained_amount || 0);
    const base = Number(form.base_amount || 0);
    const rate = Number(form.rate || 0);
    return Math.round(base * rate) / 100;
  }, [isPayroll, form.base_amount, form.rate, form.retained_amount]);

  const openNew = () => {
    setForm({ ...emptyForm });
    setFormOpen(true);
  };
  const openEdit = (row) => {
    setForm({
      id: row.id,
      retention_code: row.retention_code,
      rate: row.rate ?? "",
      ruc: row.ruc,
      name: row.name,
      document_number: row.document_number || "",
      document_date: dateStr(row.document_date),
      base_amount: row.base_amount ?? "",
      gross_income: row.gross_income ?? "",
      inss: row.inss ?? "",
      retained_amount: row.retained_amount ?? "",
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.retention_code || !form.ruc || !form.name) {
      notify("Código, RUC y nombre son obligatorios", "warning");
      return;
    }
    const payload = {
      period,
      retention_code: form.retention_code,
      rate: isPayroll ? null : form.rate === "" ? null : Number(form.rate),
      ruc: form.ruc,
      name: form.name,
      document_number: form.document_number || null,
      document_date: form.document_date || null,
      base_amount: isPayroll ? null : Number(form.base_amount || 0),
      gross_income: isPayroll ? Number(form.gross_income || 0) : null,
      inss: isPayroll ? Number(form.inss || 0) : null,
      retained_amount:
        form.retained_amount === "" ? (isPayroll ? 0 : computedRetained) : Number(form.retained_amount),
    };
    try {
      if (form.id) await API.put(`/api/retentions/${form.id}`, payload);
      else await API.post("/api/retentions", payload);
      notify("Retención guardada");
      setFormOpen(false);
      fetchRetentions();
    } catch (e) {
      notify(e.response?.data?.message || "Error guardando", "error");
    }
  };

  const remove = async (id) => {
    try {
      await API.delete(`/api/retentions/${id}`);
      fetchRetentions();
    } catch (e) {
      notify(e.response?.data?.message || "Error eliminando", "error");
    }
  };

  const columns = useMemo(
    () => [
      { field: "retention_code", headerName: "Código", width: 90 },
      { field: "ruc", headerName: "RUC / Cédula", width: 160 },
      { field: "name", headerName: "Nombre / Razón social", flex: 1, minWidth: 200 },
      { field: "document_number", headerName: "Documento", width: 120 },
      { field: "document_date", headerName: "Fecha", width: 110, valueGetter: (p) => dateStr(p.value) },
      { field: "base_amount", headerName: "Base", width: 130, type: "number", valueFormatter: (p) => money(p.value) },
      { field: "rate", headerName: "Alíc.", width: 70, valueGetter: (p) => (p.value == null ? "" : `${p.value}%`) },
      { field: "retained_amount", headerName: "Retenido", width: 130, type: "number", valueFormatter: (p) => money(p.value) },
      {
        field: "actions",
        headerName: "",
        width: 100,
        sortable: false,
        renderCell: (p) => (
          <Stack direction="row">
            <IconButton size="small" onClick={() => openEdit(p.row)}><EditIcon fontSize="small" /></IconButton>
            <IconButton size="small" color="error" onClick={() => remove(p.row.id)}><DeleteIcon fontSize="small" /></IconButton>
          </Stack>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
          <ReceiptLongIcon sx={{ color: "#0057B8" }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>Retenciones IR (DGI)</Typography>
            <Typography variant="body2" color="text.secondary">
              Registro de retenciones en la fuente y generación de la Declaración Mensual (DMI)
            </Typography>
          </Box>
          <Button variant="text" startIcon={<SettingsIcon />} onClick={() => setMapOpen(true)}>
            Cuentas de retención
          </Button>
          <Button variant="text" startIcon={<SettingsIcon />} onClick={() => setCatalogOpen(true)}>
            Catálogo
          </Button>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            type="month"
            label="Período"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="outlined" onClick={fetchRetentions} sx={{ textTransform: "none" }}>Cargar</Button>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={openNew} sx={{ textTransform: "none" }}>
            Nueva retención
          </Button>
          <Button variant="outlined" startIcon={<GroupsIcon />} onClick={importPayroll} sx={{ textTransform: "none" }}>
            Importar de planilla
          </Button>
          <Button variant="outlined" startIcon={<ReceiptLongIcon />} onClick={importChecks} sx={{ textTransform: "none" }}>
            Importar de cheques
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="outlined"
            startIcon={<DescriptionIcon />}
            onClick={() => setCertOpen(true)}
            disabled={!certParties.length}
            sx={{ textTransform: "none" }}
          >
            Constancias
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={downloadDmi}
            disabled={!rows.length}
            sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" }, textTransform: "none" }}
          >
            Generar DMI (Excel)
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
          <Chip label={`Registros: ${summary.count}`} />
          <Chip color="primary" label={`Base: C$ ${money(summary.base)}`} />
          <Chip color="success" label={`Retenido: C$ ${money(summary.retained)}`} />
        </Stack>

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
      </Paper>

      {/* Form retención */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{form.id ? "Editar" : "Nueva"} retención — {period}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField select size="small" label="Código de retención" value={form.retention_code}
              onChange={(e) => onPickCode(e.target.value)}>
              {codes.map((c) => (
                <MenuItem key={c.code} value={c.code}>
                  {c.code} — {c.description}{c.default_rate != null ? ` (${c.default_rate}%)` : ""}
                </MenuItem>
              ))}
            </TextField>
            {!isPayroll && providers.length > 0 && (
              <Autocomplete
                size="small"
                options={providers}
                getOptionLabel={(o) => (o.ruc ? `${o.name} (${o.ruc})` : o.name)}
                onChange={(_, value) => {
                  if (value) setForm((prev) => ({ ...prev, ruc: value.ruc || prev.ruc, name: value.name }));
                }}
                renderInput={(params) => <TextField {...params} label="Elegir proveedor (autollena RUC y nombre)" />}
              />
            )}
            <Stack direction="row" spacing={1}>
              <TextField size="small" label="RUC / Cédula" value={form.ruc}
                onChange={(e) => setF("ruc", e.target.value)} sx={{ flex: 1 }} />
              {!isPayroll && (
                <TextField size="small" type="number" label="Alícuota %" value={form.rate}
                  onChange={(e) => setF("rate", e.target.value)} sx={{ width: 120 }} />
              )}
            </Stack>
            <TextField size="small" label="Nombre / Razón social" value={form.name}
              onChange={(e) => setF("name", e.target.value)} />

            {isPayroll ? (
              <Stack direction="row" spacing={1}>
                <TextField size="small" type="number" label="Ingresos brutos" value={form.gross_income}
                  onChange={(e) => setF("gross_income", e.target.value)} sx={{ flex: 1 }} />
                <TextField size="small" type="number" label="INSS" value={form.inss}
                  onChange={(e) => setF("inss", e.target.value)} sx={{ flex: 1 }} />
                <TextField size="small" type="number" label="IR retenido" value={form.retained_amount}
                  onChange={(e) => setF("retained_amount", e.target.value)} sx={{ flex: 1 }} />
              </Stack>
            ) : (
              <Stack direction="row" spacing={1}>
                <TextField size="small" label="N° documento" value={form.document_number}
                  onChange={(e) => setF("document_number", e.target.value)} sx={{ flex: 1 }} />
                <TextField size="small" type="date" label="Fecha documento" InputLabelProps={{ shrink: true }}
                  value={form.document_date} onChange={(e) => setF("document_date", e.target.value)} />
              </Stack>
            )}

            {!isPayroll && (
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField size="small" type="number" label="Base imponible" value={form.base_amount}
                  onChange={(e) => setF("base_amount", e.target.value)} sx={{ flex: 1 }} />
                <Chip color="success" label={`Retenido: C$ ${money(computedRetained)}`} />
              </Stack>
            )}
            {isPayroll && (
              <Alert severity="info">
                Base imponible = Ingresos brutos − INSS. El IR retenido se toma del cálculo de planilla.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={save}
            sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" }, textTransform: "none" }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Catálogo */}
      <CatalogDialog open={catalogOpen} onClose={() => setCatalogOpen(false)} codes={codes}
        onChanged={fetchCodes} notify={notify} />

      {/* Mapeo cuenta → código (para importar de cheques) */}
      <AccountMapDialog open={mapOpen} onClose={() => setMapOpen(false)} codes={codes}
        accounts={accounts} notify={notify} />

      {/* Constancias de retención por proveedor/persona */}
      <Dialog open={certOpen} onClose={() => setCertOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Constancias de retención — {period}</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Seleccione el proveedor/persona para imprimir su constancia de retención del período.
          </Alert>
          <Stack spacing={1}>
            {certParties.map((pty) => (
              <Stack key={pty.ruc} direction="row" spacing={1} alignItems="center">
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={700}>{pty.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {pty.ruc} · {pty.count} retención(es) · C$ {Number(pty.total).toLocaleString("es-NI", { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Button size="small" variant="outlined" startIcon={<DescriptionIcon />}
                  onClick={() => printCertificate(pty.ruc)} sx={{ textTransform: "none" }}>
                  Imprimir
                </Button>
              </Stack>
            ))}
            {!certParties.length && (
              <Typography variant="body2" color="text.secondary">Sin retenciones en el período.</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCertOpen(false)} sx={{ textTransform: "none" }}>Cerrar</Button>
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

function CatalogDialog({ open, onClose, codes, onChanged, notify }) {
  const [local, setLocal] = useState([]);
  const [newCode, setNewCode] = useState({ code: "", description: "", default_rate: "", category: "ACTIVIDAD" });

  useEffect(() => {
    if (open) setLocal(codes.map((c) => ({ ...c })));
  }, [open, codes]);

  const saveRow = async (row) => {
    try {
      await API.put(`/api/retentions/codes/${row.id}`, {
        description: row.description,
        default_rate: row.default_rate === "" ? null : Number(row.default_rate),
        category: row.category,
      });
      notify("Código actualizado");
      onChanged();
    } catch (e) {
      notify(e.response?.data?.message || "Error", "error");
    }
  };

  const addCode = async () => {
    if (!newCode.code || !newCode.description) return;
    try {
      await API.post("/api/retentions/codes", {
        ...newCode,
        default_rate: newCode.default_rate === "" ? null : Number(newCode.default_rate),
      });
      setNewCode({ code: "", description: "", default_rate: "", category: "ACTIVIDAD" });
      onChanged();
      notify("Código agregado");
    } catch (e) {
      notify(e.response?.data?.message || "Error", "error");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Catálogo de códigos de retención</DialogTitle>
      <DialogContent dividers>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Verifique las alícuotas contra el catálogo vigente de la DGI. La alícuota real se guarda por cada retención; esto es solo el valor por defecto sugerido.
        </Alert>
        <Stack spacing={1}>
          {local.map((c, i) => (
            <Stack key={c.id} direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={c.code} sx={{ width: 60 }} />
              <TextField size="small" value={c.description} sx={{ flex: 1 }}
                onChange={(e) => setLocal((prev) => prev.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
              <TextField size="small" type="number" label="%" value={c.default_rate ?? ""} sx={{ width: 90 }}
                onChange={(e) => setLocal((prev) => prev.map((x, j) => (j === i ? { ...x, default_rate: e.target.value } : x)))} />
              <Button size="small" onClick={() => saveRow(local[i])}>Guardar</Button>
            </Stack>
          ))}
        </Stack>
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Agregar código</Typography>
        <Stack direction="row" spacing={1}>
          <TextField size="small" label="Código" value={newCode.code} sx={{ width: 100 }}
            onChange={(e) => setNewCode((p) => ({ ...p, code: e.target.value }))} />
          <TextField size="small" label="Descripción" value={newCode.description} sx={{ flex: 1 }}
            onChange={(e) => setNewCode((p) => ({ ...p, description: e.target.value }))} />
          <TextField size="small" type="number" label="%" value={newCode.default_rate} sx={{ width: 90 }}
            onChange={(e) => setNewCode((p) => ({ ...p, default_rate: e.target.value }))} />
          <Button variant="outlined" onClick={addCode}>Agregar</Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

function AccountMapDialog({ open, onClose, codes, accounts, notify }) {
  const [rows, setRows] = useState([]);
  const [account, setAccount] = useState(null);
  const [code, setCode] = useState("");

  const load = async () => {
    try {
      const res = await API.get("/api/retentions/account-map");
      setRows(res.data?.data || []);
    } catch (e) {
      notify(e.response?.data?.message || "Error cargando mapeo", "error");
    }
  };

  useEffect(() => {
    if (open) { load(); setAccount(null); setCode(""); }
  }, [open]);

  const add = async () => {
    if (!account || !code) return;
    try {
      await API.post("/api/retentions/account-map", { account_id: account.id, retention_code: code });
      setAccount(null);
      setCode("");
      load();
      notify("Cuenta mapeada");
    } catch (e) {
      notify(e.response?.data?.message || "Error", "error");
    }
  };

  const remove = async (id) => {
    try {
      await API.delete(`/api/retentions/account-map/${id}`);
      load();
    } catch (e) {
      notify(e.response?.data?.message || "Error", "error");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Cuentas de retención → código DGI</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Indica qué cuenta contable de "retención por pagar" corresponde a cada código. Al "Importar de cheques", las líneas que acrediten estas cuentas se convierten en retenciones (la base se calcula como retenido ÷ alícuota).
        </Alert>
        <Stack spacing={1} sx={{ mb: 2 }}>
          {rows.map((r) => (
            <Stack key={r.id} direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ flex: 1 }}>
                {r.muc_code} — {r.account_name}
              </Typography>
              <Chip size="small" label={`${r.retention_code}${r.default_rate != null ? ` (${r.default_rate}%)` : ""}`} />
              <IconButton size="small" color="error" onClick={() => remove(r.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          {rows.length === 0 && (
            <Typography variant="body2" color="text.secondary">Sin cuentas mapeadas.</Typography>
          )}
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <Autocomplete
            size="small"
            options={accounts}
            value={account}
            getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
            onChange={(_, v) => setAccount(v)}
            sx={{ flex: 1 }}
            renderInput={(params) => <TextField {...params} label="Cuenta contable" />}
          />
          <TextField select size="small" label="Código" value={code}
            onChange={(e) => setCode(e.target.value)} sx={{ minWidth: 220 }}>
            {codes.filter((c) => c.default_rate != null).map((c) => (
              <MenuItem key={c.code} value={c.code}>{c.code} — {c.description} ({c.default_rate}%)</MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" onClick={add} disabled={!account || !code}>Mapear</Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
