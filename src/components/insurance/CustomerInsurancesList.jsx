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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Autocomplete,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import LocalPoliceIcon from "@mui/icons-material/LocalPolice";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import CancelIcon from "@mui/icons-material/Cancel";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";

const API_URL = "/api/insurance";
const PRODUCTS_URL = "/api/insurance/products";

const money = (v) =>
  Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyForm = {
  customer_id: null,
  loan_id: "",
  product_id: null,
  policy_number: "",
  premium_amount: "",
  start_date: dayjs(),
  end_date: null,
  beneficiary_name: "",
  beneficiary_relationship: "",
};

export default function CustomerInsurancesList() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canContract = role === 1 || permissions.includes("seguros.contratar");
  const canCancel = role === 1 || permissions.includes("seguros.anular");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [periodStart, setPeriodStart] = useState(null);
  const [periodEnd, setPeriodEnd] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerLoans, setCustomerLoans] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchInsurances = async () => {
    try {
      setLoading(true);
      const params = {};
      if (periodStart) params.start_date = periodStart.format("YYYY-MM-DD");
      if (periodEnd) params.end_date = periodEnd.format("YYYY-MM-DD");

      const res = await API.get(API_URL, { params });
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar los seguros contratados", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsurances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStart, periodEnd]);

  useEffect(() => {
    API.get("/api/customers", { params: { page: 1, pageSize: 500, sortBy: "customer_name", sortDir: "asc" } })
      .then((res) => {
        const payload = res?.data?.data ?? res?.data;
        setCustomers(payload?.rows ?? []);
      })
      .catch(() => {});

    API.get(PRODUCTS_URL, { params: { status: "ACTIVO" } })
      .then((res) => setProducts(res.data?.data || []))
      .catch(() => {});
  }, []);

  const handleOpenCreate = () => {
    setForm(emptyForm);
    setCustomerLoans([]);
    setDialogOpen(true);
  };

  const handleCustomerChange = async (_, value) => {
    setForm((f) => ({ ...f, customer_id: value, loan_id: "" }));
    setCustomerLoans([]);
    if (!value) return;
    try {
      const res = await API.get(`/api/loans/customer/${value.id}`);
      setCustomerLoans(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setCustomerLoans([]);
    }
  };

  const handleProductChange = (_, value) => {
    setForm((f) => ({
      ...f,
      product_id: value,
      premium_amount:
        value?.premium_type === "FIJO" ? value.premium_value : f.premium_amount,
    }));
  };

  const handleSave = async () => {
    if (!form.customer_id) {
      showAlert("Debe seleccionar un cliente", "error");
      return;
    }
    if (!form.product_id) {
      showAlert("Debe seleccionar un tipo de seguro", "error");
      return;
    }
    if (!form.start_date) {
      showAlert("La fecha de inicio de vigencia es obligatoria", "error");
      return;
    }

    try {
      setSaving(true);
      await API.post(API_URL, {
        customer_id: form.customer_id.id,
        loan_id: form.loan_id || null,
        product_id: form.product_id.id,
        policy_number: form.policy_number || null,
        premium_amount: form.premium_amount === "" ? null : Number(form.premium_amount),
        start_date: form.start_date.format("YYYY-MM-DD"),
        end_date: form.end_date ? form.end_date.format("YYYY-MM-DD") : null,
        beneficiary_name: form.beneficiary_name || null,
        beneficiary_relationship: form.beneficiary_relationship || null,
      });

      showAlert("Seguro contratado correctamente");
      setDialogOpen(false);
      fetchInsurances();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al registrar el seguro contratado", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      setCancelling(true);
      await API.put(`${API_URL}/${cancelTarget.id}/cancel`, { reason: cancelReason || null });
      showAlert("Seguro cancelado correctamente");
      setCancelTarget(null);
      setCancelReason("");
      fetchInsurances();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cancelar el seguro", "error");
    } finally {
      setCancelling(false);
    }
  };

  const totalPremiums = rows.reduce((sum, r) => sum + Number(r.premium_amount || 0), 0);
  const activeCount = rows.filter((r) => r.status === "ACTIVO").length;

  const columns = useMemo(
    () => [
      { field: "customer_name", headerName: "Cliente", flex: 1, minWidth: 180 },
      { field: "credit_code", headerName: "Crédito", width: 110, renderCell: (p) => p.value || "—" },
      { field: "provider_name", headerName: "Aseguradora", width: 180 },
      { field: "product_name", headerName: "Tipo de seguro", width: 180 },
      { field: "coverage_type", headerName: "Cobertura", width: 140 },
      {
        field: "benefits",
        headerName: "Beneficios",
        width: 220,
        renderCell: (p) => (
          <Tooltip title={p.value || ""}>
            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
              {p.value || "—"}
            </Typography>
          </Tooltip>
        ),
      },
      { field: "policy_number", headerName: "N° póliza", width: 130, renderCell: (p) => p.value || "—" },
      {
        field: "premium_amount",
        headerName: "Prima",
        width: 110,
        type: "number",
        renderCell: (p) => `C$ ${money(p.value)}`,
      },
      {
        field: "start_date",
        headerName: "Inicio vigencia",
        width: 130,
        renderCell: (p) => (p.value ? dayjs(p.value).format("DD/MM/YYYY") : "—"),
      },
      {
        field: "end_date",
        headerName: "Fin vigencia",
        width: 130,
        renderCell: (p) => (p.value ? dayjs(p.value).format("DD/MM/YYYY") : "—"),
      },
      {
        field: "status",
        headerName: "Estado",
        width: 120,
        renderCell: (p) => {
          const color = p.value === "ACTIVO" ? "success" : p.value === "CANCELADO" ? "error" : "default";
          const label = p.value === "ACTIVO" ? "Activo" : p.value === "CANCELADO" ? "Cancelado" : "Vencido";
          return <Chip size="small" color={color} label={label} />;
        },
      },
      ...(canCancel
        ? [
            {
              field: "actions",
              headerName: "Acciones",
              width: 90,
              sortable: false,
              filterable: false,
              renderCell: (params) =>
                params.row.status === "ACTIVO" ? (
                  <Tooltip title="Cancelar seguro">
                    <IconButton size="small" color="error" onClick={() => setCancelTarget(params.row)}>
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null,
            },
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canCancel],
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 2 }}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
          <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LocalPoliceIcon sx={{ color: "#0057B8" }} />
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Seguros Contratados
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Seguros de vida (u otros) contratados por los clientes con aseguradoras tercerizadas
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
              {canContract && (
                <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenCreate}>
                  Contratar seguro
                </Button>
              )}
              <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchInsurances}>
                Actualizar
              </Button>
            </Box>
          </Box>

          <Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            <DatePicker
              label="Contratados desde"
              value={periodStart}
              onChange={setPeriodStart}
              renderInput={(params) => <TextField {...params} size="small" />}
            />
            <DatePicker
              label="Contratados hasta"
              value={periodEnd}
              onChange={setPeriodEnd}
              renderInput={(params) => <TextField {...params} size="small" />}
            />
          </Box>

          <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip label={`Registros: ${rows.length}`} />
            <Chip color="success" label={`Activos: ${activeCount}`} />
            <Chip color="primary" label={`Total primas: C$ ${money(totalPremiums)}`} />
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

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Contratar seguro</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <Autocomplete
                  size="small"
                  options={customers}
                  getOptionLabel={(o) => `${o.customer_name || ""}${o.identification ? " - " + o.identification : ""}`}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  value={form.customer_id}
                  onChange={handleCustomerChange}
                  renderInput={(params) => <TextField {...params} label="Cliente" />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Crédito (opcional)"
                  value={form.loan_id}
                  onChange={(e) => setForm((f) => ({ ...f, loan_id: e.target.value }))}
                  disabled={!form.customer_id || customerLoans.length === 0}
                  SelectProps={{ native: true }}
                >
                  <option value="">Sin ligar a un crédito</option>
                  {customerLoans.map((l) => (
                    <option key={l.id} value={l.id}>
                      #{l.id} — C$ {money(l.approved_amount)}
                    </option>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="N° de póliza"
                  value={form.policy_number}
                  onChange={(e) => setForm((f) => ({ ...f, policy_number: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  size="small"
                  options={products}
                  getOptionLabel={(o) => `${o.name} (${o.provider_name})`}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  value={form.product_id}
                  onChange={handleProductChange}
                  renderInput={(params) => <TextField {...params} label="Tipo de seguro" />}
                />
                {form.product_id?.benefits && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    {form.product_id.benefits}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Prima"
                  value={form.premium_amount}
                  onChange={(e) => setForm((f) => ({ ...f, premium_amount: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6} />
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Inicio de vigencia"
                  value={form.start_date}
                  onChange={(v) => setForm((f) => ({ ...f, start_date: v }))}
                  renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Fin de vigencia (opcional)"
                  value={form.end_date}
                  onChange={(v) => setForm((f) => ({ ...f, end_date: v }))}
                  renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Nombre del beneficiario"
                  value={form.beneficiary_name}
                  onChange={(e) => setForm((f) => ({ ...f, beneficiary_name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Parentesco del beneficiario"
                  value={form.beneficiary_relationship}
                  onChange={(e) => setForm((f) => ({ ...f, beneficiary_relationship: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
              {saving ? "Guardando..." : "Contratar seguro"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Cancelar seguro</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              ¿Confirma que desea cancelar el seguro de{" "}
              <strong>{cancelTarget?.customer_name}</strong> ({cancelTarget?.product_name})?
            </Typography>
            <TextField
              fullWidth
              size="small"
              label="Motivo (opcional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelTarget(null)} sx={{ textTransform: "none" }}>
              Volver
            </Button>
            <Button variant="contained" color="error" onClick={handleCancel} disabled={cancelling} sx={{ textTransform: "none" }}>
              {cancelling ? "Cancelando..." : "Cancelar seguro"}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={alert.open}
          autoHideDuration={5000}
          onClose={() => setAlert((p) => ({ ...p, open: false }))}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>
            {alert.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
}
