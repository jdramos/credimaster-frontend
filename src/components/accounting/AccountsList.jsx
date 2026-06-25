import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Chip,
  Alert,
  Snackbar,
  Tooltip,
  Button,
  IconButton,
  alpha,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PrintIcon from "@mui/icons-material/Print";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import API from "../../api";
import BAC from "../../styles/bac";

const API_URL = `/api/accounting/accounts`;

export default function AccountsList() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const showAlert = (message, severity = "success") => {
    setAlert({ open: true, message, severity });
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);

      const params = {};
      if (search.trim()) params.search = search.trim();

      const res = await API.get(API_URL, { params });

      setRows(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (error) {
      showAlert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Error al cargar cuentas",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    fetchAccounts();
  };

  const columns = useMemo(
    () => [
      {
        field: "muc_code",
        headerName: "Código MUC",
        width: 140,
      },
      {
        field: "account_name",
        headerName: "Cuenta",
        flex: 1,
        minWidth: 260,
      },
      {
        field: "parent_code",
        headerName: "Padre",
        width: 130,
        renderCell: (params) => params.value || "-",
      },
      {
        field: "level_no",
        headerName: "Nivel",
        width: 90,
      },
      {
        field: "account_type",
        headerName: "Tipo",
        width: 140,
        renderCell: (params) => (
          <Chip size="small" label={params.value || "OTRO"} />
        ),
      },
      {
        field: "nature",
        headerName: "Naturaleza",
        width: 130,
        renderCell: (params) => (
          <Chip
            size="small"
            color={params.value === "DEBIT" ? "primary" : "success"}
            label={params.value === "DEBIT" ? "Débito" : "Crédito"}
          />
        ),
      },
      {
        field: "is_movement",
        headerName: "Movimiento",
        width: 130,
        renderCell: (params) =>
          Number(params.value) === 1 ? (
            <Chip size="small" color="success" label="Sí" />
          ) : (
            <Chip size="small" label="No" />
          ),
      },
      {
        field: "is_active",
        headerName: "Estado",
        width: 120,
        renderCell: (params) =>
          Number(params.value) === 1 ? (
            <Chip size="small" color="success" label="Activa" />
          ) : (
            <Chip size="small" color="error" label="Inactiva" />
          ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: () => (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Consultar movimientos">
              <IconButton size="small">
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Imprimir">
              <IconButton size="small">
                <PrintIcon fontSize="small" />
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
            <AccountTreeIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Catálogo de Cuentas CONAMI
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manual único de cuentas contables
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              background: "#0057B8",
              "&:hover": { background: "#003E8A" },
            }}
          >
            Nueva cuenta
          </Button>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAccounts}
          >
            Actualizar
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField
            size="small"
            label="Buscar por código o nombre"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            fullWidth
          />

          <Button
            variant="outlined"
            onClick={handleSearch}
            sx={{ textTransform: "none", borderRadius: 2 }}
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
