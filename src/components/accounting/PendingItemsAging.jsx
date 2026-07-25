import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Snackbar,
  TextField,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import API from "../../api";

const money = (v) =>
  Number(v || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function PendingItemsAging() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    as_of_date: "",
    deadline_days: 30,
  });

  const [alert, setAlert] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const showAlert = (message, severity = "error") => {
    setAlert({ open: true, severity, message });
  };

  const fetchAging = async () => {
    try {
      setLoading(true);

      const params = {};
      if (filters.as_of_date) params.as_of_date = filters.as_of_date;
      if (filters.deadline_days) params.deadline_days = filters.deadline_days;

      const res = await API.get("/api/accounting/pending-items-aging", {
        params,
      });

      const json = res.data || {};

      if (json.ok === false) {
        throw new Error(json.message || "Error cargando antigüedad de partidas pendientes");
      }

      setData(json);
    } catch (error) {
      showAlert(
        error.response?.data?.message ||
          error.message ||
          "Error cargando antigüedad de partidas pendientes",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { field: "entry_date", headerName: "Fecha", width: 120 },
    { field: "entry_no", headerName: "Comprobante", width: 150 },
    { field: "description", headerName: "Descripción", flex: 1, minWidth: 200 },
    {
      field: "amount",
      headerName: "Monto pendiente",
      width: 160,
      type: "number",
      valueFormatter: (params) => money(params.value),
    },
    {
      field: "age_days",
      headerName: "Antigüedad (días)",
      width: 150,
      type: "number",
    },
    {
      field: "overdue",
      headerName: "Estado",
      width: 150,
      renderCell: (params) => (
        <Chip
          size="small"
          color={params.value ? "error" : "success"}
          label={params.value ? "Vencida" : "En plazo"}
        />
      ),
    },
  ];

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
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
          <HourglassBottomIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Antigüedad de Partidas Pendientes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cuentas transitorias 1909/2901 — Operaciones Pendientes de Imputación
            </Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Según el Cap. I del MUC, estas partidas deben regularizarse en un plazo
          máximo de 30 días calendario (operaciones en el país) o 45 días
          calendario (operaciones con el exterior), y no deben quedar con saldo al
          cierre de ejercicio. Este reporte usa 30 días como plazo general por
          defecto.
        </Alert>

        <Box
          sx={{
            mb: 2,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "200px 200px 130px" },
            gap: 1,
          }}
        >
          <TextField
            size="small"
            label="Corte al"
            type="date"
            value={filters.as_of_date}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, as_of_date: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
            helperText="Vacío = hoy"
          />

          <TextField
            size="small"
            label="Plazo (días)"
            type="number"
            value={filters.deadline_days}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, deadline_days: e.target.value }))
            }
          />

          <Button
            variant="outlined"
            onClick={fetchAging}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Generar
          </Button>
        </Box>

        {data && (
          <>
            <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip
                color="primary"
                label={`Saldo pendiente total: ${money(data.summary.open_balance)}`}
              />
              <Chip
                color={data.summary.overdue_balance > 0 ? "error" : "success"}
                label={`Vencido: ${money(data.summary.overdue_balance)}`}
              />
              <Chip
                label={`Partida más antigua: ${data.summary.oldest_age_days} días`}
              />
              <Chip
                label={`Cuentas con pendientes: ${data.summary.accounts_with_pending_items}`}
              />
            </Box>

            {data.accounts.length === 0 && (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                No hay partidas pendientes en las cuentas transitorias — nada que
                regularizar.
              </Alert>
            )}

            {data.accounts.map((account) => (
              <Accordion
                key={account.account_id}
                defaultExpanded
                sx={{ mb: 1, border: "1px solid #E5E7EB", borderRadius: 2, "&:before": { display: "none" } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: "flex", gap: 2, alignItems: "center", width: "100%" }}>
                    <Typography fontWeight={700}>
                      {account.muc_code} — {account.account_name}
                    </Typography>
                    <Chip size="small" label={`Saldo: ${money(account.open_balance)}`} />
                    {account.overdue_balance > 0 && (
                      <Chip
                        size="small"
                        color="error"
                        label={`Vencido: ${money(account.overdue_balance)}`}
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ height: 300 }}>
                    <DataGrid
                      rows={account.items}
                      columns={columns}
                      getRowId={(row) => `${row.entry_no}-${row.entry_date}-${row.amount}`}
                      loading={loading}
                      disableRowSelectionOnClick
                      hideFooter={account.items.length <= 10}
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
                </AccordionDetails>
              </Accordion>
            ))}
          </>
        )}
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
