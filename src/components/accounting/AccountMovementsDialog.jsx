import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Chip,
  Typography,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import CloseIcon from "@mui/icons-material/Close";
import API from "../../api";
import JournalDetailDialog from "./JournalDetailDialog";

const money = (value) =>
  Number(value || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Movimientos de una cuenta para el mismo período/sucursal que se está
// consultando en la pantalla que abre este diálogo (Balance de
// Comprobación, Balance General, etc.) -- reusa /api/accounting/ledger,
// el mismo endpoint que ya usa el Mayor General (LedgerList.jsx), así que
// el saldo inicial/corrido sale calculado igual en los dos lugares.
export default function AccountMovementsDialog({ open, onClose, account, filters }) {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedJournalId, setSelectedJournalId] = useState(null);

  useEffect(() => {
    if (!open || !account?.account_id) return;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const params = { account_id: account.account_id };
        if (filters?.from_date) params.start_date = filters.from_date;
        if (filters?.to_date) params.end_date = filters.to_date;
        if (filters?.branch_id) params.branch_id = filters.branch_id;

        const res = await API.get("/api/accounting/ledger", { params });
        const payload = res.data || {};
        setRows(Array.isArray(payload.data) ? payload.data : []);
        setSummary(payload.summary || null);
      } catch (err) {
        setError(
          err.response?.data?.message || err.response?.data?.error || err.message || "Error cargando los movimientos de la cuenta",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, account?.account_id, filters?.from_date, filters?.to_date, filters?.branch_id]);

  const displayRows = useMemo(() => {
    if (!summary) return rows;
    const openingRow = {
      id: "opening-balance",
      entry_date: filters?.from_date || "",
      entry_no: "",
      entry_description: "Saldo Inicial",
      line_description: "",
      debit: null,
      credit: null,
      balance: summary.opening_balance,
    };
    return [openingRow, ...rows];
  }, [rows, summary, filters?.from_date]);

  const columns = useMemo(
    () => [
      {
        field: "entry_date",
        headerName: "Fecha",
        width: 100,
        valueGetter: (params) => (params.value ? String(params.value).substring(0, 10) : ""),
      },
      {
        field: "entry_no",
        headerName: "Comprobante",
        width: 120,
        renderCell: (params) =>
          params.row.journal_entry_id ? (
            <Button
              size="small"
              onClick={() => { setSelectedJournalId(params.row.journal_entry_id); setDetailOpen(true); }}
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
        minWidth: 180,
        valueGetter: (params) => params.row.line_description || params.row.entry_description || "",
      },
      { field: "debit", headerName: "Débito", width: 110, type: "number", valueFormatter: (params) => money(params.value) },
      { field: "credit", headerName: "Crédito", width: 110, type: "number", valueFormatter: (params) => money(params.value) },
      { field: "balance", headerName: "Saldo", width: 120, type: "number", valueFormatter: (params) => money(params.value) },
    ],
    [],
  );

  const periodLabel = filters?.from_date || filters?.to_date
    ? `${filters.from_date || "..."} al ${filters.to_date || "..."}`
    : "Todo el histórico";

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={800}>
              {account?.muc_code} — {account?.account_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Movimientos del {periodLabel}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {error && <Typography color="error" variant="body2" sx={{ mb: 1 }}>{error}</Typography>}

          {summary && (
            <Box sx={{ mb: 1.5, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip label={`Saldo inicial: ${money(summary.opening_balance)}`} />
              <Chip color="primary" label={`Débitos: ${money(summary.total_debit)}`} />
              <Chip color="success" label={`Créditos: ${money(summary.total_credit)}`} />
              <Chip color="warning" label={`Saldo final: ${money(summary.closing_balance)}`} />
            </Box>
          )}

          <Box sx={{ height: 420 }}>
            <DataGrid
              rows={displayRows}
              columns={columns}
              loading={loading}
              getRowId={(row) => row.id || `${row.journal_entry_id}-${row.entry_date}-${row.debit}-${row.credit}`}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
              disableRowSelectionOnClick
              sx={{
                border: "1px solid #E5E7EB",
                borderRadius: 2,
                "& .MuiDataGrid-columnHeaders": { backgroundColor: "#F8FAFC", fontWeight: 700 },
              }}
            />
          </Box>

          {!loading && !error && rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
              Esta cuenta no tiene movimientos en el período consultado.
            </Typography>
          )}
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} sx={{ textTransform: "none" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <JournalDetailDialog open={detailOpen} onClose={() => setDetailOpen(false)} journalId={selectedJournalId} />
    </>
  );
}
