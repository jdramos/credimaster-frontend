import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { Link as RouterLink } from "react-router-dom";
import { UserContext } from "../../contexts/UserContext";
import { useAuth } from "../../contexts/AuthContext";
import API from "../../api";
import { printPicReport } from "../../reports/picReport";
import { printCustomerProfileReport } from "../../reports/customerProfileReport";

const url = "/api/customers";

const BAC = {
  primary: "#0057B8",
  primaryDark: "#003E8A",
  soft: "#EAF2FF",
  border: "#D7E6FA",
  text: "#1F2937",
  muted: "#6B7280",
};

const RISK_CHIP = {
  BAJO: { label: "BAJO", color: "success" },
  MEDIO: { label: "MEDIO", color: "warning" },
  ALTO: { label: "ALTO", color: "error" },
};

export default function CustomerList() {
  const { permissions = [], role, user } = useContext(UserContext);
  const { tenant } = useAuth();

  const company = {
    commercial_name: tenant?.commercial_name || tenant?.name || "",
    legal_name: tenant?.legal_name || tenant?.company_name || "",
    tax_id: tenant?.tax_id || tenant?.ruc || "",
    address: tenant?.address || "",
    phone: tenant?.phone || "",
    logo_url: tenant?.logo_url || "",
  };

  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [printingId, setPrintingId] = useState(null);
  const [printingProfileId, setPrintingProfileId] = useState(null);

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const [sortModel, setSortModel] = useState([{ field: "id", sort: "desc" }]);

  const [search, setSearch] = useState("");
  const [globalFilter, setGlobalFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snack, setSnack] = useState({
    type: "info",
    msg: "",
  });

  const debounceRef = useRef(null);

  const canCreate = role === 1 || permissions.includes("clientes.insertar");
  const canEdit = role === 1 || permissions.includes("clientes.editar");
  const canView = role === 1 || permissions.includes("clientes.ver");
  const canPrintPic = role === 1 || permissions.includes("cumplimiento.matriz_riesgo.ver");

  const showSnack = useCallback((type, msg) => {
    setSnack({ type, msg });
    setSnackOpen(true);
  }, []);

  const handlePrintPic = useCallback(
    async (customerId) => {
      try {
        setPrintingId(customerId);
        const { data } = await API.get(`/api/aml/customers/${customerId}/pic`);
        printPicReport({ company, user, customer: data.customer, screenings: data.screenings });
      } catch (err) {
        showSnack(
          "error",
          err?.response?.data?.message || "No se pudo generar el PIC del cliente",
        );
      } finally {
        setPrintingId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showSnack],
  );

  const handlePrintProfile = useCallback(
    async (customerId) => {
      try {
        setPrintingProfileId(customerId);
        const [customerRes, docsRes] = await Promise.all([
          API.get(`/api/customers/${customerId}`),
          API.get(`/api/customer-files/${customerId}/checklist`),
        ]);
        const payload = customerRes?.data?.data ?? customerRes?.data ?? {};
        const docsData = docsRes?.data;
        const documents = Array.isArray(docsData?.rows)
          ? docsData.rows
          : Array.isArray(docsData)
            ? docsData
            : [];
        printCustomerProfileReport({
          company,
          user,
          customer: payload.customer ?? {},
          guarantees: payload.guarantees ?? [],
          financialEvaluation: payload.financial_evaluation ?? null,
          documents,
        });
      } catch (err) {
        showSnack(
          "error",
          err?.response?.data?.message || "No se pudo generar la ficha del cliente",
        );
      } finally {
        setPrintingProfileId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showSnack],
  );

  const columns = useMemo(
    () => [
      {
        field: "id",
        headerName: "ID",
        width: 80,
      },
      {
        field: "customer_code",
        headerName: "Código",
        width: 130,
      },
      {
        field: "identification",
        headerName: "Identificación",
        width: 170,
      },
      {
        field: "customer_name",
        headerName: "Cliente",
        flex: 1,
        minWidth: 220,
        renderCell: (params) => (
          <Typography fontWeight={700} color={BAC.text}>
            {params.value || "-"}
          </Typography>
        ),
      },
      {
        field: "risk_level",
        headerName: "Riesgo LA/FT/FP",
        width: 140,
        renderCell: (params) => {
          const cfg = RISK_CHIP[params.value];
          if (!cfg) return <Chip size="small" label="Sin calcular" />;
          return <Chip size="small" label={cfg.label} color={cfg.color} />;
        },
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 210,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            {canEdit && (
              <Tooltip title="Editar cliente">
                <IconButton
                  size="small"
                  component={RouterLink}
                  to={`/clientes/editar/${params.row.id}`}
                  sx={{
                    color: BAC.primary,
                    bgcolor: BAC.soft,
                    "&:hover": {
                      bgcolor: BAC.border,
                    },
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {canView && (
              <Tooltip title="Ver cliente">
                <IconButton
                  size="small"
                  component={RouterLink}
                  to={`/clientes/ver/${params.row.id}`}
                  sx={{
                    color: BAC.primaryDark,
                    bgcolor: "#F3F4F6",
                    "&:hover": {
                      bgcolor: "#E5E7EB",
                    },
                  }}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {canPrintPic && (
              <Tooltip title="Imprimir PIC">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => handlePrintPic(params.row.id)}
                    disabled={printingId === params.row.id}
                    sx={{
                      color: "#0F766E",
                      bgcolor: "#ECFDF5",
                      "&:hover": {
                        bgcolor: "#D1FAE5",
                      },
                    }}
                  >
                    <PrintIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}

            {canView && (
              <Tooltip title="Imprimir ficha del cliente">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => handlePrintProfile(params.row.id)}
                    disabled={printingProfileId === params.row.id}
                    sx={{
                      color: BAC.primary,
                      bgcolor: BAC.soft,
                      "&:hover": {
                        bgcolor: BAC.border,
                      },
                    }}
                  >
                    <PrintIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Stack>
        ),
      },
    ],
    [
      canEdit,
      canView,
      canPrintPic,
      printingId,
      handlePrintPic,
      printingProfileId,
      handlePrintProfile,
    ],
  );

  const fetchData = useCallback(
    async (signal) => {
      setLoading(true);

      try {
        const sortBy = sortModel[0]?.field || "id";
        const sortDir = sortModel[0]?.sort || "desc";

        const params = {
          page: paginationModel.page + 1,
          pageSize: paginationModel.pageSize,
          sortBy,
          sortDir,
          search: globalFilter,
        };

        const res = await API.get(url, { params, signal });

        const payload = res?.data?.data ?? res?.data;
        const newRows = payload?.rows ?? [];
        const newTotal = payload?.total ?? 0;

        setRows(Array.isArray(newRows) ? newRows : []);
        setRowCount(Number(newTotal) || 0);
      } catch (err) {
        if (err.name === "CanceledError" || signal?.aborted) return;

        console.error(err);

        showSnack(
          "error",
          `Error al obtener clientes: ${
            err?.response?.data?.message || err.message || "Error desconocido"
          }`,
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [paginationModel, sortModel, globalFilter, showSnack],
  );

  useEffect(() => {
    const ac = new AbortController();

    fetchData(ac.signal);

    return () => ac.abort();
  }, [fetchData]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;

    setSearch(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setPaginationModel((prev) => ({
        ...prev,
        page: 0,
      }));
      setGlobalFilter(value.trim());
    }, 400);
  };

  const clearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    setSearch("");
    setGlobalFilter("");
    setPaginationModel((prev) => ({
      ...prev,
      page: 0,
    }));
  };

  const refresh = () => {
    const ac = new AbortController();
    fetchData(ac.signal);
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: "1px solid",
          borderColor: BAC.border,
          bgcolor: "#fff",
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.6,
            background: `linear-gradient(90deg, ${BAC.primaryDark}, ${BAC.primary})`,
            color: "#fff",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
            spacing={1.5}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h6" fontWeight={900}>
                  Clientes
                </Typography>

                <Chip
                  size="small"
                  label={`${rowCount} registros`}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.18)",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                />

                {loading && (
                  <CircularProgress
                    size={18}
                    thickness={5}
                    sx={{ color: "#fff" }}
                  />
                )}
              </Stack>

              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                Consulta, búsqueda y administración de clientes
              </Typography>
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <TextField
                size="small"
                placeholder="Buscar cliente..."
                value={search}
                onChange={handleSearchChange}
                sx={{
                  minWidth: { xs: "100%", sm: 320 },
                  bgcolor: "#fff",
                  borderRadius: 2,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="Limpiar búsqueda"
                        onClick={clearSearch}
                        size="small"
                        edge="end"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />

              <Tooltip title="Actualizar listado">
                <IconButton
                  onClick={refresh}
                  sx={{
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.35)",
                    borderRadius: 2,
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              {canCreate && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  component={RouterLink}
                  to="/clientes/agregar"
                  sx={{
                    bgcolor: "#fff",
                    color: BAC.primary,
                    fontWeight: 800,
                    borderRadius: 2,
                    px: 2,
                    "&:hover": {
                      bgcolor: BAC.soft,
                    },
                  }}
                >
                  Agregar
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ height: 560, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            rowCount={rowCount}
            loading={loading}
            paginationMode="server"
            sortingMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[5, 10, 20, 50, 100]}
            sortModel={sortModel}
            onSortModelChange={(model) => {
              setPaginationModel((prev) => ({
                ...prev,
                page: 0,
              }));
              setSortModel(model);
            }}
            disableRowSelectionOnClick
            density="compact"
            localeText={{
              noRowsLabel: "No hay clientes para mostrar",
              footerRowSelected: (count) =>
                count !== 1
                  ? `${count.toLocaleString()} filas seleccionadas`
                  : `${count.toLocaleString()} fila seleccionada`,
            }}
            sx={{
              border: 0,
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "#F8FAFC",
                color: BAC.text,
                fontWeight: 900,
                borderBottom: `1px solid ${BAC.border}`,
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: 900,
              },
              "& .MuiDataGrid-row:hover": {
                bgcolor: "#F8FBFF",
              },
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid #EEF2F7",
              },
              "& .MuiDataGrid-footerContainer": {
                borderTop: `1px solid ${BAC.border}`,
                bgcolor: "#FAFCFF",
              },
            }}
          />
        </Box>
      </Paper>

      <Snackbar
        open={snackOpen}
        autoHideDuration={3500}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity={snack.type}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
