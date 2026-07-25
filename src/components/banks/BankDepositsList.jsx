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
  Grid,
  MenuItem,
  Autocomplete,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Divider,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SavingsIcon from "@mui/icons-material/Savings";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import API from "../../api";

const API_URL = "/api/banks/deposits";

const STATUS_CHIP = {
  EN_TRANSITO: { label: "En tránsito", color: "warning" },
  ACREDITADO: { label: "Acreditado", color: "success" },
  ANULADO: { label: "Anulado", color: "default" },
};

const emptyLine = () => ({ account: null, debit: "", credit: "", description: "" });

const COLLECTOR_CUSTODY_MUC_CODE = "1101.03";

const emptyForm = {
  bank_account_id: "",
  deposit_date: new Date().toISOString().slice(0, 10),
  description: "",
  collector: null,
  lines: [emptyLine()],
};

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function BankDepositsList() {
  const [rows, setRows] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [collectorCustody, setCollectorCustody] = useState(null);
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

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (bankAccountFilter) params.bank_account_id = bankAccountFilter;
      const res = await API.get(API_URL, { params });
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar los depósitos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, bankAccountFilter]);

  useEffect(() => {
    API.get("/api/banks/accounts", { params: { status: "ACTIVA" } }).then((res) => setBankAccounts(res.data?.data || [])).catch(() => {});
    API.get(`/api/accounting/accounts?is_active=1`).then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAccounts(list.filter((a) => Number(a.is_movement) === 1));
    }).catch(() => {});
    API.get("/api/collectors").then((res) => setCollectors(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  }, []);

  const handleOpenDialog = () => {
    setForm(emptyForm);
    setCollectorCustody(null);
    setDialogOpen(true);
  };

  // Al elegir un cobrador: consulta su custodia disponible en vivo y, si la
  // única línea sigue vacía, la pre-llena con la cuenta de custodia (1101.03
  // Remesas en Tránsito) — el depósito de un cobrador siempre sale íntegro
  // de ahí, así que es la cuenta correcta el 100% de las veces.
  const handleSelectCollector = async (collector) => {
    setForm((f) => {
      if (!collector) return { ...f, collector: null };
      const custodyAccount = accounts.find((a) => a.muc_code === COLLECTOR_CUSTODY_MUC_CODE) || null;
      const onlyLineEmpty = f.lines.length === 1 && !f.lines[0].account && !f.lines[0].debit && !f.lines[0].credit;
      return {
        ...f,
        collector,
        lines: onlyLineEmpty && custodyAccount ? [{ ...f.lines[0], account: custodyAccount }] : f.lines,
      };
    });

    if (!collector) {
      setCollectorCustody(null);
      return;
    }
    try {
      const res = await API.get("/api/caja/collector-custody", { params: { collector_id: collector.id } });
      setCollectorCustody(res.data?.data?.available_custody ?? null);
    } catch {
      setCollectorCustody(null);
    }
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
    () => form.lines.reduce((sum, l) => sum + (Number(l.credit) || 0) - (Number(l.debit) || 0), 0),
    [form.lines],
  );

  const handleSave = async () => {
    if (!form.bank_account_id || !form.deposit_date || !form.description) {
      showAlert("Complete cuenta bancaria, fecha y descripción", "error");
      return;
    }
    if (form.lines.some((l) => !l.account || (!Number(l.debit) && !Number(l.credit)))) {
      showAlert("Cada línea debe tener cuenta y un monto en débito o crédito", "error");
      return;
    }
    if (netAmount <= 0) {
      showAlert("El neto de las líneas (lo que entra al banco) debe ser mayor a 0", "error");
      return;
    }

    try {
      setSaving(true);
      const res = await API.post(API_URL, {
        bank_account_id: form.bank_account_id,
        deposit_date: form.deposit_date,
        description: form.description,
        collector_id: form.collector?.id || undefined,
        lines: form.lines.map((l) => ({
          account_id: l.account.id,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description || undefined,
        })),
      });
      showAlert(`Depósito registrado por C$ ${money(res.data.data.amount)} (comprobante ${res.data.data.entry_no})`);
      setDialogOpen(false);
      fetchDeposits();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al registrar el depósito", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmVoid = async () => {
    if (!voidTarget) return;
    const confirmed = window.confirm(`¿Confirma anular el depósito por C$ ${money(voidTarget.amount)}?\n\nEsta acción anula el comprobante contable asociado.`);
    if (!confirmed) return;

    try {
      setVoiding(true);
      await API.put(`${API_URL}/${voidTarget.id}/void`, { void_reason: voidReason || null });
      showAlert("Depósito anulado");
      setVoidTarget(null);
      setVoidReason("");
      fetchDeposits();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al anular el depósito", "error");
    } finally {
      setVoiding(false);
    }
  };

  const openDetail = async (row) => {
    try {
      setDetailLoading(true);
      setDetail({ deposit: row, lines: [] });
      const res = await API.get(`${API_URL}/${row.id}`);
      setDetail({ deposit: row, lines: res.data?.data?.lines || [] });
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo cargar el detalle del depósito", "error");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = useMemo(() => [
    { field: "bank_account_alias", headerName: "Cuenta bancaria", width: 180 },
    { field: "deposit_date", headerName: "Fecha", width: 110, renderCell: (p) => String(p.value || "").slice(0, 10) },
    { field: "description", headerName: "Descripción / Origen", flex: 1, minWidth: 220 },
    { field: "collector_name", headerName: "Cobrador", width: 160, renderCell: (p) => p.value || "—" },
    { field: "amount", headerName: "Monto", width: 130, renderCell: (p) => money(p.value) },
    { field: "entry_no", headerName: "Comprobante", width: 130 },
    {
      field: "status",
      headerName: "Estado",
      width: 130,
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
          {params.row.status === "EN_TRANSITO" && (
            <Tooltip title="Anular depósito">
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
            <SavingsIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Depósitos</Typography>
              <Typography variant="body2" color="text.secondary">Registro y anulación de depósitos bancarios</Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenDialog}>
              Registrar depósito
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchDeposits}>
              Actualizar
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <TextField select size="small" label="Cuenta bancaria" value={bankAccountFilter} onChange={(e) => setBankAccountFilter(e.target.value)} sx={{ width: 220 }}>
            <MenuItem value="">Todas</MenuItem>
            {bankAccounts.map((b) => <MenuItem key={b.id} value={b.id}>{b.account_alias}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 180 }}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="EN_TRANSITO">En tránsito</MenuItem>
            <MenuItem value="ACREDITADO">Acreditado</MenuItem>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Registrar depósito</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                select fullWidth size="small" label="Cuenta bancaria"
                value={form.bank_account_id}
                onChange={(e) => setForm((f) => ({ ...f, bank_account_id: e.target.value }))}
              >
                {bankAccounts.map((b) => <MenuItem key={b.id} value={b.id}>{b.account_alias}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="date" label="Fecha del depósito" InputLabelProps={{ shrink: true }}
                value={form.deposit_date}
                onChange={(e) => setForm((f) => ({ ...f, deposit_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Descripción / origen"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={collectors}
                value={form.collector}
                getOptionLabel={(o) => `${o.name}${o.branch_name ? ` — ${o.branch_name}` : ""}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => handleSelectCollector(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Cobrador (opcional — si el efectivo viene de un cobrador)"
                    helperText={
                      form.collector
                        ? collectorCustody !== null
                          ? `Custodia disponible: C$ ${money(collectorCustody)}`
                          : "Calculando custodia disponible..."
                        : "Deje vacío si el origen del depósito no es efectivo de un cobrador"
                    }
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Líneas (ingreso, comisión bancaria, etc. — el banco se debita automático por el neto)
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

              <Box sx={{ mt: 2 }}>
                <Chip
                  color={netAmount > 0 ? "primary" : "error"}
                  label={`Monto del depósito (neto): C$ ${money(netAmount)}`}
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : "Registrar depósito"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(voidTarget)} onClose={() => setVoidTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Anular depósito</DialogTitle>
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
            {voiding ? "Anulando..." : "Anular depósito"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
        {detail && (
          <>
            <Box sx={{ bgcolor: "#0057B8", color: "#fff", p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <SavingsIcon sx={{ fontSize: 32, opacity: 0.9 }} />
                  <Box>
                    <Typography variant="overline" sx={{ opacity: 0.85, lineHeight: 1 }}>Comprobante de Depósito</Typography>
                    <Typography variant="h5" fontWeight={800}>#{detail.deposit.id}</Typography>
                  </Box>
                </Stack>
                <Chip
                  label={STATUS_CHIP[detail.deposit.status]?.label || detail.deposit.status}
                  sx={{ bgcolor: "rgba(255,255,255,.22)", color: "#fff", fontWeight: 700 }}
                />
              </Stack>
            </Box>

            <DialogContent sx={{ p: 3 }}>
              <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Fecha del depósito</Typography>
                  <Typography variant="body1" fontWeight={700}>{String(detail.deposit.deposit_date).slice(0, 10)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Cuenta bancaria</Typography>
                  <Typography variant="body1" fontWeight={700}>{detail.deposit.bank_account_alias}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Descripción / origen</Typography>
                  <Typography variant="body2">{detail.deposit.description}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Comprobante contable</Typography>
                  <Typography variant="body2">{detail.deposit.entry_no}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Partidas contables</Typography>
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
                  <TableRow sx={{ "& td": { borderBottom: "none" } }}>
                    <TableCell colSpan={2}><Typography variant="body2" color="text.secondary">Banco — {detail.deposit.bank_account_alias} (débito automático)</Typography></TableCell>
                    <TableCell align="right">{money(detail.deposit.amount)}</TableCell>
                    <TableCell />
                  </TableRow>
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
                </TableBody>
              </Table>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2, pt: 2, borderTop: "2px solid #0057B8" }}>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="caption" color="text.secondary">Monto del depósito</Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ color: "#0057B8" }}>C$ {money(detail.deposit.amount)}</Typography>
                </Box>
              </Box>

              {detail.deposit.status === "ANULADO" && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Depósito anulado{detail.deposit.void_reason ? `: ${detail.deposit.void_reason}` : ""}
                </Alert>
              )}
              {detail.deposit.status === "ACREDITADO" && detail.deposit.cleared_date && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Acreditado el {String(detail.deposit.cleared_date).slice(0, 10)}
                </Alert>
              )}
            </DialogContent>
          </>
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
