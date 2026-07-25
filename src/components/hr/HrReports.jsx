import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Alert,
  Snackbar,
  Button,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Grid,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { printRentasDelTrabajoReport } from "../../reports/printRentasDelTrabajoReport";
import { printPrestacionesSocialesReport } from "../../reports/printPrestacionesSocialesReport";

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const firstDayOfYear = () => `${new Date().getFullYear()}-01-01`;
const today = () => new Date().toISOString().slice(0, 10);

export default function HrReports() {
  const { tenant } = useAuth();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [tab, setTab] = useState(0);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  // Rentas del trabajo
  const [startDate, setStartDate] = useState(firstDayOfYear());
  const [endDate, setEndDate] = useState(today());
  const [rentasData, setRentasData] = useState(null);
  const [loadingRentas, setLoadingRentas] = useState(false);

  const fetchRentas = async () => {
    try {
      setLoadingRentas(true);
      const res = await API.get("/api/hr/reports/rentas-trabajo", { params: { start_date: startDate, end_date: endDate } });
      setRentasData(res.data?.data || null);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al generar el reporte", "error");
    } finally {
      setLoadingRentas(false);
    }
  };

  const handlePrintRentas = () => {
    if (!rentasData) return;
    printRentasDelTrabajoReport({
      company: tenant, user: currentUser,
      startDate: rentasData.start_date, endDate: rentasData.end_date,
      employees: rentasData.employees, totals: rentasData.totals,
    });
  };

  // Prestaciones sociales acumuladas
  const [asOfDate, setAsOfDate] = useState(today());
  const [prestacionesData, setPrestacionesData] = useState(null);
  const [loadingPrestaciones, setLoadingPrestaciones] = useState(false);

  const fetchPrestaciones = async () => {
    try {
      setLoadingPrestaciones(true);
      const res = await API.get("/api/hr/reports/prestaciones-sociales", { params: { as_of_date: asOfDate } });
      setPrestacionesData(res.data?.data || null);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al generar el reporte", "error");
    } finally {
      setLoadingPrestaciones(false);
    }
  };

  const handlePrintPrestaciones = () => {
    if (!prestacionesData) return;
    printPrestacionesSocialesReport({
      company: tenant, user: currentUser,
      asOfDate: prestacionesData.as_of_date,
      employees: prestacionesData.employees, totals: prestacionesData.totals,
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <AssessmentIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Reportes de RRHH</Typography>
            <Typography variant="body2" color="text.secondary">
              Rentas del trabajo (soporte DGI) y prestaciones sociales acumuladas
            </Typography>
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Rentas del Trabajo" />
          <Tab label="Prestaciones Sociales Acumuladas" />
        </Tabs>

        {tab === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Reporte de apoyo para la Declaración de Retenciones IR Laboral ante la DGI. No es el archivo con el formato oficial exacto que exige la DGI (no disponemos del manual de layout) — sirve como respaldo/soporte para transcripción manual.
            </Alert>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }}
                  value={startDate} onChange={(e) => setStartDate(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }}
                  value={endDate} onChange={(e) => setEndDate(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button variant="outlined" sx={{ textTransform: "none", height: "100%" }} disabled={loadingRentas} onClick={fetchRentas}>
                  {loadingRentas ? "Generando..." : "Generar reporte"}
                </Button>
              </Grid>
              {rentasData && (
                <Grid item xs={12} sm={3}>
                  <Button variant="contained" startIcon={<PrintIcon />} sx={{ textTransform: "none", height: "100%" }} onClick={handlePrintRentas}>
                    Imprimir
                  </Button>
                </Grid>
              )}
            </Grid>

            {rentasData && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Empleado</TableCell>
                    <TableCell>Cédula</TableCell>
                    <TableCell>Puesto</TableCell>
                    <TableCell align="right">Ingresos gravables</TableCell>
                    <TableCell align="right">IR retenido</TableCell>
                    <TableCell align="right">INSS laboral</TableCell>
                    <TableCell align="right">Neto pagado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rentasData.employees.length === 0 && (
                    <TableRow><TableCell colSpan={7}><Typography variant="body2" color="text.secondary">Sin ingresos registrados en el período.</Typography></TableCell></TableRow>
                  )}
                  {rentasData.employees.map((e) => (
                    <TableRow key={e.employee_id}>
                      <TableCell>{e.full_name}</TableCell>
                      <TableCell>{e.id_card}</TableCell>
                      <TableCell>{e.position}</TableCell>
                      <TableCell align="right">C$ {money(e.total_ingresos)}</TableCell>
                      <TableCell align="right">C$ {money(e.total_ir)}</TableCell>
                      <TableCell align="right">C$ {money(e.total_inss_laboral)}</TableCell>
                      <TableCell align="right">C$ {money(e.total_neto)}</TableCell>
                    </TableRow>
                  ))}
                  {rentasData.employees.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={3}><strong>Totales</strong></TableCell>
                      <TableCell align="right"><strong>C$ {money(rentasData.totals.total_ingresos)}</strong></TableCell>
                      <TableCell align="right"><strong>C$ {money(rentasData.totals.total_ir)}</strong></TableCell>
                      <TableCell align="right"><strong>C$ {money(rentasData.totals.total_inss_laboral)}</strong></TableCell>
                      <TableCell align="right"><strong>C$ {money(rentasData.totals.total_neto)}</strong></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Estima cuánto costaría liquidar a todo el personal activo en la fecha indicada (vacaciones + aguinaldo proporcional + indemnización Art. 45) — pasivo laboral contingente, no un cálculo contable persistido.
            </Alert>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth size="small" type="date" label="A la fecha de" InputLabelProps={{ shrink: true }}
                  value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button variant="outlined" sx={{ textTransform: "none", height: "100%" }} disabled={loadingPrestaciones} onClick={fetchPrestaciones}>
                  {loadingPrestaciones ? "Generando..." : "Generar reporte"}
                </Button>
              </Grid>
              {prestacionesData && (
                <Grid item xs={12} sm={3}>
                  <Button variant="contained" startIcon={<PrintIcon />} sx={{ textTransform: "none", height: "100%" }} onClick={handlePrintPrestaciones}>
                    Imprimir
                  </Button>
                </Grid>
              )}
            </Grid>

            {prestacionesData && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Empleado</TableCell>
                    <TableCell>Puesto</TableCell>
                    <TableCell align="right">Años serv.</TableCell>
                    <TableCell align="right">Vacaciones</TableCell>
                    <TableCell align="right">Aguinaldo</TableCell>
                    <TableCell align="right">Indemnización</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {prestacionesData.employees.length === 0 && (
                    <TableRow><TableCell colSpan={7}><Typography variant="body2" color="text.secondary">Sin empleados activos.</Typography></TableCell></TableRow>
                  )}
                  {prestacionesData.employees.map((e) => (
                    <TableRow key={e.employee_id}>
                      <TableCell>{e.full_name}</TableCell>
                      <TableCell>{e.position}</TableCell>
                      <TableCell align="right">{e.years_of_service}</TableCell>
                      <TableCell align="right">C$ {money(e.vacaciones_monto)}</TableCell>
                      <TableCell align="right">C$ {money(e.aguinaldo_monto)}</TableCell>
                      <TableCell align="right">C$ {money(e.indemnizacion_monto)}</TableCell>
                      <TableCell align="right">C$ {money(e.total_acumulado)}</TableCell>
                    </TableRow>
                  ))}
                  {prestacionesData.employees.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={3}><strong>Totales</strong></TableCell>
                      <TableCell align="right"><strong>C$ {money(prestacionesData.totals.vacaciones_monto)}</strong></TableCell>
                      <TableCell align="right"><strong>C$ {money(prestacionesData.totals.aguinaldo_monto)}</strong></TableCell>
                      <TableCell align="right"><strong>C$ {money(prestacionesData.totals.indemnizacion_monto)}</strong></TableCell>
                      <TableCell align="right"><strong>C$ {money(prestacionesData.totals.total_acumulado)}</strong></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Box>
        )}
      </Paper>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
