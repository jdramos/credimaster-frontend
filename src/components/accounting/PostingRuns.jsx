import React, { useEffect, useMemo, useState } from "react";
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
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import API from "../../api";

export default function PostingRuns() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const [form, setForm] = useState({
    from_date: "",
    to_date: "",
    operation_type: "PAYMENT",
    posting_mode: "SUMMARY",
  });

  const [alert, setAlert] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const showAlert = (message, severity = "success") => {
    setAlert({
      open: true,
      severity,
      message,
    });
  };

  const fetchRuns = async () => {
    try {
      setLoading(true);

      const res = await API.get(`/api/accounting/posting-runs`);

      const json = await res.data;
      setRows(json || []);
    } catch (error) {
      showAlert(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handlePost = async () => {
    try {
      if (!form.from_date || !form.to_date) {
        showAlert("Debe seleccionar rango de fechas", "warning");
        return;
      }

      setPosting(true);

      const res = await API.handlePost(`/api/accounting/post-operations`, {
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Error contabilizando");
      }

      showAlert(json.message || "Contabilización realizada");

      fetchRuns();
    } catch (error) {
      showAlert(error.message, "error");
    } finally {
      setPosting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "id",
        headerName: "Run",
        width: 90,
      },
      {
        field: "from_date",
        headerName: "Desde",
        width: 120,
        valueGetter: (params) =>
          params.value ? String(params.value).substring(0, 10) : "",
      },
      {
        field: "to_date",
        headerName: "Hasta",
        width: 120,
        valueGetter: (params) =>
          params.value ? String(params.value).substring(0, 10) : "",
      },
      {
        field: "operation_type",
        headerName: "Operación",
        width: 180,
      },
      {
        field: "posting_mode",
        headerName: "Modo",
        width: 120,
        renderCell: (params) => (
          <Chip
            size="small"
            color={params.value === "SUMMARY" ? "primary" : "secondary"}
            label={params.value === "SUMMARY" ? "Resumido" : "Detallado"}
          />
        ),
      },
      {
        field: "total_operations",
        headerName: "Operaciones",
        width: 130,
      },
      {
        field: "total_debit",
        headerName: "Débito",
        width: 140,
        valueFormatter: (params) =>
          Number(params.value || 0).toLocaleString("es-NI", {
            minimumFractionDigits: 2,
          }),
      },
      {
        field: "total_credit",
        headerName: "Crédito",
        width: 140,
        valueFormatter: (params) =>
          Number(params.value || 0).toLocaleString("es-NI", {
            minimumFractionDigits: 2,
          }),
      },
      {
        field: "entry_no",
        headerName: "Comprobante",
        width: 170,
        renderCell: (params) => params.value || "-",
      },
      {
        field: "status",
        headerName: "Estado",
        width: 130,
        renderCell: (params) => {
          const status = params.value || "POSTED";

          if (status === "ERROR") {
            return <Chip size="small" color="error" label="Error" />;
          }

          if (status === "VOID") {
            return <Chip size="small" color="warning" label="Anulado" />;
          }

          return <Chip size="small" color="success" label="Contabilizado" />;
        },
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
            gap: 1,
            alignItems: "center",
          }}
        >
          <AutoFixHighIcon sx={{ color: "#0057B8" }} />

          <Box>
            <Typography variant="h6" fontWeight={700}>
              Contabilizar operaciones
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Generación automática de comprobantes
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            mb: 2,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "180px 180px 220px 180px 150px",
            },
            gap: 1,
          }}
        >
          <TextField
            size="small"
            label="Desde"
            type="date"
            value={form.from_date}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                from_date: e.target.value,
              }))
            }
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            size="small"
            label="Hasta"
            type="date"
            value={form.to_date}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                to_date: e.target.value,
              }))
            }
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            select
            size="small"
            label="Operación"
            value={form.operation_type}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                operation_type: e.target.value,
              }))
            }
          >
            <MenuItem value="PAYMENT">Pagos</MenuItem>

            <MenuItem value="LOAN_DISBURSEMENT">Desembolsos</MenuItem>

            <MenuItem value="PROVISION">Provisiones</MenuItem>

            <MenuItem value="DEFAULT_INTEREST">Mora</MenuItem>

            <MenuItem value="WRITEOFF">Castigos</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            label="Modo"
            value={form.posting_mode}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                posting_mode: e.target.value,
              }))
            }
          >
            <MenuItem value="SUMMARY">Resumido</MenuItem>

            <MenuItem value="DETAILED">Detallado</MenuItem>
          </TextField>

          <Button
            variant="contained"
            disabled={posting}
            onClick={handlePost}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              background: "#0057B8",
              "&:hover": {
                background: "#003E8A",
              },
            }}
          >
            Contabilizar
          </Button>
        </Box>

        <Box sx={{ height: 620 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 25,
                  page: 0,
                },
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
        onClose={() =>
          setAlert((prev) => ({
            ...prev,
            open: false,
          }))
        }
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <Alert
          severity={alert.severity}
          onClose={() =>
            setAlert((prev) => ({
              ...prev,
              open: false,
            }))
          }
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
