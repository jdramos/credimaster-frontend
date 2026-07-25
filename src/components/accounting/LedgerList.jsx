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
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { printAccountingReport } from "./printAccountingReport";
import JournalDetailDialog from "./JournalDetailDialog";

const money = (value) =>
  Number(value || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedJournalId, setSelectedJournalId] = useState(null);

  const handleOpenDetail = (journalEntryId) => {
    if (!journalEntryId) return;
    setSelectedJournalId(journalEntryId);
    setDetailOpen(true);
  };

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
      const res = await API.get("/api/accounting/accounts", {
        params: { is_active: 1 },
      });

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

      setAccounts(data.filter((acc) => Number(acc.is_movement) === 1));
    } catch (error) {
      showAlert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Error cargando cuentas contables",
        "error",
      );
    }
  };

  const fetchLedger = async () => {
    if (!selectedAccount?.id) {
      showAlert("Debe seleccionar una cuenta contable", "warning");
      return;
    }

    try {
      setLoading(true);

      const params = {
        account_id: selectedAccount.id,
      };

      if (filters.from_date) params.start_date = filters.from_date;
      if (filters.to_date) params.end_date = filters.to_date;

      const res = await API.get("/api/accounting/ledger", { params });

      // La respuesta es { ok, data: [...], summary: {...} } — data y summary
      // son hermanos, no summary anidado dentro de data. "res.data?.data ||
      // res.data" fallaba en cuanto data era un array (siempre truthy,
      // incluso vacío []), dejando el resto del código leyendo summary
      // desde el array de movimientos — por eso "Saldo inicial" nunca
      // aparecía en pantalla.
      const payload = res.data || {};

      setRows(
        Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload.movements)
            ? payload.movements
            : Array.isArray(payload.rows)
              ? payload.rows
              : Array.isArray(payload)
                ? payload
                : [],
      );

      setSummary(payload.summary || null);
    } catch (error) {
      showAlert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Error cargando mayor general",
        "error",
      );
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
        renderCell: (params) =>
          params.row.journal_entry_id ? (
            <Button
              size="small"
              onClick={() => handleOpenDetail(params.row.journal_entry_id)}
              sx={{ textTransform: "none", minWidth: 0, p: 0, fontWeight: 700 }}
            >
              {params.value}
            </Button>
          ) : (
            params.value
          ),
      },
      {
        field: "description",
        headerName: "Descripción",
        flex: 1,
        minWidth: 280,
        // El backend expone la descripción de la línea (line_description) y
        // la del comprobante (entry_description) por separado, no un campo
        // "description" plano — sin esto la columna quedaba siempre vacía.
        // La línea es más específica; si no tiene una propia, se usa la del
        // comprobante (que siempre existe, es NOT NULL).
        valueGetter: (params) =>
          params.row.line_description || params.row.entry_description || "",
      },
      {
        field: "debit",
        headerName: "Débito",
        width: 140,
        type: "number",
        valueFormatter: (params) => money(params.value),
      },
      {
        field: "credit",
        headerName: "Crédito",
        width: 140,
        type: "number",
        valueFormatter: (params) => money(params.value),
      },
      {
        field: "balance",
        headerName: "Saldo",
        width: 150,
        type: "number",
        valueFormatter: (params) => money(params.value),
      },
    ],
    [],
  );

  // Fila sintética de "Saldo Inicial" al principio del mayor — solo
  // informativa (no tiene journal_entry_id, el comprobante no es clicable
  // en esta fila) y visible tanto en pantalla como en el reporte impreso,
  // ya que displayRows alimenta a ambos.
  const displayRows = useMemo(() => {
    if (!summary) return rows;

    const openingRow = {
      id: "opening-balance",
      entry_date: filters.from_date || "",
      entry_no: "",
      entry_description: "Saldo Inicial",
      line_description: "",
      debit: null,
      credit: null,
      balance: summary.opening_balance,
    };

    return [openingRow, ...rows];
  }, [rows, summary, filters.from_date]);

  const printReport = () => {
    if (!selectedAccount) return;

    printAccountingReport({
      title: "Mayor General",
      subtitle: `${selectedAccount.muc_code} - ${selectedAccount.account_name}`,
      period: filters.from_date || filters.to_date
        ? `${filters.from_date || "..."} a ${filters.to_date || "..."}`
        : "",
      columns: [
        { field: "entry_date", label: "Fecha", value: (row) => (row.entry_date ? String(row.entry_date).substring(0, 10) : "") },
        { field: "entry_no", label: "Comprobante" },
        { field: "description", label: "Descripción", value: (row) => row.line_description || row.entry_description || "" },
        { field: "debit", label: "Débito", numeric: true, format: money },
        { field: "credit", label: "Crédito", numeric: true, format: money },
        { field: "balance", label: "Saldo", numeric: true, format: money },
      ],
      rows: displayRows,
      totals: summary
        ? [
            { value: `Totales (saldo inicial: ${money(summary.opening_balance)})`, colspan: 3 },
            { value: money(summary.total_debit), numeric: true },
            { value: money(summary.total_credit), numeric: true },
            { value: money(summary.closing_balance), numeric: true },
          ]
        : [],
    });
  };

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
              md: "2fr 180px 180px 120px 120px",
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

          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={printReport}
            disabled={!displayRows.length}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Imprimir
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
            rows={displayRows}
            columns={columns}
            loading={loading}
            getRowId={(row) =>
              row.id ||
              row.journal_line_id ||
              `${row.journal_entry_id}-${row.account_id}-${row.entry_date}-${row.debit}-${row.credit}`
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

      <JournalDetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        journalId={selectedJournalId}
      />

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
