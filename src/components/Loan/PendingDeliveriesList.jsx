import React, { useEffect, useState } from "react";
import HelpButton from "../help/HelpButton";
import {
  Paper,
  Stack,
  Typography,
  Divider,
  Box,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PrintIcon from "@mui/icons-material/Print";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CloseIcon from "@mui/icons-material/Close";
import { loanApi } from "../../api/loanApi";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { printCheckDisbursementDetail } from "../../reports/checkDisbursementDetailReport";

const money = (n) =>
  new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", minimumFractionDigits: 2 }).format(
    Number(n || 0),
  );

const METHOD_LABEL = {
  CHEQUE: "Cheque",
  TRANSFERENCIA: "Transferencia",
  EFECTIVO: "Efectivo",
};

export default function PendingDeliveriesList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [target, setTarget] = useState(null);
  const [notes, setNotes] = useState("");
  const [deliveryImage, setDeliveryImage] = useState(null);
  const [deliveryImagePreview, setDeliveryImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageRequired, setImageRequired] = useState(false);
  const { user, tenant } = useAuth();

  useEffect(() => {
    API.get("/api/credit-policies/delivery_image_required")
      .then((res) => {
        const v = String(res.data?.policy_value || "").trim().toLowerCase();
        setImageRequired(["true", "1", "si", "sí"].includes(v));
      })
      .catch(() => setImageRequired(false));
  }, []);

  const handlePrintCheck = async (row) => {
    if (!row?.bank_check_id) return;
    try {
      const res = await API.get(`/api/loans/remittances/check/${row.bank_check_id}/supporting`);
      const data = res.data?.data || {};
      printCheckDisbursementDetail({
        company: {
          commercial_name: tenant?.commercial_name || tenant?.name,
          legal_name: tenant?.legal_name || tenant?.company_name,
          logo_url: tenant?.logo_url,
          tax_id: tenant?.tax_id,
          address: tenant?.address,
          phone: tenant?.phone,
        },
        user: { full_name: user?.full_name },
        check: data.check || {},
        loans: data.loans || [],
        total: data.total || 0,
      });
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo generar el detalle del cheque.");
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await loanApi.listPendingDeliveries();
      setRows(res?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Error al cargar las entregas pendientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const closeDeliverDialog = () => {
    setTarget(null);
    setNotes("");
    if (deliveryImagePreview) URL.revokeObjectURL(deliveryImagePreview);
    setDeliveryImage(null);
    setDeliveryImagePreview(null);
  };

  const handlePickImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (deliveryImagePreview) URL.revokeObjectURL(deliveryImagePreview);
    setDeliveryImage(file);
    setDeliveryImagePreview(URL.createObjectURL(file));
  };

  const handleConfirmDelivered = async () => {
    if (!target) return;
    try {
      setSaving(true);
      await loanApi.markDelivered(target.loan_id, {
        delivery_notes: notes || null,
        image: deliveryImage || undefined,
      });
      closeDeliverDialog();
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Error al registrar la entrega.");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "credit_code", headerName: "Crédito", width: 100 },
    { field: "customer_name", headerName: "Cliente", flex: 1, minWidth: 180 },
    { field: "customer_identification", headerName: "Cédula", width: 150 },
    { field: "branch_name", headerName: "Sucursal", width: 140 },
    {
      field: "disbursement_method",
      headerName: "Forma",
      width: 120,
      valueGetter: (params) => METHOD_LABEL[params.row.disbursement_method] || params.row.disbursement_method,
    },
    {
      field: "account",
      headerName: "Cuenta / Caja",
      width: 160,
      valueGetter: (params) => params.row.bank_account_alias || params.row.cash_register_name || "—",
    },
    {
      field: "amount",
      headerName: "Monto",
      width: 130,
      valueGetter: (params) => money(params.row.amount),
    },
    {
      field: "disbursed_at",
      headerName: "Desembolsado",
      width: 160,
      valueGetter: (params) =>
        params.row.disbursed_at ? new Date(`${String(params.row.disbursed_at).replace(" ", "T")}Z`).toLocaleString("es-NI") : "",
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 230,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Button
            size="small"
            variant="outlined"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={() => {
              setTarget(params.row);
              setNotes("");
            }}
          >
            Marcar entregado
          </Button>
          {params.row.bank_check_id && (
            <Tooltip title={`Imprimir detalle del cheque${params.row.check_number ? ` ${params.row.check_number}` : ""}`}>
              <IconButton size="small" color="primary" onClick={() => handlePrintCheck(params.row)}>
                <PrintIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1.5} mb={2}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            <Typography variant="h6" fontWeight={700}>
              Mis entregas pendientes
            </Typography>
            <HelpButton screenKey="creditos.entregas-pendientes" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Créditos ya desembolsados cuyo cheque/efectivo todavía no le entregó al cliente
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={`${rows.length} pendiente(s)`} color={rows.length ? "warning" : "default"} />
          <Button startIcon={<RefreshIcon />} onClick={loadData}>
            Recargar
          </Button>
        </Stack>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ height: 560, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          density="compact"
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>

      <Dialog open={Boolean(target)} onClose={closeDeliverDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar entrega</DialogTitle>
        <DialogContent dividers>
          {target && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Crédito #{target.loan_id} · {target.customer_name} · Monto: C$ {money(target.amount)}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Notas (opcional)"
            multiline
            minRows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Box sx={{ mt: 2 }}>
            {imageRequired && !deliveryImage && (
              <Alert severity="warning" sx={{ mb: 1.5 }}>
                La imagen del comprobante de entrega es obligatoria.
              </Alert>
            )}
            <Button
              component="label"
              variant="outlined"
              color={imageRequired && !deliveryImage ? "error" : "primary"}
              startIcon={<AddPhotoAlternateIcon />}
              disabled={saving}
            >
              {deliveryImage
                ? "Cambiar imagen"
                : imageRequired
                  ? "Adjuntar imagen (obligatoria)"
                  : "Adjuntar imagen (opcional)"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={handlePickImage}
              />
            </Button>

            {deliveryImagePreview && (
              <Box
                sx={{
                  position: "relative",
                  width: 120,
                  height: 120,
                  mt: 1.5,
                  borderRadius: 2,
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <img
                  src={deliveryImagePreview}
                  alt="Comprobante de entrega"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <IconButton
                  size="small"
                  onClick={() => {
                    URL.revokeObjectURL(deliveryImagePreview);
                    setDeliveryImage(null);
                    setDeliveryImagePreview(null);
                  }}
                  sx={{ position: "absolute", top: 2, right: 2, bgcolor: "rgba(0,0,0,0.55)", color: "#fff" }}
                >
                  <CloseIcon fontSize="inherit" />
                </IconButton>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeliverDialog} color="inherit" disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelivered}
            variant="contained"
            color="success"
            disabled={saving || (imageRequired && !deliveryImage)}
          >
            {saving ? "Registrando..." : "Confirmar entrega"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
