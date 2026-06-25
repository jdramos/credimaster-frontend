import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import API from "../../api";

export default function BalanceSheet() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ to_date: "" });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const showAlert = (message, severity = "error") =>
    setAlert({ open: true, severity, message });

  const fetchData = async () => {
    try {
      setLoading(true);

      const params = {};
      if (filters.to_date) params.to_date = filters.to_date;

      const res = await API.get("/api/accounting/trial-balance", { params });

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

      const filtered = data.filter((row) =>
        [
          "ACTIVO",
          "ASSET",
          "PASIVO",
          "LIABILITY",
          "PATRIMONIO",
          "EQUITY",
        ].includes(String(row.account_type || "").toUpperCase()),
      );

      setRows(filtered);
    } catch (error) {
      showAlert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Error al generar balance general",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    let equity = 0;

    rows.forEach((row) => {
      const type = String(row.account_type || "").toUpperCase();
      const debit = Number(row.total_debit || row.debit || 0);
      const credit = Number(row.total_credit || row.credit || 0);

      if (["ACTIVO", "ASSET"].includes(type)) {
        assets += debit - credit;
      }

      if (["PASIVO", "LIABILITY"].includes(type)) {
        liabilities += credit - debit;
      }

      if (["PATRIMONIO", "EQUITY"].includes(type)) {
        equity += credit - debit;
      }
    });

    return {
      assets,
      liabilities,
      equity,
      difference: assets - (liabilities + equity),
    };
  }, [rows]);

  const columns = [
    { field: "muc_code", headerName: "Código", width: 140 },
    { field: "account_name", headerName: "Cuenta", flex: 1, minWidth: 320 },
    { field: "account_type", headerName: "Tipo", width: 140 },
    {
      field: "amount",
      headerName: "Saldo",
      width: 160,
      type: "number",
      valueGetter: (params) => {
        const type = String(params.row.account_type || "").toUpperCase();
        const debit = Number(params.row.total_debit || params.row.debit || 0);
        const credit = Number(
          params.row.total_credit || params.row.credit || 0,
        );

        if (["ACTIVO", "ASSET"].includes(type)) return debit - credit;
        return credit - debit;
      },
      valueFormatter: (params) =>
        Number(params.value || 0).toLocaleString("es-NI", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Paper
        elevation={0}
        sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}
      >
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <AccountBalanceIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Balance General
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Activos, pasivos y patrimonio
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            mb: 2,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "180px 130px" },
            gap: 1,
          }}
        >
          <TextField
            size="small"
            label="Fecha corte"
            type="date"
            value={filters.to_date}
            onChange={(e) =>
              setFilters((p) => ({ ...p, to_date: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
          />

          <Button
            variant="outlined"
            onClick={fetchData}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Generar
          </Button>
        </Box>

        <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            color="primary"
            label={`Activos: ${summary.assets.toLocaleString("es-NI", { minimumFractionDigits: 2 })}`}
          />
          <Chip
            color="success"
            label={`Pasivos: ${summary.liabilities.toLocaleString("es-NI", { minimumFractionDigits: 2 })}`}
          />
          <Chip
            color="warning"
            label={`Patrimonio: ${summary.equity.toLocaleString("es-NI", { minimumFractionDigits: 2 })}`}
          />
          <Chip
            color={Math.abs(summary.difference) < 0.01 ? "success" : "error"}
            label={`Diferencia: ${summary.difference.toLocaleString("es-NI", { minimumFractionDigits: 2 })}`}
          />
        </Box>

        <Box sx={{ height: 620 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.account_id || row.id || row.muc_code}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25, page: 0 } },
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
        onClose={() => setAlert((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          severity={alert.severity}
          onClose={() => setAlert((p) => ({ ...p, open: false }))}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
