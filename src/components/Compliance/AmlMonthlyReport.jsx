import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import EventNoteIcon from "@mui/icons-material/EventNote";
import API from "../../api";

const currentPeriod = () => new Date().toISOString().slice(0, 7);
const currentYear = () => new Date().getFullYear();

const daysUntilDeadline = (mmdd) => {
  const [month, day] = String(mmdd || "04-30").split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let target = new Date(today.getFullYear(), month - 1, day);
  if (target < today) target = new Date(today.getFullYear() + 1, month - 1, day);
  return Math.round((target - today) / 86400000);
};

export default function AmlMonthlyReport() {
  const [period, setPeriod] = useState(currentPeriod());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manualCounts, setManualCounts] = useState({
    apps_rejected_count: 0,
    relationships_closed_count: 0,
    ros_from_rejected_apps: 0,
    ros_from_closed_relationships: 0,
  });
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [year, setYear] = useState(currentYear());
  const [annualReport, setAnnualReport] = useState(null);
  const [loadingAnnual, setLoadingAnnual] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchReport = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/api/aml/monthly-report", { params: { period } });
      setReport(data);
      setManualCounts({
        apps_rejected_count: data.apps_rejected_count,
        relationships_closed_count: data.relationships_closed_count,
        ros_from_rejected_apps: data.ros_from_rejected_apps,
        ros_from_closed_relationships: data.ros_from_closed_relationships,
      });
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al generar el informe", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnualReport = async () => {
    try {
      setLoadingAnnual(true);
      const { data } = await API.get("/api/aml/annual-risk-report", { params: { year } });
      setAnnualReport(data);
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al generar el informe anual", "error");
    } finally {
      setLoadingAnnual(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    fetchAnnualReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const handleSaveManualCounts = async () => {
    try {
      setSaving(true);
      await API.put("/api/aml/monthly-report/manual-counts", { period, ...manualCounts });
      showAlert("Conteos manuales guardados");
      await fetchReport();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al guardar los conteos", "error");
    } finally {
      setSaving(false);
    }
  };

  const annualDaysLeft = annualReport ? daysUntilDeadline(annualReport.deadline) : null;

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff", mb: 2 }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <AssessmentIcon sx={{ color: "#1D4ED8" }} />
          <Box flexGrow={1}>
            <Typography variant="h6" fontWeight={700}>
              Informe Mensual PLA/FT/FP a CONAMI
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Art. 42.1 CD-CONAMI-070-01OCT07-2025 — remisión los primeros 5 días del mes siguiente.
            </Typography>
          </Box>
          <TextField
            label="Período"
            type="month"
            size="small"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        {report && (
          <>
            <Grid container spacing={2} mb={2}>
              <Grid item xs={12} sm={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                  <Typography variant="h4" fontWeight={800}>
                    {report.ros_sent_count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ROS enviados en el mes (42.1.1)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                  <Typography variant="h4" fontWeight={800} color={report.raii_flag ? "success.main" : "text.primary"}>
                    {report.raii_flag ? "SÍ" : "NO"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    RAII (42.1.2)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                  <Typography variant="h4" fontWeight={800} color={report.onu_list_attended ? "success.main" : "text.primary"}>
                    {report.onu_list_updates.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Actualizaciones listas ONU (42.1.3)
                  </Typography>
                  {report.onu_list_updates.length > 0 && (
                    <Chip
                      size="small"
                      sx={{ mt: 1 }}
                      label={report.onu_list_attended ? "Cartera escaneada" : "Cartera pendiente de escanear"}
                      color={report.onu_list_attended ? "success" : "warning"}
                    />
                  )}
                </Paper>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              Detalle de ROS enviados
            </Typography>
            <TableContainer sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>N° Caso</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Fecha de envío</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.ros_sent.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.case_number}</TableCell>
                      <TableCell>{r.customer_name}</TableCell>
                      <TableCell>{String(r.ros_sent_at).slice(0, 16).replace("T", " ")}</TableCell>
                    </TableRow>
                  ))}
                  {report.ros_sent.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        Sin ROS enviados en este período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              Conteos que el sistema no puede derivar automáticamente (42.1.4-1.7)
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Solicitudes rechazadas por PLA/FT, relaciones cerradas por PLA/FT, y cuántas de esas derivaron en un
              ROS a la UAF — se registran manualmente, no se infieren del sistema.
            </Typography>
            <Grid container spacing={2} alignItems="center" mb={2}>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Solicitudes rechazadas (42.1.4)"
                  type="number"
                  size="small"
                  fullWidth
                  value={manualCounts.apps_rejected_count}
                  onChange={(e) => setManualCounts({ ...manualCounts, apps_rejected_count: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="De esas, con ROS (42.1.5)"
                  type="number"
                  size="small"
                  fullWidth
                  value={manualCounts.ros_from_rejected_apps}
                  onChange={(e) => setManualCounts({ ...manualCounts, ros_from_rejected_apps: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Relaciones cerradas (42.1.6)"
                  type="number"
                  size="small"
                  fullWidth
                  value={manualCounts.relationships_closed_count}
                  onChange={(e) =>
                    setManualCounts({ ...manualCounts, relationships_closed_count: Number(e.target.value) })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="De esas, con ROS (42.1.7)"
                  type="number"
                  size="small"
                  fullWidth
                  value={manualCounts.ros_from_closed_relationships}
                  onChange={(e) =>
                    setManualCounts({ ...manualCounts, ros_from_closed_relationships: Number(e.target.value) })
                  }
                />
              </Grid>
            </Grid>
            <Button variant="contained" onClick={handleSaveManualCounts} disabled={saving}>
              Guardar conteos
            </Button>
          </>
        )}

        {loading && !report && (
          <Typography variant="body2" color="text.secondary">
            Cargando informe...
          </Typography>
        )}
      </Paper>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <EventNoteIcon sx={{ color: "#7C3AED" }} />
          <Box flexGrow={1}>
            <Typography variant="h6" fontWeight={700}>
              Informe Anual de Evaluaciones Individuales de Riesgo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Art. 42.3.1 / Art. 29 CD-CONAMI-070-01OCT07-2025 — agregado de la matriz de riesgo por cliente.
            </Typography>
          </Box>
          <TextField
            label="Año"
            type="number"
            size="small"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || currentYear())}
            sx={{ width: 120 }}
          />
        </Box>

        {annualReport && (
          <>
            {annualDaysLeft !== null && (
              <Alert severity={annualDaysLeft <= 30 ? "warning" : "info"} sx={{ mb: 2 }}>
                Vencimiento {annualReport.deadline} — {annualDaysLeft} día(s) restantes.
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                  <Typography variant="h4" fontWeight={800} color="success.main">
                    {annualReport.por_nivel.BAJO}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">BAJO</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                  <Typography variant="h4" fontWeight={800} color="warning.main">
                    {annualReport.por_nivel.MEDIO}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">MEDIO</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                  <Typography variant="h4" fontWeight={800} color="error.main">
                    {annualReport.por_nivel.ALTO}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">ALTO</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                  <Typography variant="h4" fontWeight={800}>
                    {annualReport.total_evaluados}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Total evaluados</Typography>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}

        {loadingAnnual && !annualReport && (
          <Typography variant="body2" color="text.secondary">
            Cargando informe anual...
          </Typography>
        )}
      </Paper>

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
