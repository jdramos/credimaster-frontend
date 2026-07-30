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
  Menu,
  Divider,
  Autocomplete,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import BadgeIcon from "@mui/icons-material/Badge";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import HistoryIcon from "@mui/icons-material/History";
import GroupsIcon from "@mui/icons-material/Groups";
import DescriptionIcon from "@mui/icons-material/Description";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import EmployeeHistoryDialog from "./EmployeeHistoryDialog";
import EmployeeBeneficiariesDialog from "./EmployeeBeneficiariesDialog";
import { printEmployeeContractReport } from "../../reports/printEmployeeContractReport";
import { printWorkCertificateReport } from "../../reports/printWorkCertificateReport";

const API_URL = "/api/hr/employees";

const MOTIVO_OPTIONS = [
  { value: "RENUNCIA", label: "Renuncia voluntaria" },
  { value: "DESPIDO_JUSTIFICADO", label: "Despido con causa justificada" },
  { value: "DESPIDO_INJUSTIFICADO", label: "Despido sin causa justificada" },
  { value: "MUTUO_ACUERDO", label: "Mutuo acuerdo" },
];

const emptyForm = {
  full_name: "",
  id_card: "",
  position: "",
  hire_date: new Date().toISOString().slice(0, 10),
  base_salary: "",
  branch_id: "",
  supervisor: null,
  user: null,
  contract_type: "INDEFINIDO",
  contract_end_date: "",

  birth_date: "",
  gender: "",
  marital_status: "",
  nationality: "Nicaragüense",
  address: "",
  phone: "",
  personal_email: "",
  education_level: "",
  inss_number: "",
  bank_name: "",
  bank_account_number: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relationship: "",
};

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function EmployeesList() {
  const { tenant } = useAuth();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [beneficiariesOpen, setBeneficiariesOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateForm, setDeactivateForm] = useState({ termination_date: "", motivo: "", comment: "" });
  const [deactivateSaving, setDeactivateSaving] = useState(false);

  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [reactivateForm, setReactivateForm] = useState({ entry_date: "", comment: "" });
  const [reactivateSaving, setReactivateSaving] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar empleados", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    API.get("/api/branches").then(({ data }) => setBranches(Array.isArray(data) ? data : [])).catch(() => {});
    API.get("/api/users").then(({ data }) => setUsers(Array.isArray(data) ? data : data?.data || [])).catch(() => {});
  }, []);

  const activeEmployees = useMemo(() => rows.filter((r) => r.status === "ACTIVO"), [rows]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (row) => {
    setEditingId(row.id);
    setForm({
      full_name: row.full_name,
      id_card: row.id_card || "",
      position: row.position || "",
      hire_date: String(row.hire_date).slice(0, 10),
      base_salary: String(row.base_salary),
      branch_id: row.branch_id || "",
      supervisor: row.supervisor_id ? { id: row.supervisor_id, full_name: row.supervisor_name } : null,
      user: row.user_id ? { id: row.user_id, user_name: row.linked_user_name } : null,
      contract_type: row.contract_type || "INDEFINIDO",
      contract_end_date: row.contract_end_date ? String(row.contract_end_date).slice(0, 10) : "",

      birth_date: row.birth_date ? String(row.birth_date).slice(0, 10) : "",
      gender: row.gender || "",
      marital_status: row.marital_status || "",
      nationality: row.nationality || "Nicaragüense",
      address: row.address || "",
      phone: row.phone || "",
      personal_email: row.personal_email || "",
      education_level: row.education_level || "",
      inss_number: row.inss_number || "",
      bank_name: row.bank_name || "",
      bank_account_number: row.bank_account_number || "",
      emergency_contact_name: row.emergency_contact_name || "",
      emergency_contact_phone: row.emergency_contact_phone || "",
      emergency_contact_relationship: row.emergency_contact_relationship || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.hire_date) {
      showAlert("Complete el nombre y la fecha de ingreso", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        full_name: form.full_name,
        id_card: form.id_card || null,
        position: form.position || null,
        hire_date: form.hire_date,
        base_salary: Number(form.base_salary || 0),
        branch_id: form.branch_id || null,
        supervisor_id: form.supervisor?.id || null,
        user_id: form.user?.id || null,
        contract_type: form.contract_type,
        contract_end_date: form.contract_type === "PLAZO_FIJO" ? (form.contract_end_date || null) : null,

        birth_date: form.birth_date || null,
        gender: form.gender || null,
        marital_status: form.marital_status || null,
        nationality: form.nationality || null,
        address: form.address || null,
        phone: form.phone || null,
        personal_email: form.personal_email || null,
        education_level: form.education_level || null,
        inss_number: form.inss_number || null,
        bank_name: form.bank_name || null,
        bank_account_number: form.bank_account_number || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        emergency_contact_relationship: form.emergency_contact_relationship || null,
      };

      if (editingId) {
        await API.put(`${API_URL}/${editingId}`, payload);
        showAlert("Empleado actualizado correctamente");
      } else {
        await API.post(API_URL, payload);
        showAlert("Empleado registrado correctamente");
      }

      setDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al guardar el empleado", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenMenu = (event, row) => {
    setMenuAnchor(event.currentTarget);
    setMenuRow(row);
  };
  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuRow(null);
  };

  const handleOpenHistory = () => {
    setActiveRow(menuRow);
    setHistoryOpen(true);
    handleCloseMenu();
  };
  const handleOpenBeneficiaries = () => {
    setActiveRow(menuRow);
    setBeneficiariesOpen(true);
    handleCloseMenu();
  };
  const handlePrintContract = () => {
    printEmployeeContractReport({ company: tenant, user: currentUser, employee: menuRow });
    handleCloseMenu();
  };
  const handlePrintCertificate = () => {
    printWorkCertificateReport({ company: tenant, user: currentUser, employee: menuRow });
    handleCloseMenu();
  };

  const handleOpenDeactivate = () => {
    setActiveRow(menuRow);
    setDeactivateForm({ termination_date: new Date().toISOString().slice(0, 10), motivo: "", comment: "" });
    setDeactivateOpen(true);
    handleCloseMenu();
  };
  const handleOpenReactivate = () => {
    setActiveRow(menuRow);
    setReactivateForm({ entry_date: new Date().toISOString().slice(0, 10), comment: "" });
    setReactivateOpen(true);
    handleCloseMenu();
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateForm.termination_date || !deactivateForm.motivo || !deactivateForm.comment.trim()) {
      showAlert("Fecha, motivo y comentario son requeridos", "error");
      return;
    }
    try {
      setDeactivateSaving(true);
      await API.post(`${API_URL}/${activeRow.id}/deactivate`, deactivateForm);
      showAlert(`Empleado "${activeRow.full_name}" dado de baja correctamente`);
      setDeactivateOpen(false);
      fetchEmployees();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al dar de baja al empleado", "error");
    } finally {
      setDeactivateSaving(false);
    }
  };

  const handleConfirmReactivate = async () => {
    if (!reactivateForm.entry_date) {
      showAlert("La fecha de reingreso es requerida", "error");
      return;
    }
    try {
      setReactivateSaving(true);
      await API.post(`${API_URL}/${activeRow.id}/reactivate`, reactivateForm);
      showAlert(`Empleado "${activeRow.full_name}" reingresado correctamente`);
      setReactivateOpen(false);
      fetchEmployees();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al reingresar al empleado", "error");
    } finally {
      setReactivateSaving(false);
    }
  };

  const columns = useMemo(() => [
    { field: "full_name", headerName: "Nombre", flex: 1, minWidth: 200 },
    { field: "position", headerName: "Puesto", width: 160, renderCell: (p) => p.value || "-" },
    { field: "branch_name", headerName: "Sucursal", width: 160, renderCell: (p) => p.value || "Sin asignar" },
    { field: "supervisor_name", headerName: "Jefe inmediato", width: 180, renderCell: (p) => p.value || "-" },
    { field: "base_salary", headerName: "Salario base", width: 130, renderCell: (p) => `C$ ${money(p.value)}` },
    {
      field: "status",
      headerName: "Estado",
      width: 110,
      renderCell: (p) => <Chip size="small" color={p.value === "ACTIVO" ? "success" : "default"} label={p.value === "ACTIVO" ? "Activo" : "Inactivo"} />,
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => handleOpenEdit(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Más acciones">
            <IconButton size="small" onClick={(e) => handleOpenMenu(e, params.row)}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BadgeIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Empleados</Typography>
              <Typography variant="body2" color="text.secondary">
                Expediente de personal para nómina
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenCreate}>
              Nuevo empleado
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchEmployees}>
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

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleCloseMenu}>
        <MenuItem onClick={handleOpenHistory}>
          <HistoryIcon fontSize="small" sx={{ mr: 1.2 }} /> Ver historial
        </MenuItem>
        <MenuItem onClick={handleOpenBeneficiaries}>
          <GroupsIcon fontSize="small" sx={{ mr: 1.2 }} /> Beneficiarios
        </MenuItem>
        <MenuItem onClick={handlePrintContract}>
          <DescriptionIcon fontSize="small" sx={{ mr: 1.2 }} /> Imprimir contrato
        </MenuItem>
        <MenuItem onClick={handlePrintCertificate}>
          <BadgeOutlinedIcon fontSize="small" sx={{ mr: 1.2 }} /> Imprimir constancia laboral
        </MenuItem>
        <Divider />
        {menuRow?.status === "ACTIVO" ? (
          <MenuItem onClick={handleOpenDeactivate} sx={{ color: "#B91C1C" }}>
            <PersonOffIcon fontSize="small" sx={{ mr: 1.2 }} /> Dar de baja
          </MenuItem>
        ) : (
          <MenuItem onClick={handleOpenReactivate} sx={{ color: "#0F766E" }}>
            <PersonAddIcon fontSize="small" sx={{ mr: 1.2 }} /> Reingresar
          </MenuItem>
        )}
      </Menu>

      <EmployeeHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        employeeId={activeRow?.id}
        employeeName={activeRow?.full_name}
      />
      <EmployeeBeneficiariesDialog
        open={beneficiariesOpen}
        onClose={() => setBeneficiariesOpen(false)}
        employeeId={activeRow?.id}
        employeeName={activeRow?.full_name}
      />

      <Dialog open={deactivateOpen} onClose={() => setDeactivateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Dar de baja — {activeRow?.full_name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              fullWidth size="small" type="date" label="Fecha de baja" InputLabelProps={{ shrink: true }}
              value={deactivateForm.termination_date}
              onChange={(e) => setDeactivateForm((f) => ({ ...f, termination_date: e.target.value }))}
            />
            <TextField
              select fullWidth size="small" label="Motivo"
              value={deactivateForm.motivo}
              onChange={(e) => setDeactivateForm((f) => ({ ...f, motivo: e.target.value }))}
            >
              {MOTIVO_OPTIONS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>
            <TextField
              fullWidth size="small" multiline minRows={2} label="Comentario"
              value={deactivateForm.comment}
              onChange={(e) => setDeactivateForm((f) => ({ ...f, comment: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDeactivate} disabled={deactivateSaving} sx={{ textTransform: "none" }}>
            {deactivateSaving ? "Guardando..." : "Dar de baja"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reactivateOpen} onClose={() => setReactivateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reingresar — {activeRow?.full_name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              fullWidth size="small" type="date" label="Fecha de reingreso" InputLabelProps={{ shrink: true }}
              value={reactivateForm.entry_date}
              onChange={(e) => setReactivateForm((f) => ({ ...f, entry_date: e.target.value }))}
            />
            <TextField
              fullWidth size="small" multiline minRows={2} label="Comentario (opcional)"
              value={reactivateForm.comment}
              onChange={(e) => setReactivateForm((f) => ({ ...f, comment: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReactivateOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleConfirmReactivate} disabled={reactivateSaving} sx={{ textTransform: "none" }}>
            {reactivateSaving ? "Guardando..." : "Reingresar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingId ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1, mb: 1 }}>Datos generales</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Nombre completo"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Cédula"
                value={form.id_card}
                onChange={(e) => setForm((f) => ({ ...f, id_card: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Puesto"
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="date" label="Fecha de ingreso" InputLabelProps={{ shrink: true }}
                value={form.hire_date}
                onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="number" label="Salario base mensual (C$)"
                value={form.base_salary}
                onChange={(e) => setForm((f) => ({ ...f, base_salary: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select fullWidth size="small" label="Sucursal (opcional)"
                value={form.branch_id}
                onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
              >
                <MenuItem value="">Sin asignar</MenuItem>
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                size="small"
                options={activeEmployees.filter((e) => e.id !== editingId)}
                value={form.supervisor}
                getOptionLabel={(o) => o.full_name || ""}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setForm((f) => ({ ...f, supervisor: value }))}
                renderInput={(params) => <TextField {...params} label="Jefe inmediato (opcional)" />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                size="small"
                options={users}
                value={form.user}
                getOptionLabel={(o) => o.user_name || o.full_name || ""}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setForm((f) => ({ ...f, user: value }))}
                renderInput={(params) => <TextField {...params} label="Usuario del sistema vinculado (opcional)" />}
              />
            </Grid>
            <Grid item xs={12} sm={form.contract_type === "PLAZO_FIJO" ? 6 : 12}>
              <TextField
                select fullWidth size="small" label="Tipo de contrato"
                value={form.contract_type}
                onChange={(e) => setForm((f) => ({ ...f, contract_type: e.target.value }))}
              >
                <MenuItem value="INDEFINIDO">Tiempo indefinido</MenuItem>
                <MenuItem value="PLAZO_FIJO">Plazo fijo</MenuItem>
                <MenuItem value="OBRA_DETERMINADA">Obra o servicio determinado</MenuItem>
              </TextField>
            </Grid>
            {form.contract_type === "PLAZO_FIJO" && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth size="small" type="date" label="Fin del contrato" InputLabelProps={{ shrink: true }}
                  value={form.contract_end_date}
                  onChange={(e) => setForm((f) => ({ ...f, contract_end_date: e.target.value }))}
                />
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Datos personales</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth size="small" type="date" label="Fecha de nacimiento" InputLabelProps={{ shrink: true }}
                value={form.birth_date}
                onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select fullWidth size="small" label="Sexo"
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              >
                <MenuItem value="">Sin especificar</MenuItem>
                <MenuItem value="MASCULINO">Masculino</MenuItem>
                <MenuItem value="FEMENINO">Femenino</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select fullWidth size="small" label="Estado civil"
                value={form.marital_status}
                onChange={(e) => setForm((f) => ({ ...f, marital_status: e.target.value }))}
              >
                <MenuItem value="">Sin especificar</MenuItem>
                <MenuItem value="SOLTERO">Soltero(a)</MenuItem>
                <MenuItem value="CASADO">Casado(a)</MenuItem>
                <MenuItem value="UNION_LIBRE">Unión libre</MenuItem>
                <MenuItem value="DIVORCIADO">Divorciado(a)</MenuItem>
                <MenuItem value="VIUDO">Viudo(a)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth size="small" label="Nacionalidad"
                value={form.nationality}
                onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth size="small" label="Número INSS"
                value={form.inss_number}
                onChange={(e) => setForm((f) => ({ ...f, inss_number: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth size="small" label="Nivel académico"
                value={form.education_level}
                onChange={(e) => setForm((f) => ({ ...f, education_level: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Teléfono"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Correo personal"
                value={form.personal_email}
                onChange={(e) => setForm((f) => ({ ...f, personal_email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Dirección"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Banco (para depósito de salario)"
                value={form.bank_name}
                onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Número de cuenta"
                value={form.bank_account_number}
                onChange={(e) => setForm((f) => ({ ...f, bank_account_number: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth size="small" label="Contacto de emergencia — nombre"
                value={form.emergency_contact_name}
                onChange={(e) => setForm((f) => ({ ...f, emergency_contact_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth size="small" label="Contacto de emergencia — teléfono"
                value={form.emergency_contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, emergency_contact_phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth size="small" label="Contacto de emergencia — parentesco"
                value={form.emergency_contact_relationship}
                onChange={(e) => setForm((f) => ({ ...f, emergency_contact_relationship: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Registrar empleado"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
