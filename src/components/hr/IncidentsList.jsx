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
import EventBusyIcon from "@mui/icons-material/EventBusy";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import BlockIcon from "@mui/icons-material/Block";
import API from "../../api";

const API_URL = "/api/hr/incidents";

const TYPE_LABELS = {
  AUSENCIA_INJUSTIFICADA: "Ausencia injustificada",
  AUSENCIA_JUSTIFICADA: "Ausencia justificada",
  PERMISO_CON_GOCE: "Permiso con goce",
  PERMISO_SIN_GOCE: "Permiso sin goce",
  SUBSIDIO_INSS: "Subsidio INSS",
  HORAS_EXTRA: "Horas extra",
};

const DAY_BASED_TYPES = ["AUSENCIA_INJUSTIFICADA", "AUSENCIA_JUSTIFICADA", "PERMISO_CON_GOCE", "PERMISO_SIN_GOCE", "SUBSIDIO_INSS"];

const STATUS_LABEL = { PENDIENTE: "Pendiente", APLICADA: "Aplicada", ANULADA: "Anulada" };
const STATUS_COLOR = { PENDIENTE: "warning", APLICADA: "success", ANULADA: "default" };

const emptyForm = { employee: null, incident_type: "AUSENCIA_INJUSTIFICADA", start_date: "", end_date: "", hours: "", notes: "" };

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function IncidentsList() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar incidencias", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    API.get("/api/hr/employees?status=ACTIVO").then((res) => setEmployees(res.data?.data || [])).catch(() => {});
  }, []);

  const handleOpenCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const isDayBased = DAY_BASED_TYPES.includes(form.incident_type);

  const handleSave = async () => {
    if (!form.employee || !form.incident_type) {
      showAlert("Complete el empleado y el tipo de incidencia", "error");
      return;
    }
    if (isDayBased && (!form.start_date || !form.end_date)) {
      showAlert("Complete las fechas desde/hasta", "error");
      return;
    }
    if (!isDayBased && (!form.start_date || !form.hours)) {
      showAlert("Complete la fecha y las horas", "error");
      return;
    }

    try {
      setSaving(true);
      await API.post(API_URL, {
        employee_id: form.employee.id,
        incident_type: form.incident_type,
        start_date: form.start_date,
        end_date: isDayBased ? form.end_date : form.start_date,
        hours: isDayBased ? null : Number(form.hours),
        notes: form.notes || null,
      });
      showAlert("Incidencia registrada correctamente");
      setDialogOpen(false);
      fetchIncidents();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al registrar la incidencia", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleVoid = async (row) => {
    const confirmed = window.confirm(`¿Confirma anular esta incidencia de "${row.employee_name}"?`);
    if (!confirmed) return;
    try {
      await API.put(`${API_URL}/${row.id}/void`);
      showAlert("Incidencia anulada correctamente");
      fetchIncidents();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al anular la incidencia", "error");
    }
  };

  const columns = useMemo(() => [
    { field: "employee_name", headerName: "Empleado", flex: 1, minWidth: 180 },
    { field: "incident_type", headerName: "Tipo", width: 190, renderCell: (p) => TYPE_LABELS[p.value] || p.value },
    {
      field: "period",
      headerName: "Fecha/Período",
      width: 180,
      renderCell: (p) => (
        p.row.incident_type === "HORAS_EXTRA"
          ? `${String(p.row.start_date).slice(0, 10)} (${p.row.hours}h)`
          : `${String(p.row.start_date).slice(0, 10)} a ${String(p.row.end_date).slice(0, 10)}`
      ),
    },
    { field: "notes", headerName: "Notas", flex: 1, minWidth: 140, renderCell: (p) => p.value || "-" },
    {
      field: "computed_amount",
      headerName: "Monto aplicado",
      width: 130,
      renderCell: (p) => (p.value !== null && p.value !== undefined ? `C$ ${money(p.value)}` : "-"),
    },
    {
      field: "status",
      headerName: "Estado",
      width: 110,
      renderCell: (p) => <Chip size="small" color={STATUS_COLOR[p.value]} label={STATUS_LABEL[p.value]} />,
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        params.row.status === "PENDIENTE" ? (
          <Tooltip title="Anular">
            <IconButton size="small" color="error" onClick={() => handleVoid(params.row)}>
              <BlockIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null
      ),
    },
  ], []);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <EventBusyIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Incidencias</Typography>
              <Typography variant="body2" color="text.secondary">
                Ausencias, permisos, subsidios y horas extra — se aplican automáticamente al generar la siguiente planilla
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenCreate}>
              Nueva incidencia
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchIncidents}>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nueva incidencia</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={employees}
                value={form.employee}
                getOptionLabel={(o) => o.full_name || ""}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setForm((f) => ({ ...f, employee: value }))}
                renderInput={(params) => <TextField {...params} label="Empleado" />}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select fullWidth size="small" label="Tipo de incidencia"
                value={form.incident_type}
                onChange={(e) => setForm((f) => ({ ...f, incident_type: e.target.value }))}
              >
                {Object.entries(TYPE_LABELS).map(([code, label]) => (
                  <MenuItem key={code} value={code}>{label}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {isDayBased ? (
              <>
                <Grid item xs={6}>
                  <TextField
                    fullWidth size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }}
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }}
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  />
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={6}>
                  <TextField
                    fullWidth size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }}
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth size="small" type="number" label="Horas"
                    value={form.hours}
                    onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Notas (opcional)"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : "Registrar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
