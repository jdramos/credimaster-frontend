import React, { useEffect, useState } from "react";
import { Box, Chip, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import API from "../../api";
import SanctionsEntryDetailDialog from "./SanctionsEntryDetailDialog";

const SOURCE_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "OFAC SDN", label: "OFAC SDN" },
  { value: "ONU Consolidada", label: "ONU Consolidada" },
];

const columns = [
  { field: "full_name", headerName: "Nombre", flex: 1, minWidth: 260 },
  { field: "entry_type", headerName: "Tipo", width: 110 },
  { field: "primary_identification", headerName: "Identificación", width: 200 },
  {
    field: "source",
    headerName: "Fuente",
    width: 160,
    renderCell: (params) => <Chip size="small" label={params.value} variant="outlined" />,
  },
];

// Consulta paginada del volumen sincronizado de OFAC/ONU (ver
// api/compliance/sanctionsFeedSync.js) -- distinta de la tabla "Agregar
// entrada" de arriba (esa es solo para entradas cargadas a mano, sin
// paginar, no soportaría las ~45 mil filas que trae cada sincronización).
export default function BrowseSanctionsListsPanel() {
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 50 });
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPaginationModel((p) => ({ ...p, page: 0 }));
  }, [source, debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    API.get("/api/aml/watchlists/browse", {
      params: {
        source: source || undefined,
        search: debouncedSearch || undefined,
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
      },
    })
      .then(({ data }) => {
        if (cancelled) return;
        setRows(data.rows || []);
        setTotal(data.total || 0);
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [source, debouncedSearch, paginationModel]);

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="subtitle1" fontWeight={800} mb={0.5}>
        Consultar listas OFAC / ONU
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Navegue el contenido sincronizado de la SDN List (OFAC) y la Consolidated List (ONU) —{" "}
        {total.toLocaleString("es-NI")} entrada(s) {source ? `en "${source}"` : "en total"}.
      </Typography>

      <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
        <TextField
          select
          label="Lista"
          size="small"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          {SOURCE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Buscar nombre"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
        />
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Clic en una fila para ver el detalle completo (identificaciones, alias, direcciones).
      </Typography>

      <Box sx={{ height: 480 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          paginationMode="server"
          rowCount={total}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[25, 50, 100]}
          disableRowSelectionOnClick
          onRowClick={(params) => setSelectedId(params.row.id)}
          sx={{
            border: "1px solid #E5E7EB",
            borderRadius: 2,
            cursor: "pointer",
            "& .MuiDataGrid-columnHeaders": { backgroundColor: "#F8FAFC", fontWeight: 700 },
          }}
        />
      </Box>

      {selectedId && <SanctionsEntryDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />}
    </Paper>
  );
}
