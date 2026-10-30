import React, { useEffect, useMemo, useState } from "react";
import HelpButton from "./help/HelpButton";
import PromoterModal from "./PromoterModal";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
  TextField,
  MenuItem,
  InputAdornment,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import EditIcon from "@mui/icons-material/Edit";
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

const url = "/api/promoters";
// Marcas diacríticas (acentos) tras normalize("NFD"): la búsqueda no distingue acentos.
const ACCENTS = /[\u0300-\u036f]/g;

export default function PromoterList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPromoter, setSelectedPromoter] = useState(null);

  // Filtros (en pantalla, sobre la lista ya cargada).
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  const branchOptions = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => r.branch_id && map.set(String(r.branch_id), r.branch_name || `Sucursal ${r.branch_id}`));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const norm = (v) => String(v || "").toLowerCase().normalize("NFD").replace(ACCENTS, "");
    const q = norm(search.trim());
    return rows.filter((r) => {
      if (branchFilter && String(r.branch_id) !== branchFilter) return false;
      if (!q) return true;
      return norm(`${r.id} ${r.name} ${r.identification} ${r.telephone} ${r.branch_name}`).includes(q);
    });
  }, [rows, search, branchFilter]);

  const [snackbar, setSnackbar] = useState({
    open: false,
    type: "success",
    message: "",
  });

  const openAddModal = () => {
    setSelectedPromoter(null);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setSelectedPromoter(row);
    setModalOpen(true);
  };

  const fetchPromoters = async () => {
    try {
      setLoading(true);

      const response = await API.get(url);
      const jsonData = await response.data;

      setRows(Array.isArray(jsonData) ? jsonData : []);
    } catch (error) {
      console.error(error);
      setSnackbar({
        open: true,
        type: "error",
        message: "Ocurrió un error al cargar los promotores.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoters();
  }, []);

  const handleSaved = async (alertData) => {
    setSnackbar({
      open: true,
      type: alertData.type || "success",
      message: alertData.message || "Registro guardado correctamente.",
    });

    await fetchPromoters();
  };

  const buildReport = () => ({
    title: "Listado de promotores",
    subtitle: reportFilters([
      ["Sucursal", branchFilter ? branchOptions.find(([id]) => id === branchFilter)?.[1] : ""],
      ["Búsqueda", search.trim()],
    ]),
    fileName: "promotores",
    sheetName: "Promotores",
    columns: [
      { field: "id", label: "ID" },
      { field: "name", label: "Nombre", format: (v) => v || "Sin nombre" },
      { field: "identification", label: "Identificación" },
      { field: "telephone", label: "Teléfono" },
      { field: "branch_name", label: "Sucursal", format: (v) => v || "Sin sucursal" },
    ],
    rows: filteredRows,
    totals: [{ value: `${filteredRows.length} registros`, colspan: 5 }],
  });

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
          <Typography fontWeight={700} color={`var(--cm-text, ${BAC.text})`} fontSize={14}>
            {params.value || "Sin nombre"}
          </Typography>
        ),
      },
      {
        field: "identification",
        headerName: "Identificación",
        width: 170,
        renderCell: (params) => (
          <Stack direction="row" spacing={1} alignItems="center">
            <BadgeOutlinedIcon sx={{ fontSize: 17, color: `var(--cm-primary-text, ${BAC.primary})` }} />
            <Typography fontSize={14} color={`var(--cm-text, ${BAC.text})`}>
              {params.value || "No registrada"}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "telephone",
        headerName: "Teléfono",
        width: 160,
        renderCell: (params) =>
          params.value ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <PhoneOutlinedIcon sx={{ fontSize: 17, color: `var(--cm-primary-text, ${BAC.primary})` }} />
              <Typography fontSize={14} color={`var(--cm-text, ${BAC.text})`}>
                {params.value}
              </Typography>
            </Stack>
          ) : (
            <Typography fontSize={12} color={`var(--cm-text-2, ${BAC.muted})`}>
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
              bgcolor: params.value ? `var(--cm-soft, ${BAC.soft})` : "var(--cm-surface, #F3F4F6)",
              color: params.value ? `var(--cm-primary-text, ${BAC.primaryDark})` : `var(--cm-text-2, ${BAC.muted})`,
              border: `1px solid var(--cm-border, ${BAC.border})`,
            }}
          />
        ),
      },
      {
        field: "actions",
        headerName: "Acción",
        width: 90,
        headerAlign: "center",
        align: "center",
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Tooltip title="Editar promotor">
            <IconButton
              size="small"
              onClick={() => openEditModal(params.row)}
              sx={{
                color: `var(--cm-primary-text, ${BAC.primary})`,
                bgcolor: `var(--cm-soft, ${BAC.soft})`,
                border: `1px solid var(--cm-border, ${BAC.border})`,
                "&:hover": {
                  bgcolor: BAC.primary,
                  color: BAC.white,
                },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [],
  );

  return (
    <Box sx={{ width: "100%", mt: 3, px: { xs: 1, md: 2 } }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid var(--cm-border, ${BAC.border})`,
          bgcolor: `var(--cm-paper, ${BAC.white})`,
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
                    Listado de promotores
                  </Typography>
                  <HelpButton screenKey="promotores.listado" sx={{ color: "white" }} />
                </Box>
                <Typography fontSize={13} sx={{ opacity: 0.85 }}>
                  Administración de promotores asignados por sucursal
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
                  bgcolor: `var(--cm-paper, ${BAC.white})`,
                  color: `var(--cm-primary-text, ${BAC.primaryDark})`,
                  fontWeight: 800,
                  borderRadius: 2,
                  textTransform: "none",
                  "&:hover": {
                    bgcolor: `var(--cm-soft, ${BAC.soft})`,
                  },
                }}
              >
                Agregar promotor
              </Button>
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ p: 2.5 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }}>
            <TextField
              size="small"
              placeholder="Buscar por nombre, identificación, teléfono o ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, bgcolor: `var(--cm-paper, ${BAC.white})` }}
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
              sx={{ minWidth: 220, bgcolor: `var(--cm-paper, ${BAC.white})` }}
            >
              <MenuItem value="">Todas</MenuItem>
              {branchOptions.map(([id, name]) => (
                <MenuItem key={id} value={id}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
            {(search || branchFilter) && (
              <Button
                onClick={() => {
                  setSearch("");
                  setBranchFilter("");
                }}
              >
                Limpiar
              </Button>
            )}
            <ReportExportButtons report={buildReport} disabled={loading || !filteredRows.length} sx={{ bgcolor: `var(--cm-paper, ${BAC.white})` }} />
          </Stack>

          <Box
            sx={{
              height: 520,
              width: "100%",
              bgcolor: `var(--cm-paper, ${BAC.white})`,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <DataGrid
              rows={filteredRows}
              columns={columns}
              loading={loading}
              rowsPerPageOptions={[10, 25, 50]}
              initialState={{
                pagination: {
                    pageSize: 10,
                    page: 0
                  },
              }}
              disableSelectionOnClick
              getRowId={(row) => row.id}
              localeText={{
                noRowsLabel: "No hay promotores registrados",
              }}
              sx={{
                border: 0,
                fontSize: 14,
                color: `var(--cm-text, ${BAC.text})`,

                "& .MuiDataGrid-columnHeaders": {
                  bgcolor: `var(--cm-soft, ${BAC.soft})`,
                  color: `var(--cm-primary-text, ${BAC.primaryDark})`,
                  fontWeight: 800,
                  borderBottom: `1px solid var(--cm-border, ${BAC.border})`,
                },

                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: 800,
                },

                "& .MuiDataGrid-row": {
                  transition: "all .15s ease",
                },

                "& .MuiDataGrid-row:hover": {
                  bgcolor: "var(--cm-paper, #F8FBFF)",
                },

                "& .MuiDataGrid-cell": {
                  borderBottom: `1px solid var(--cm-border, ${BAC.border})`,
                },

                "& .MuiDataGrid-footerContainer": {
                  borderTop: `1px solid var(--cm-border, ${BAC.border})`,
                  bgcolor: "var(--cm-paper, #FBFCFE)",
                },

                "& .MuiDataGrid-overlay": {
                  color: `var(--cm-text-2, ${BAC.muted})`,
                  fontWeight: 600,
                },

                "& .MuiTablePagination-root": {
                  color: `var(--cm-text, ${BAC.text})`,
                },
              }}
            />
          </Box>
        </Box>
      </Paper>

      <PromoterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        promoterSelected={selectedPromoter}
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
