import React, { useEffect, useMemo, useState } from "react";
import HelpButton from "../help/HelpButton";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import API from "../../api";

const emptyForm = {
  id: null, name: "", ruc: "", telephone: "", email: "", address: "",
  applies_retention: 0, retention_code: "",
};

export default function ProvidersList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [codes, setCodes] = useState([]);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const notify = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await API.get("/api/providers", { params: search ? { search } : {} });
      setRows(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (e) {
      notify(e.response?.data?.message || "Error cargando proveedores", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    API.get("/api/retentions/codes")
      .then((res) => setCodes(res.data?.data || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) {
      notify("El nombre es obligatorio", "warning");
      return;
    }
    try {
      const payload = {
        name: form.name,
        ruc: form.ruc || null,
        telephone: form.telephone || null,
        email: form.email || null,
        address: form.address || null,
        applies_retention: form.applies_retention ? 1 : 0,
        retention_code: form.applies_retention ? form.retention_code || null : null,
      };
      if (form.id) await API.put(`/api/providers/${form.id}`, payload);
      else await API.post("/api/providers", payload);
      notify("Proveedor guardado");
      setOpen(false);
      fetchRows();
    } catch (e) {
      notify(e.response?.data?.message || "Error guardando", "error");
    }
  };

  const columns = useMemo(
    () => [
      { field: "name", headerName: "Nombre / Razón social", flex: 1, minWidth: 220 },
      { field: "ruc", headerName: "RUC / Cédula", width: 170, valueGetter: (p) => p.value || "—" },
      { field: "telephone", headerName: "Teléfono", width: 140, valueGetter: (p) => p.value || "—" },
      { field: "email", headerName: "Correo", width: 200, valueGetter: (p) => p.value || "—" },
      {
        field: "actions",
        headerName: "",
        width: 70,
        sortable: false,
        renderCell: (p) => (
          <IconButton size="small" onClick={() => { setForm({ ...emptyForm, ...p.row }); setOpen(true); }}>
            <EditIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [],
  );

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <StorefrontIcon sx={{ color: "#0057B8" }} />
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="h6" fontWeight={700}>Proveedores</Typography>
              <HelpButton screenKey="proveedores.listado" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Proveedores a quienes se paga y se retiene IR (con RUC para el DMI)
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => { setForm(emptyForm); setOpen(true); }}
            sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" }, textTransform: "none" }}>
            Nuevo proveedor
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField size="small" label="Buscar por nombre o RUC" value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchRows()} sx={{ minWidth: 260 }} />
          <Button variant="outlined" onClick={fetchRows} sx={{ textTransform: "none" }}>Buscar</Button>
        </Stack>

        <Box sx={{ height: 560 }}>
          <DataGrid rows={rows} columns={columns} loading={loading} getRowId={(r) => r.id}
            density="compact" pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            disableRowSelectionOnClick />
        </Box>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{form.id ? "Editar" : "Nuevo"} proveedor</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField size="small" label="Nombre / Razón social" value={form.name}
              onChange={(e) => setF("name", e.target.value)} />
            <TextField size="small" label="RUC / Cédula" value={form.ruc}
              onChange={(e) => setF("ruc", e.target.value)} />
            <Stack direction="row" spacing={1}>
              <TextField size="small" label="Teléfono" value={form.telephone}
                onChange={(e) => setF("telephone", e.target.value)} sx={{ flex: 1 }} />
              <TextField size="small" label="Correo" value={form.email}
                onChange={(e) => setF("email", e.target.value)} sx={{ flex: 1 }} />
            </Stack>
            <TextField size="small" label="Dirección" value={form.address}
              onChange={(e) => setF("address", e.target.value)} />
            <FormControlLabel
              control={<Switch checked={Boolean(Number(form.applies_retention))}
                onChange={(e) => setF("applies_retention", e.target.checked ? 1 : 0)} />}
              label="Se le retiene impuesto (IR en la fuente)" />
            {Boolean(Number(form.applies_retention)) && (
              <TextField select size="small" label="Tipo de retención (código DGI)" value={form.retention_code || ""}
                onChange={(e) => setF("retention_code", e.target.value)}>
                {codes.filter((c) => c.default_rate != null).map((c) => (
                  <MenuItem key={c.code} value={c.code}>{c.code} — {c.description} ({c.default_rate}%)</MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={save}
            sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" }, textTransform: "none" }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={4000}
        onClose={() => setAlert((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
