import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { getBudgetAlerts, runBudgetAlertCheck, dismissBudgetAlert } from "../../api/budget";

const STATUS_CHIP = {
  OPEN: { label: "Abierta", color: "warning" },
  DISMISSED: { label: "Descartada", color: "default" },
};

const ALERT_TYPE_LABEL = {
  EXPENSE_OVER_THRESHOLD: "Gasto sobre el umbral",
  INCOME_SHORTFALL: "Ingreso por debajo de meta",
  PLACEMENT_SHORTFALL: "Colocación por debajo de meta",
};

export default function BudgetAlertsInbox() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ OPEN: 0, DISMISSED: 0 });
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const [dialogRow, setDialogRow] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchRows = async () => {
    try {
      setLoading(true);
      const res = await getBudgetAlerts(statusFilter === "ALL" ? undefined : statusFilter);
      setRows(res?.data || []);
      setSummary(res?.summary || {});
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al cargar las alertas", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleRunCheck = async () => {
    try {
      setRunning(true);
      const res = await runBudgetAlertCheck();
      showAlert(`Verificación ejecutada: ${res.created} alerta(s) nueva(s) de ${res.checked} evaluadas`);
      await fetchRows();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al ejecutar la verificación", "error");
    } finally {
      setRunning(false);
    }
  };

  const openDialog = (row) => {
    setDialogRow(row);
    setComment("");
  };

  const closeDialog = () => setDialogRow(null);

  const handleDismiss = async () => {
    if (!comment.trim()) {
      showAlert("Debe indicar un comentario", "error");
      return;
    }
    try {
      setSubmitting(true);
      await dismissBudgetAlert(dialogRow.id, comment);
      showAlert("Alerta descartada");
      closeDialog();
      await fetchRows();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al descartar la alerta", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      field: "alert_type",
      headerName: "Tipo",
      width: 220,
      valueFormatter: (params) => ALERT_TYPE_LABEL[params.value] || params.value,
    },
    { field: "year_no", headerName: "Año", width: 90 },
    { field: "month_no", headerName: "Mes", width: 80 },
    {
      field: "reference",
      headerName: "Referencia",
      width: 220,
      valueGetter: (params) => params.row.muc_code ? `${params.row.muc_code} — ${params.row.account_name}` : (params.row.branch_name || "Consolidado"),
    },
    { field: "description", headerName: "Descripción", flex: 1.5, minWidth: 300 },
    {
      field: "triggered_at",
      headerName: "Fecha",
      width: 160,
      valueFormatter: (params) => (params.value ? String(params.value).slice(0, 16).replace("T", " ") : ""),
    },
    {
      field: "status",
      headerName: "Estado",
      width: 130,
      renderCell: (params) => {
        const cfg = STATUS_CHIP[params.value] || { label: params.value, color: "default" };
        return <Chip size="small" label={cfg.label} color={cfg.color} />;
      },
    },
    {
      field: "acciones",
      headerName: "Acciones",
      width: 130,
      sortable: false,
      renderCell: (params) =>
        params.row.status === "OPEN" ? (
          <Button size="small" variant="outlined" onClick={() => openDialog(params.row)}>
            Descartar
          </Button>
        ) : null,
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
          <WarningAmberIcon sx={{ color: "#B45309" }} />
          <Box flexGrow={1}>
            <Typography variant="h6" fontWeight={700}>Alertas de Presupuesto</Typography>
            <Typography variant="body2" color="text.secondary">
              Gastos sobre umbral, ingresos y colocación por debajo de la meta mensual
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleRunCheck} disabled={running}>
            {running ? "Ejecutando..." : "Ejecutar verificación"}
          </Button>
        </Box>

        <Stack direction="row" spacing={1} mb={2}>
          {["OPEN", "DISMISSED", "ALL"].map((s) => (
            <Chip
              key={s}
              label={s === "ALL" ? "Todas" : `${STATUS_CHIP[s]?.label || s} (${summary[s] ?? 0})`}
              color={statusFilter === s ? "primary" : "default"}
              onClick={() => setStatusFilter(s)}
              variant={statusFilter === s ? "filled" : "outlined"}
            />
          ))}
        </Stack>

        <Box sx={{ height: 520 }}>
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

      <Dialog open={!!dialogRow} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Descartar alerta</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>{dialogRow?.description}</Typography>
          <TextField
            label="Motivo del descarte"
            multiline
            minRows={3}
            fullWidth
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleDismiss} disabled={submitting}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert((prev) => ({ ...prev, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((prev) => ({ ...prev, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
