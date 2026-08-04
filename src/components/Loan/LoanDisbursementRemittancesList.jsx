import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import RefreshIcon from "@mui/icons-material/Refresh";
import { loanApi } from "../../api/loanApi";

const money = (n) =>
  new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", minimumFractionDigits: 2 }).format(
    Number(n || 0),
  );

const STATUS_COLOR = {
  EN_TRANSITO: "warning",
  DESEMBOLSADO: "success",
  DEVUELTO: "default",
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
      width: 140,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value === "EN_TRANSITO" ? "En tránsito" : params.value === "DESEMBOLSADO" ? "Desembolsado" : "Devuelto"}
          color={STATUS_COLOR[params.value] || "default"}
        />
      ),
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
  ];

  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1.5} mb={2}>
        <Typography variant="h6" fontWeight={700}>
          Remesas de desembolso — seguimiento
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={loadData}>
          Recargar
        </Button>
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
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>
    </Paper>
  );
}
