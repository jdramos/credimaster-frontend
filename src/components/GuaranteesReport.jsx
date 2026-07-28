import React, { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Chip,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SecurityIcon from "@mui/icons-material/Security";
import API from "../api";

const money = (v) =>
  Number(v || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function GuaranteesReport() {
  const [rows, setRows] = useState([]);
  const [cuentaContable, setCuentaContable] = useState("");
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [alert, setAlert] = useState({ open: false, severity: "error", message: "" });
  const showAlert = (message, severity = "error") => setAlert({ open: true, severity, message });

  const fetchReport = async (customerId) => {
    try {
      setLoading(true);
      const params = {};
      if (customerId) params.customer_id = customerId;

      const res = await API.get("/api/guarantees/report", { params });
      const data = res.data || {};

      if (data.success === false) {
        throw new Error(data.message || "Error al cargar el reporte de garantías");
      }

      setRows(data.data || []);
      setCuentaContable(data.cuenta_contable || "");
    } catch (error) {
      showAlert(
        error.response?.data?.message || error.message || "Error al cargar el reporte de garantías",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // Carga simple de clientes para el filtro (no búsqueda server-side —
    // suficiente para el tamaño típico de cartera de una IMF; si crece
    // mucho conviene un Autocomplete con búsqueda como en otras pantallas).
    API.get("/api/customers", { params: { page: 1, pageSize: 500, sortBy: "customer_name", sortDir: "asc" } })
      .then((res) => {
        const payload = res?.data?.data ?? res?.data;
        setCustomers(payload?.rows ?? []);
      })
      .catch(() => {});
  }, []);

  const handleCustomerChange = (_, value) => {
    setSelectedCustomer(value);
    fetchReport(value?.id);
  };

  const totalValue = rows.reduce((sum, r) => sum + Number(r.value || 0), 0);
  const totalPosted = rows
    .filter((r) => r.posted_at)
    .reduce((sum, r) => sum + Number(r.value || 0), 0);

  const columns = [
    { field: "customer_name", headerName: "Cliente", flex: 1, minWidth: 180 },
    { field: "article", headerName: "Artículo", width: 150 },
    { field: "series", headerName: "Serie", width: 130 },
    { field: "brand", headerName: "Marca", width: 130 },
    {
      field: "value",
      headerName: "Valor",
      width: 130,
      type: "number",
      valueFormatter: (params) => money(params.value),
    },
    {
      field: "cuenta_contable",
      headerName: "Cuenta contable",
      width: 220,
      valueGetter: () => cuentaContable,
    },
    {
      field: "posted_at",
      headerName: "Contabilizada",
      width: 140,
      renderCell: (params) => (
        <Chip
          size="small"
          color={params.value ? "success" : "default"}
          label={params.value ? "Sí" : "No"}
        />
      ),
    },
    { field: "entry_no", headerName: "Comprobante", width: 150 },
    {
      field: "created_at",
      headerName: "Fecha registro",
      width: 140,
      valueFormatter: (params) => (params.value ? String(params.value).slice(0, 10) : ""),
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
          <SecurityIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Reporte de Garantías
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Garantías registradas por cliente y su estado de contabilización en cuentas de orden
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 2, maxWidth: 360 }}>
          <Autocomplete
            size="small"
            options={customers}
            value={selectedCustomer}
            getOptionLabel={(o) => `${o.customer_name || ""}${o.identification ? " - " + o.identification : ""}`}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            onChange={handleCustomerChange}
            renderInput={(params) => <TextField {...params} label="Filtrar por cliente" />}
          />
        </Box>

        <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip color="primary" label={`Total garantías: ${money(totalValue)}`} />
          <Chip color="success" label={`Contabilizado: ${money(totalPosted)}`} />
          <Chip label={`Pendiente de contabilizar: ${money(totalValue - totalPosted)}`} />
          <Chip label={`Registros: ${rows.length}`} />
        </Box>

        <Box sx={{ height: 500 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
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
