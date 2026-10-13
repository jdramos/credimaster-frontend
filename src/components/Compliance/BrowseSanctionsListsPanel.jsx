import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, MenuItem, Paper, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import API from "../../api";
import SanctionsEntryDetailDialog from "./SanctionsEntryDetailDialog";

const SOURCE_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "OFAC SDN", label: "OFAC SDN" },
  { value: "ONU Consolidada", label: "ONU Consolidada" },
];
const TYPE_OPTIONS = [
  { value: "", label: "Personas y entidades" },
  { value: "PERSONA", label: "Personas" },
  { value: "ENTIDAD", label: "Entidades" },
];
const STATUS_OPTIONS = [
  { value: "active", label: "Vigentes" },
  { value: "inactive", label: "Retiradas de la lista" },
  { value: "all", label: "Todas" },
];

const LIST_INFO = [
  { source: "OFAC SDN", publisher: "OFAC" },
  { source: "ONU Consolidada", publisher: "ONU" },
];

const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(String(v).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("es-NI", { dateStyle: "medium", timeStyle: "short" });
};
// Fecha sin hora (YYYY-MM-DD) armada en hora local, para que no se corra un día.
const fmtDay = (v) => {
  if (!v) return "—";
  const [y, m, d] = String(v).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-NI", { day: "2-digit", month: "short", year: "numeric" });
};

export const UN_NO_REASON = "La ONU no publica el motivo del retiro, solo la decisión del Comité.";

const SORT_OPTIONS = [
  { value: "name", label: "Nombre (A-Z)" },
  { value: "listed_desc", label: "Inclusión más reciente" },
  { value: "listed_asc", label: "Inclusión más antigua" },
  { value: "delisted_desc", label: "Exclusión más reciente", onlyDelisted: true },
];

// OFAC publica solo la fecha (hora 00:00:00); la ONU, fecha y hora.
const fmtPublished = (v) => {
  if (!v) return "sin dato (se registra en la próxima sincronización)";
  if (/ 00:00:00$/.test(v)) {
    const [y, m, d] = v.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-NI", { dateStyle: "long" });
  }
  return fmtDateTime(v);
};

const baseColumns = [
  { field: "full_name", headerName: "Nombre", flex: 1, minWidth: 260 },
  { field: "entry_type", headerName: "Tipo", width: 100, valueFormatter: (v) => (v === "PERSONA" ? "Persona" : "Entidad") },
  {
    field: "programs",
    headerName: "Programa(s)",
    width: 190,
    renderCell: (params) => {
      const info = params.row.programs_info || [];
      const names = info.map((p) => p.name_es).filter(Boolean).join("; ");
      return (
        <Tooltip title={info.map((p) => (p.name_es ? `${p.code}: ${p.name_es}` : p.code)).join("\n") || ""}>
          <Box sx={{ lineHeight: 1.25, py: 0.5, overflow: "hidden" }}>
            <div>{params.value || "—"}</div>
            {names && <Typography variant="caption" color="text.secondary" noWrap component="div">{names}</Typography>}
          </Box>
        </Tooltip>
      );
    },
  },
  {
    field: "remarks_es",
    headerName: "Motivo de inclusión",
    flex: 1,
    minWidth: 260,
    renderCell: (params) => {
      const r = params.row;
      // Lo que publica la lista sobre la entrada (en español) y, debajo, la base legal (OFAC) o el Comité (ONU).
      const info = r.remarks_es || r.remarks || null;
      const basis = r.source === "ONU Consolidada" ? r.listed_decided_by : r.listed_legal_basis;
      const tooltip = [info, basis, r.remarks_es && r.remarks ? `Texto oficial: ${r.remarks}` : null].filter(Boolean).join("\n\n");
      if (!info && !basis) return "—";
      return (
        <Tooltip title={<span style={{ whiteSpace: "pre-line" }}>{tooltip}</span>}>
          <Box sx={{ lineHeight: 1.25, py: 0.5, overflow: "hidden" }}>
            <Typography variant="body2" noWrap component="div">{info || basis}</Typography>
            {info && basis && <Typography variant="caption" color="text.secondary" noWrap component="div">{basis}</Typography>}
          </Box>
        </Tooltip>
      );
    },
  },
  { field: "nationality", headerName: "Nacionalidad", width: 160 },
  { field: "date_of_birth", headerName: "Fecha de nacimiento", width: 160 },
  { field: "primary_identification", headerName: "Identificación", width: 180 },
  { field: "listed_on", headerName: "Fecha de inclusión", width: 150, valueFormatter: (v) => fmtDay(v) },
  {
    field: "source",
    headerName: "Lista",
    width: 150,
    renderCell: (params) => <Chip size="small" label={params.value} variant="outlined" />,
  },
];
const statusColumns = [
  {
    field: "active",
    headerName: "Estado",
    width: 110,
    renderCell: (params) =>
      params.value ? <Chip size="small" color="error" variant="outlined" label="Vigente" /> : <Chip size="small" label="Retirada" />,
  },
  {
    field: "delisted_on",
    headerName: "Fecha de exclusión",
    width: 175,
    renderCell: (params) =>
      params.value ? (
        <Box sx={{ lineHeight: 1.2, py: 0.5 }}>
          <div>{fmtDay(params.value)}</div>
          {params.row.delisted_detected ? (
            <Typography variant="caption" color="text.secondary">detectada por CrediMaster</Typography>
          ) : null}
        </Box>
      ) : (
        "—"
      ),
  },
  {
    field: "delisted_reason",
    headerName: "Programa / motivo de la exclusión",
    flex: 1,
    minWidth: 280,
    renderCell: (params) => {
      const {
        delisted_programs: programs, delisted_reason: reason, delisted_reason_es: reasonEs, delisted_decided_by: decidedBy, active,
      } = params.row;
      if (active) return "—";
      // OFAC: motivo en español (traducción automática), texto oficial en el tooltip.
      // ONU: no publica el motivo; se muestra qué Comité decidió el retiro.
      const note = reasonEs || reason || decidedBy || "Motivo no disponible";
      const tooltip = reasonEs && reason
        ? `${reasonEs}\n\nTexto oficial (OFAC): ${reason}`
        : decidedBy
          ? `${decidedBy}\n\n${UN_NO_REASON}`
          : note;
      return (
        <Tooltip title={<span style={{ whiteSpace: "pre-line" }}>{tooltip}</span>}>
          <Box sx={{ lineHeight: 1.25, py: 0.5, overflow: "hidden" }}>
            <div>{programs || "—"}</div>
            <Typography variant="caption" color="text.secondary" noWrap component="div">{note}</Typography>
          </Box>
        </Tooltip>
      );
    },
  },
];

// Consulta de las listas OFAC (SDN) y ONU (Consolidada) completas, sincronizadas
// cada noche en la tabla compartida (ver api/compliance/sanctionsFeedSync.js).
// Se usa en su propia pantalla (/cumplimiento/listas-ofac-onu, `fullPage`) y
// embebida en Listas de Riesgo, debajo de las entradas cargadas a mano.
export default function BrowseSanctionsListsPanel({ fullPage = false }) {
  const [filters, setFilters] = useState({
    source: "", entry_type: "", program: "", status: "active", listed_from: "", listed_to: "",
    delisted_from: "", delisted_to: "", sort: "name",
  });
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [debounced, setDebounced] = useState({ search: "", country: "" });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 50 });
  const [selectedId, setSelectedId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get("/api/aml/watchlists/browse/summary")
      .then(({ data }) => setSummary(data))
      .catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced({ search, country }), 400);
    return () => clearTimeout(t);
  }, [search, country]);

  const query = useMemo(
    () => ({
      source: filters.source || undefined,
      entry_type: filters.entry_type || undefined,
      program: filters.program || undefined,
      status: filters.status,
      listed_from: filters.listed_from || undefined,
      listed_to: filters.listed_to || undefined,
      // Los filtros/orden de exclusión solo aplican al ver las retiradas.
      delisted_from: filters.status !== "active" ? filters.delisted_from || undefined : undefined,
      delisted_to: filters.status !== "active" ? filters.delisted_to || undefined : undefined,
      sort: filters.sort !== "name" && !(filters.status === "active" && filters.sort === "delisted_desc") ? filters.sort : undefined,
      search: debounced.search || undefined,
      country: debounced.country || undefined,
    }),
    [filters, debounced],
  );

  useEffect(() => {
    setPaginationModel((p) => ({ ...p, page: 0 }));
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    API.get("/api/aml/watchlists/browse", {
      params: { ...query, page: paginationModel.page + 1, pageSize: paginationModel.pageSize },
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
  }, [query, paginationModel]);

  const programOptions = useMemo(
    () => (summary?.programs || []).filter((p) => !filters.source || p.source === filters.source),
    [summary, filters.source],
  );
  const selectedProgram = programOptions.find((p) => p.code === filters.program) || null;
  const showingDelisted = filters.status !== "active";
  const columns = showingDelisted ? [...baseColumns, ...statusColumns] : baseColumns;
  const sortOptions = SORT_OPTIONS.filter((o) => showingDelisted || !o.onlyDelisted);
  const setFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));

  const exportExcel = async () => {
    try {
      setExporting(true);
      setError("");
      const res = await API.get("/api/aml/watchlists/browse/export", { params: query, responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Listas_OFAC_ONU_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("No se pudo exportar la lista.");
    } finally {
      setExporting(false);
    }
  };

  const bySource = Object.fromEntries((summary?.sources || []).map((s) => [s.source, s]));

  return (
    <Paper sx={{ p: 2, mt: fullPage ? 0 : 2 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "flex-start" }} mb={1.5}>
        <Box>
          <Typography variant="subtitle1" fontWeight={800} mb={0.5}>
            {fullPage ? "Lista completa" : "Consultar listas OFAC / ONU"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            SDN List de la OFAC (EE. UU.) y Lista Consolidada del Consejo de Seguridad de la ONU, actualizadas cada noche desde las fuentes oficiales.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexShrink={0}>
          {!fullPage && (
            <Button component={RouterLink} to="/cumplimiento/listas-ofac-onu" size="small" startIcon={<OpenInFullIcon />} sx={{ textTransform: "none" }}>
              Pantalla completa
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={exporting ? <CircularProgress size={16} /> : <FileDownloadIcon />}
            onClick={exportExcel}
            disabled={exporting || total === 0}
            sx={{ textTransform: "none", whiteSpace: "nowrap" }}
          >
            {exporting ? "Generando Excel…" : `Exportar a Excel (${total.toLocaleString("es-NI")})`}
          </Button>
        </Stack>
      </Stack>

      {summary && (
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} mb={2}>
          {LIST_INFO.map(({ source, publisher }) => {
            const s = bySource[source];
            if (!s) return null;
            return (
              <Box key={source} sx={{ flex: 1, p: 1.5, border: "1px solid #DBEAFE", bgcolor: "#F8FBFF", borderRadius: 2 }}>
                <Typography fontWeight={800} fontSize={14}>{source}</Typography>
                <Typography fontSize={13} sx={{ mt: 0.25 }}>
                  Última actualización de la lista ({publisher}): <b>{fmtPublished(s.published_at)}</b>
                </Typography>
                <Typography fontSize={12.5} color="text.secondary">
                  Sincronizada en CrediMaster: {fmtDateTime(s.synced_at || summary.last_synced_at)}
                </Typography>
                <Typography fontSize={12.5} color="text.secondary">
                  {s.active.toLocaleString("es-NI")} vigentes · {s.PERSONA.toLocaleString("es-NI")} personas · {s.ENTIDAD.toLocaleString("es-NI")} entidades
                  {s.inactive ? ` · ${s.inactive.toLocaleString("es-NI")} retiradas` : ""}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      )}

      <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap" useFlexGap>
        <TextField
          label="Buscar nombre, alias o identificación"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 280, flex: 1 }}
        />
        <TextField select label="Lista" size="small" value={filters.source} onChange={(e) => setFilter("source")(e.target.value)} sx={{ minWidth: 170 }}>
          {SOURCE_OPTIONS.map((opt) => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
        </TextField>
        <TextField select label="Tipo" size="small" value={filters.entry_type} onChange={(e) => setFilter("entry_type")(e.target.value)} sx={{ minWidth: 190 }}>
          {TYPE_OPTIONS.map((opt) => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
        </TextField>
        <Autocomplete
          size="small"
          sx={{ minWidth: 230 }}
          options={programOptions}
          value={selectedProgram}
          onChange={(_, v) => setFilter("program")(v?.code || "")}
          getOptionLabel={(o) => o.code}
          isOptionEqualToValue={(o, v) => o.code === v.code && o.source === v.source}
          renderOption={(props, o) => (
            <li {...props} key={`${o.source}|${o.code}`}>
              <Box sx={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 1 }}>
                <span>
                  {o.code}
                  {o.name_es && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ display: "block" }}>{o.name_es}</Typography>
                  )}
                </span>
                <Typography component="span" variant="caption" color="text.secondary">{o.count.toLocaleString("es-NI")}</Typography>
              </Box>
            </li>
          )}
          renderInput={(params) => <TextField {...params} label="Programa / régimen" />}
        />
        <TextField
          label="País (nacionalidad o dirección)"
          size="small"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        <TextField select label="Estado" size="small" value={filters.status} onChange={(e) => setFilter("status")(e.target.value)} sx={{ minWidth: 190 }}>
          {STATUS_OPTIONS.map((opt) => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
        </TextField>
        <TextField
          type="date"
          label="Incluidas desde"
          size="small"
          value={filters.listed_from}
          onChange={(e) => setFilter("listed_from")(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 165 }}
        />
        <TextField
          type="date"
          label="Incluidas hasta"
          size="small"
          value={filters.listed_to}
          onChange={(e) => setFilter("listed_to")(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 165 }}
        />
        {showingDelisted && (
          <>
            <TextField
              type="date"
              label="Excluidas desde"
              size="small"
              value={filters.delisted_from}
              onChange={(e) => setFilter("delisted_from")(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 165 }}
            />
            <TextField
              type="date"
              label="Excluidas hasta"
              size="small"
              value={filters.delisted_to}
              onChange={(e) => setFilter("delisted_to")(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 165 }}
            />
          </>
        )}
        <TextField
          select
          label="Ordenar por"
          size="small"
          value={sortOptions.some((o) => o.value === filters.sort) ? filters.sort : "name"}
          onChange={(e) => setFilter("sort")(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          {sortOptions.map((opt) => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError("")}>{error}</Alert>}

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        {total.toLocaleString("es-NI")} entrada(s) con los filtros aplicados. Clic en una fila para ver el detalle completo (identificaciones, alias, direcciones).
      </Typography>

      <Box sx={{ height: fullPage ? "max(520px, calc(100vh - 380px))" : 480 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          paginationMode="server"
          rowCount={total}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[25, 50, 100, 200]}
          disableRowSelectionOnClick
          onRowClick={(params) => setSelectedId(params.row.id)}
          localeText={{ noRowsLabel: "No hay entradas con esos filtros" }}
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
