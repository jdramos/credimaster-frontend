import React, { useEffect, useState } from "react";
import HelpButton from "../help/HelpButton";
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
import RosDossierDialog from "./RosDossierDialog";
import ReportExportButtons from "../common/ReportExportButtons";
import { reportDateTime } from "../common/reportFormat";

// Plazo de envío del ROS: 30 días desde la alerta (Art. 6 Resolución UAF-N-021-2019).
const DEADLINE_CHIP = {
  EN_PLAZO: { color: "default", label: (r) => `Vence ${r.deadline_date} (${r.days_left} días)` },
  POR_VENCER: { color: "warning", label: (r) => `Vence en ${r.days_left} día(s)` },
  VENCIDO: { color: "error", label: (r) => `Vencido hace ${Math.abs(r.days_left)} día(s)` },
  ENVIADO_EN_PLAZO: { color: "success", label: () => "Enviado en plazo" },
  ENVIADO_FUERA_DE_PLAZO: { color: "error", label: () => "Enviado fuera de plazo" },
  DESCARTADO: { color: "default", label: () => "—" },
};

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
  const [sirelReceipt, setSirelReceipt] = useState("");
  const [dossierCase, setDossierCase] = useState(null);
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
    setSirelReceipt(row.sirel_receipt || "");
  };

  const closeDialog = () => setDialog(null);

  const handleSubmitDialog = async () => {
    try {
      setSubmitting(true);
      const payload = dialog.mode === "notes" ? { analysis_notes: notes } : { analysis_notes: notes, status: dialog.mode };
      if (dialog.mode === "ROS_ENVIADO" || dialog.row.status === "ROS_ENVIADO") payload.sirel_receipt = sirelReceipt;
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
    {
      field: "deadline_status",
      headerName: "Plazo UAF (30 días)",
      width: 190,
      renderCell: (params) => {
        const cfg = DEADLINE_CHIP[params.value];
        if (!cfg) return "";
        return <Chip size="small" variant={params.value === "EN_PLAZO" ? "outlined" : "filled"} color={cfg.color} label={cfg.label(params.row)} />;
      },
    },
    { field: "sirel_receipt", headerName: "Acuse SIREL", width: 130 },
    { field: "analysis_notes", headerName: "Notas de análisis", flex: 1.5, minWidth: 220 },
    {
      field: "acciones",
      headerName: "Acciones",
      width: 410,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={() => setDossierCase(params.row)}>
            Expediente
          </Button>
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

  const buildReport = () => ({
    title: "Casos ROS",
    subtitle: `Estado: ${statusFilter === "ALL" ? "Todos" : STATUS_CHIP[statusFilter]?.label || statusFilter}`,
    orientation: "landscape",
    columns: [
      { field: "case_number", label: "N° Caso" },
      { field: "customer_name", label: "Cliente" },
      { field: "identification", label: "Identificación" },
      { field: "opened_at", label: "Apertura", format: reportDateTime },
      { field: "status", label: "Estado", format: (v) => STATUS_CHIP[v]?.label || v },
      { label: "Plazo UAF (30 días)", value: (row) => DEADLINE_CHIP[row.deadline_status]?.label(row) || "" },
      { field: "sirel_receipt", label: "Acuse SIREL" },
      { field: "analysis_notes", label: "Notas de análisis" },
    ],
    rows,
    totals: [{ value: `${rows.length} caso(s)`, colspan: 8 }],
    fileName: `casos_ros_${statusFilter.toLowerCase()}`,
  });

  const dialogTitle = {
    notes: "Editar notas de análisis",
    DESCARTADO: "Descartar caso ROS",
    ROS_ENVIADO: "Marcar ROS como enviado a la UAF",
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid var(--cm-border, #E5E7EB)", background: "var(--cm-paper, #fff)" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
          <GavelIcon sx={{ color: "var(--cm-error-text, #B91C1C)" }} />
          <Box flexGrow={1}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="h6" fontWeight={700}>
                Casos ROS
              </Typography>
              <HelpButton screenKey="cumplimiento.ros" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Casos originados por alertas escaladas (Art. 35-42 CD-CONAMI-070-01OCT07-2025). El ROS se envía a la UAF por
              SIREL a más tardar 30 días después de la alerta (Art. 6 Resolución UAF-N-021-2019); el expediente reúne los
              anexos obligatorios del Art. 9.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexShrink={0}>
            <ReportExportButtons report={buildReport} disabled={!rows.length} />
          </Stack>
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
            rowsPerPageOptions={[10, 25, 50, 100]}
            initialState={{ pagination: { pageSize: 25, page: 0 } }}
            disableSelectionOnClick
            sx={{
              border: "1px solid var(--cm-border, #E5E7EB)",
              borderRadius: 2,
              "& .MuiDataGrid-columnHeaders": { backgroundColor: "var(--cm-surface, #F8FAFC)", fontWeight: 700 },
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
            helperText={dialog?.mode === "ROS_ENVIADO" ? "Este es el informe de análisis del caso (anexo 4 del ROS): antecedentes y razones de la sospecha." : ""}
          />
          {(dialog?.mode === "ROS_ENVIADO" || dialog?.row?.status === "ROS_ENVIADO") && (
            <TextField
              label="Número de acuse de SIREL"
              fullWidth
              value={sirelReceipt}
              onChange={(e) => setSirelReceipt(e.target.value)}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmitDialog} disabled={submitting}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <RosDossierDialog rosCase={dossierCase} onClose={() => setDossierCase(null)} />

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
