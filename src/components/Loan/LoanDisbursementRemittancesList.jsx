import React, { useEffect, useState } from "react";
import HelpButton from "../help/HelpButton";
import {
  Paper,
  Stack,
  Typography,
  Divider,
  Box,
  TextField,
  MenuItem,
  Button,
  Alert,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";
import ImageIcon from "@mui/icons-material/Image";
import { loanApi } from "../../api/loanApi";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { printCheckDisbursementDetail } from "../../reports/checkDisbursementDetailReport";
import ReportExportButtons from "../common/ReportExportButtons";
import { reportFilters, reportMoney } from "../common/reportFormat";

const money = (n) =>
  new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", minimumFractionDigits: 2 }).format(
    Number(n || 0),
  );

const STATUS_COLOR = {
  EN_TRANSITO: "warning",
  DESEMBOLSADO: "success",
  DEVUELTO: "default",
};

const STATUS_FILTER_LABEL = { EN_TRANSITO: "En tránsito", DESEMBOLSADO: "Desembolsado", DEVUELTO: "Devuelto" };

const localDateTime = (v) => (v ? new Date(`${String(v).replace(" ", "T")}Z`).toLocaleString("es-NI") : "");

// Mismo texto que el chip de la columna Estado.
const statusLabel = (row) => {
  if (row.status === "DESEMBOLSADO") return row.delivered_at ? "Entregado" : "Pendiente de entrega";
  if (row.status === "EN_TRANSITO") return "En tránsito";
  if (row.status === "DEVUELTO") return "Devuelto";
  return row.status || "";
};

const METHOD_LABEL = {
  CHEQUE: "Cheque",
  TRANSFERENCIA: "Transferencia",
  EFECTIVO: "Efectivo",
};

export default function LoanDisbursementRemittancesList() {
  const [rows, setRows] = useState([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("EN_TRANSITO");
  const { user, tenant } = useAuth();

  const handleViewDeliveryImage = async (row) => {
    try {
      const res = await loanApi.getDeliveryImageUrl(row.id);
      if (res?.url) window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo abrir la imagen de entrega.");
    }
  };

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
      const res = await loanApi.listRemittances(status ? { status } : {});
      setRows(res?.data || []);
      setPendingTotal(Number(res?.pending_total || 0));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Error al cargar las remesas de desembolso.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const buildReport = () => {
    const total = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    return {
      title: "Remesas de desembolso",
      subtitle: reportFilters([
        ["Estado", status ? STATUS_FILTER_LABEL[status] : "Todos"],
        ["Saldo en remesas en tránsito (1101.03)", reportMoney(pendingTotal)],
      ]),
      columns: [
        { field: "id", label: "ID" },
        { field: "credit_code", label: "Crédito" },
        { field: "customer_name", label: "Cliente" },
        { field: "branch_name", label: "Sucursal" },
        { label: "Forma", value: (r) => METHOD_LABEL[r.disbursement_method] || r.disbursement_method || "" },
        { label: "Cuenta / Caja", value: (r) => r.bank_account_alias || r.cash_register_name || "—" },
        { field: "amount", label: "Monto", numeric: true, format: reportMoney },
        { label: "Estado", value: statusLabel },
        { field: "delivery_agent_name", label: "Responsable de entrega" },
        { field: "delivered_at", label: "Entregado", format: localDateTime },
        { field: "created_at", label: "Fecha", format: localDateTime },
        { field: "return_reason", label: "Motivo devolución" },
      ],
      rows,
      totals: [
        { value: `Total (${rows.length} remesas)`, colspan: 6 },
        { value: reportMoney(total), raw: total, numeric: true },
        { value: "", colspan: 5 },
      ],
      orientation: "landscape",
      fileName: `remesas_desembolso_${status || "todas"}`,
    };
  };

  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "credit_code", headerName: "Crédito", width: 100 },
    { field: "customer_name", headerName: "Cliente", flex: 1, minWidth: 180 },
    { field: "branch_name", headerName: "Sucursal", width: 140 },
    {
      field: "disbursement_method",
      headerName: "Forma",
      width: 130,
      valueGetter: (params) => METHOD_LABEL[params.row.disbursement_method] || params.row.disbursement_method,
    },
    {
      field: "account",
      headerName: "Cuenta / Caja",
      width: 180,
      valueGetter: (params) => params.row.bank_account_alias || params.row.cash_register_name || "—",
    },
    {
      field: "amount",
      headerName: "Monto",
      width: 130,
      valueGetter: (params) => money(params.row.amount),
    },
    {
      field: "status",
      headerName: "Estado",
      width: 150,
      renderCell: (params) => {
        if (params.value === "DESEMBOLSADO" && params.row.delivered_at) {
          return <Chip size="small" label="Entregado" color="success" />;
        }
        if (params.value === "DESEMBOLSADO") {
          return <Chip size="small" label="Pendiente de entrega" color="info" />;
        }
        return (
          <Chip
            size="small"
            label={params.value === "EN_TRANSITO" ? "En tránsito" : "Devuelto"}
            color={STATUS_COLOR[params.value] || "default"}
          />
        );
      },
    },
    {
      field: "delivery_agent_name",
      headerName: "Responsable de entrega",
      width: 170,
    },
    {
      field: "delivered_at",
      headerName: "Entregado",
      width: 160,
      valueGetter: (params) =>
        params.row.delivered_at ? new Date(`${String(params.row.delivered_at).replace(" ", "T")}Z`).toLocaleString("es-NI") : "",
    },
    {
      field: "created_at",
      headerName: "Fecha",
      width: 160,
      valueGetter: (params) => (params.row.created_at ? new Date(`${String(params.row.created_at).replace(" ", "T")}Z`).toLocaleString("es-NI") : ""),
    },
    {
      field: "return_reason",
      headerName: "Motivo devolución",
      flex: 1,
      minWidth: 160,
    },
    {
      field: "acciones",
      headerName: "Acciones",
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          {params.row.bank_check_id && (
            <Tooltip title={`Imprimir detalle del cheque${params.row.check_number ? ` ${params.row.check_number}` : ""}`}>
              <IconButton size="small" color="primary" onClick={() => handlePrintCheck(params.row)}>
                <PrintIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {params.row.delivery_image_path && (
            <Tooltip title="Ver imagen de entrega">
              <IconButton size="small" color="secondary" onClick={() => handleViewDeliveryImage(params.row)}>
                <ImageIcon fontSize="small" />
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
          <Typography variant="h6" fontWeight={700}>
            Remesas de desembolso — seguimiento
          </Typography>
          <HelpButton screenKey="creditos.remesas" />
        </Box>
        <Stack direction="row" spacing={1}>
          <ReportExportButtons report={buildReport} disabled={loading || !rows.length} />
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

      <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap" useFlexGap>
        <TextField
          select
          size="small"
          label="Estado"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="EN_TRANSITO">En tránsito</MenuItem>
          <MenuItem value="DESEMBOLSADO">Desembolsado</MenuItem>
          <MenuItem value="DEVUELTO">Devuelto</MenuItem>
        </TextField>

        <Chip
          label={`Saldo en remesas en tránsito (1101.03): ${money(pendingTotal)}`}
          color="warning"
          variant="outlined"
        />
      </Stack>

      <Box sx={{ height: 560, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          density="compact"
          disableSelectionOnClick
          rowsPerPageOptions={[10, 25, 50]}
          initialState={{ pagination: { pageSize: 25 } }}
        />
      </Box>
    </Paper>
  );
}
