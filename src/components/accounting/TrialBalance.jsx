import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { printAccountingReport } from "./printAccountingReport";
import ReportSignaturesDialog from "./ReportSignaturesDialog";

export default function TrialBalance() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
    scope: "ALL",
  });

  const [alert, setAlert] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const showAlert = (message, severity = "error") => {
    setAlert({ open: true, severity, message });
  };

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);

      const params = { scope: filters.scope };
      if (filters.from_date) params.start_date = filters.from_date;
      if (filters.to_date) params.end_date = filters.to_date;

      const res = await API.get("/api/accounting/trial-balance", { params });

      const json = res.data || {};

      if (json.ok === false) {
        throw new Error(
          json.message || "Error cargando balance de comprobación",
        );
      }

      const data = json.data || json;

      setRows(
        Array.isArray(data.rows) ? data.rows : Array.isArray(data) ? data : [],
      );

      // El backend expone los totales de control en json.totals (ya excluye
      // encabezados y cuentas de orden/contingentes, ver ledgerController.js
      // getTrialBalance) — no en data.summary, que nunca existió en la
      // respuesta real; sin esto, la UI siempre caía al cálculo local
      // ingenuo (localSummary) que suma TODAS las filas, incluidas las de
      // encabezado ya acumuladas, inflando el total varias veces.
      setSummary(
        json.totals
          ? {
              totalDebit: json.totals.debit,
              totalCredit: json.totals.credit,
              difference: json.totals.difference,
              balanced: Math.abs(json.totals.difference) < 0.01,
            }
          : null,
      );
    } catch (error) {
      showAlert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Error cargando balance de comprobación",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const localSummary = useMemo(() => {
    // Respaldo por si el backend no envía "totals" — replica su misma
    // lógica: solo cuentas de movimiento (los encabezados ya traen la suma
    // acumulada de sus hijas, sumarlos de nuevo duplicaría el monto) y
    // excluyendo cuentas de orden/contingentes (fuera de balance).
    const isRealMovement = (row) =>
      row.is_movement && !["ORDEN", "CONTINGENTE"].includes(row.account_type);

    const totalDebit = rows.reduce(
      (sum, row) => (isRealMovement(row) ? sum + Number(row.total_debit || row.debit || 0) : sum),
      0,
    );

    const totalCredit = rows.reduce(
      (sum, row) => (isRealMovement(row) ? sum + Number(row.total_credit || row.credit || 0) : sum),
      0,
    );

    const difference = totalDebit - totalCredit;

    return {
      totalDebit,
      totalCredit,
      difference,
      balanced: Math.abs(difference) < 0.01,
    };
  }, [rows]);

  const finalSummary = summary || localSummary;

  const columns = useMemo(
    () => [
      {
        field: "muc_code",
        headerName: "Código MUC",
        width: 150,
        cellClassName: (params) =>
          params.row.is_movement ? "" : "tb-header-cell",
      },
      {
        field: "account_name",
        headerName: "Cuenta",
        flex: 1,
        minWidth: 300,
        renderCell: (params) => (
          <span
            style={{
              paddingLeft: Math.max(Number(params.row.level_no || 1) - 1, 0) * 16,
              fontWeight: params.row.is_movement ? 400 : 700,
            }}
          >
            {params.value}
          </span>
        ),
        cellClassName: (params) =>
          params.row.is_movement ? "" : "tb-header-cell",
      },
      {
        field: "account_type",
        headerName: "Tipo",
        width: 130,
      },
      {
        field: "nature",
        headerName: "Naturaleza",
        width: 130,
        renderCell: (params) => (
          <Chip
            size="small"
            color={params.value === "CREDIT" ? "success" : "primary"}
            label={params.value === "CREDIT" ? "Crédito" : "Débito"}
          />
        ),
      },
      {
        field: "total_debit",
        headerName: "Débitos",
        width: 150,
        type: "number",
        valueGetter: (params) =>
          Number(params.row.total_debit || params.row.debit || 0),
        valueFormatter: (params) =>
          Number(params.value || 0).toLocaleString("es-NI", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        cellClassName: (params) =>
          params.row.is_movement ? "" : "tb-header-cell",
      },
      {
        field: "total_credit",
        headerName: "Créditos",
        width: 150,
        type: "number",
        valueGetter: (params) =>
          Number(params.row.total_credit || params.row.credit || 0),
        valueFormatter: (params) =>
          Number(params.value || 0).toLocaleString("es-NI", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        cellClassName: (params) =>
          params.row.is_movement ? "" : "tb-header-cell",
      },
      {
        field: "balance",
        headerName: "Saldo",
        width: 150,
        type: "number",
        valueGetter: (params) =>
          Number(
            params.row.balance ??
              params.row.closing_balance ??
              Number(params.row.total_debit || params.row.debit || 0) -
                Number(params.row.total_credit || params.row.credit || 0),
          ),
        valueFormatter: (params) =>
          Number(params.value || 0).toLocaleString("es-NI", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        cellClassName: (params) =>
          params.row.is_movement ? "" : "tb-header-cell",
      },
    ],
    [],
  );

  const printReport = () => printAccountingReport({
    title: "Balance de Comprobación de Saldos",
    subtitle: "Forma E - Manual Único de Cuentas CONAMI",
    period: `Del ${filters.from_date || "inicio"} al ${filters.to_date || "corte"}`,
    columns: [
      { field: "muc_code", label: "Código" }, { field: "account_name", label: "Denominación" },
      { field: "previous_balance", label: "Saldo anterior", numeric: true, format: (v) => Number(v).toLocaleString("es-NI", { minimumFractionDigits: 2 }) },
      { field: "total_debit", label: "Cargos", numeric: true, format: (v) => Number(v).toLocaleString("es-NI", { minimumFractionDigits: 2 }) },
      { field: "total_credit", label: "Abonos", numeric: true, format: (v) => Number(v).toLocaleString("es-NI", { minimumFractionDigits: 2 }) },
      { field: "balance", label: "Saldo actual", numeric: true, format: (v) => Number(v).toLocaleString("es-NI", { minimumFractionDigits: 2 }) },
    ], rows,
  });

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
          <FactCheckIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Balance de Comprobación
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Validación de débitos y créditos contables
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            mb: 2,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "180px 180px 200px 130px 130px",
            },
            gap: 1,
          }}
        >
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

          <TextField
            select
            size="small"
            label="Cuentas a mostrar"
            value={filters.scope}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, scope: e.target.value }))
            }
          >
            <MenuItem value="ALL">Todas las cuentas</MenuItem>
            <MenuItem value="WITH_MOVEMENTS">Solo con movimientos</MenuItem>
          </TextField>

          <Button
            variant="outlined"
            onClick={fetchTrialBalance}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Generar
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={printReport} disabled={!rows.length}>Imprimir</Button>
          <ReportSignaturesDialog />
        </Box>

        <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            color="primary"
            label={`Débitos: ${Number(
              finalSummary.totalDebit || finalSummary.total_debit || 0,
            ).toLocaleString("es-NI", { minimumFractionDigits: 2 })}`}
          />

          <Chip
            color="success"
            label={`Créditos: ${Number(
              finalSummary.totalCredit || finalSummary.total_credit || 0,
            ).toLocaleString("es-NI", { minimumFractionDigits: 2 })}`}
          />

          <Chip
            color={
              finalSummary.balanced ||
              Math.abs(Number(finalSummary.difference || 0)) < 0.01
                ? "success"
                : "error"
            }
            label={`Diferencia: ${Number(
              finalSummary.difference || 0,
            ).toLocaleString("es-NI", { minimumFractionDigits: 2 })}`}
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
              "& .tb-header-cell": {
                backgroundColor: "#F1F5F9",
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
