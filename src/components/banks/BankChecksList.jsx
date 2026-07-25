import React, { useEffect, useMemo, useState } from "react";
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
  MenuItem,
  Autocomplete,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LockIcon from "@mui/icons-material/Lock";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { numberToWords } from "./numberToWords";

const API_URL = "/api/banks/checks";

const STATUS_CHIP = {
  EMITIDO: { label: "Emitido", color: "info" },
  COBRADO: { label: "Cobrado", color: "success" },
  ANULADO: { label: "Anulado", color: "default" },
};

const emptyLine = () => ({ account: null, debit: "", credit: "", description: "" });

const emptyForm = {
  bank_account_id: "",
  check_number: "",
  issue_date: new Date().toISOString().slice(0, 10),
  beneficiary_name: "",
  vendor: null,
  concept: "",
  lines: [emptyLine()],
};

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function BankChecksList() {
  const { tenant } = useAuth();
  const [rows, setRows] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [bankAccountFilter, setBankAccountFilter] = useState("");
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchChecks = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (bankAccountFilter) params.bank_account_id = bankAccountFilter;
      const res = await API.get(API_URL, { params });
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar los cheques", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, bankAccountFilter]);

  useEffect(() => {
    API.get("/api/banks/accounts", { params: { status: "ACTIVA" } }).then((res) => setBankAccounts(res.data?.data || [])).catch(() => {});
    API.get(`/api/accounting/accounts?is_active=1`).then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAccounts(list.filter((a) => Number(a.is_movement) === 1));
    }).catch(() => {});
    API.get("/api/vendors").then((res) => setVendors(Array.isArray(res.data) ? res.data : res.data?.data || [])).catch(() => setVendors([]));
  }, []);

  const handleOpenDialog = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const updateLine = (index, field, value) => {
    setForm((f) => {
      const lines = [...f.lines];
      lines[index] = { ...lines[index], [field]: value };
      return { ...f, lines };
    });
  };

  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }));
  const removeLine = (index) => setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== index) }));

  const netAmount = useMemo(
    () => form.lines.reduce((sum, l) => sum + (Number(l.debit) || 0) - (Number(l.credit) || 0), 0),
    [form.lines],
  );

  const selectedBankAccount = useMemo(
    () => bankAccounts.find((b) => b.id === form.bank_account_id) || null,
    [bankAccounts, form.bank_account_id],
  );

  const handleSave = async () => {
    if (!form.bank_account_id || !form.check_number || !form.issue_date || !form.beneficiary_name || !form.concept) {
      showAlert("Complete cuenta bancaria, número, fecha, beneficiario y concepto", "error");
      return;
    }
    if (form.lines.some((l) => !l.account || (!Number(l.debit) && !Number(l.credit)))) {
      showAlert("Cada línea debe tener cuenta y un monto en débito o crédito", "error");
      return;
    }
    if (netAmount <= 0) {
      showAlert("El neto de las líneas (lo que sale del banco) debe ser mayor a 0", "error");
      return;
    }

    try {
      setSaving(true);
      const res = await API.post(API_URL, {
        bank_account_id: form.bank_account_id,
        check_number: form.check_number,
        issue_date: form.issue_date,
        beneficiary_name: form.beneficiary_name,
        vendor_id: form.vendor?.id || null,
        concept: form.concept,
        lines: form.lines.map((l) => ({
          account_id: l.account.id,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description || undefined,
        })),
      });
      showAlert(`Cheque #${form.check_number} emitido por ${selectedBankAccount?.currency_symbol || "C$"} ${money(res.data.data.amount)} (comprobante ${res.data.data.entry_no})`);
      setDialogOpen(false);
      fetchChecks();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al emitir el cheque", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmVoid = async () => {
    if (!voidTarget) return;
    const confirmed = window.confirm(`¿Confirma anular el cheque #${voidTarget.check_number} por ${voidTarget.currency_symbol || "C$"} ${money(voidTarget.amount)}?\n\nEsta acción anula el comprobante contable asociado.`);
    if (!confirmed) return;

    try {
      setVoiding(true);
      await API.put(`${API_URL}/${voidTarget.id}/void`, { void_reason: voidReason || null });
      showAlert(`Cheque #${voidTarget.check_number} anulado`);
      setVoidTarget(null);
      setVoidReason("");
      fetchChecks();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al anular el cheque", "error");
    } finally {
      setVoiding(false);
    }
  };

  const openDetail = async (row) => {
    try {
      setDetailLoading(true);
      setDetail({ check: row, lines: [] });
      const res = await API.get(`${API_URL}/${row.id}`);
      const { lines, ...checkDetail } = res.data?.data || {};
      setDetail({ check: { ...row, ...checkDetail }, lines: lines || [] });
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo cargar el detalle del cheque", "error");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = useMemo(() => [
    { field: "check_number", headerName: "N° Cheque", width: 110 },
    { field: "bank_account_alias", headerName: "Cuenta bancaria", width: 180 },
    { field: "issue_date", headerName: "Fecha", width: 110, renderCell: (p) => String(p.value || "").slice(0, 10) },
    { field: "beneficiary_name", headerName: "Beneficiario", flex: 1, minWidth: 160 },
    { field: "concept", headerName: "Concepto", flex: 1, minWidth: 180 },
    { field: "amount", headerName: "Monto", width: 130, renderCell: (p) => money(p.value) },
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
      width: 130,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Ver detalle">
            <IconButton size="small" onClick={() => openDetail(params.row)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.status === "EMITIDO" && (
            <Tooltip title="Anular cheque">
              <IconButton size="small" color="error" onClick={() => { setVoidTarget(params.row); setVoidReason(""); }}>
                <CancelIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ReceiptLongIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Cheques</Typography>
              <Typography variant="body2" color="text.secondary">Emisión y anulación de cheques</Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenDialog}>
              Emitir cheque
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchChecks}>
              Actualizar
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <TextField select size="small" label="Cuenta bancaria" value={bankAccountFilter} onChange={(e) => setBankAccountFilter(e.target.value)} sx={{ width: 220 }}>
            <MenuItem value="">Todas</MenuItem>
            {bankAccounts.map((b) => <MenuItem key={b.id} value={b.id}>{b.account_alias}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 160 }}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="EMITIDO">Emitido</MenuItem>
            <MenuItem value="COBRADO">Cobrado</MenuItem>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Emitir cheque</DialogTitle>
        <DialogContent sx={{ p: 3, bgcolor: "#F1F5F9" }}>
          {/* Cuerpo del cheque, editable en vivo — misma ventana visual del detalle */}
          <Box sx={{
            position: "relative",
            bgcolor: "#fff",
            border: "1px solid #D8DEE9",
            borderRadius: 2,
            overflow: "hidden",
            p: 3,
            mb: 3,
          }}>
            <Box sx={{
              position: "absolute", inset: 0, opacity: 0.05, pointerEvents: "none",
              background: "repeating-linear-gradient(115deg, #0057B8 0px, #0057B8 2px, transparent 2px, transparent 14px)",
            }} />

            <Box sx={{ position: "relative" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
                  {selectedBankAccount?.logo_url && (
                    <Box
                      component="img"
                      src={selectedBankAccount.logo_url}
                      alt={selectedBankAccount.account_alias}
                      sx={{ height: 40, maxWidth: 90, objectFit: "contain", flexShrink: 0, mt: 0.25 }}
                    />
                  )}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                      {tenant?.legal_name || tenant?.commercial_name || "CrediMaster"}
                    </Typography>
                    {tenant?.address && <Typography variant="caption" display="block" color="text.secondary">{tenant.address}</Typography>}
                    {tenant?.phone && <Typography variant="caption" display="block" color="text.secondary">Tel: {tenant.phone}</Typography>}
                    <TextField
                      select variant="standard" size="small" value={form.bank_account_id}
                      onChange={(e) => {
                        const id = e.target.value;
                        const acc = bankAccounts.find((b) => b.id === id);
                        setForm((f) => ({
                          ...f,
                          bank_account_id: id,
                          check_number: f.check_number || acc?.next_check_number || f.check_number,
                        }));
                      }}
                      sx={{ mt: 0.5, minWidth: 200 }}
                      SelectProps={{ displayEmpty: true }}
                    >
                      <MenuItem value="" disabled>Elija cuenta bancaria</MenuItem>
                      {bankAccounts.map((b) => <MenuItem key={b.id} value={b.id}>{b.account_alias}</MenuItem>)}
                    </TextField>
                  </Box>
                </Stack>

                <Box sx={{ textAlign: "center", flexShrink: 0 }}>
                  <TextField
                    variant="standard" size="small" type="date"
                    value={form.issue_date}
                    onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
                    sx={{ width: 150 }}
                  />
                  <Typography variant="caption" color="text.secondary" display="block">FECHA</Typography>
                </Box>

                <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                  <Typography variant="caption" color="text.secondary" display="block">N°</Typography>
                  <TextField
                    variant="standard" size="small"
                    value={form.check_number}
                    onChange={(e) => setForm((f) => ({ ...f, check_number: e.target.value }))}
                    inputProps={{ style: { textAlign: "right", fontWeight: 800, fontFamily: "monospace", fontSize: "1.1rem" } }}
                    sx={{ width: 130 }}
                  />
                </Box>
              </Stack>

              <Stack direction="row" alignItems="flex-end" spacing={2} sx={{ mb: 2 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">PÁGUESE A LA ORDEN DE</Typography>
                  <Autocomplete
                    size="small"
                    freeSolo
                    options={vendors}
                    getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
                    value={form.vendor}
                    onChange={(_, value) => {
                      if (typeof value === "string") {
                        setForm((f) => ({ ...f, vendor: null, beneficiary_name: value }));
                      } else {
                        setForm((f) => ({ ...f, vendor: value, beneficiary_name: value?.name || f.beneficiary_name }));
                      }
                    }}
                    onInputChange={(_, value, reason) => {
                      if (reason === "input") setForm((f) => ({ ...f, beneficiary_name: value }));
                    }}
                    inputValue={form.beneficiary_name}
                    renderInput={(params) => <TextField {...params} variant="standard" placeholder="Nombre del beneficiario" />}
                  />
                </Box>
                <Box sx={{ width: 190, flexShrink: 0 }}>
                  <Typography variant="caption" color="text.secondary">{selectedBankAccount?.currency_symbol || "C$"}</Typography>
                  <Box sx={{ border: "1px solid #333", borderRadius: 1, px: 1.5, py: 0.75, textAlign: "right" }}>
                    <Typography variant="body1" fontWeight={800} color={netAmount > 0 ? "text.primary" : "error"}>{money(netAmount)}</Typography>
                  </Box>
                </Box>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ borderBottom: "1px solid #333", pb: 0.5, mb: 2.5 }}>
                <Typography variant="body2" noWrap sx={{ flex: 1, textTransform: "uppercase", fontStyle: "italic", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {numberToWords(netAmount)} {selectedBankAccount?.currency_name || "CÓRDOBAS"}
                </Typography>
                <LockIcon fontSize="small" sx={{ color: "text.disabled", flexShrink: 0 }} />
              </Stack>

              <Box>
                <Typography variant="caption" color="text.secondary">CONCEPTO</Typography>
                <TextField
                  fullWidth variant="standard"
                  value={form.concept}
                  onChange={(e) => setForm((f) => ({ ...f, concept: e.target.value }))}
                  placeholder="Concepto del pago"
                />
              </Box>
            </Box>
          </Box>

          {/* Líneas contables */}
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Líneas (gasto, retención, etc. — el banco se acredita automático por el neto)
          </Typography>

          {form.lines.map((line, index) => (
            <Box key={index} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 110px 110px 40px" }, gap: 1, mb: 1, alignItems: "center" }}>
              <Autocomplete
                size="small"
                options={accounts}
                value={line.account}
                getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => updateLine(index, "account", value)}
                renderInput={(params) => <TextField {...params} label="Cuenta" />}
              />
              <TextField
                size="small" label="Detalle"
                value={line.description}
                onChange={(e) => updateLine(index, "description", e.target.value)}
              />
              <TextField
                size="small" type="number" label="Débito"
                value={line.debit}
                onChange={(e) => updateLine(index, "debit", e.target.value)}
              />
              <TextField
                size="small" type="number" label="Crédito"
                value={line.credit}
                onChange={(e) => updateLine(index, "credit", e.target.value)}
              />
              <IconButton size="small" onClick={() => removeLine(index)} disabled={form.lines.length === 1}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}

          <Button size="small" onClick={addLine} sx={{ textTransform: "none", mt: 0.5 }}>+ Agregar línea</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Emitiendo..." : "Emitir cheque"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(voidTarget)} onClose={() => setVoidTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Anular cheque {voidTarget?.check_number}</DialogTitle>
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
            {voiding ? "Anulando..." : "Anular cheque"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        {detail && (
          <DialogContent sx={{ p: 3, bgcolor: "#F1F5F9" }}>
            {/* Cuerpo del cheque, estilo físico — apaisado */}
            <Box sx={{
              position: "relative",
              bgcolor: "#fff",
              border: "1px solid #D8DEE9",
              borderRadius: 2,
              overflow: "hidden",
              p: 3,
              mb: 3,
              minWidth: 0,
            }}>
              <Box sx={{
                position: "absolute", inset: 0, opacity: 0.05, pointerEvents: "none",
                background: "repeating-linear-gradient(115deg, #0057B8 0px, #0057B8 2px, transparent 2px, transparent 14px)",
              }} />

              <Box sx={{ position: "relative" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 2.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
                    {detail.check.bank_logo_url && (
                      <Box
                        component="img"
                        src={detail.check.bank_logo_url}
                        alt={detail.check.bank_account_alias}
                        sx={{ height: 40, maxWidth: 90, objectFit: "contain", flexShrink: 0, mt: 0.25 }}
                      />
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                        {tenant?.legal_name || tenant?.commercial_name || "CrediMaster"}
                      </Typography>
                      {tenant?.address && <Typography variant="caption" display="block" color="text.secondary">{tenant.address}</Typography>}
                      {tenant?.phone && <Typography variant="caption" display="block" color="text.secondary">Tel: {tenant.phone}</Typography>}
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>{detail.check.bank_account_alias}</Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ textAlign: "center", flexShrink: 0 }}>
                    <Typography variant="body2" sx={{ borderBottom: "1px solid #333", pb: 0.5, px: 2, whiteSpace: "nowrap" }}>
                      {String(detail.check.issue_date).slice(0, 10)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">FECHA</Typography>
                  </Box>

                  <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                    <Chip size="small" label={STATUS_CHIP[detail.check.status]?.label || detail.check.status} color={STATUS_CHIP[detail.check.status]?.color || "default"} sx={{ mb: 1 }} />
                    <Typography variant="h5" fontWeight={800} sx={{ fontFamily: "monospace", letterSpacing: 1, whiteSpace: "nowrap" }}>
                      N° {detail.check.check_number}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" alignItems="flex-end" spacing={2} sx={{ mb: 2 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">PÁGUESE A LA ORDEN DE</Typography>
                    <Typography variant="body1" fontWeight={700} noWrap sx={{ borderBottom: "1px solid #333", pb: 0.5 }}>
                      {detail.check.beneficiary_name}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 190, flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary">{detail.check.currency_symbol || "C$"}</Typography>
                    <Box sx={{ border: "1px solid #333", borderRadius: 1, px: 1.5, py: 0.75, textAlign: "right" }}>
                      <Typography variant="body1" fontWeight={800}>{money(detail.check.amount)}</Typography>
                    </Box>
                  </Box>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1} sx={{ borderBottom: "1px solid #333", pb: 0.5, mb: 2.5 }}>
                  <Typography variant="body2" noWrap sx={{ flex: 1, textTransform: "uppercase", fontStyle: "italic", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {numberToWords(detail.check.amount)} {detail.check.currency_name || "CÓRDOBAS"}
                  </Typography>
                  <LockIcon fontSize="small" sx={{ color: "text.disabled", flexShrink: 0 }} />
                </Stack>

                <Stack direction="row" spacing={4} alignItems="flex-end" sx={{ mb: 2.5 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">CONCEPTO</Typography>
                    <Typography variant="body2" noWrap sx={{ borderBottom: "1px solid #333", pb: 0.5 }}>
                      {detail.check.concept}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontFamily: "monospace", letterSpacing: 3, color: "text.disabled", flexShrink: 0, whiteSpace: "nowrap" }}>
                    ⑆{String(detail.check.bank_account_id).padStart(10, "0")}⑆ {String(detail.check.check_number).padStart(6, "0")}⑈
                  </Typography>
                </Stack>
              </Box>
            </Box>

            {/* Detalle contable */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Partidas contables — {detail.check.entry_no}</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cuenta</TableCell>
                  <TableCell>Detalle</TableCell>
                  <TableCell align="right">Débito</TableCell>
                  <TableCell align="right">Crédito</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.muc_code} - {l.account_name}</TableCell>
                    <TableCell>{l.description}</TableCell>
                    <TableCell align="right">{Number(l.debit) > 0 ? money(l.debit) : ""}</TableCell>
                    <TableCell align="right">{Number(l.credit) > 0 ? money(l.credit) : ""}</TableCell>
                  </TableRow>
                ))}
                {!detailLoading && detail.lines.length === 0 && (
                  <TableRow><TableCell colSpan={4} align="center">Sin líneas</TableCell></TableRow>
                )}
                <TableRow sx={{ "& td": { borderBottom: "none" } }}>
                  <TableCell colSpan={2}><Typography variant="body2" color="text.secondary">Banco — {detail.check.bank_account_alias} (crédito automático)</Typography></TableCell>
                  <TableCell />
                  <TableCell align="right">{money(detail.check.amount)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {detail.check.status === "ANULADO" && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Cheque anulado{detail.check.void_reason ? `: ${detail.check.void_reason}` : ""}
              </Alert>
            )}
            {detail.check.status === "COBRADO" && detail.check.cleared_date && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Cobrado el {String(detail.check.cleared_date).slice(0, 10)}
              </Alert>
            )}
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setDetail(null)} sx={{ textTransform: "none" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
