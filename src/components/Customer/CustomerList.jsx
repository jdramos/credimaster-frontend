import React, { useEffect, useMemo, useState, useContext, useRef } from "react";
import {
  Box, Paper, Toolbar, Tooltip, Typography, TextField, InputAdornment,
  IconButton, Snackbar, Alert, Stack, Button, CircularProgress
} from "@mui/material";
import { Search as SearchIcon, Clear as ClearIcon, Add as AddIcon, Refresh as RefreshIcon } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import Show from "@mui/icons-material/Visibility";
import { Link as RouterLink, Link } from "react-router-dom";
import { UserContext } from "../../contexts/UserContext";
import API from "../../api";

const url = "/api/customers";

export default function CustomerList() {
  const { permissions, role } = useContext(UserContext);

  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);

  // DataGrid server state
  const [page, setPage] = useState(0);      // 0-based
  const [pageSize, setPageSize] = useState(10);
  const [sortModel, setSortModel] = useState([{ field: "id", sort: "desc" }]);

  // search
  const [search, setSearch] = useState("");
  const [globalFilter, setGlobalFilter] = useState("");
  const debounceRef = useRef(null);

  // ui
  const [loading, setLoading] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snack, setSnack] = useState({ type: "info", msg: "" });

  const canCreate = role === 1 || permissions?.includes("clientes.crear");

  const columns = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 70 },
      { field: "customer_code", headerName: "Código", width: 120 },
      { field: "identification", headerName: "Identificación", width: 160 },
      { field: "customer_name", headerName: "Nombre del cliente", flex: 1, minWidth: 150 },
      {
        field: "actions",
        headerName: "Acciones",
        width: 130,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Box>
            {(role === 1 || permissions.includes("clientes.editar")) && (
              <Tooltip title="Editar">
                <Link to={`/clientes/editar/${params.row.id}`} >
                  <IconButton size="small">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Link>
              </Tooltip>
            )}
            {(role === 1 || permissions.includes("clientes.mostrar")) && (
              <Tooltip title="Mostrar">
                <Link to={`/clientes/ver/${params.row.id}`}>
                  <IconButton size="small">
                    <Show fontSize="small" />
                  </IconButton>
                </Link>
              </Tooltip>
            )}
          </Box>
        ),
      },
    ],
    [permissions, role]
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0); // reset a primera página
      setGlobalFilter(value.trim());
    }, 350);
  };

  const clearSearch = () => {
    setSearch("");
    setGlobalFilter("");
    setPage(0);
  };

  const fetchData = async (signal) => {
    setLoading(true);
    try {
      const sortBy = sortModel[0]?.field || "id";
      const sortDir = sortModel[0]?.sort || "desc";

      const params = {
        page: page + 1,          // API base 1
        pageSize,
        sortBy,
        sortDir,
        search: globalFilter,     // ✅ usa el debounced
      };

      const res = await API.get(url, { params, signal });

      // ✅ Soporta ambas respuestas:
      // 1) tu back anterior: { rows, total }
      // 2) mi back recomendado: { ok, data: { rows,total } }
      const payload = res?.data?.data ?? res?.data;

      const newRows = payload?.rows ?? [];
      const newTotal = payload?.total ?? 0;

      setRows(Array.isArray(newRows) ? newRows : []);
      setRowCount(Number(newTotal) || 0);
    } catch (err) {
      if (signal?.aborted) return;
      console.error(err);
      setSnack({ type: "error", msg: `Error al obtener clientes: ${err?.response?.data?.message ?? err.message}` });
      setSnackOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    fetchData(ac.signal);
    return () => ac.abort();
  }, [page, pageSize, sortModel, globalFilter]);

  const refresh = () => {
    const ac = new AbortController();
    fetchData(ac.signal);
    return () => ac.abort();
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ mb: 2, p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        <Toolbar disableGutters sx={{ justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={700}>
              Listado de clientes
            </Typography>
            {loading && <CircularProgress size={20} />}
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: "100%", sm: 520 }, flexShrink: 0 }}>
            <TextField
              size="small"
              placeholder="Buscar por identificación o nombre…"
              fullWidth
              value={search}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton aria-label="Limpiar búsqueda" edge="end" onClick={clearSearch} size="small">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />

            <IconButton aria-label="Refrescar" onClick={refresh}>
              <RefreshIcon />
            </IconButton>

            {canCreate && (
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} mt={2}>
              <Button variant="contained" 
              startIcon={<AddIcon />} 
              component={RouterLink} 
              to="/clientes/agregar" 
              sx={{ borderRadius: 2, px: 2 , ml: 1}}>
                Agregar
              </Button>
              </Box>
            )}
          </Stack>
        </Toolbar>

        <div style={{ height: 540, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(r) => r.id}
            rowCount={rowCount}
            loading={loading}
            paginationMode="server"
            sortingMode="server"
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              setPage(model.page);
              setPageSize(model.pageSize);
            }}
            pageSizeOptions={[5, 10, 20, 50]}
            sortModel={sortModel}
            onSortModelChange={setSortModel}
            disableRowSelectionOnClick
          />
        </div>
      </Paper>

      <Snackbar open={snackOpen} autoHideDuration={3500} onClose={() => setSnackOpen(false)}>
        <Alert onClose={() => setSnackOpen(false)} severity={snack.type} variant="filled" sx={{ width: "100%" }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
