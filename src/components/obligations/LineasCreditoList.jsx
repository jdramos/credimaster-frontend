import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
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
  Autocomplete,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import LinkIcon from "@mui/icons-material/Link";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import API from "../../api";

const API_URL = "/api/obligations/lineas-credito";

const money = (value) => Number(value || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyForm = {
  financiador: null,
  id_linea: "",
  id_estado_linea: "",
  id_tipo_linea: "",
  id_moneda: "",
  mto_linea: "0",
  gl_account: null,
};

export default function LineasCreditoList() {
  const [rows, setRows] = useState([]);
  const [financiadores, setFinanciadores] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchLineas = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar las líneas de crédito", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLineas();
    API.get("/api/obligations/financiadores?status=ACTIVO").then((res) => setFinanciadores(res.data?.data || [])).catch(() => {});
    API.get("/api/accounting/accounts?is_active=1").then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAccounts(list.filter((a) => Number(a.is_movement) === 1));
    }).catch(() => {});
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (row) => {
    setEditingId(row.id);
    setForm({
      financiador: { id: row.financiador_id, name: row.financiador_name },
      id_linea: row.id_linea,
      id_estado_linea: row.id_estado_linea || "",
      id_tipo_linea: row.id_tipo_linea || "",
      id_moneda: row.id_moneda || "",
      mto_linea: String(row.mto_linea),
      gl_account: { id: row.gl_account_id, muc_code: row.gl_muc_code, account_name: row.gl_account_name },
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.id_linea || !form.gl_account || (!editingId && !form.financiador)) {
      showAlert("Complete el identificador de línea, la cuenta contable y el financiador", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        financiador_id: form.financiador?.id,
        id_linea: form.id_linea,
        id_estado_linea: form.id_estado_linea || null,
        id_tipo_linea: form.id_tipo_linea || null,
        id_moneda: form.id_moneda || null,
        mto_linea: Number(form.mto_linea || 0),
        gl_account_id: form.gl_account?.id,
      };

      if (editingId) {
        await API.put(`${API_URL}/${editingId}`, payload);
        showAlert("Línea de crédito actualizada correctamente");
      } else {
        await API.post(API_URL, payload);
        showAlert("Línea de crédito registrada correctamente");
      }

      setDialogOpen(false);
      fetchLineas();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al guardar la línea de crédito", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => [
    { field: "id_linea", headerName: "Identificador", width: 150 },
    { field: "financiador_name", headerName: "Financiador", flex: 1, minWidth: 180 },
    { field: "gl_muc_code", headerName: "Cuenta contable", width: 220, renderCell: (p) => `${p.row.gl_muc_code} - ${p.row.gl_account_name}` },
    { field: "mto_linea", headerName: "Monto de la línea", width: 160, renderCell: (p) => money(p.value) },
    { field: "saldo_disponible_linea", headerName: "Saldo disponible", width: 160, renderCell: (p) => money(p.value) },
    {
      field: "actions",
      headerName: "Acciones",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Tooltip title="Editar">
          <IconButton size="small" onClick={() => handleOpenEdit(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ], []);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LinkIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Líneas de Crédito</Typography>
              <Typography variant="body2" color="text.secondary">
                Líneas de crédito autorizadas por los financiadores
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenCreate}>
              Nueva línea
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchLineas}>
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
        <DialogTitle>{editingId ? "Editar línea de crédito" : "Nueva línea de crédito"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={financiadores}
                disabled={Boolean(editingId)}
                value={form.financiador}
                getOptionLabel={(o) => o.name || ""}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setForm((f) => ({ ...f, financiador: value }))}
                renderInput={(params) => <TextField {...params} label="Financiador" />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Identificador de la línea"
                value={form.id_linea}
                disabled={Boolean(editingId)}
                onChange={(e) => setForm((f) => ({ ...f, id_linea: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="number" label="Monto de la línea"
                value={form.mto_linea}
                onChange={(e) => setForm((f) => ({ ...f, mto_linea: e.target.value }))}
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
                renderInput={(params) => <TextField {...params} label="Cuenta contable (pasivo)" helperText="Sugerido: 2201.0X (hasta 1 año) / 2202.0X (más de 1 año)" />}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Registrar línea"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
