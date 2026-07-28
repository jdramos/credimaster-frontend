import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Alert,
  Snackbar,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SellIcon from "@mui/icons-material/Sell";
import CancelIcon from "@mui/icons-material/Cancel";
import API from "../api";

const API_URL = "/api/asset-adjudications";

const STATUS_CHIP = {
  DRAFT: { label: "Borrador", color: "default" },
  APPROVED: { label: "Aprobada", color: "info" },
  APPLIED: { label: "Aplicada", color: "success" },
  SOLD: { label: "Vendida", color: "primary" },
  CANCELLED: { label: "Cancelada", color: "error" },
};

const money = (value) =>
  Number(value || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function AssetAdjudicationsList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [saleTarget, setSaleTarget] = useState(null);
  const [saleForm, setSaleForm] = useState({ entry_date: new Date().toISOString().slice(0, 10), sale_price: "" });
  const [saleError, setSaleError] = useState("");
  const [saving, setSaving] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchRows = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar las adjudicaciones", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const performAction = async (id, action, successMessage) => {
    try {
      setActingId(id);
      const res = await API.put(`${API_URL}/${id}/${action}`);
      showAlert(res.data?.message || successMessage, "success");
      await fetchRows();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al procesar la acción", "error");
    } finally {
      setActingId(null);
    }
  };

  const openSaleDialog = (row) => {
    setSaleTarget(row);
    setSaleForm({ entry_date: new Date().toISOString().slice(0, 10), sale_price: "" });
    setSaleError("");
  };

  const handleConfirmSale = async () => {
    try {
      setSaving(true);
      setSaleError("");

      const res = await API.put(`${API_URL}/${saleTarget.id}/sell`, {
        entry_date: saleForm.entry_date,
        sale_price: Number(saleForm.sale_price || 0),
      });

      showAlert(res.data?.message || "Venta registrada", "success");
      setSaleTarget(null);
      await fetchRows();
    } catch (error) {
      setSaleError(error.response?.data?.message || error.message || "Error registrando la venta");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { field: "credit_code", headerName: "Crédito", width: 130 },
    { field: "customer_name", headerName: "Cliente", flex: 1, minWidth: 200 },
    {
      field: "adjudication_date",
      headerName: "Fecha",
      width: 120,
      valueGetter: (params) => (params.value ? String(params.value).slice(0, 10) : ""),
    },
    { field: "asset_description", headerName: "Bien", flex: 1, minWidth: 200 },
    {
      field: "adjudicated_value",
      headerName: "Valor adjudicado",
      width: 150,
      align: "right",
      headerAlign: "right",
      valueFormatter: (params) => `C$ ${money(params.value)}`,
    },
    {
      field: "total_applied",
      headerName: "Total aplicado",
      width: 150,
      align: "right",
      headerAlign: "right",
      valueGetter: (params) =>
        Number(params.row.applied_to_principal || 0) +
        Number(params.row.applied_to_interest || 0) +
        Number(params.row.applied_to_default_interest || 0) +
        Number(params.row.applied_to_fees || 0) +
        Number(params.row.applied_to_other_charges || 0),
      valueFormatter: (params) => `C$ ${money(params.value)}`,
    },
    {
      field: "sale_price",
      headerName: "Precio de venta",
      width: 140,
      align: "right",
      headerAlign: "right",
      valueFormatter: (params) => (params.value != null ? `C$ ${money(params.value)}` : ""),
    },
    {
      field: "gain_loss_amount",
      headerName: "Ganancia/Pérdida",
      width: 150,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => {
        if (params.value == null) return "";
        const value = Number(params.value);
        return (
          <Typography variant="body2" color={value >= 0 ? "success.main" : "error.main"} fontWeight={700}>
            {value >= 0 ? "+" : ""}
            C$ {money(value)}
          </Typography>
        );
      },
    },
    {
      field: "status",
      headerName: "Estado",
      width: 130,
      renderCell: (params) => {
        const cfg = STATUS_CHIP[params.value] || { label: params.value, color: "default" };
        return <Chip size="small" label={cfg.label} color={cfg.color} />;
      },
    },
    {
      field: "acciones",
      headerName: "Acciones",
      width: 300,
      sortable: false,
      renderCell: (params) => {
        const row = params.row;
        const disabled = actingId === row.id;

        return (
          <Stack direction="row" spacing={1}>
            {row.status === "DRAFT" && (
              <Button
                size="small"
                variant="outlined"
                color="info"
                startIcon={<CheckCircleIcon />}
                disabled={disabled}
                onClick={() => performAction(row.id, "approve", "Adjudicación aprobada")}
              >
                Aprobar
              </Button>
            )}

            {row.status === "APPROVED" && (
              <Button
                size="small"
                variant="outlined"
                color="success"
                startIcon={<PlayArrowIcon />}
                disabled={disabled}
                onClick={() => performAction(row.id, "apply", "Adjudicación aplicada")}
              >
                Aplicar
              </Button>
            )}

            {row.status === "APPLIED" && (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<SellIcon />}
                disabled={disabled}
                onClick={() => openSaleDialog(row)}
              >
                Vender
              </Button>
            )}

            {["DRAFT", "APPROVED"].includes(row.status) && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                disabled={disabled}
                onClick={() => performAction(row.id, "cancel", "Adjudicación cancelada")}
              >
                Cancelar
              </Button>
            )}
          </Stack>
        );
      },
    },
  ];

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={800} mb={2}>
          Adjudicaciones de Bienes
        </Typography>

        <div style={{ height: 600, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          />
        </div>
      </Paper>

      <Dialog open={Boolean(saleTarget)} onClose={() => setSaleTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Vender bien adjudicado</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {saleTarget?.asset_description} — crédito #{saleTarget?.credit_code}
          </Typography>

          {saleError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saleError}
            </Alert>
          )}

          <Stack spacing={2}>
            <TextField
              fullWidth
              type="date"
              label="Fecha de venta"
              value={saleForm.entry_date}
              onChange={(e) => setSaleForm({ ...saleForm, entry_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type="number"
              label="Precio de venta"
              value={saleForm.sale_price}
              onChange={(e) => setSaleForm({ ...saleForm, sale_price: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaleTarget(null)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleConfirmSale} disabled={saving}>
            Confirmar venta
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={alert.severity} sx={{ width: "100%" }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
