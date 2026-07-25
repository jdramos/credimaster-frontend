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
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import API from "../../api";

const API_URL = "/api/caja/registers";
const DEFAULT_GL_MUC_CODE = "1101.01";

const emptyForm = {
  name: "",
  branch_id: "",
  gl_account: null,
  opening_balance: "0",
  opening_date: new Date().toISOString().slice(0, 10),
  currency_symbol: "C$",
  currency_name: "CÓRDOBAS",
};

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function CashRegistersList() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchRegisters = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar las cajas", "error");
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
    fetchRegisters();
    fetchGlAccounts();
    API.get("/api/branches").then(({ data }) => setBranches(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const handleOpenCreate = () => {
    const defaultGl = accounts.find((a) => a.muc_code === DEFAULT_GL_MUC_CODE) || null;
    setEditingId(null);
    setForm({ ...emptyForm, gl_account: defaultGl });
    setDialogOpen(true);
  };

  const handleOpenEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      branch_id: row.branch_id || "",
      gl_account: { id: row.gl_account_id, muc_code: row.gl_muc_code, account_name: row.gl_account_name },
      opening_balance: String(row.opening_balance),
      opening_date: String(row.opening_date).slice(0, 10),
      currency_symbol: row.currency_symbol || "C$",
      currency_name: row.currency_name || "CÓRDOBAS",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.opening_date) {
      showAlert("Complete el nombre y la fecha de apertura", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name,
        branch_id: form.branch_id || null,
        gl_account_id: form.gl_account?.id || null,
        opening_balance: Number(form.opening_balance || 0),
        opening_date: form.opening_date,
        currency_symbol: form.currency_symbol,
        currency_name: form.currency_name,
      };

      if (editingId) {
        await API.put(`${API_URL}/${editingId}`, payload);
        showAlert("Caja actualizada correctamente");
      } else {
        await API.post(API_URL, payload);
        showAlert("Caja registrada correctamente");
      }

      setDialogOpen(false);
      fetchRegisters();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al guardar la caja", "error");
    } finally {
      setSaving(false);
    }
  };

  const closeRegister = async (row) => {
    const confirmed = window.confirm(`¿Confirma cerrar la caja "${row.name}"? No podrá registrar más movimientos en ella.`);
    if (!confirmed) return;

    try {
      await API.put(`${API_URL}/${row.id}/close`);
      showAlert(`Caja "${row.name}" cerrada`);
      fetchRegisters();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cerrar la caja", "error");
    }
  };

  const columns = useMemo(() => [
    { field: "name", headerName: "Nombre", flex: 1, minWidth: 200 },
    { field: "branch_name", headerName: "Sucursal", width: 180, renderCell: (p) => p.value || "Sin asignar" },
    {
      field: "gl_muc_code",
      headerName: "Cuenta contable",
      width: 220,
      renderCell: (p) => `${p.row.gl_muc_code} - ${p.row.gl_account_name}`,
    },
    { field: "opening_balance", headerName: "Saldo apertura", width: 140, renderCell: (p) => `${p.row.currency_symbol || "C$"} ${money(p.value)}` },
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
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => handleOpenEdit(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.status === "ACTIVA" && (
            <Tooltip title="Cerrar caja">
              <IconButton size="small" color="warning" onClick={() => closeRegister(params.row)}>
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
            <PointOfSaleIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Cajas</Typography>
              <Typography variant="body2" color="text.secondary">
                Cajas de efectivo de la institución
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenCreate}>
              Nueva caja
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchRegisters}>
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
        <DialogTitle>{editingId ? "Editar caja" : "Nueva caja"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Nombre de la caja"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Caja Principal - Sucursal Central"
              />
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
            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={accounts}
                value={form.gl_account}
                getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setForm((f) => ({ ...f, gl_account: value }))}
                renderInput={(params) => <TextField {...params} label="Cuenta contable (caja)" helperText={`Sugerido: ${DEFAULT_GL_MUC_CODE}`} />}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth size="small" label="Símbolo de moneda"
                value={form.currency_symbol}
                onChange={(e) => setForm((f) => ({ ...f, currency_symbol: e.target.value }))}
                placeholder="C$"
              />
            </Grid>
            <Grid item xs={6} sm={8}>
              <TextField
                fullWidth size="small" label="Nombre de moneda"
                value={form.currency_name}
                onChange={(e) => setForm((f) => ({ ...f, currency_name: e.target.value.toUpperCase() }))}
                placeholder="CÓRDOBAS"
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Registrar caja"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
