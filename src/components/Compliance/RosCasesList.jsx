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
import GavelIcon from "@mui/icons-material/Gavel";
import API from "../../api";

const STATUS_CHIP = {
  EN_ANALISIS: { label: "En análisis", color: "info" },
  DESCARTADO: { label: "Descartado", color: "default" },
  ROS_ENVIADO: { label: "ROS enviado", color: "success" },
};

export default function RosCasesList() {
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("EN_ANALISIS");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const [dialog, setDialog] = useState(null); // { mode: 'notes'|'DESCARTADO'|'ROS_ENVIADO', row }
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchRows = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/api/aml/ros-cases", { params: { status: statusFilter } });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al cargar los casos ROS", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const openDialog = (mode, row) => {
    setDialog({ mode, row });
    setNotes(row.analysis_notes || "");
  };

  const closeDialog = () => setDialog(null);

  const handleSubmitDialog = async () => {
    try {
      setSubmitting(true);
      const payload = dialog.mode === "notes" ? { analysis_notes: notes } : { analysis_notes: notes, status: dialog.mode };
      await API.put(`/api/aml/ros-cases/${dialog.row.id}`, payload);
      showAlert("Caso ROS actualizado");
      closeDialog();
      await fetchRows();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al actualizar el caso", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { field: "case_number", headerName: "N° Caso", width: 140 },
    { field: "customer_name", headerName: "Cliente", flex: 1, minWidth: 200 },
    { field: "identification", headerName: "Identificación", width: 150 },
    {
      field: "opened_at",
      headerName: "Apertura",
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
    { field: "analysis_notes", headerName: "Notas de análisis", flex: 1.5, minWidth: 260 },
    {
      field: "acciones",
      headerName: "Acciones",
      width: 300,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={() => openDialog("notes", params.row)}>
            Editar notas
          </Button>
          {params.row.status === "EN_ANALISIS" && (
            <>
              <Button size="small" variant="outlined" color="warning" onClick={() => openDialog("DESCARTADO", params.row)}>
                Descartar
              </Button>
              <Button size="small" variant="contained" color="success" onClick={() => openDialog("ROS_ENVIADO", params.row)}>
                Marcar ROS enviado
              </Button>
            </>
          )}
        </Stack>
      ),
    },
  ];

  const dialogTitle = {
    notes: "Editar notas de análisis",
    DESCARTADO: "Descartar caso ROS",
    ROS_ENVIADO: "Marcar ROS como enviado a la UAF",
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
          <GavelIcon sx={{ color: "#B91C1C" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Casos ROS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Registro interno de casos originados por alertas escaladas (Art. 35-42 CD-CONAMI-070-01OCT07-2025).
              El envío real del ROS a la UAF se hace fuera del sistema; aquí solo se documenta el caso.
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} mb={2}>
          {["EN_ANALISIS", "ROS_ENVIADO", "DESCARTADO", "ALL"].map((s) => (
            <Chip
              key={s}
              label={s === "ALL" ? "Todos" : STATUS_CHIP[s]?.label || s}
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
        <DialogTitle>{dialogTitle[dialog?.mode]}</DialogTitle>
        <DialogContent>
          <TextField
            label="Notas de análisis"
            multiline
            minRows={3}
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mt: 1 }}
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
