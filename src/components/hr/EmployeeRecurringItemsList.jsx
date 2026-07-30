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
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Autocomplete,
  LinearProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import BlockIcon from "@mui/icons-material/Block";
import EditIcon from "@mui/icons-material/Edit";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";

const API_URL = "/api/hr/recurring-items";

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFmt = (value) => (value ? String(value).slice(0, 10) : "-");

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  employee: null, concept: null, schedule_type: "CUOTAS",
  principal: "", num_installments: "", installment_amount: "",
  description: "", start_date: todayStr(), end_date: "",
});

const emptyEditForm = { description: "", start_date: "", end_date: "", principal: "", num_installments: "", installment_amount: "" };

// Pantalla parametrizada por kind — sirve tanto para Deducciones como para
// Ingresos, generalizando lo que antes era solo "Préstamos de Empleados"
// (hardcodeado al concepto PRESTAMO_EMPLEADO, sin poder crear otros
// tipos recurrentes ni de ingreso ni de deducción). Ver diseño en
// db/migrations/20260731_01_create_hr_employee_recurring_items.js.
export default function EmployeeRecurringItemsList({ kind }) {
  const { role, permissions = [] } = useContext(UserContext) || {};
  const canManage = role === 1 || permissions.includes("rrhh.deducciones.gestionar");
  const canManageConcepts = role === 1 || permissions.includes("rrhh.configuracion.gestionar");

  const isIncome = kind === "INGRESO";
  const label = isIncome ? "Ingreso" : "Deducción";
  const labelPlural = isIncome ? "Ingresos" : "Deducciones";
  const newLabelPrefix = isIncome ? "Nuevo" : "Nueva";

  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editSaving, setEditSaving] = useState(false);

  const [statementRow, setStatementRow] = useState(null);
  const [statementData, setStatementData] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchRows = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL, { params: { type: kind } });
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || `Error al cargar ${labelPlural.toLowerCase()}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchConcepts = async () => {
    try {
      const res = await API.get("/api/hr/concepts");
      setConcepts((res.data?.data || []).filter((c) => c.type === kind && c.status === "ACTIVO"));
    } catch { /* silencioso — el selector queda vacío */ }
  };

  useEffect(() => {
    fetchRows();
    fetchConcepts();
    API.get("/api/hr/employees?status=ACTIVO").then((res) => setEmployees(res.data?.data || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const handleOpenCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleQuickAddSave = async () => {
    if (!quickAddName.trim()) {
      showAlert("Escriba un nombre para el nuevo tipo", "error");
      return;
    }
    const code = quickAddName.trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    try {
      setQuickAddSaving(true);
      const res = await API.post("/api/hr/concepts", { code, name: quickAddName.trim(), type: kind, calc_method: "MANUAL" });
      await fetchConcepts();
      const newConcept = { id: res.data?.data?.id, code, name: quickAddName.trim(), type: kind };
      setForm((f) => ({ ...f, concept: newConcept }));
      setQuickAddOpen(false);
      setQuickAddName("");
      showAlert("Tipo creado correctamente");
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al crear el tipo", "error");
    } finally {
      setQuickAddSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.employee || !form.concept) {
      showAlert("Complete empleado y tipo", "error");
      return;
    }
    if (!form.start_date) {
      showAlert("Indique a partir de cuándo queda vigente", "error");
      return;
    }
    if (form.schedule_type === "CUOTAS" && (!form.principal || !form.num_installments)) {
      showAlert("Complete el monto total y el número de cuotas", "error");
      return;
    }
    if (form.schedule_type === "FIJO" && !form.installment_amount) {
      showAlert("Complete el monto fijo por período", "error");
      return;
    }
    try {
      setSaving(true);
      await API.post(API_URL, {
        employee_id: form.employee.id,
        concept_id: form.concept.id,
        schedule_type: form.schedule_type,
        principal: form.schedule_type === "CUOTAS" ? Number(form.principal) : undefined,
        num_installments: form.schedule_type === "CUOTAS" ? Number(form.num_installments) : undefined,
        installment_amount: form.schedule_type === "FIJO" ? Number(form.installment_amount) : undefined,
        description: form.description || null,
        start_date: form.start_date,
        end_date: form.schedule_type === "FIJO" ? (form.end_date || null) : null,
      });
      showAlert(`${label} registrado(a) correctamente`);
      setDialogOpen(false);
      fetchRows();
    } catch (error) {
      showAlert(error.response?.data?.message || `Error al registrar ${label.toLowerCase()}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (row) => {
    setEditRow(row);
    setEditForm({
      description: row.description || "",
      start_date: row.start_date ? String(row.start_date).slice(0, 10) : todayStr(),
      end_date: row.end_date ? String(row.end_date).slice(0, 10) : "",
      principal: row.principal ?? "",
      num_installments: row.num_installments ?? "",
      installment_amount: row.installment_amount ?? "",
    });
  };

  const handleEditSave = async () => {
    try {
      setEditSaving(true);
      const payload = { description: editForm.description || null, end_date: editForm.end_date || null };
      if (editRow.paid_installments === 0) {
        payload.start_date = editForm.start_date;
        if (editRow.schedule_type === "CUOTAS") {
          payload.principal = Number(editForm.principal);
          payload.num_installments = Number(editForm.num_installments);
        } else {
          payload.installment_amount = Number(editForm.installment_amount);
        }
      }
      await API.put(`${API_URL}/${editRow.id}`, payload);
      showAlert("Actualizado correctamente");
      setEditRow(null);
      fetchRows();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al actualizar", "error");
    } finally {
      setEditSaving(false);
    }
  };

  const handleVoid = async (row) => {
    const confirmed = window.confirm(`¿Confirma anular ${label.toLowerCase()} de "${row.employee_name}"?`);
    if (!confirmed) return;
    try {
      await API.put(`${API_URL}/${row.id}/void`);
      showAlert("Anulado correctamente");
      fetchRows();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al anular", "error");
    }
  };

  const handleOpenStatement = async (row) => {
    setStatementRow(row);
    setStatementData(null);
    try {
      setStatementLoading(true);
      const res = await API.get(`${API_URL}/${row.id}/statement`);
      setStatementData(res.data?.data);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al obtener el estado de cuenta", "error");
    } finally {
      setStatementLoading(false);
    }
  };

  const columns = useMemo(() => [
    { field: "employee_name", headerName: "Empleado", flex: 1, minWidth: 160 },
    { field: "concept_name", headerName: "Tipo", flex: 1, minWidth: 150 },
    { field: "description", headerName: "Descripción", flex: 1, minWidth: 150, renderCell: (p) => p.value || "-" },
    {
      field: "schedule_type",
      headerName: "Modalidad",
      width: 100,
      renderCell: (p) => <Chip size="small" variant="outlined" label={p.value === "CUOTAS" ? "Cuotas" : "Fijo"} />,
    },
    { field: "installment_amount", headerName: "Monto", width: 120, renderCell: (p) => `C$ ${money(p.value)}` },
    { field: "start_date", headerName: "Vigente desde", width: 120, renderCell: (p) => dateFmt(p.value) },
    {
      field: "progress",
      headerName: "Avance",
      width: 150,
      sortable: false,
      renderCell: (p) => (p.row.schedule_type === "CUOTAS" ? (
        <Box sx={{ width: "100%" }}>
          <LinearProgress variant="determinate" value={(p.row.paid_installments / p.row.num_installments) * 100} sx={{ height: 8, borderRadius: 4 }} />
          <Typography variant="caption" color="text.secondary">{p.row.paid_installments} de {p.row.num_installments}</Typography>
        </Box>
      ) : "—"),
    },
    { field: "balance", headerName: "Saldo", width: 110, renderCell: (p) => (p.row.schedule_type === "CUOTAS" ? `C$ ${money(p.value)}` : "—") },
    {
      field: "status",
      headerName: "Estado",
      width: 110,
      renderCell: (p) => {
        const color = p.value === "ACTIVO" ? "warning" : p.value === "FINALIZADO" ? "success" : "default";
        const text = p.value === "ACTIVO" ? "Activo" : p.value === "FINALIZADO" ? "Finalizado" : "Anulado";
        return <Chip size="small" color={color} label={text} />;
      },
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {canManage && params.row.status === "ACTIVO" && (
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => handleOpenEdit(params.row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canManage && params.row.status === "ACTIVO" && params.row.paid_installments === 0 && (
            <Tooltip title="Anular">
              <IconButton size="small" color="error" onClick={() => handleVoid(params.row)}>
                <BlockIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Estado de cuenta">
            <IconButton size="small" onClick={() => handleOpenStatement(params.row)}>
              <ReceiptLongIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [canManage]);

  const estimatedCuota = form.principal && form.num_installments > 0
    ? Number(form.principal) / Number(form.num_installments)
    : null;

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isIncome ? <TrendingUpIcon sx={{ color: "#0057B8" }} /> : <RequestQuoteIcon sx={{ color: "#0057B8" }} />}
            <Box>
              <Typography variant="h6" fontWeight={700}>{labelPlural}</Typography>
              <Typography variant="body2" color="text.secondary">
                {isIncome ? "Ingresos fijos recurrentes aplicados por planilla" : "Deducciones recurrentes aplicadas por planilla"}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            {canManage && (
              <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenCreate}>
                {newLabelPrefix} {label.toLowerCase()}
              </Button>
            )}
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchRows}>
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

      {/* Crear */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{newLabelPrefix} {label.toLowerCase()}</DialogTitle>
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
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <Autocomplete
                  size="small"
                  fullWidth
                  options={concepts}
                  value={form.concept}
                  getOptionLabel={(o) => o.name || ""}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  onChange={(_, value) => setForm((f) => ({ ...f, concept: value }))}
                  renderInput={(params) => <TextField {...params} label="Tipo" />}
                />
                {canManageConcepts && (
                  <Tooltip title="Agregar nuevo tipo">
                    <IconButton size="small" onClick={() => setQuickAddOpen(true)} sx={{ mt: 0.5 }}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <RadioGroup
                row
                value={form.schedule_type}
                onChange={(e) => setForm((f) => ({ ...f, schedule_type: e.target.value }))}
              >
                <FormControlLabel value="CUOTAS" control={<Radio size="small" />} label="Por cuotas" />
                <FormControlLabel value="FIJO" control={<Radio size="small" />} label="Monto fijo recurrente" />
              </RadioGroup>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" type="date" label="Vigente desde" required InputLabelProps={{ shrink: true }}
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                helperText="No puede ser un período ya incluido en una planilla generada"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Descripción (opcional)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Grid>

            {form.schedule_type === "CUOTAS" ? (
              <>
                <Grid item xs={6}>
                  <TextField
                    fullWidth size="small" type="number" label="Monto total (C$)"
                    value={form.principal}
                    onChange={(e) => setForm((f) => ({ ...f, principal: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth size="small" type="number" label="Número de cuotas"
                    value={form.num_installments}
                    onChange={(e) => setForm((f) => ({ ...f, num_installments: e.target.value }))}
                  />
                </Grid>
                {estimatedCuota !== null && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Cuota estimada: C$ {money(estimatedCuota)}
                    </Typography>
                  </Grid>
                )}
              </>
            ) : (
              <>
                <Grid item xs={6}>
                  <TextField
                    fullWidth size="small" type="number" label="Monto fijo por período (C$)"
                    value={form.installment_amount}
                    onChange={(e) => setForm((f) => ({ ...f, installment_amount: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth size="small" type="date" label="Fecha fin (opcional)" InputLabelProps={{ shrink: true }}
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : "Registrar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick-add de tipo */}
      <Dialog open={quickAddOpen} onClose={() => setQuickAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nuevo tipo de {label.toLowerCase()}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth size="small" label="Nombre" sx={{ mt: 1 }} autoFocus
            value={quickAddName}
            onChange={(e) => setQuickAddName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickAddOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleQuickAddSave} disabled={quickAddSaving} sx={{ textTransform: "none" }}>
            {quickAddSaving ? "Guardando..." : "Crear tipo"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Editar */}
      <Dialog open={!!editRow} onClose={() => setEditRow(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar {label.toLowerCase()}</DialogTitle>
        <DialogContent>
          {editRow && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  {editRow.employee_name} — {editRow.concept_name}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth size="small" label="Descripción"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth size="small" type="date" label="Vigente desde" InputLabelProps={{ shrink: true }}
                  value={editForm.start_date}
                  disabled={editRow.paid_installments > 0}
                  onChange={(e) => setEditForm((f) => ({ ...f, start_date: e.target.value }))}
                  helperText={editRow.paid_installments > 0 ? "Ya tiene cuotas aplicadas — no se puede cambiar" : "No puede ser un período ya incluido en una planilla generada"}
                />
              </Grid>
              {editRow.schedule_type === "FIJO" && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth size="small" type="date" label="Fecha fin (opcional)" InputLabelProps={{ shrink: true }}
                    value={editForm.end_date}
                    onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value }))}
                  />
                </Grid>
              )}
              {editRow.paid_installments > 0 ? (
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ fontSize: 13 }}>
                    Ya tiene cuotas aplicadas en planilla — el monto no se puede modificar.
                  </Alert>
                </Grid>
              ) : editRow.schedule_type === "CUOTAS" ? (
                <>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth size="small" type="number" label="Monto total (C$)"
                      value={editForm.principal}
                      onChange={(e) => setEditForm((f) => ({ ...f, principal: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth size="small" type="number" label="Número de cuotas"
                      value={editForm.num_installments}
                      onChange={(e) => setEditForm((f) => ({ ...f, num_installments: e.target.value }))}
                    />
                  </Grid>
                </>
              ) : (
                <Grid item xs={12}>
                  <TextField
                    fullWidth size="small" type="number" label="Monto fijo por período (C$)"
                    value={editForm.installment_amount}
                    onChange={(e) => setEditForm((f) => ({ ...f, installment_amount: e.target.value }))}
                  />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRow(null)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={editSaving} sx={{ textTransform: "none" }}>
            {editSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Estado de cuenta */}
      <Dialog open={!!statementRow} onClose={() => setStatementRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Estado de cuenta — {statementRow?.employee_name}</DialogTitle>
        <DialogContent>
          {statementLoading ? (
            <LinearProgress />
          ) : statementData ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {statementData.item.concept_name} · {statementData.item.schedule_type === "CUOTAS" ? "Por cuotas" : "Monto fijo"}
                {statementData.item.schedule_type === "CUOTAS" && ` · Saldo actual: C$ ${money(statementData.item.balance)}`}
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700 } }}>
                    <TableCell>Fecha de pago</TableCell>
                    <TableCell>Comprobante</TableCell>
                    <TableCell>Detalle</TableCell>
                    <TableCell align="right">Monto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statementData.applications.map((a, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{dateFmt(a.pay_date)}</TableCell>
                      <TableCell>{a.entry_no || "-"}</TableCell>
                      <TableCell>{a.detail || "-"}</TableCell>
                      <TableCell align="right">C$ {money(a.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!statementData.applications.length && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                  Aún no se ha aplicado en ninguna planilla.
                </Typography>
              )}
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatementRow(null)} sx={{ textTransform: "none" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
