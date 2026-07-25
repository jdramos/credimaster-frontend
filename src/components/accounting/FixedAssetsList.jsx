import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Chip,
  Alert,
  Snackbar,
  Tooltip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Divider,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import RemoveShoppingCartIcon from "@mui/icons-material/RemoveShoppingCart";
import API from "../../api";

const API_URL = "/api/fixed-assets";

const CATEGORY_LABELS = {
  TERRENO: "Terreno",
  EDIFICIO: "Edificio",
  INSTALACION: "Instalación",
  MOBILIARIO: "Mobiliario",
  EQUIPO: "Equipo",
  COMPUTACION: "Equipo de Cómputo",
  VEHICULO: "Vehículo",
};

const emptyForm = {
  category_code: "",
  description: "",
  branch_id: "",
  acquisition_date: "",
  acquisition_cost: "",
  residual_value: "0",
  useful_life_months: "",
};

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function FixedAssetsList() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [disposal, setDisposal] = useState(null);
  const [disposalPreview, setDisposalPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar los activos fijos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    API.get("/api/branches").then(({ data }) => setBranches(Array.isArray(data) ? data : [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDepreciable = form.category_code && form.category_code !== "TERRENO";

  const handleOpenDialog = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.category_code || !form.description || !form.acquisition_date || !form.acquisition_cost) {
      showAlert("Complete categoría, descripción, fecha y costo de adquisición", "error");
      return;
    }
    if (isDepreciable && !form.useful_life_months) {
      showAlert("Indique la vida útil en meses para esta categoría", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        category_code: form.category_code,
        description: form.description,
        branch_id: form.branch_id || null,
        acquisition_date: form.acquisition_date,
        acquisition_cost: Number(form.acquisition_cost),
        residual_value: Number(form.residual_value || 0),
        useful_life_months: isDepreciable ? Number(form.useful_life_months) : undefined,
      };

      const res = await API.post(API_URL, payload);
      showAlert(`Activo ${res.data.data.asset_code} registrado (comprobante ${res.data.data.entry_no})`);
      setDialogOpen(false);
      fetchAssets();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al registrar el activo fijo", "error");
    } finally {
      setSaving(false);
    }
  };

  const openDisposal = (asset) => {
    setDisposal({
      asset,
      entry_date: new Date().toISOString().slice(0, 10),
      sale_price: "0",
      disposal_notes: "",
    });
    setDisposalPreview(null);
  };

  const fetchDisposalPreview = async () => {
    if (!disposal) return;
    try {
      setPreviewLoading(true);
      const res = await API.get(`${API_URL}/${disposal.asset.id}/disposal-preview`, {
        params: { sale_price: Number(disposal.sale_price || 0) },
      });
      setDisposalPreview(res.data);
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo calcular la vista previa", "error");
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmDisposal = async () => {
    if (!disposal || !disposalPreview) return;

    const confirmed = window.confirm(
      `¿Confirma la baja del activo ${disposal.asset.asset_code}?\n\n` +
      `Valor en libros: C$ ${money(disposalPreview.book_value)}\n` +
      `${disposalPreview.gain_loss >= 0 ? "Ganancia" : "Pérdida"}: C$ ${money(Math.abs(disposalPreview.gain_loss))}\n\n` +
      `Esta acción genera un comprobante contable permanente.`
    );
    if (!confirmed) return;

    try {
      setConfirming(true);
      const res = await API.put(`${API_URL}/${disposal.asset.id}/dispose`, {
        entry_date: disposal.entry_date,
        sale_price: Number(disposal.sale_price || 0),
        disposal_notes: disposal.disposal_notes || null,
      });
      showAlert(`Activo ${disposal.asset.asset_code} dado de baja (comprobante ${res.data.data.entry_no})`);
      setDisposal(null);
      setDisposalPreview(null);
      fetchAssets();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al dar de baja el activo", "error");
    } finally {
      setConfirming(false);
    }
  };

  const columns = useMemo(() => [
    { field: "asset_code", headerName: "Código", width: 130 },
    {
      field: "category_code",
      headerName: "Categoría",
      width: 160,
      renderCell: (params) => CATEGORY_LABELS[params.value] || params.value,
    },
    { field: "description", headerName: "Descripción", flex: 1, minWidth: 200 },
    { field: "acquisition_date", headerName: "Fecha compra", width: 130, renderCell: (p) => String(p.value || "").slice(0, 10) },
    { field: "acquisition_cost", headerName: "Costo", width: 130, renderCell: (p) => money(p.value) },
    { field: "accumulated_depreciation", headerName: "Dep. Acumulada", width: 140, renderCell: (p) => money(p.value) },
    {
      field: "book_value",
      headerName: "Valor en libros",
      width: 140,
      renderCell: (p) => money(Number(p.row.acquisition_cost) - Number(p.row.accumulated_depreciation)),
    },
    {
      field: "status",
      headerName: "Estado",
      width: 130,
      renderCell: (p) => (
        <Chip
          size="small"
          color={p.value === "ACTIVE" ? "success" : "default"}
          label={p.value === "ACTIVE" ? "Activo" : "Dado de baja"}
        />
      ),
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        params.row.status === "ACTIVE" && (
          <Tooltip title="Dar de baja (venta o retiro)">
            <IconButton size="small" color="error" onClick={() => openDisposal(params.row)}>
              <RemoveShoppingCartIcon fontSize="small" />
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
            <WarehouseIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Activo Fijo</Typography>
              <Typography variant="body2" color="text.secondary">
                Registro, depreciación y baja de activos de la institución
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenDialog}>
              Nuevo activo
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchAssets}>
              Actualizar
            </Button>
          </Box>
        </Box>

        <Box sx={{ height: 620, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            pageSizeOptions={[10, 25, 50, 100]}
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

      {/* Diálogo de alta */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo activo fijo</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                select fullWidth size="small" label="Categoría"
                value={form.category_code}
                onChange={(e) => setForm((f) => ({ ...f, category_code: e.target.value, useful_life_months: "" }))}
              >
                {Object.entries(CATEGORY_LABELS).map(([code, label]) => (
                  <MenuItem key={code} value={code}>{label}</MenuItem>
                ))}
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
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Descripción"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="date" label="Fecha de adquisición" InputLabelProps={{ shrink: true }}
                value={form.acquisition_date}
                onChange={(e) => setForm((f) => ({ ...f, acquisition_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="number" label="Costo de adquisición"
                value={form.acquisition_cost}
                onChange={(e) => setForm((f) => ({ ...f, acquisition_cost: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="number" label="Valor residual"
                value={form.residual_value}
                onChange={(e) => setForm((f) => ({ ...f, residual_value: e.target.value }))}
                disabled={!isDepreciable}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="number" label="Vida útil (meses)"
                value={form.useful_life_months}
                onChange={(e) => setForm((f) => ({ ...f, useful_life_months: e.target.value }))}
                disabled={!isDepreciable}
                helperText={!isDepreciable && form.category_code ? "Los terrenos no se deprecian" : " "}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : "Registrar activo"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de baja */}
      <Dialog open={Boolean(disposal)} onClose={() => setDisposal(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Dar de baja {disposal?.asset?.asset_code}</DialogTitle>
        <DialogContent>
          {disposal && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">{disposal.asset.description}</Typography>

              <TextField
                size="small" type="date" label="Fecha de baja" InputLabelProps={{ shrink: true }}
                value={disposal.entry_date}
                onChange={(e) => { setDisposal((d) => ({ ...d, entry_date: e.target.value })); setDisposalPreview(null); }}
              />

              <TextField
                size="small" type="number" label="Precio de venta (0 = retiro sin venta)"
                value={disposal.sale_price}
                onChange={(e) => { setDisposal((d) => ({ ...d, sale_price: e.target.value })); setDisposalPreview(null); }}
              />

              <TextField
                size="small" label="Notas (opcional)" multiline minRows={2}
                value={disposal.disposal_notes}
                onChange={(e) => setDisposal((d) => ({ ...d, disposal_notes: e.target.value }))}
              />

              <Button variant="outlined" onClick={fetchDisposalPreview} disabled={previewLoading} sx={{ textTransform: "none" }}>
                {previewLoading ? "Calculando..." : "Calcular ganancia/pérdida"}
              </Button>

              {disposalPreview && (
                <>
                  <Divider />
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip label={`Valor en libros: C$ ${money(disposalPreview.book_value)}`} />
                    <Chip
                      color={disposalPreview.gain_loss > 0 ? "success" : disposalPreview.gain_loss < 0 ? "error" : "default"}
                      label={`${disposalPreview.gain_loss >= 0 ? "Ganancia" : "Pérdida"}: C$ ${money(Math.abs(disposalPreview.gain_loss))}`}
                    />
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisposal(null)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button
            variant="contained" color="error" onClick={confirmDisposal}
            disabled={!disposalPreview || confirming}
            sx={{ textTransform: "none" }}
          >
            {confirming ? "Procesando..." : "Confirmar baja"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
