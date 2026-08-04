import React, { useEffect, useState } from "react";
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
  RadioGroup,
  FormControlLabel,
  Radio,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PrintIcon from "@mui/icons-material/Print";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { printRentasDelTrabajoReport } from "../../reports/printRentasDelTrabajoReport";
import { printPrestacionesSocialesReport } from "../../reports/printPrestacionesSocialesReport";
import { printDeduccionesIngresosReport } from "../../reports/printDeduccionesIngresosReport";

const exportToExcel = (rows, sheetName, fileName) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  saveAs(blob, fileName);
};

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

  // Catálogo de empleados compartido por los 3 selectores (sin filtrar por
  // estado: un reporte histórico puede necesitar un empleado ya inactivo).
  const [employees, setEmployees] = useState([]);
  useEffect(() => {
    API.get("/api/hr/employees")
      .then((res) => setEmployees(res.data?.data || []))
      .catch(() => setEmployees([]));
  }, []);

  // Rentas del trabajo
  const [startDate, setStartDate] = useState(firstDayOfYear());
  const [endDate, setEndDate] = useState(today());
  const [rentasEmployee, setRentasEmployee] = useState(null);
  const [rentasData, setRentasData] = useState(null);
  const [loadingRentas, setLoadingRentas] = useState(false);

  const fetchRentas = async () => {
    try {
      setLoadingRentas(true);
      const res = await API.get("/api/hr/reports/rentas-trabajo", {
        params: { start_date: startDate, end_date: endDate, employee_id: rentasEmployee?.id || undefined },
      });
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

  const handleExportRentas = () => {
    if (!rentasData) return;
    exportToExcel(
      rentasData.employees.map((e) => ({
        Empleado: e.full_name, Cédula: e.id_card, Puesto: e.position,
        "Ingresos gravables": Number(e.total_ingresos), "IR retenido": Number(e.total_ir),
        "INSS laboral": Number(e.total_inss_laboral), "Neto pagado": Number(e.total_neto),
      })),
      "Rentas del trabajo",
      `RentasDelTrabajo_${rentasData.start_date}_${rentasData.end_date}.xlsx`,
    );
  };

  // Prestaciones sociales acumuladas
  const [asOfDate, setAsOfDate] = useState(today());
  const [prestacionesEmployee, setPrestacionesEmployee] = useState(null);
  const [prestacionesData, setPrestacionesData] = useState(null);
  const [loadingPrestaciones, setLoadingPrestaciones] = useState(false);

  const fetchPrestaciones = async () => {
    try {
      setLoadingPrestaciones(true);
      const res = await API.get("/api/hr/reports/prestaciones-sociales", {
        params: { as_of_date: asOfDate, employee_id: prestacionesEmployee?.id || undefined },
      });
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

  const handleExportPrestaciones = () => {
    if (!prestacionesData) return;
    exportToExcel(
      prestacionesData.employees.map((e) => ({
        Empleado: e.full_name, Puesto: e.position, "Años servicio": Number(e.years_of_service),
        Vacaciones: Number(e.vacaciones_monto), Aguinaldo: Number(e.aguinaldo_monto),
        Indemnización: Number(e.indemnizacion_monto), Total: Number(e.total_acumulado),
      })),
      "Prestaciones sociales",
      `PrestacionesSociales_${prestacionesData.as_of_date}.xlsx`,
    );
  };

  // Deducciones e ingresos de planilla
  const [diType, setDiType] = useState("DEDUCCION");
  const [allConcepts, setAllConcepts] = useState([]);
  const [diConceptId, setDiConceptId] = useState("");
  const [diEmployee, setDiEmployee] = useState(null);
  const [diStartDate, setDiStartDate] = useState("");
  const [diEndDate, setDiEndDate] = useState("");
  const [diData, setDiData] = useState(null);
  const [loadingDi, setLoadingDi] = useState(false);

  useEffect(() => {
    if (tab !== 2 || allConcepts.length > 0) return;
    API.get("/api/hr/concepts")
      .then((res) => setAllConcepts(res.data?.data || []))
      .catch(() => setAllConcepts([]));
  }, [tab, allConcepts.length]);

  const diConcepts = allConcepts.filter((c) => c.type === diType);

  const handleDiTypeChange = (value) => {
    setDiType(value);
    setDiConceptId("");
    setDiData(null);
  };

  const fetchDi = async () => {
    try {
      setLoadingDi(true);
      const res = await API.get("/api/hr/reports/deducciones-ingresos", {
        params: {
          type: diType,
          concept_id: diConceptId || undefined,
          employee_id: diEmployee?.id || undefined,
          start_date: diStartDate || undefined,
          end_date: diEndDate || undefined,
        },
      });
      setDiData(res.data?.data || null);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al generar el reporte", "error");
    } finally {
      setLoadingDi(false);
    }
  };

  const handlePrintDi = () => {
    if (!diData) return;
    const conceptName = diConceptId ? diConcepts.find((c) => String(c.id) === String(diConceptId))?.name : null;
    printDeduccionesIngresosReport({
      company: tenant, user: currentUser,
      type: diData.type, conceptName,
      startDate: diData.start_date, endDate: diData.end_date,
      lines: diData.lines, total: diData.total,
    });
  };

  const handleExportDi = () => {
    if (!diData) return;
    const label = diData.type === "INGRESO" ? "Ingresos" : "Deducciones";
    exportToExcel(
      diData.lines.map((l) => ({
        "Fecha de pago": l.pay_date ? new Date(l.pay_date).toLocaleDateString("es-NI") : "",
        Comprobante: l.entry_no || "",
        Empleado: l.employee_name, Cédula: l.id_card || "",
        Concepto: l.concept_name, Detalle: l.detail || "",
        Monto: Number(l.amount),
      })),
      label,
      `${label}Planilla_${diData.start_date || "historico"}_${diData.end_date || "hoy"}.xlsx`,
    );
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
          <Tab label="Deducciones e Ingresos" />
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
                <Autocomplete
                  size="small"
                  options={employees}
                  getOptionLabel={(o) => o.full_name || ""}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  value={rentasEmployee}
                  onChange={(_, v) => setRentasEmployee(v)}
                  renderInput={(params) => <TextField {...params} label="Empleado (todos si vacío)" />}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button variant="outlined" fullWidth sx={{ textTransform: "none", height: "100%" }} disabled={loadingRentas} onClick={fetchRentas}>
                  {loadingRentas ? "Generando..." : "Generar reporte"}
                </Button>
              </Grid>
              {rentasData && (
                <>
                  <Grid item xs={12} sm={3}>
                    <Button variant="contained" fullWidth startIcon={<PrintIcon />} sx={{ textTransform: "none", height: "100%" }} onClick={handlePrintRentas}>
                      Imprimir
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button variant="outlined" fullWidth startIcon={<FileDownloadIcon />} sx={{ textTransform: "none", height: "100%" }} onClick={handleExportRentas}>
                      Exportar a Excel
                    </Button>
                  </Grid>
                </>
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
                <Autocomplete
                  size="small"
                  options={employees}
                  getOptionLabel={(o) => o.full_name || ""}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  value={prestacionesEmployee}
                  onChange={(_, v) => setPrestacionesEmployee(v)}
                  renderInput={(params) => <TextField {...params} label="Empleado (todos si vacío)" />}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button variant="outlined" fullWidth sx={{ textTransform: "none", height: "100%" }} disabled={loadingPrestaciones} onClick={fetchPrestaciones}>
                  {loadingPrestaciones ? "Generando..." : "Generar reporte"}
                </Button>
              </Grid>
              {prestacionesData && (
                <>
                  <Grid item xs={12} sm={3}>
                    <Button variant="contained" fullWidth startIcon={<PrintIcon />} sx={{ textTransform: "none", height: "100%" }} onClick={handlePrintPrestaciones}>
                      Imprimir
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button variant="outlined" fullWidth startIcon={<FileDownloadIcon />} sx={{ textTransform: "none", height: "100%" }} onClick={handleExportPrestaciones}>
                      Exportar a Excel
                    </Button>
                  </Grid>
                </>
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

        {tab === 2 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Listado de todas las líneas de deducciones o de ingresos aplicadas en planillas aprobadas. Ambos filtros son opcionales e independientes: puede usar solo fecha, solo tipo, ambos, o ninguno para ver el historial completo.
            </Alert>
            <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
              <Grid item xs={12} sm={3}>
                <RadioGroup row value={diType} onChange={(e) => handleDiTypeChange(e.target.value)}>
                  <FormControlLabel value="DEDUCCION" control={<Radio size="small" />} label="Deducciones" />
                  <FormControlLabel value="INGRESO" control={<Radio size="small" />} label="Ingresos" />
                </RadioGroup>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  select fullWidth size="small" label="Tipo específico (opcional)"
                  value={diConceptId} onChange={(e) => setDiConceptId(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {diConcepts.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Autocomplete
                  size="small"
                  options={employees}
                  getOptionLabel={(o) => o.full_name || ""}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  value={diEmployee}
                  onChange={(_, v) => setDiEmployee(v)}
                  renderInput={(params) => <TextField {...params} label="Empleado (todos si vacío)" />}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth size="small" type="date" label="Desde (opcional)" InputLabelProps={{ shrink: true }}
                  value={diStartDate} onChange={(e) => setDiStartDate(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth size="small" type="date" label="Hasta (opcional)" InputLabelProps={{ shrink: true }}
                  value={diEndDate} onChange={(e) => setDiEndDate(e.target.value)}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={3}>
                <Button variant="outlined" fullWidth sx={{ textTransform: "none", height: "100%" }} disabled={loadingDi} onClick={fetchDi}>
                  {loadingDi ? "Generando..." : "Generar reporte"}
                </Button>
              </Grid>
              {diData && (
                <>
                  <Grid item xs={12} sm={3}>
                    <Button variant="contained" fullWidth startIcon={<PrintIcon />} sx={{ textTransform: "none", height: "100%" }} onClick={handlePrintDi}>
                      Imprimir
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button variant="outlined" fullWidth startIcon={<FileDownloadIcon />} sx={{ textTransform: "none", height: "100%" }} onClick={handleExportDi}>
                      Exportar a Excel
                    </Button>
                  </Grid>
                </>
              )}
            </Grid>

            {diData && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha de pago</TableCell>
                    <TableCell>Comprobante</TableCell>
                    <TableCell>Empleado</TableCell>
                    <TableCell>Cédula</TableCell>
                    <TableCell>Concepto</TableCell>
                    <TableCell>Detalle</TableCell>
                    <TableCell align="right">Monto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {diData.lines.length === 0 && (
                    <TableRow><TableCell colSpan={7}><Typography variant="body2" color="text.secondary">Sin registros con estos filtros.</Typography></TableCell></TableRow>
                  )}
                  {diData.lines.map((l, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{l.pay_date ? new Date(l.pay_date).toLocaleDateString("es-NI") : "-"}</TableCell>
                      <TableCell>{l.entry_no || "-"}</TableCell>
                      <TableCell>{l.employee_name}</TableCell>
                      <TableCell>{l.id_card || "-"}</TableCell>
                      <TableCell>{l.concept_name}</TableCell>
                      <TableCell>{l.detail || ""}</TableCell>
                      <TableCell align="right">C$ {money(l.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {diData.lines.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={6}><strong>Total</strong></TableCell>
                      <TableCell align="right"><strong>C$ {money(diData.total)}</strong></TableCell>
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
