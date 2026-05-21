import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

const API_BASE = process.env.REACT_APP_API_BASE_URL;
const token = process.env.REACT_APP_API_TOKEN;

const headers = {
  Authorization: token,
  "Content-Type": "application/json",
};

export default function LedgerList() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
  });

  const [alert, setAlert] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const showAlert = (message, severity = "error") => {
    setAlert({ open: true, severity, message });
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/accounting/accounts?is_active=1`,
        { headers },
      );

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Error cargando cuentas");
      }

      setAccounts(
        (json.data || []).filter((acc) => Number(acc.is_movement) === 1),
      );
    } catch (error) {
      showAlert(error.message);
    }
  };

  const fetchLedger = async () => {
    if (!selectedAccount?.id) {
      showAlert("Debe seleccionar una cuenta contable", "warning");
      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append("account_id", selectedAccount.id);

      if (filters.from_date) params.append("from_date", filters.from_date);
      if (filters.to_date) params.append("to_date", filters.to_date);

      const res = await fetch(`${API_BASE}/api/accounting/ledger?${params}`, {
        headers,
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Error cargando mayor");
      }

      setRows(json.data?.movements || json.data || []);
      setSummary(json.data?.summary || null);
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const columns = useMemo(
    () => [
      {
        field: "entry_date",
        headerName: "Fecha",
        width: 130,
        valueGetter: (params) =>
          params.value ? String(params.value).substring(0, 10) : "",
      },
      {
        field: "entry_no",
        headerName: "Comprobante",
        width: 150,
      },
      {
        field: "description",
        headerName: "Descripción",
        flex: 1,
        minWidth: 280,
      },
      {
        field: "debit",
        headerName: "Débito",
        width: 140,
        type: "number",
        valueFormatter: (params) =>
          Number(params.value || 0).toLocaleString("es-NI", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
      {
        field: "credit",
        headerName: "Crédito",
        width: 140,
        type: "number",
        valueFormatter: (params) =>
          Number(params.value || 0).toLocaleString("es-NI", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
      {
        field: "running_balance",
        headerName: "Saldo",
        width: 150,
        type: "number",
        valueFormatter: (params) =>
          Number(params.value || 0).toLocaleString("es-NI", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
    ],
    [],
  );

  return (
    <Box sx={{ p: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: "1px solid #E5E7EB",
          background: "#fff",
        }}
      >
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <AccountBalanceWalletIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Mayor General
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Movimientos contables por cuenta
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            mb: 2,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "2fr 180px 180px 120px",
            },
            gap: 1,
          }}
        >
          <Autocomplete
            size="small"
            options={accounts}
            value={selectedAccount}
            getOptionLabel={(option) =>
              `${option.muc_code} - ${option.account_name}`
            }
            onChange={(_, value) => setSelectedAccount(value)}
            renderInput={(params) => (
              <TextField {...params} label="Cuenta contable" />
            )}
          />

          <TextField
            size="small"
            label="Desde"
            type="date"
            value={filters.from_date}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, from_date: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            size="small"
            label="Hasta"
            type="date"
            value={filters.to_date}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, to_date: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
          />

          <Button
            variant="outlined"
            onClick={fetchLedger}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Buscar
          </Button>
        </Box>

        {summary && (
          <Box
            sx={{
              mb: 2,
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Chip
              label={`Saldo inicial: ${Number(
                summary.opening_balance || 0,
              ).toLocaleString("es-NI", { minimumFractionDigits: 2 })}`}
            />
            <Chip
              color="primary"
              label={`Débitos: ${Number(
                summary.total_debit || 0,
              ).toLocaleString("es-NI", { minimumFractionDigits: 2 })}`}
            />
            <Chip
              color="success"
              label={`Créditos: ${Number(
                summary.total_credit || 0,
              ).toLocaleString("es-NI", { minimumFractionDigits: 2 })}`}
            />
            <Chip
              color="warning"
              label={`Saldo final: ${Number(
                summary.closing_balance || 0,
              ).toLocaleString("es-NI", { minimumFractionDigits: 2 })}`}
            />
          </Box>
        )}

        <Box sx={{ height: 620 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) =>
              row.id || `${row.journal_entry_id}-${row.account_id}`
            }
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 25, page: 0 },
              },
            }}
            disableRowSelectionOnClick
            sx={{
              border: "1px solid #E5E7EB",
              borderRadius: 2,
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#F8FAFC",
                fontWeight: 700,
              },
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
        <Alert
          severity={alert.severity}
          onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
