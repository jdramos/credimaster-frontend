import React, { useContext, useEffect, useMemo, useState } from "react";
import HelpButton from "../help/HelpButton";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import JournalForm from "./JournalForm";
import JournalDetailDialog from "./JournalDetailDialog";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportExportButtons from "../common/ReportExportButtons";
import { reportFilters, reportMoney, reportPeriod } from "../common/reportFormat";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";

const API_URL = `/api/accounting/journal`;
const EMPTY_FILTERS = { from_date: "", to_date: "", search: "", branch_id: "", branch_name: "" };
// Máximo de filas por página que acepta el backend del libro diario.
const REPORT_PAGE_LIMIT = 500;

const SOURCE_LABELS = {
  BANKS: "Bancos",
  LOANS: "Créditos",
  CAJA: "Caja",
  HR: "Rec. Humanos",
  PAYMENTS: "Pagos",
  FIXED_ASSETS: "Activo Fijo",
  BUSINESS_DAY: "Cierre del día",
  PROVISIONS: "Provisiones",
  ADJUSTMENTS: "Ajustes",
};
const isManualSource = (sm) => !sm || ["MANUAL", "ACCOUNTING"].includes(sm);

export default function JournalList() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canCreateEntry = role === 1 || permissions.includes("contabilidad.asientos.crear");
  const canVoidEntry = role === 1 || permissions.includes("contabilidad.asientos.anular");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedJournalId, setSelectedJournalId] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidDate, setVoidDate] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // Filtros efectivamente consultados: se aplican al pulsar "Buscar"/Enter,
  // y la paginación (servidor) siempre pagina sobre estos.
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [rowCount, setRowCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [alert, setAlert] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const showAlert = (message, severity = "success") => {
    setAlert({ open: true, severity, message });
  };

  const buildParams = (pageNo, limit) => {
    const params = { page: pageNo, limit };
    if (appliedFilters.from_date) params.from_date = appliedFilters.from_date;
    if (appliedFilters.to_date) params.to_date = appliedFilters.to_date;
    if (appliedFilters.search.trim()) params.search = appliedFilters.search.trim();
    if (appliedFilters.branch_id) params.branch_id = appliedFilters.branch_id;
    return params;
  };

  const extractRows = (res) => (Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data?.data?.rows)
        ? res.data.data.rows
        : []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);

        const res = await API.get(API_URL, { params: buildParams(page + 1, pageSize), signal: controller.signal });

        const data = extractRows(res);

        setRows(data);
        setRowCount(Number(res.data?.pagination?.total ?? data.length) || 0);
      } catch (error) {
        if (error.name === "CanceledError" || controller.signal.aborted) return;
        showAlert(
          error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            "Error cargando libro diario",
          "error",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, page, pageSize, reloadKey]);

  // Imprimir/Excel: todas las páginas con los filtros consultados, no solo
  // la página visible.
  const fetchAllRows = async () => {
    const all = [];
    for (let pageNo = 1; ; pageNo += 1) {
      const res = await API.get(API_URL, { params: buildParams(pageNo, REPORT_PAGE_LIMIT) });
      const data = extractRows(res);
      all.push(...data);
      const totalPages = Number(res.data?.pagination?.totalPages) || 1;
      if (pageNo >= totalPages || data.length < REPORT_PAGE_LIMIT) break;
    }
    return all;
  };

  const buildReport = async () => {
    const reportRows = await fetchAllRows();
    const sum = (field) => reportRows.reduce((s, r) => s + Number(r[field] || 0), 0);
    return {
      title: "Libro Diario",
      subtitle: reportFilters([
        ["Sucursal", appliedFilters.branch_id ? appliedFilters.branch_name : "Todas"],
        ["Búsqueda", appliedFilters.search.trim()],
      ]),
      period: reportPeriod(appliedFilters.from_date, appliedFilters.to_date),
      fileName: `libro_diario_${appliedFilters.from_date || "inicio"}_${appliedFilters.to_date || "corte"}`,
      columns: [
        { field: "entry_no", label: "Comprobante" },
        { field: "entry_date", label: "Fecha", format: (v) => (v ? String(v).substring(0, 10) : "") },
        { field: "description", label: "Descripción" },
        { field: "source_module", label: "Origen", format: (v) => (isManualSource(v) ? "Manual" : SOURCE_LABELS[v] || v) },
        { field: "total_debit", label: "Débito", numeric: true, format: reportMoney },
        { field: "total_credit", label: "Crédito", numeric: true, format: reportMoney },
        { field: "status", label: "Estado", format: (v) => ((v || "POSTED") === "VOID" ? "Anulado" : "Aplicado") },
      ],
      rows: reportRows,
      totals: [
        { value: `Comprobantes: ${reportRows.length}`, colspan: 4 },
        { value: reportMoney(sum("total_debit")), numeric: true, raw: sum("total_debit") },
        { value: reportMoney(sum("total_credit")), numeric: true, raw: sum("total_credit") },
        { value: "" },
      ],
    };
  };

  // Recarga con los filtros/página actuales (tras crear, editar o anular).
  const fetchJournal = () => setReloadKey((k) => k + 1);

  // Aplica los filtros escritos y vuelve a la primera página.
  const applyFilters = () => {
    if (filters.from_date && filters.to_date && filters.from_date > filters.to_date) {
      showAlert("La fecha 'Desde' no puede ser posterior a 'Hasta'.", "warning");
      return;
    }
    setPage(0);
    setAppliedFilters({ ...filters });
  };

  const openVoid = (entry) => {
    setVoidTarget(entry);
    setVoidDate(String(entry.entry_date || "").slice(0, 10) || new Date().toISOString().slice(0, 10));
  };

  const openEdit = (entry) => {
    setDetailOpen(false);
    setEditId(entry.id);
    setFormOpen(true);
  };

  const confirmVoid = async () => {
    if (!voidTarget) return;
    if (voidDate && voidDate < String(voidTarget.entry_date || "").slice(0, 10)) {
      showAlert("La fecha de anulación no puede ser anterior a la del comprobante.", "warning");
      return;
    }
    try {
      setVoiding(true);
      await API.put(`${API_URL}/${voidTarget.id}/void`, { annulment_date: voidDate || null });
      showAlert("Comprobante anulado correctamente", "success");
      setVoidTarget(null);
      setDetailOpen(false);
      fetchJournal();
    } catch (error) {
      showAlert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Error anulando comprobante",
        "error",
      );
    } finally {
      setVoiding(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "entry_no",
        headerName: "Comprobante",
        width: 160,
      },
      {
        field: "entry_date",
        headerName: "Fecha",
        width: 130,
        valueGetter: (params) => {
          if (!params.value) return "";
          return String(params.value).substring(0, 10);
        },
      },
      {
        field: "description",
        headerName: "Descripción",
        flex: 1,
        minWidth: 280,
      },
      {
        field: "source_module",
        headerName: "Origen",
        width: 150,
        renderCell: (params) => {
          const sm = params.value;
          const manual = isManualSource(sm);
          return manual ? (
            <Tooltip title="Comprobante manual — se puede editar o anular desde aquí">
              <Chip size="small" color="success" variant="outlined" label="Manual" />
            </Tooltip>
          ) : (
            <Tooltip title={`Generado por ${SOURCE_LABELS[sm] || sm} — se edita/anula desde ese módulo`}>
              <Chip size="small" label={SOURCE_LABELS[sm] || sm} />
            </Tooltip>
          );
        },
      },
      {
        field: "total_debit",
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
        field: "total_credit",
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
        field: "status",
        headerName: "Estado",
        width: 130,
        renderCell: (params) => {
          const status = params.value || "POSTED";

          if (status === "VOID") {
            return <Chip size="small" color="error" label="Anulado" />;
          }

          return <Chip size="small" color="success" label="Aplicado" />;
        },
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 130,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Ver detalle">
              <IconButton
                size="small"
                onClick={() => {
                  setSelectedJournalId(params.row.id);
                  setDetailOpen(true);
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
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
          border: "1px solid var(--cm-border, #E5E7EB)",
          background: "var(--cm-paper, #fff)",
        }}
      >
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ReceiptLongIcon sx={{ color: "var(--cm-primary-text, #0057B8)" }} />

            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                <Typography variant="h6" fontWeight={700}>
                  Libro Diario
                </Typography>
                <HelpButton screenKey="contabilidad.libro-diario" />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Comprobantes contables registrados en CrediMaster
              </Typography>
            </Box>
          </Box>

          {canCreateEntry && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setEditId(null); setFormOpen(true); }}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                background: "#0057B8",
                "&:hover": { background: "#003E8A" },
              }}
            >
              Nuevo comprobante
            </Button>
          )}
        </Box>

        <Box
          sx={{
            mb: 2,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "180px 180px 200px 1fr 120px auto",
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

          <ReportBranchFilter
            value={filters.branch_id}
            onChange={(id, name) => setFilters((prev) => ({ ...prev, branch_id: id, branch_name: name }))}
          />

          <TextField
            size="small"
            label="Buscar comprobante o descripción"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
          />

          <Button
            variant="outlined"
            onClick={applyFilters}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Buscar
          </Button>

          <Box sx={{ display: "flex", gap: 1 }}>
            <ReportExportButtons report={buildReport} disabled={!rowCount} sx={{ borderRadius: 2 }} />
          </Box>
        </Box>

        <Box sx={{ height: 620, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            paginationMode="server"
            rowCount={rowCount}
            page={page}
            pageSize={pageSize}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newPageSize) => {
              setPage(0);
              setPageSize(newPageSize);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            disableSelectionOnClick
            sx={{
              border: "1px solid var(--cm-border, #E5E7EB)",
              borderRadius: 2,
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "var(--cm-surface, #F8FAFC)",
                fontWeight: 700,
              },
            }}
          />
        </Box>
      </Paper>

      <JournalForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditId(null); }}
        onSaved={fetchJournal}
        editId={editId}
      />

      <JournalDetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        journalId={selectedJournalId}
        canVoid={canVoidEntry}
        onRequestVoid={openVoid}
        canEdit={canCreateEntry}
        onRequestEdit={openEdit}
      />

      <Dialog open={Boolean(voidTarget)} onClose={() => !voiding && setVoidTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Anular comprobante {voidTarget?.entry_no || ""}</DialogTitle>
        <DialogContent dividers>
          <Alert severity="error" sx={{ mb: 2 }}>
            Esta acción revierte el efecto contable del comprobante y no se puede deshacer.
          </Alert>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Fecha de anulación"
            InputLabelProps={{ shrink: true }}
            value={voidDate}
            onChange={(e) => setVoidDate(e.target.value)}
            inputProps={{ min: String(voidTarget?.entry_date || "").slice(0, 10) }}
            helperText="Puede ser igual o posterior a la fecha del comprobante, nunca anterior."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoidTarget(null)} disabled={voiding} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={confirmVoid} disabled={voiding} sx={{ textTransform: "none" }}>
            {voiding ? "Anulando..." : "Anular comprobante"}
          </Button>
        </DialogActions>
      </Dialog>

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
