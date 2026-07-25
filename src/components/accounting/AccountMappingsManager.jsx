import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Chip,
  Alert,
  Snackbar,
  Tooltip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
import BlockIcon from "@mui/icons-material/Block";
import { UserContext } from "../../contexts/UserContext";
import API from "../../api";

const MAPPINGS_URL = "/api/accounting/mappings";
const ACCOUNTS_URL = "/api/accounting/accounts";

const emptyForm = {
  id: null,
  operation_code: "",
  line_code: "",
  account: null,
  dc: "DEBIT",
  description: "",
  is_active: 1,
};

export default function AccountMappingsManager() {
  const { role, permissions } = useContext(UserContext);
  const canManage = role === 1 || permissions.includes("contabilidad.cuentas.gestionar");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [accountOptions, setAccountOptions] = useState([]);
  const [accountSearch, setAccountSearch] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const showAlert = (message, severity = "success") => {
    setAlert({ open: true, message, severity });
  };

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const res = await API.get(MAPPINGS_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(
        error.response?.data?.message || error.message || "Error al cargar los mapeos contables",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAccountOptions = async (term) => {
    try {
      setAccountLoading(true);
      const res = await API.get(ACCOUNTS_URL, { params: { search: term } });
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      // Solo cuentas de movimiento ya aprobadas pueden usarse en un mapeo
      // (misma regla que valida el backend al guardar).
      setAccountOptions(
        list.filter((a) => Number(a.is_movement) === 1 && a.approval_status === "APPROVED"),
      );
    } catch (error) {
      showAlert(
        error.response?.data?.message || error.message || "Error al buscar cuentas",
        "error",
      );
    } finally {
      setAccountLoading(false);
    }
  };

  useEffect(() => {
    if (!dialogOpen) return;
    const timer = setTimeout(() => fetchAccountOptions(accountSearch), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountSearch, dialogOpen]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const term = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.operation_code?.toLowerCase().includes(term) ||
        r.line_code?.toLowerCase().includes(term) ||
        r.muc_code?.toLowerCase().includes(term) ||
        r.account_name?.toLowerCase().includes(term),
    );
  }, [rows, search]);

  const openCreateDialog = () => {
    setForm(emptyForm);
    setAccountSearch("");
    setAccountOptions([]);
    setDialogOpen(true);
  };

  const openEditDialog = (row) => {
    setForm({
      id: row.id,
      operation_code: row.operation_code,
      line_code: row.line_code,
      account: { id: row.account_id, muc_code: row.muc_code, account_name: row.account_name },
      dc: row.dc,
      description: row.description || "",
      is_active: Number(row.is_active),
    });
    setAccountSearch("");
    setAccountOptions([]);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.operation_code.trim() || !form.line_code.trim() || !form.account || !form.dc) {
      showAlert("Operación, línea, cuenta y naturaleza son obligatorios", "error");
      return;
    }

    const payload = {
      operation_code: form.operation_code.trim().toUpperCase(),
      line_code: form.line_code.trim().toUpperCase(),
      account_id: form.account.id,
      dc: form.dc,
      description: form.description || null,
      is_active: form.is_active,
    };

    try {
      setSaving(true);
      if (form.id) {
        await API.put(`${MAPPINGS_URL}/${form.id}`, payload);
        showAlert("Mapeo actualizado correctamente");
      } else {
        await API.post(MAPPINGS_URL, payload);
        showAlert("Mapeo creado correctamente");
      }
      setDialogOpen(false);
      fetchMappings();
    } catch (error) {
      showAlert(
        error.response?.data?.message || error.message || "Error al guardar el mapeo",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (row) => {
    try {
      await API.delete(`${MAPPINGS_URL}/${row.id}`);
      showAlert(`Mapeo ${row.operation_code}/${row.line_code} desactivado`);
      fetchMappings();
    } catch (error) {
      showAlert(
        error.response?.data?.message || error.message || "Error al desactivar el mapeo",
        "error",
      );
    }
  };

  const columns = useMemo(
    () => [
      { field: "operation_code", headerName: "Operación", width: 190 },
      { field: "line_code", headerName: "Línea", width: 200 },
      {
        field: "muc_code",
        headerName: "Cuenta MUC",
        width: 130,
      },
      {
        field: "account_name",
        headerName: "Nombre de la cuenta",
        flex: 1,
        minWidth: 240,
      },
      {
        field: "dc",
        headerName: "Naturaleza",
        width: 120,
        renderCell: (params) => (
          <Chip
            size="small"
            color={params.value === "DEBIT" ? "primary" : "success"}
            label={params.value === "DEBIT" ? "Débito" : "Crédito"}
          />
        ),
      },
      { field: "description", headerName: "Descripción", flex: 1, minWidth: 220 },
      {
        field: "is_active",
        headerName: "Estado",
        width: 110,
        renderCell: (params) =>
          Number(params.value) === 1 ? (
            <Chip size="small" color="success" label="Activo" />
          ) : (
            <Chip size="small" color="default" label="Inactivo" />
          ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: (params) =>
          canManage ? (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="Editar">
                <IconButton size="small" onClick={() => openEditDialog(params.row)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {Number(params.row.is_active) === 1 && (
                <Tooltip title="Desactivar">
                  <IconButton size="small" color="error" onClick={() => handleDeactivate(params.row)}>
                    <BlockIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage],
  );

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AccountBalanceIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Cuentas contables por operación
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Define qué cuenta del catálogo MUC se usa para cada operación (ingresos, cartera, caja, provisión, etc.). Ya vienen precargadas las cuentas establecidas en el MUC.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            {canManage && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreateDialog}
                sx={{ borderRadius: 2, textTransform: "none", background: "#0057B8", "&:hover": { background: "#003E8A" } }}
              >
                Nuevo mapeo
              </Button>
            )}
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchMappings}>
              Actualizar
            </Button>
          </Box>
        </Box>

        {!canManage && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Puedes consultar las cuentas configuradas, pero no tienes permiso para modificarlas.
          </Alert>
        )}

        <TextField
          size="small"
          label="Buscar por operación, línea, código o nombre de cuenta"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />

        <Box sx={{ height: 620, width: "100%" }}>
          <DataGrid
            rows={filteredRows}
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? "Editar mapeo contable" : "Nuevo mapeo contable"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label="Código de operación"
            placeholder="Ej. PAYMENT, LOAN_DISBURSEMENT"
            value={form.operation_code}
            onChange={(e) => setForm((f) => ({ ...f, operation_code: e.target.value }))}
            fullWidth
            helperText="Identifica el evento contable (un pago, un desembolso, una provisión...)."
          />

          <TextField
            label="Código de línea"
            placeholder="Ej. CASH, PRINCIPAL, INTEREST"
            value={form.line_code}
            onChange={(e) => setForm((f) => ({ ...f, line_code: e.target.value }))}
            fullWidth
            helperText="Identifica qué parte del asiento es (caja, capital, intereses...)."
          />

          <Autocomplete
            options={accountOptions}
            loading={accountLoading}
            value={form.account}
            getOptionLabel={(option) => (option ? `${option.muc_code} - ${option.account_name}` : "")}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onInputChange={(event, value) => setAccountSearch(value)}
            onChange={(event, newValue) => setForm((f) => ({ ...f, account: newValue }))}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Cuenta contable"
                helperText="Solo se pueden usar cuentas de movimiento ya aprobadas del catálogo MUC."
              />
            )}
          />

          <Box>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Naturaleza
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={form.dc}
              onChange={(event, value) => value && setForm((f) => ({ ...f, dc: value }))}
              size="small"
            >
              <ToggleButton value="DEBIT">Débito</ToggleButton>
              <ToggleButton value="CREDIT">Crédito</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <TextField
            label="Descripción"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            fullWidth
            multiline
            rows={2}
          />

          {form.id && (
            <FormControlLabel
              control={
                <Switch
                  checked={Number(form.is_active) === 1}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked ? 1 : 0 }))}
                />
              }
              label="Activo"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            Guardar
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
