import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import AddCircle from "./AddCircle";
import EmptyNotice from "./EmptyNotice";
import {
  Alert,
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

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

const url = process.env.REACT_APP_API_BASE_URL + "/api/risks";
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };

export default function RiskList() {
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

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
        field: "risk_name",
        headerName: "Nombre",
        flex: 1,
        minWidth: 180,
        renderCell: (params) => (
          <Typography fontWeight={700} color={BAC.text} fontSize={14}>
            {params.value}
          </Typography>
        ),
      },
      {
        field: "from_range",
        headerName: "Desde",
        width: 110,
        headerAlign: "right",
        align: "right",
      },
      {
        field: "to_range",
        headerName: "Hasta",
        width: 110,
        headerAlign: "right",
        align: "right",
      },
      {
        field: "value",
        headerName: "Valor",
        width: 110,
        headerAlign: "right",
        align: "right",
        renderCell: (params) => (
          <Chip
            label={params.value ?? 0}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: BAC.soft,
              color: BAC.primaryDark,
              border: `1px solid ${BAC.border}`,
            }}
          />
        ),
      },
      {
        field: "color",
        headerName: "Color",
        width: 120,
        headerAlign: "center",
        align: "center",
        sortable: false,
        renderCell: (params) => {
          const color = params.value;

          if (!color) {
            return (
              <Typography fontSize={12} color={BAC.muted}>
                —
              </Typography>
            );
          }

          return (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  backgroundColor: color,
                  border: `2px solid ${BAC.white}`,
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.18)",
                }}
              />
            </Stack>
          );
        },
      },
      {
        field: "edit",
        headerName: "Acción",
        width: 90,
        headerAlign: "center",
        align: "center",
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Tooltip title="Editar riesgo">
            <IconButton
              component={Link}
              to={`/riesgos/editar/${params.row.id}`}
              state={{ risk: params.row }}
              size="small"
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

  const fetchRisks = async () => {
    try {
      setLoading(true);
      setError(null);

      const resp = await fetch(url, { headers });
      if (!resp.ok) throw new Error(await resp.text());

      const data = await resp.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Ocurrió un error al cargar los riesgos. Intente más tarde.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisks();
  }, []);

  if (!loading && !error && rows.length === 0) {
    return <EmptyNotice route="/riesgos/agregar" />;
  }

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
                <ShieldOutlinedIcon />
              </Box>

              <Box>
                <Typography variant="h6" fontWeight={800} lineHeight={1.1}>
                  Listado de riesgos
                </Typography>
                <Typography fontSize={13} sx={{ opacity: 0.85 }}>
                  Administración de rangos, valores y colores de riesgo
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

              <AddCircle goTo="/riesgos/agregar" />
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ p: 2.5, bgcolor: BAC.bg }}>
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                borderRadius: 2,
                border: "1px solid #F3B4B4",
              }}
            >
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
              getRowId={(r) => r.id}
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

                "& .MuiTablePagination-root": {
                  color: BAC.text,
                },
              }}
            />
          </Paper>
        </Box>
      </Paper>
    </Box>
  );
}
