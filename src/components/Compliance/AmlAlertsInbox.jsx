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
import API from "../../api";

const STATUS_CHIP = {
  OPEN: { label: "Abierta", color: "warning" },
  UNDER_REVIEW: { label: "En revisión", color: "info" },
  DISMISSED: { label: "Descartada", color: "default" },
  ESCALATED: { label: "Escalada a ROS", color: "error" },
};

const ALERT_TYPE_LABEL = {
  PAGO_EFECTIVO_ELEVADO: "Pago en efectivo elevado",
  FRACCIONAMIENTO_EFECTIVO: "Fraccionamiento en efectivo",
  MONTO_DESPROPORCIONADO: "Monto desproporcionado al ingreso",
  ALTO_RIESGO_PIC_VENCIDO: "Cliente ALTO riesgo con PIC vencido",
};

export default function AmlAlertsInbox() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ OPEN: 0, UNDER_REVIEW: 0, DISMISSED: 0, ESCALATED: 0 });
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const [dialog, setDialog] = useState(null); // { mode: 'dismiss'|'escalate', alert }
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchRows = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/api/aml/alerts", { params: { status: statusFilter, limit: 100 } });
      setRows(data?.data || []);
      setSummary(data?.summary || {});
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

  const handleRunDetection = async () => {
    try {
      setRunning(true);
      const { data } = await API.post("/api/aml/alerts/run-detection");
      showAlert(`Detección ejecutada: ${data.created} alerta(s) nueva(s)`);
      await fetchRows();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al ejecutar la detección", "error");
    } finally {
      setRunning(false);
    }
  };

  const openDialog = (mode, row) => {
    setDialog({ mode, row });
    setComment("");
  };

  const closeDialog = () => setDialog(null);

  const handleSubmitDialog = async () => {
    if (!comment.trim()) {
      showAlert("Debe indicar un comentario", "error");
      return;
    }
    try {
      setSubmitting(true);
      if (dialog.mode === "dismiss") {
        await API.post(`/api/aml/alerts/${dialog.row.id}/dismiss`, { comment });
        showAlert("Alerta descartada");
      } else {
        const { data } = await API.post(`/api/aml/alerts/${dialog.row.id}/escalate`, {
          comment,
          analysis_notes: comment,
        });
        showAlert(`Alerta escalada a caso ${data.case_number}`);
      }
      closeDialog();
      await fetchRows();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al procesar la alerta", "error");
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
    { field: "customer_name", headerName: "Cliente", flex: 1, minWidth: 200 },
    { field: "identification", headerName: "Identificación", width: 150 },
    { field: "description", headerName: "Descripción", flex: 1.5, minWidth: 260 },
    {
      field: "triggered_at",
      headerName: "Fecha",
      width: 160,
      valueFormatter: (params) => (params.value ? String(params.value).slice(0, 16).replace("T", " ") : ""),
    },
    {
      field: "status",
      headerName: "Estado",
      width: 150,
      renderCell: (params) => {
        const cfg = STATUS_CHIP[params.value] || { label: params.value, color: "default" };
        return <Chip size="small" label={cfg.label} color={cfg.color} />;
      },
    },
    {
      field: "acciones",
      headerName: "Acciones",
      width: 220,
      sortable: false,
      renderCell: (params) =>
        params.row.status === "OPEN" || params.row.status === "UNDER_REVIEW" ? (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={() => openDialog("dismiss", params.row)}>
              Descartar
            </Button>
            <Button size="small" variant="contained" color="error" onClick={() => openDialog("escalate", params.row)}>
              Escalar a ROS
            </Button>
          </Stack>
        ) : null,
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
          <WarningAmberIcon sx={{ color: "#B45309" }} />
          <Box flexGrow={1}>
            <Typography variant="h6" fontWeight={700}>
              Alertas de Operaciones Inusuales
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Art. 33-34, 37-38 CD-CONAMI-070-01OCT07-2025
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={handleRunDetection}
            disabled={running}
          >
            {running ? "Ejecutando..." : "Ejecutar detección"}
          </Button>
        </Box>

        <Stack direction="row" spacing={1} mb={2}>
          {["OPEN", "UNDER_REVIEW", "ESCALATED", "DISMISSED", "ALL"].map((s) => (
            <Chip
              key={s}
              label={
                s === "ALL"
                  ? "Todas"
                  : `${STATUS_CHIP[s]?.label || s} (${summary[s] ?? 0})`
              }
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

      <Dialog open={!!dialog} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialog?.mode === "dismiss" ? "Descartar alerta" : "Escalar alerta a caso ROS"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {dialog?.row?.description}
          </Typography>
          <TextField
            label={dialog?.mode === "dismiss" ? "Motivo del descarte" : "Notas de análisis inicial"}
            multiline
            minRows={3}
            fullWidth
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmitDialog} disabled={submitting}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={alert.severity} onClose={() => setAlert((prev) => ({ ...prev, open: false }))}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
