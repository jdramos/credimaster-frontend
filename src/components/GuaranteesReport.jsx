import React, { useEffect, useState } from "react";
import HelpButton from "./help/HelpButton";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SecurityIcon from "@mui/icons-material/Security";
import PhotoCameraBackIcon from "@mui/icons-material/PhotoCameraBack";
import PrintIcon from "@mui/icons-material/Print";
import API from "../api";
import GuaranteePhotosDialog from "./GuaranteePhotosDialog";
import { printAccountingReport } from "./accounting/printAccountingReport";

const money = (v) =>
  Number(v || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function GuaranteesReport() {
  const [rows, setRows] = useState([]);
  const [cuentaContable, setCuentaContable] = useState("");
  const [ledgerBalance, setLedgerBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [alert, setAlert] = useState({ open: false, severity: "error", message: "" });
  const showAlert = (message, severity = "error") => setAlert({ open: true, severity, message });

  const [photosDialog, setPhotosDialog] = useState({ open: false, guaranteeId: null, label: "" });

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
      setLedgerBalance(typeof data.ledger_balance === "number" ? data.ledger_balance : null);
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

  // Una garantía "Anulada" (posted_at seteado pero el asiento ya no está
  // POSTED) no debe inflar ningún total del reporte -- ver
  // GuaranteeController.js::getGuaranteesReport. Sigue apareciendo en la
  // grilla (con su chip "Anulado") para trazabilidad, solo se excluye de
  // las sumas.
  const isVoided = (r) => Boolean(r.posted_at) && r.journal_status && r.journal_status !== "POSTED";
  const activeRows = rows.filter((r) => !isVoided(r));
  const totalValue = activeRows.reduce((sum, r) => sum + Number(r.value || 0), 0);
  const totalPosted = activeRows
    .filter((r) => r.effectively_posted)
    .reduce((sum, r) => sum + Number(r.value || 0), 0);
  const reconciles = ledgerBalance === null || Math.abs(ledgerBalance - totalPosted) < 0.01;

  const statusLabel = (row) => {
    if (row.effectively_posted) return "Contabilizada";
    if (isVoided(row)) return "Anulado";
    return "Pendiente";
  };

  const printReport = () =>
    printAccountingReport({
      title: "Reporte de Garantías",
      subtitle: cuentaContable ? `Cuenta contable: ${cuentaContable}` : undefined,
      period: selectedCustomer ? `Cliente: ${selectedCustomer.customer_name}` : "Todos los clientes",
      columns: [
        { field: "customer_name", label: "Cliente" },
        { field: "article", label: "Artículo" },
        { field: "series", label: "Serie" },
        { field: "brand", label: "Marca" },
        { field: "value", label: "Valor", numeric: true, format: (v) => money(v) },
        { field: "status", label: "Estado", value: (row) => statusLabel(row) },
        { field: "entry_no", label: "Comprobante" },
        { field: "created_at", label: "Fecha registro", format: (v) => (v ? String(v).slice(0, 10) : "") },
      ],
      rows,
      totals: [
        { value: "Totales (excluye anuladas)", colspan: 4 },
        { value: money(totalValue), numeric: true },
        { value: "", colspan: 3 },
      ],
    });

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
      width: 150,
      renderCell: (params) => {
        const row = params.row;
        if (row.effectively_posted) {
          return <Chip size="small" color="success" label="Sí" />;
        }
        if (row.posted_at && row.journal_status && row.journal_status !== "POSTED") {
          return (
            <Tooltip title={`El comprobante ${row.entry_no || ""} fue anulado`}>
              <Chip size="small" color="warning" label="Anulado" />
            </Tooltip>
          );
        }
        return <Chip size="small" color="default" label="No" />;
      },
    },
    { field: "entry_no", headerName: "Comprobante", width: 150 },
    {
      field: "created_at",
      headerName: "Fecha registro",
      width: 140,
      valueFormatter: (params) => (params.value ? String(params.value).slice(0, 10) : ""),
    },
    {
      field: "photos",
      headerName: "Fotos",
      width: 80,
      sortable: false,
      filterable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Tooltip title="Ver fotos de la garantía">
          <IconButton
            size="small"
            onClick={() =>
              setPhotosDialog({
                open: true,
                guaranteeId: params.row.id,
                label: [params.row.article, params.row.series].filter(Boolean).join(" - "),
              })
            }
          >
            <PhotoCameraBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
          <SecurityIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="h6" fontWeight={700}>
                Reporte de Garantías
              </Typography>
              <HelpButton screenKey="garantias.reporte" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Garantías registradas por cliente y su estado de contabilización en cuentas de orden
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ maxWidth: 360, flex: 1, minWidth: 260 }}>
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
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={printReport} disabled={!rows.length}>
            Imprimir
          </Button>
        </Box>

        <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip color="primary" label={`Total garantías: ${money(totalValue)}`} />
          <Chip color="success" label={`Contabilizado: ${money(totalPosted)}`} />
          <Chip label={`Pendiente de contabilizar: ${money(totalValue - totalPosted)}`} />
          <Chip label={`Registros: ${rows.length}`} />
          {ledgerBalance !== null && (
            <Tooltip title="Saldo actual de la cuenta de orden de garantías recibidas (solo asientos contabilizados, no anulados)">
              <Chip
                color={reconciles ? "success" : "error"}
                variant={reconciles ? "outlined" : "filled"}
                label={`Saldo en libro mayor: ${money(ledgerBalance)}${reconciles ? " ✓ cuadra" : " ⚠ no cuadra"}`}
              />
            </Tooltip>
          )}
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

      <GuaranteePhotosDialog
        open={photosDialog.open}
        onClose={() => setPhotosDialog({ open: false, guaranteeId: null, label: "" })}
        guaranteeId={photosDialog.guaranteeId}
        guaranteeLabel={photosDialog.label}
      />
    </Box>
  );
}
