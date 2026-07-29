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
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditNoteIcon from "@mui/icons-material/EditNote";
import FlagIcon from "@mui/icons-material/Flag";
import InsightsIcon from "@mui/icons-material/Insights";
import { UserContext } from "../../contexts/UserContext";
import { getBudgets, createBudget, updateBudgetStatus } from "../../api/budget";

const emptyForm = { year_no: new Date().getFullYear(), name: "" };

const STATUS_CHIP = {
  DRAFT: { label: "Borrador", color: "default" },
  ACTIVE: { label: "Activo", color: "success" },
  CLOSED: { label: "Cerrado", color: "error" },
};

export default function BudgetsList() {
  const navigate = useNavigate();
  const { role, permissions = [] } = useContext(UserContext) || {};
  const canManage = role === 1 || permissions.includes("presupuesto.gestionar");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const res = await getBudgets();
      setRows(res?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar los presupuestos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!form.year_no || !form.name.trim()) {
      showAlert("Año y nombre son requeridos", "error");
      return;
    }
    try {
      setSaving(true);
      await createBudget({ year_no: Number(form.year_no), name: form.name.trim() });
      showAlert("Presupuesto creado correctamente");
      setDialogOpen(false);
      setForm(emptyForm);
      fetchBudgets();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al crear el presupuesto", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (row, status) => {
    try {
      await updateBudgetStatus(row.id, status);
      showAlert(`Presupuesto ${STATUS_CHIP[status].label.toLowerCase()}`);
      fetchBudgets();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al actualizar el estado", "error");
    }
  };

  const columns = useMemo(
    () => [
      { field: "year_no", headerName: "Año", width: 100 },
      { field: "name", headerName: "Nombre", flex: 1, minWidth: 200 },
      {
        field: "status",
        headerName: "Estado",
        width: 130,
        renderCell: (p) => <Chip size="small" color={STATUS_CHIP[p.value]?.color} label={STATUS_CHIP[p.value]?.label || p.value} />,
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 260,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Seguimiento">
              <IconButton size="small" onClick={() => navigate(`/presupuesto/${params.row.id}/seguimiento`)}>
                <InsightsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {canManage && (
              <>
                <Tooltip title="Líneas por cuenta (operativo)">
                  <IconButton size="small" onClick={() => navigate(`/presupuesto/${params.row.id}/cuentas`)}>
                    <EditNoteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Metas de colocación">
                  <IconButton size="small" onClick={() => navigate(`/presupuesto/${params.row.id}/metas-colocacion`)}>
                    <FlagIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {params.row.status === "DRAFT" && (
                  <Button size="small" sx={{ textTransform: "none" }} onClick={() => handleStatusChange(params.row, "ACTIVE")}>
                    Activar
                  </Button>
                )}
                {params.row.status === "ACTIVE" && (
                  <Button size="small" color="error" sx={{ textTransform: "none" }} onClick={() => handleStatusChange(params.row, "CLOSED")}>
                    Cerrar
                  </Button>
                )}
              </>
            )}
          </Box>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage],
  );

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AccountBalanceWalletIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Presupuestos</Typography>
              <Typography variant="body2" color="text.secondary">
                Presupuesto operativo por cuenta MUC y metas de colocación de cartera, por año
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            {canManage && (
              <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={() => setDialogOpen(true)}>
                Nuevo presupuesto
              </Button>
            )}
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchBudgets}>
              Actualizar
            </Button>
          </Box>
        </Box>

        <Box sx={{ height: 480, width: "100%" }}>
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
        <DialogTitle>Nuevo presupuesto</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Año"
                value={form.year_no}
                onChange={(e) => setForm((f) => ({ ...f, year_no: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Nombre"
                placeholder="Presupuesto 2026"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Creando..." : "Crear presupuesto"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
