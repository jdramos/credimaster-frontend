import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import CancelIcon from "@mui/icons-material/Cancel";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import JournalForm from "./JournalForm";
import JournalDetailDialog from "./JournalDetailDialog";
import API from "../../api";

const API_URL = `/api/accounting/journal`;

export default function JournalList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedJournalId, setSelectedJournalId] = useState(null);
  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
    search: "",
  });

  const [alert, setAlert] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const showAlert = (message, severity = "success") => {
    setAlert({ open: true, severity, message });
  };

  const fetchJournal = async () => {
    try {
      setLoading(true);

      const params = {};
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      if (filters.search.trim()) params.search = filters.search.trim();

      const res = await API.get(API_URL, { params });

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.data?.rows)
            ? res.data.data.rows
            : [];

      setRows(data);
    } catch (error) {
      showAlert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Error cargando libro diario",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVoid = async (id) => {
    const ok = window.confirm("¿Seguro que deseas anular este comprobante?");
    if (!ok) return;

    try {
      await API.put(`{API_URL}/${id}/void`);

      showAlert("Comprobante anulado correctamente", "success");
      fetchJournal();
    } catch (error) {
      showAlert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Error anulando comprobante",
        "error",
      );
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "entry_number",
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
        width: 140,
        renderCell: (params) => (
          <Chip size="small" label={params.value || "MANUAL"} />
        ),
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

            <Tooltip title="Anular comprobante">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={params.row.status === "VOID"}
                  onClick={() => handleVoid(params.row.id)}
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              </span>
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
          border: "1px solid #E5E7EB",
          background: "#fff",
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
            <ReceiptLongIcon sx={{ color: "#0057B8" }} />

            <Box>
              <Typography variant="h6" fontWeight={700}>
                Libro Diario
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Comprobantes contables registrados en CrediMaster
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setFormOpen(true)}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              background: "#0057B8",
              "&:hover": { background: "#003E8A" },
            }}
          >
            Nuevo comprobante
          </Button>
        </Box>

        <Box
          sx={{
            mb: 2,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "180px 180px 1fr 120px",
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
            size="small"
            label="Buscar comprobante o descripción"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchJournal();
            }}
          />

          <Button
            variant="outlined"
            onClick={fetchJournal}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Buscar
          </Button>
        </Box>

        <Box sx={{ height: 620, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
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

      <JournalForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={fetchJournal}
      />

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
