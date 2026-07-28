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
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import API from "../../api";

const API_URL = "/api/obligations/financiadores";

const emptyForm = {
  name: "",
  identification: "",
  id_tipo_documento: "",
  id_pais: "",
  id_pais_residencia: "",
  status: "ACTIVO",
};

export default function FinanciadoresList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchFinanciadores = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar los financiadores", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanciadores();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      identification: row.identification || "",
      id_tipo_documento: row.id_tipo_documento || "",
      id_pais: row.id_pais || "",
      id_pais_residencia: row.id_pais_residencia || "",
      status: row.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      showAlert("El nombre del financiador es requerido", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name,
        identification: form.identification || null,
        id_tipo_documento: form.id_tipo_documento || null,
        id_pais: form.id_pais || null,
        id_pais_residencia: form.id_pais_residencia || null,
        status: form.status,
      };

      if (editingId) {
        await API.put(`${API_URL}/${editingId}`, payload);
        showAlert("Financiador actualizado correctamente");
      } else {
        await API.post(API_URL, payload);
        showAlert("Financiador registrado correctamente");
      }

      setDialogOpen(false);
      fetchFinanciadores();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al guardar el financiador", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => [
    { field: "name", headerName: "Nombre / razón social", flex: 1, minWidth: 220 },
    { field: "identification", headerName: "Identificación", width: 160, renderCell: (p) => p.value || "—" },
    {
      field: "status",
      headerName: "Estado",
      width: 120,
      renderCell: (p) => <Chip size="small" color={p.value === "ACTIVO" ? "success" : "default"} label={p.value === "ACTIVO" ? "Activo" : "Inactivo"} />,
    },
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
            <AccountBalanceIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Financiadores</Typography>
              <Typography variant="body2" color="text.secondary">
                Bancos, organismos y otras instituciones que fondean a la IMF
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenCreate}>
              Nuevo financiador
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchFinanciadores}>
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
        <DialogTitle>{editingId ? "Editar financiador" : "Nuevo financiador"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Nombre o razón social"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Identificación / RUC"
                value={form.identification}
                onChange={(e) => setForm((f) => ({ ...f, identification: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select fullWidth size="small" label="Estado"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <MenuItem value="ACTIVO">Activo</MenuItem>
                <MenuItem value="INACTIVO">Inactivo</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Registrar financiador"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
