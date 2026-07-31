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
  Autocomplete,
  Avatar,
  Stack,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import ImageIcon from "@mui/icons-material/Image";
import DeleteIcon from "@mui/icons-material/Delete";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";

const API_URL = "/api/banks/accounts";
const DEFAULT_GL_MUC_CODE = "1102.01.01";

const emptyForm = {
  bank_name: "",
  account_number: "",
  account_alias: "",
  account_type: "CORRIENTE",
  gl_account: null,
  branch_id: "",
  opening_balance: "0",
  opening_date: new Date().toISOString().slice(0, 10),
  currency_symbol: "C$",
  currency_name: "CÓRDOBAS",
  next_check_number: "",
};

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function BankAccountsList() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canManageBankAccounts = role === 1 || permissions.includes("bancos.cuentas.gestionar");
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar las cuentas bancarias", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchGlAccounts = async () => {
    try {
      const res = await API.get(`/api/accounting/accounts?is_active=1`);
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAccounts(list.filter((a) => Number(a.is_movement) === 1));
    } catch {
      // El diálogo simplemente queda sin opciones si falla; no bloquea el listado.
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchGlAccounts();
    API.get("/api/branches").then(({ data }) => setBranches(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const handleOpenCreate = () => {
    const defaultGl = accounts.find((a) => a.muc_code === DEFAULT_GL_MUC_CODE) || null;
    setEditingId(null);
    setForm({ ...emptyForm, gl_account: defaultGl });
    setLogoFile(null);
    setLogoPreview(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (row) => {
    setEditingId(row.id);
    setForm({
      bank_name: row.bank_name,
      account_number: row.account_number,
      account_alias: row.account_alias,
      account_type: row.account_type,
      gl_account: { id: row.gl_account_id, muc_code: row.gl_muc_code, account_name: row.gl_account_name },
      branch_id: row.branch_id || "",
      opening_balance: String(row.opening_balance),
      opening_date: String(row.opening_date).slice(0, 10),
      currency_symbol: row.currency_symbol || "C$",
      currency_name: row.currency_name || "CÓRDOBAS",
      next_check_number: row.next_check_number || "",
    });
    setLogoFile(null);
    setLogoPreview(row.logo_url || null);
    setDialogOpen(true);
  };

  const uploadLogo = async (bankAccountId, file) => {
    try {
      setUploadingLogo(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await API.post(`${API_URL}/${bankAccountId}/logo`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setLogoPreview(res.data?.data?.logo_url || null);
      return true;
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al subir el logo", "error");
      return false;
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoPreview(URL.createObjectURL(file));

    if (editingId) {
      const ok = await uploadLogo(editingId, file);
      if (ok) {
        showAlert("Logo actualizado");
        fetchAccounts();
      }
    } else {
      setLogoFile(file);
    }
  };

  const handleRemoveLogo = async () => {
    if (!editingId) {
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }

    const confirmed = window.confirm("¿Quitar el logo de esta cuenta bancaria?");
    if (!confirmed) return;

    try {
      await API.delete(`${API_URL}/${editingId}/logo`);
      setLogoPreview(null);
      showAlert("Logo eliminado");
      fetchAccounts();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al eliminar el logo", "error");
    }
  };

  const handleSave = async () => {
    if (!form.bank_name || !form.account_number || !form.account_alias || !form.opening_date) {
      showAlert("Complete banco, número de cuenta, alias y fecha de apertura", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        bank_name: form.bank_name,
        account_number: form.account_number,
        account_alias: form.account_alias,
        account_type: form.account_type,
        gl_account_id: form.gl_account?.id || null,
        branch_id: form.branch_id || null,
        opening_balance: Number(form.opening_balance || 0),
        opening_date: form.opening_date,
        currency_symbol: form.currency_symbol,
        currency_name: form.currency_name,
        next_check_number: form.next_check_number || null,
      };

      if (editingId) {
        await API.put(`${API_URL}/${editingId}`, payload);
        showAlert("Cuenta bancaria actualizada correctamente");
      } else {
        const res = await API.post(API_URL, payload);
        if (logoFile) {
          await uploadLogo(res.data.data.id, logoFile);
        }
        showAlert("Cuenta bancaria registrada correctamente");
      }

      setDialogOpen(false);
      fetchAccounts();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al guardar la cuenta bancaria", "error");
    } finally {
      setSaving(false);
    }
  };

  const closeAccount = async (row) => {
    const confirmed = window.confirm(`¿Confirma cerrar la cuenta "${row.account_alias}"? No podrá emitir más cheques contra ella.`);
    if (!confirmed) return;

    try {
      await API.put(`${API_URL}/${row.id}/close`);
      showAlert(`Cuenta "${row.account_alias}" cerrada`);
      fetchAccounts();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cerrar la cuenta", "error");
    }
  };

  const columns = useMemo(() => [
    {
      field: "logo_url",
      headerName: "Logo",
      width: 70,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Avatar src={p.value || undefined} variant="rounded" sx={{ width: 32, height: 32, bgcolor: "#F1F5F9" }}>
          <ImageIcon fontSize="small" sx={{ color: "#94A3B8" }} />
        </Avatar>
      ),
    },
    { field: "bank_name", headerName: "Banco", width: 140 },
    { field: "account_number", headerName: "Número de cuenta", width: 160 },
    { field: "account_alias", headerName: "Alias", flex: 1, minWidth: 200 },
    { field: "account_type", headerName: "Tipo", width: 110 },
    {
      field: "gl_muc_code",
      headerName: "Cuenta contable",
      width: 220,
      renderCell: (p) => `${p.row.gl_muc_code} - ${p.row.gl_account_name}`,
    },
    { field: "opening_balance", headerName: "Saldo apertura", width: 140, renderCell: (p) => money(p.value) },
    {
      field: "status",
      headerName: "Estado",
      width: 120,
      renderCell: (p) => <Chip size="small" color={p.value === "ACTIVA" ? "success" : "default"} label={p.value === "ACTIVA" ? "Activa" : "Cerrada"} />,
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {canManageBankAccounts && (
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => handleOpenEdit(params.row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {params.row.status === "ACTIVA" && canManageBankAccounts && (
            <Tooltip title="Cerrar cuenta">
              <IconButton size="small" color="warning" onClick={() => closeAccount(params.row)}>
                <LockIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [accounts]);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AccountBalanceIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Cuentas Bancarias</Typography>
              <Typography variant="body2" color="text.secondary">
                Cuentas bancarias de la institución
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            {canManageBankAccounts && (
              <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenCreate}>
                Nueva cuenta
              </Button>
            )}
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchAccounts}>
              Actualizar
            </Button>
          </Box>
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
        <DialogTitle>{editingId ? "Editar cuenta bancaria" : "Nueva cuenta bancaria"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Banco"
                value={form.bank_name}
                disabled={Boolean(editingId)}
                onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Número de cuenta"
                value={form.account_number}
                disabled={Boolean(editingId)}
                onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Alias / etiqueta interna"
                value={form.account_alias}
                onChange={(e) => setForm((f) => ({ ...f, account_alias: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select fullWidth size="small" label="Tipo de cuenta"
                value={form.account_type}
                onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value }))}
              >
                <MenuItem value="CORRIENTE">Corriente</MenuItem>
                <MenuItem value="AHORRO">Ahorro</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select fullWidth size="small" label="Sucursal (opcional)"
                value={form.branch_id}
                onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
              >
                <MenuItem value="">Sin asignar</MenuItem>
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth size="small" label="Símbolo de moneda"
                value={form.currency_symbol}
                onChange={(e) => setForm((f) => ({ ...f, currency_symbol: e.target.value }))}
                placeholder="C$"
                helperText="Se muestra en el cheque"
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth size="small" label="Nombre de moneda"
                value={form.currency_name}
                onChange={(e) => setForm((f) => ({ ...f, currency_name: e.target.value.toUpperCase() }))}
                placeholder="CÓRDOBAS"
                helperText="Para el monto en letras"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth size="small" label="Próximo N° de cheque"
                value={form.next_check_number}
                onChange={(e) => setForm((f) => ({ ...f, next_check_number: e.target.value }))}
                placeholder="Ej: 1001"
                helperText="Se sugiere al emitir, se autoincrementa"
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={accounts}
                value={form.gl_account}
                getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setForm((f) => ({ ...f, gl_account: value }))}
                renderInput={(params) => <TextField {...params} label="Cuenta contable (banco)" helperText={`Sugerido: ${DEFAULT_GL_MUC_CODE}`} />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="number" label="Saldo de apertura"
                value={form.opening_balance}
                disabled={Boolean(editingId)}
                onChange={(e) => setForm((f) => ({ ...f, opening_balance: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="date" label="Fecha de apertura" InputLabelProps={{ shrink: true }}
                value={form.opening_date}
                disabled={Boolean(editingId)}
                onChange={(e) => setForm((f) => ({ ...f, opening_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Logo del banco (se muestra en el comprobante visual del cheque)
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar src={logoPreview || undefined} variant="rounded" sx={{ width: 56, height: 56, bgcolor: "#F1F5F9" }}>
                  <ImageIcon sx={{ color: "#94A3B8" }} />
                </Avatar>
                <Button size="small" variant="outlined" component="label" disabled={uploadingLogo} sx={{ textTransform: "none" }}>
                  {uploadingLogo ? "Subiendo..." : logoPreview ? "Cambiar logo" : "Subir logo"}
                  <input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={handleLogoFileChange} />
                </Button>
                {logoPreview && (
                  <IconButton size="small" onClick={handleRemoveLogo} title="Quitar logo">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Registrar cuenta"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
