import React, { useEffect, useMemo, useState } from "react";
import HelpButton from "./help/HelpButton";
import CollectorModal from "./CollectorModal";
import CollectorPortfolioDialog from "./CollectorPortfolioDialog";
import {
  Alert,
  Box,
  Chip,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
  Button,
  TextField,
  MenuItem,
  InputAdornment,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import EditIcon from "@mui/icons-material/Edit";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import SearchIcon from "@mui/icons-material/Search";
import API from "../api";
import ReportExportButtons from "./common/ReportExportButtons";
import { reportFilters } from "./common/reportFormat";

const BAC = {
  primary: "#0057B8",
  primaryDark: "#003E8A",
  soft: "#EAF2FF",
  bg: "#F6F8FC",
  border: "#D8E2F0",
  text: "#1F2937",
  muted: "#6B7280",
  white: "#FFFFFF",
};

const url = "/api/collectors/";

export default function CollectorList() {
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCollector, setSelectedCollector] = useState(null);
  // Cartera / traslado / baja del cobrador (CollectorPortfolioDialog).
  const [portfolioCollector, setPortfolioCollector] = useState(null);

  // Filtros (en pantalla, sobre la lista ya cargada).
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  const branchOptions = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => r.branch_id && map.set(String(r.branch_id), r.branch_name || `Sucursal ${r.branch_id}`));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return rows.filter((r) => {
      const active = Number(r.active ?? 1) === 1;
      if (statusFilter === "ACTIVE" && !active) return false;
      if (statusFilter === "INACTIVE" && active) return false;
      if (branchFilter && String(r.branch_id) !== branchFilter) return false;
      if (!q) return true;
      const haystack = `${r.id} ${r.name || ""} ${r.telephone || ""} ${r.branch_name || ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return haystack.includes(q);
    });
  }, [rows, search, branchFilter, statusFilter]);

  const [snackbar, setSnackbar] = useState({
    open: false,
    type: "success",
    message: "",
  });

  const openAddModal = () => {
    setSelectedCollector(null);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setSelectedCollector(row);
    setModalOpen(true);
  };

  const fetchCollectors = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await API.get(url);

      const jsonData = await response.data;
      setRows(Array.isArray(jsonData) ? jsonData : []);
    } catch (error) {
      console.error(error);
      setError("Ocurrió un error al cargar los colectores. Intente más tarde.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectors();
  }, []);

  const columns = useMemo(
    () => [
      {
        field: "id",
        headerName: "ID",
        width: 80,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "name",
        headerName: "Nombre",
        flex: 1,
        minWidth: 220,
        renderCell: (params) => (
          <Typography fontWeight={700} color={BAC.text} fontSize={14}>
            {params.value || "Sin nombre"}
          </Typography>
        ),
      },
      {
        field: "telephone",
        headerName: "Teléfono",
        width: 160,
        renderCell: (params) =>
          params.value ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <PhoneOutlinedIcon sx={{ fontSize: 17, color: BAC.primary }} />
              <Typography fontSize={14} color={BAC.text}>
                {params.value}
              </Typography>
            </Stack>
          ) : (
            <Typography fontSize={12} color={BAC.muted}>
              No registrado
            </Typography>
          ),
      },
      {
        field: "branch_name",
        headerName: "Sucursal",
        flex: 1,
        minWidth: 180,
        renderCell: (params) => (
          <Chip
            label={params.value || "Sin sucursal"}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: params.value ? BAC.soft : "#F3F4F6",
              color: params.value ? BAC.primaryDark : BAC.muted,
              border: `1px solid ${BAC.border}`,
            }}
          />
        ),
      },
      {
        field: "active",
        headerName: "Estado",
        width: 110,
        renderCell: (params) =>
          Number(params.value ?? 1) === 1 ? (
            <Chip label="Activo" size="small" color="success" variant="outlined" sx={{ fontWeight: 700 }} />
          ) : (
            <Tooltip title={params.row.deactivation_reason || ""}>
              <Chip label="Inactivo" size="small" sx={{ fontWeight: 700 }} />
            </Tooltip>
          ),
      },
      {
        field: "actions",
        headerName: "Acción",
        width: 120,
        headerAlign: "center",
        align: "center",
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.75}>
          <Tooltip title="Cartera: ver, trasladar a otro cobrador o dar de baja">
            <IconButton
              size="small"
              onClick={() => setPortfolioCollector(params.row)}
              sx={{
                color: BAC.primary,
                bgcolor: BAC.soft,
                border: `1px solid ${BAC.border}`,
                "&:hover": { bgcolor: BAC.primary, color: BAC.white },
              }}
            >
              <SwapHorizIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar colector">
            <IconButton
              size="small"
              onClick={() => openEditModal(params.row)}
              sx={{
                color: BAC.primary,
                bgcolor: BAC.soft,
                border: `1px solid ${BAC.border}`,
                "&:hover": {
                  bgcolor: BAC.primary,
                  color: BAC.white,
                },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          </Stack>
        ),
      },
    ],
    [],
  );

  const buildReport = () => ({
    title: "Listado de colectores",
    subtitle: reportFilters([
      ["Sucursal", branchFilter ? branchOptions.find(([id]) => id === branchFilter)?.[1] : ""],
      ["Estado", statusFilter === "ACTIVE" ? "Activos" : statusFilter === "INACTIVE" ? "Inactivos" : "Todos"],
      ["Búsqueda", search.trim()],
    ]),
    fileName: "colectores",
    sheetName: "Colectores",
    columns: [
      { field: "id", label: "ID" },
      { field: "name", label: "Nombre", format: (v) => v || "Sin nombre" },
      { field: "telephone", label: "Teléfono" },
      { field: "branch_name", label: "Sucursal", format: (v) => v || "Sin sucursal" },
      { label: "Estado", value: (r) => (Number(r.active ?? 1) === 1 ? "Activo" : "Inactivo") },
      { field: "deactivation_reason", label: "Motivo de baja" },
    ],
    rows: filteredRows,
    totals: [{ value: `${filteredRows.length} registros`, colspan: 6 }],
  });

  const handleSaved = async (alertData) => {
    setSnackbar({
      open: true,
      type: alertData.type,
      message: alertData.message,
    });

    await fetchCollectors();
  };

  return (
    <Box sx={{ width: "100%", mt: 3, px: { xs: 1, md: 2 } }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid ${BAC.border}`,
          bgcolor: BAC.white,
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2.2,
            background: `linear-gradient(135deg, ${BAC.primaryDark}, ${BAC.primary})`,
            color: BAC.white,
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.16)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GroupsOutlinedIcon />
              </Box>

              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                  <Typography variant="h6" fontWeight={800} lineHeight={1.1}>
                    Listado de colectores
                  </Typography>
                  <HelpButton screenKey="colectores.listado" sx={{ color: "white" }} />
                </Box>
                <Typography fontSize={13} sx={{ opacity: 0.85 }}>
                  Administración de colectores asignados por sucursal
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={filteredRows.length === rows.length ? `${rows.length} registros` : `${filteredRows.length} de ${rows.length} registros`}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.18)",
                  color: BAC.white,
                  fontWeight: 700,
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              />

              <Button
                variant="contained"
                onClick={openAddModal}
                sx={{
                  bgcolor: BAC.white,
                  color: BAC.primaryDark,
                  fontWeight: 800,
                  "&:hover": {
                    bgcolor: BAC.soft,
                  },
                }}
              >
                Agregar
              </Button>
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ p: 2.5, bgcolor: BAC.bg }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }}>
            <TextField
              size="small"
              placeholder="Buscar por nombre, teléfono o ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, bgcolor: BAC.white }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              size="small"
              label="Sucursal"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              sx={{ minWidth: 220, bgcolor: BAC.white }}
            >
              <MenuItem value="">Todas</MenuItem>
              {branchOptions.map(([id, name]) => (
                <MenuItem key={id} value={id}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 160, bgcolor: BAC.white }}
            >
              <MenuItem value="ACTIVE">Activos</MenuItem>
              <MenuItem value="INACTIVE">Inactivos</MenuItem>
              <MenuItem value="">Todos</MenuItem>
            </TextField>
            {(search || branchFilter || statusFilter !== "ACTIVE") && (
              <Button
                onClick={() => {
                  setSearch("");
                  setBranchFilter("");
                  setStatusFilter("ACTIVE");
                }}
              >
                Limpiar
              </Button>
            )}
            <ReportExportButtons report={buildReport} disabled={loading || !filteredRows.length} sx={{ bgcolor: BAC.white }} />
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Paper
            elevation={0}
            sx={{
              height: 520,
              width: "100%",
              borderRadius: 2.5,
              overflow: "hidden",
              border: `1px solid ${BAC.border}`,
              bgcolor: BAC.white,
            }}
          >
            <DataGrid
              rows={filteredRows}
              columns={columns}
              loading={loading}
              rowsPerPageOptions={[10, 25, 50]}
              initialState={{
                pagination: { pageSize: 10, page: 0 },
              }}
              disableSelectionOnClick
              getRowId={(row) => row.id}
              localeText={{
                noRowsLabel: "No hay colectores registrados",
              }}
              sx={{
                border: 0,
                fontSize: 14,
                color: BAC.text,

                "& .MuiDataGrid-columnHeaders": {
                  bgcolor: BAC.soft,
                  color: BAC.primaryDark,
                  fontWeight: 800,
                  borderBottom: `1px solid ${BAC.border}`,
                },

                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: 800,
                },

                "& .MuiDataGrid-row:hover": {
                  bgcolor: "#F8FBFF",
                },

                "& .MuiDataGrid-cell": {
                  borderBottom: `1px solid ${BAC.border}`,
                },

                "& .MuiDataGrid-footerContainer": {
                  borderTop: `1px solid ${BAC.border}`,
                  bgcolor: "#FBFCFE",
                },
              }}
            />
          </Paper>
        </Box>
      </Paper>

      <CollectorPortfolioDialog
        open={!!portfolioCollector}
        collector={portfolioCollector}
        collectors={rows}
        onClose={() => setPortfolioCollector(null)}
        onChanged={fetchCollectors}
      />

      <CollectorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        collectorSelected={selectedCollector}
        onSaved={handleSaved}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.type} variant="filled" sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
