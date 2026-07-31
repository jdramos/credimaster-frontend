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
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  Stack,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import PaidIcon from "@mui/icons-material/Paid";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import BlockIcon from "@mui/icons-material/Block";
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { printColillaDePagoReport } from "../../reports/printColillaDePagoReport";
import { printPlanillaReport } from "../../reports/printPlanillaReport";

const API_URL = "/api/hr/payroll-runs";

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const emptyRunForm = {
  period_start: "",
  period_end: "",
  pay_date: new Date().toISOString().slice(0, 10),
  period_type: "MENSUAL",
  branch_id: "",
};

const emptyManualItem = { employee: null, concept: null, amount: "", detail: "" };

export default function PayrollRunsList() {
  const { tenant } = useAuth();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [manualConcepts, setManualConcepts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [runForm, setRunForm] = useState(emptyRunForm);
  const [manualItems, setManualItems] = useState([]);
  const [manualItemDraft, setManualItemDraft] = useState(emptyManualItem);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar planillas", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    API.get("/api/branches").then(({ data }) => setBranches(Array.isArray(data) ? data : [])).catch(() => {});
    API.get("/api/hr/employees?status=ACTIVO").then((res) => setEmployees(res.data?.data || [])).catch(() => {});
    API.get("/api/hr/concepts").then((res) => {
      const list = res.data?.data || [];
      setManualConcepts(list.filter((c) => c.calc_method === "MANUAL" && c.status === "ACTIVO" && c.code !== "PRESTAMO_EMPLEADO"));
    }).catch(() => {});
  }, []);

  const handleOpenGenerate = () => {
    setRunForm(emptyRunForm);
    setManualItems([]);
    setManualItemDraft(emptyManualItem);
    setPreview(null);
    setGenDialogOpen(true);
  };

  const buildPayload = () => ({
    period_start: runForm.period_start,
    period_end: runForm.period_end,
    pay_date: runForm.pay_date,
    period_type: runForm.period_type,
    branch_id: runForm.branch_id || null,
    manual_items: manualItems.map((m) => ({
      employee_id: m.employee.id,
      concept_code: m.concept.code,
      amount: Number(m.amount),
      detail: m.detail || null,
    })),
  });

  const handlePreview = async () => {
    if (!runForm.period_start || !runForm.period_end || !runForm.pay_date) {
      showAlert("Complete el período y la fecha de pago", "error");
      return;
    }
    try {
      setPreviewing(true);
      const res = await API.post(`${API_URL}/preview`, buildPayload());
      setPreview(res.data?.data || null);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al calcular la planilla", "error");
    } finally {
      setPreviewing(false);
    }
  };

  const addManualItem = () => {
    if (!manualItemDraft.employee || !manualItemDraft.concept || !manualItemDraft.amount) {
      showAlert("Complete empleado, concepto y monto", "error");
      return;
    }
    setManualItems((rows2) => [...rows2, manualItemDraft]);
    setManualItemDraft(emptyManualItem);
    setPreview(null);
  };

  const removeManualItem = (index) => {
    setManualItems((rows2) => rows2.filter((_, i) => i !== index));
    setPreview(null);
  };

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      const res = await API.post(API_URL, buildPayload());
      showAlert(res.data?.message || "Planilla generada correctamente");
      setGenDialogOpen(false);
      fetchRuns();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al generar la planilla", "error");
    } finally {
      setConfirming(false);
    }
  };

  // Deriva salario mensual/quincenal e INSS/IR/otras deducciones por
  // separado a partir de item.concepts — la API ya trae el desglose
  // completo por concepto, aquí solo se reagrupa para las columnas.
  const augmentItem = (item) => {
    const concepts = item.concepts || [];
    const inss = concepts.filter((c) => c.code === "INSS_LABORAL").reduce((s, c) => s + Number(c.amount), 0);
    const ir = concepts.filter((c) => c.code === "IR").reduce((s, c) => s + Number(c.amount), 0);
    const otrasDeducciones = concepts
      .filter((c) => c.type === "DEDUCCION" && c.code !== "INSS_LABORAL" && c.code !== "IR")
      .reduce((s, c) => s + Number(c.amount), 0);

    return {
      ...item,
      salario_mensual: Number(item.base_salary || 0),
      salario_quincenal: Number(item.base_salary || 0) / 2,
      inss_monto: inss,
      ir_monto: ir,
      otras_deducciones_monto: otrasDeducciones,
    };
  };

  const openDetail = async (row) => {
    try {
      const res = await API.get(`${API_URL}/${row.id}`);
      const data = res.data?.data || null;
      if (data) data.items = data.items.map(augmentItem);
      setDetail(data);
      setDetailOpen(true);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al obtener el detalle de la planilla", "error");
    }
  };

  const handleVoid = async (row) => {
    const reason = window.prompt(`Indique el motivo de anulación de la planilla #${row.id}:`);
    if (reason === null) return;
    try {
      await API.put(`${API_URL}/${row.id}/void`, { void_reason: reason });
      showAlert("Planilla anulada correctamente");
      fetchRuns();
      setDetailOpen(false);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al anular la planilla", "error");
    }
  };

  const handlePrintColilla = async (runId, employeeId) => {
    try {
      const res = await API.get(`${API_URL}/${runId}/payslip/${employeeId}`);
      const { run, item, concepts } = res.data?.data || {};
      printColillaDePagoReport({ company: tenant, user: currentUser, run, item, concepts });
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al generar la colilla", "error");
    }
  };

  const handlePrintPlanilla = () => {
    if (!detail) return;
    printPlanillaReport({ company: tenant, user: currentUser, run: detail.run, items: detail.items });
  };

  const columns = useMemo(() => [
    { field: "id", headerName: "#", width: 70 },
    { field: "period_start", headerName: "Período desde", width: 120, renderCell: (p) => String(p.value).slice(0, 10) },
    { field: "period_end", headerName: "Período hasta", width: 120, renderCell: (p) => String(p.value).slice(0, 10) },
    { field: "pay_date", headerName: "Fecha de pago", width: 120, renderCell: (p) => String(p.value).slice(0, 10) },
    { field: "branch_name", headerName: "Sucursal", width: 150, renderCell: (p) => p.value || "Todas" },
    { field: "employee_count", headerName: "Empleados", width: 100 },
    { field: "total_net", headerName: "Total neto", width: 130, renderCell: (p) => `C$ ${money(p.value)}` },
    {
      field: "status",
      headerName: "Estado",
      width: 190,
      renderCell: (p) => {
        const STATUS_META = {
          APROBADA: { color: "success", label: "Aprobada" },
          ANULADA: { color: "default", label: "Anulada" },
          RECHAZADA: { color: "error", label: "Rechazada" },
          PENDIENTE_APROBACION: { color: "warning", label: "Pendiente de aprobación" },
          BORRADOR: { color: "warning", label: "Borrador" },
        };
        const meta = STATUS_META[p.value] || { color: "default", label: p.value };
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Chip size="small" color={meta.color} label={meta.label} />
            {p.value === "PENDIENTE_APROBACION" && Number(p.row.approvers_total) > 0 && (
              <Typography variant="caption" color="text.secondary">
                {p.row.approvers_approved}/{p.row.approvers_total}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Ver detalle">
            <IconButton size="small" onClick={() => openDetail(params.row)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.status === "APROBADA" && (
            <Tooltip title="Anular">
              <IconButton size="small" color="error" onClick={() => handleVoid(params.row)}>
                <BlockIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ], []);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PaidIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Planillas</Typography>
              <Typography variant="body2" color="text.secondary">
                Generación y control de corridas de nómina
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenGenerate}>
              Generar planilla
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchRuns}>
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

      {/* Diálogo: generar planilla */}
      <Dialog open={genDialogOpen} onClose={() => setGenDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Generar planilla</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth size="small" type="date" label="Período desde" InputLabelProps={{ shrink: true }}
                value={runForm.period_start}
                onChange={(e) => { setRunForm((f) => ({ ...f, period_start: e.target.value })); setPreview(null); }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth size="small" type="date" label="Período hasta" InputLabelProps={{ shrink: true }}
                value={runForm.period_end}
                onChange={(e) => { setRunForm((f) => ({ ...f, period_end: e.target.value })); setPreview(null); }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth size="small" type="date" label="Fecha de pago" InputLabelProps={{ shrink: true }}
                value={runForm.pay_date}
                onChange={(e) => { setRunForm((f) => ({ ...f, pay_date: e.target.value })); setPreview(null); }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                select fullWidth size="small" label="Tipo de período"
                value={runForm.period_type}
                onChange={(e) => { setRunForm((f) => ({ ...f, period_type: e.target.value })); setPreview(null); }}
              >
                <MenuItem value="MENSUAL">Mensual</MenuItem>
                <MenuItem value="QUINCENAL">Quincenal</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select fullWidth size="small" label="Sucursal (opcional)"
                value={runForm.branch_id}
                onChange={(e) => { setRunForm((f) => ({ ...f, branch_id: e.target.value })); setPreview(null); }}
              >
                <MenuItem value="">Todas las sucursales</MenuItem>
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Conceptos manuales (opcional) — horas extra, otros ingresos, otras deducciones
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Autocomplete
                size="small"
                options={employees}
                value={manualItemDraft.employee}
                getOptionLabel={(o) => o.full_name || ""}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setManualItemDraft((f) => ({ ...f, employee: value }))}
                renderInput={(params) => <TextField {...params} label="Empleado" />}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Autocomplete
                size="small"
                options={manualConcepts}
                value={manualItemDraft.concept}
                getOptionLabel={(o) => o.name || ""}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setManualItemDraft((f) => ({ ...f, concept: value }))}
                renderInput={(params) => <TextField {...params} label="Concepto" />}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField
                fullWidth size="small" type="number" label="Monto"
                value={manualItemDraft.amount}
                onChange={(e) => setManualItemDraft((f) => ({ ...f, amount: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField
                fullWidth size="small" label="Detalle (opcional)"
                value={manualItemDraft.detail}
                onChange={(e) => setManualItemDraft((f) => ({ ...f, detail: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={1}>
              <Button fullWidth sx={{ textTransform: "none", height: "100%" }} onClick={addManualItem}>Agregar</Button>
            </Grid>

            {manualItems.length > 0 && (
              <Grid item xs={12}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Empleado</TableCell>
                      <TableCell>Concepto</TableCell>
                      <TableCell>Monto</TableCell>
                      <TableCell>Detalle</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {manualItems.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell>{m.employee.full_name}</TableCell>
                        <TableCell>{m.concept.name}</TableCell>
                        <TableCell>C$ {money(m.amount)}</TableCell>
                        <TableCell>{m.detail || "-"}</TableCell>
                        <TableCell>
                          <Button size="small" color="error" sx={{ textTransform: "none" }} onClick={() => removeManualItem(i)}>Quitar</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Grid>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Button variant="outlined" sx={{ textTransform: "none" }} disabled={previewing} onClick={handlePreview}>
                {previewing ? "Calculando..." : "Calcular vista previa"}
              </Button>
            </Grid>

            {preview && (
              <Grid item xs={12}>
                <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                  <Chip label={`${preview.employee_count} empleados`} />
                  <Chip color="primary" label={`Total neto: C$ ${money(preview.total_net)}`} />
                </Stack>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Empleado</TableCell>
                      <TableCell>Ingresos</TableCell>
                      <TableCell>Deducciones</TableCell>
                      <TableCell>Neto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.items.map((i) => (
                      <TableRow key={i.employee_id}>
                        <TableCell>{i.employee_name}</TableCell>
                        <TableCell>C$ {money(i.total_income)}</TableCell>
                        <TableCell>C$ {money(i.total_deductions)}</TableCell>
                        <TableCell>C$ {money(i.net_pay)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!preview || confirming}
            sx={{ textTransform: "none" }}
            onClick={handleConfirm}
          >
            {confirming ? "Generando..." : "Confirmar y generar planilla"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo: detalle de una planilla */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle>
          Planilla #{detail?.run?.id} — {detail?.run?.status}
        </DialogTitle>
        <DialogContent>
          {detail && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {String(detail.run.period_start).slice(0, 10)} al {String(detail.run.period_end).slice(0, 10)} · Comprobante: {detail.run.entry_no || "-"}
              </Typography>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Empleado</TableCell>
                      <TableCell>Cédula</TableCell>
                      <TableCell>N° INSS</TableCell>
                      <TableCell>Banco</TableCell>
                      <TableCell>Cuenta bancaria</TableCell>
                      <TableCell align="right">Salario mensual</TableCell>
                      <TableCell align="right">Salario quincenal</TableCell>
                      <TableCell align="right">INSS (retención)</TableCell>
                      <TableCell align="right">IR</TableCell>
                      <TableCell align="right">Otras deducciones</TableCell>
                      <TableCell align="right">Salario neto</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>{i.employee_name}</TableCell>
                        <TableCell>{i.id_card || "-"}</TableCell>
                        <TableCell>{i.inss_number || "-"}</TableCell>
                        <TableCell>{i.bank_name || "-"}</TableCell>
                        <TableCell>{i.bank_account_number || "-"}</TableCell>
                        <TableCell align="right">C$ {money(i.salario_mensual)}</TableCell>
                        <TableCell align="right">C$ {money(i.salario_quincenal)}</TableCell>
                        <TableCell align="right">C$ {money(i.inss_monto)}</TableCell>
                        <TableCell align="right">C$ {money(i.ir_monto)}</TableCell>
                        <TableCell align="right">C$ {money(i.otras_deducciones_monto)}</TableCell>
                        <TableCell align="right">C$ {money(i.net_pay)}</TableCell>
                        <TableCell>
                          <Button size="small" startIcon={<PrintIcon />} sx={{ textTransform: "none" }} onClick={() => handlePrintColilla(detail.run.id, i.employee_id)}>
                            Colilla
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button startIcon={<PrintIcon />} sx={{ textTransform: "none" }} onClick={handlePrintPlanilla}>
            Imprimir planilla completa
          </Button>
          {detail?.run?.status === "APROBADA" && (
            <Button color="error" startIcon={<BlockIcon />} sx={{ textTransform: "none" }} onClick={() => handleVoid(detail.run)}>
              Anular
            </Button>
          )}
          <Button onClick={() => setDetailOpen(false)} sx={{ textTransform: "none" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
