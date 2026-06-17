import React, { useEffect, useMemo, useState } from "react";
import AddCircle from "./AddCircle";
import CollectorModal from "./CollectorModal";
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
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import EditIcon from "@mui/icons-material/Edit";
import API from "../api";

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
        field: "actions",
        headerName: "Acción",
        width: 90,
        headerAlign: "center",
        align: "center",
        sortable: false,
        filterable: false,
        renderCell: (params) => (
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
        ),
      },
    ],
    [],
  );

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
                <Typography variant="h6" fontWeight={800} lineHeight={1.1}>
                  Listado de colectores
                </Typography>
                <Typography fontSize={13} sx={{ opacity: 0.85 }}>
                  Administración de colectores asignados por sucursal
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={`${rows.length} registros`}
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
              rows={rows}
              columns={columns}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
              }}
              disableRowSelectionOnClick
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
