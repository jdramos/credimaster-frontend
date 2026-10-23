import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton, InputAdornment, MenuItem, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, TextField, Tooltip, Typography,
} from "@mui/material";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EventIcon from "@mui/icons-material/Event";
import SearchIcon from "@mui/icons-material/Search";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import InactiveCustomerDetail from "./InactiveCustomerDetail";
import { RATING, STAGE_COLOR, dmy, money, whatsappUrl } from "./inactiveCustomersShared";

// Clientes inactivos (tuvieron crédito desembolsado y hoy no tienen ninguno
// vivo, la misma definición del tablero gerencial) con un seguimiento tipo
// CRM ligero para recuperarlos o renovarles. Backend:
// api/customer/inactiveCustomersController.js.

const today = () => dayjs().format("YYYY-MM-DD");

const paperSx = { p: 2, borderRadius: 3, border: 1, borderColor: "divider", bgcolor: "background.paper" };
const headSx = { "& th": { bgcolor: "action.hover", fontWeight: 700, whiteSpace: "nowrap" } };

const EMPTY_FILTERS = {
  as_of: "",
  branch_id: "",
  promoter_id: "",
  collector_id: "",
  days_min: "",
  days_max: "",
  amount_min: "",
  amount_max: "",
  rating: "",
  max_late_max: "",
  stage: "",
  responsible: "",
  next_action: "",
  q: "",
  // Política de represtamo: por omisión solo se muestran los aptos.
  eligibility: "apto",
};

const SORTS = {
  customer_name: (a, b) => String(a.customer_name || "").localeCompare(String(b.customer_name || "")),
  days_inactive: (a, b) => Number(a.days_inactive ?? 1e9) - Number(b.days_inactive ?? 1e9),
  last_amount: (a, b) => Number(a.last_amount) - Number(b.last_amount),
  last_max_days_late: (a, b) => Number(a.last_max_days_late ?? -1) - Number(b.last_max_days_late ?? -1),
  next_action_date: (a, b) => String(a.next_action_date || "9999").localeCompare(String(b.next_action_date || "9999")),
};

export function EligibilityChip({ row }) {
  if (row.eligible) return <Chip size="small" color="success" variant="outlined" label="Apto" />;
  const reasons = (row.eligibility_reasons || []).join("; ");
  return (
    <Tooltip title={`No cumple la política de represtamo: ${reasons}. Una solicitud requerirá Comité de Crédito.`}>
      <Box>
        <Chip size="small" color="error" label="No apto" />
        <Typography variant="caption" color="error" display="block">{reasons}</Typography>
      </Box>
    </Tooltip>
  );
}

function MyActions({ rows, onOpen }) {
  if (!rows.length) return null;
  return (
    <Paper elevation={0} sx={{ ...paperSx, mb: 2, borderColor: "primary.light" }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <EventIcon color="primary" fontSize="small" />
        <Typography fontWeight={700}>Mis próximas acciones de hoy ({rows.length})</Typography>
      </Stack>
      <Stack spacing={0.5}>
        {rows.map((r) => (
          <Box
            key={r.customer_id}
            sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", cursor: "pointer", "&:hover": { bgcolor: "action.hover" }, px: 1, py: 0.5, borderRadius: 1 }}
            onClick={() => onOpen(r.customer_id)}
          >
            <Chip size="small" color={r.overdue ? "error" : "primary"} label={r.overdue ? `Atrasada ${dmy(r.next_action_date)}` : "Hoy"} />
            <Typography variant="body2" fontWeight={600}>{r.customer_name}</Typography>
            <Typography variant="body2" color="text.secondary">{r.phone || "sin teléfono"}</Typography>
            {r.next_action_note && <Typography variant="body2">· {r.next_action_note}</Typography>}
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

export default function InactiveCustomers() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canManage = role === 1 || permissions.includes("clientes.inactivos.gestionar");
  const canRequestLoan = role === 1 || permissions.includes("creditos.insertar");

  const [catalogs, setCatalogs] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [myActions, setMyActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sort, setSort] = useState({ by: "days_inactive", dir: "asc" });
  const [detailId, setDetailId] = useState(null);

  useEffect(() => {
    API.get("/api/inactive-customers/catalogs")
      .then(({ data: res }) => setCatalogs(res.data))
      .catch(() => setCatalogs({ stages: [], channels: [], results: [], users: [], promoters: [], collectors: [], branches: [] }));
  }, []);

  const stageLabel = useMemo(
    () => Object.fromEntries((catalogs?.stages || []).map((s) => [s.key, s.label])),
    [catalogs],
  );

  const load = useCallback(async (f) => {
    setLoading(true);
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v != null));
      const [list, mine] = await Promise.all([
        API.get("/api/inactive-customers", { params }),
        API.get("/api/inactive-customers/my-actions"),
      ]);
      setData(list.data.data);
      setMyActions(mine.data?.data?.rows || []);
      setPage(0);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo obtener la lista de clientes inactivos.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Recarga al cambiar filtros (con una pequeña espera para los campos de texto).
  useEffect(() => {
    const t = setTimeout(() => load(filters), 350);
    return () => clearTimeout(t);
  }, [filters, load]);

  const setFilter = (name) => (e) => setFilters((f) => ({ ...f, [name]: e.target.value }));

  const sorted = useMemo(() => {
    const rows = [...(data?.rows || [])];
    const cmp = SORTS[sort.by];
    if (cmp) rows.sort((a, b) => (sort.dir === "asc" ? cmp(a, b) : cmp(b, a)));
    return rows;
  }, [data, sort]);

  const pageRows = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const sortHeader = (by, label, align) => (
    <TableCell align={align} sortDirection={sort.by === by ? sort.dir : false}>
      <TableSortLabel
        active={sort.by === by}
        direction={sort.by === by ? sort.dir : "asc"}
        onClick={() => setSort((s) => ({ by, dir: s.by === by && s.dir === "asc" ? "desc" : "asc" }))}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  const exportExcel = () => {
    const rows = sorted.map((r) => ({
      Cliente: r.customer_name,
      Identificación: r.identification,
      Teléfono: r.phone || "",
      Sucursal: r.branch_name || "",
      Promotor: r.promoter_name || "",
      Gestor: r.collector_name || "",
      "Créditos": r.loans_count,
      "Último crédito": r.last_loan_code,
      "Estado último crédito": r.last_loan_status === "WRITTEN_OFF" ? "Saneado" : "Cancelado",
      "Monto último crédito": Number(r.last_amount),
      "Desembolso": r.last_disbursement_date || "",
      "Fecha de cancelación": r.last_end_date || "",
      "Días inactivo": r.days_inactive,
      "Atraso máx. último crédito": r.last_max_days_late,
      "Mejor atraso": r.best_max_days_late,
      "Peor atraso": r.worst_max_days_late,
      "Calificación": RATING[r.last_rating]?.label || r.last_rating,
      "Elegibilidad represtamo": r.eligible ? "Apto" : "No apto",
      "Motivo no apto": (r.eligibility_reasons || []).join("; "),
      Etapa: stageLabel[r.stage] || r.stage,
      Responsable: r.responsible_name || "",
      "Próxima acción": r.next_action_date || "",
      "Nota próxima acción": r.next_action_note || "",
      Gestiones: r.actions_count,
      "Última gestión": r.last_action_date || "",
      "Solicitud en trámite": r.pending_request_id ? `#${r.pending_request_id}` : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes inactivos");
    XLSX.writeFile(wb, `clientes_inactivos_${data?.as_of || today()}.xlsx`);
  };

  const byStage = data?.by_stage || {};
  const totalByStage = Object.values(byStage).reduce((s, n) => s + Number(n || 0), 0);
  const select = (name, label, options, extra = {}) => (
    <TextField select size="small" label={label} value={filters[name]} onChange={setFilter(name)} sx={{ minWidth: 150 }} {...extra}>
      <MenuItem value="">Todos</MenuItem>
      {options}
    </TextField>
  );
  const numberField = (name, label, width = 110) => (
    <TextField size="small" type="number" label={label} value={filters[name]} onChange={setFilter(name)} sx={{ width }} inputProps={{ min: 0 }} />
  );

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={paperSx}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PersonSearchIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={700}>Clientes inactivos</Typography>
              <Typography variant="body2" color="text.secondary">
                Tuvieron crédito desembolsado y no tienen ninguno vivo a la fecha de corte (la misma definición del tablero gerencial).
                Seguimiento opcional para recuperarlos o renovarles.
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<FileDownloadIcon />} sx={{ textTransform: "none" }} onClick={exportExcel} disabled={!sorted.length}>
              Exportar a Excel
            </Button>
            <Tooltip title="Actualizar">
              <IconButton onClick={() => load(filters)} aria-label="Actualizar"><RefreshIcon /></IconButton>
            </Tooltip>
          </Stack>
        </Box>

        <MyActions rows={myActions} onOpen={setDetailId} />

        <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap", rowGap: 1.5 }}>
          <TextField
            size="small"
            type="date"
            label="Fecha de corte"
            value={filters.as_of || data?.as_of || ""}
            onChange={setFilter("as_of")}
            InputLabelProps={{ shrink: true }}
          />
          {select("branch_id", "Sucursal", (catalogs?.branches || []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>))}
          {select("promoter_id", "Promotor", (catalogs?.promoters || []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>))}
          {select("collector_id", "Gestor", (catalogs?.collectors || []).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>))}
          {numberField("days_min", "Días inactivo desde", 150)}
          {numberField("days_max", "hasta", 90)}
          {numberField("amount_min", "Último monto desde", 150)}
          {numberField("amount_max", "hasta", 110)}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1.5 }}>
          <TextField select size="small" label="Elegibilidad represtamo" value={filters.eligibility} onChange={setFilter("eligibility")} sx={{ minWidth: 190 }}>
            <MenuItem value="apto">Aptos{data?.by_eligibility ? ` (${data.by_eligibility.apto})` : ""}</MenuItem>
            <MenuItem value="no_apto">No aptos{data?.by_eligibility ? ` (${data.by_eligibility.no_apto})` : ""}</MenuItem>
            <MenuItem value="">Todos</MenuItem>
          </TextField>
          {select("rating", "Calificación último crédito", Object.entries(RATING).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>), { sx: { minWidth: 200 } })}
          {numberField("max_late_max", "Atraso máx. hasta (días)", 170)}
          {select("responsible", "Responsable", [
            <MenuItem key="me" value="me">Asignados a mí</MenuItem>,
            <MenuItem key="none" value="none">Sin asignar</MenuItem>,
            ...(catalogs?.users || []).map((u) => <MenuItem key={u.id} value={String(u.id)}>{u.name}</MenuItem>),
          ])}
          {select("next_action", "Próxima acción", [
            <MenuItem key="due" value="due">Para hoy o atrasada</MenuItem>,
            <MenuItem key="none" value="none">Sin próxima acción</MenuItem>,
          ])}
          <TextField
            size="small"
            label="Buscar cliente, cédula o crédito"
            value={filters.q}
            onChange={setFilter("q")}
            sx={{ minWidth: 260 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <Button sx={{ textTransform: "none" }} onClick={() => setFilters(EMPTY_FILTERS)}>Limpiar filtros</Button>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
          <Chip
            label={`Todas (${totalByStage})`}
            color={filters.stage ? "default" : "primary"}
            variant={filters.stage ? "outlined" : "filled"}
            onClick={() => setFilters((f) => ({ ...f, stage: "" }))}
          />
          {(catalogs?.stages || []).map((s) => (
            <Chip
              key={s.key}
              label={`${s.label} (${byStage[s.key] || 0})`}
              color={filters.stage === s.key ? STAGE_COLOR[s.key] === "default" ? "primary" : STAGE_COLOR[s.key] : "default"}
              variant={filters.stage === s.key ? "filled" : "outlined"}
              onClick={() => setFilters((f) => ({ ...f, stage: f.stage === s.key ? "" : s.key }))}
            />
          ))}
        </Stack>

        {data && !data.tracking_available && (
          <Alert severity="info" sx={{ mb: 2 }}>
            El seguimiento aún no está habilitado en esta empresa: la lista se puede consultar y exportar, pero no se pueden registrar gestiones.
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {data && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {sorted.length === data.total_inactive
              ? `${data.total_inactive} cliente(s) inactivo(s) al ${dmy(data.as_of)}`
              : `${sorted.length} de ${data.total_inactive} cliente(s) inactivo(s) al ${dmy(data.as_of)}`}
            {loading && <CircularProgress size={14} sx={{ ml: 1, verticalAlign: "middle" }} />}
          </Typography>
        )}
        {!data && loading && <CircularProgress size={22} />}

        {data && (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead sx={headSx}>
                  <TableRow>
                    {sortHeader("customer_name", "Cliente")}
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Sucursal / promotor</TableCell>
                    {sortHeader("last_amount", "Último crédito")}
                    {sortHeader("days_inactive", "Días inactivo", "right")}
                    {sortHeader("last_max_days_late", "Atraso máx. (últ. · mejor / peor)")}
                    <TableCell>Represtamo</TableCell>
                    <TableCell>Etapa</TableCell>
                    <TableCell>Responsable</TableCell>
                    {sortHeader("next_action_date", "Próxima acción")}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.map((r) => {
                    const wa = whatsappUrl(r.cellphone || r.phone);
                    const overdue = r.next_action_date && r.next_action_date < today();
                    return (
                      <TableRow key={r.customer_id} hover sx={{ cursor: "pointer" }} onClick={() => setDetailId(r.customer_id)}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{r.customer_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.identification}</Typography>
                          {r.pending_request_id && (
                            <Chip size="small" color="secondary" variant="outlined" label="Solicitud en trámite" sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {r.phone || "—"}
                          {wa && (
                            <Tooltip title="Abrir WhatsApp">
                              <IconButton size="small" component="a" href={wa} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} aria-label="WhatsApp">
                                <WhatsAppIcon fontSize="small" color="success" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{r.branch_name || "—"}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.promoter_name || ""}</Typography>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Typography variant="body2">#{r.last_loan_code} · {money(r.last_amount)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {r.last_loan_status === "WRITTEN_OFF" ? "Saneado" : "Cancelado"} {dmy(r.last_end_date)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{r.days_inactive ?? "—"}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Chip size="small" color={RATING[r.last_rating]?.color || "default"} label={RATING[r.last_rating]?.label || r.last_rating} sx={{ mr: 1 }} />
                          {r.last_max_days_late ?? "—"} d
                          <Typography component="span" variant="caption" color="text.secondary">
                            {" "}· {r.best_max_days_late ?? "—"} / {r.worst_max_days_late ?? "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <EligibilityChip row={r} />
                        </TableCell>
                        <TableCell>
                          <Chip size="small" color={STAGE_COLOR[r.stage] || "default"} label={stageLabel[r.stage] || r.stage} />
                        </TableCell>
                        <TableCell>{r.responsible_name || <Typography variant="caption" color="text.secondary">Sin asignar</Typography>}</TableCell>
                        <TableCell>
                          {r.next_action_date ? (
                            <>
                              <Typography variant="body2" color={overdue ? "error" : "text.primary"} fontWeight={overdue ? 700 : 400}>
                                {dmy(r.next_action_date)}
                              </Typography>
                              {r.next_action_note && <Typography variant="caption" color="text.secondary">{r.next_action_note}</Typography>}
                            </>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!pageRows.length && (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        No hay clientes inactivos con estos filtros.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={sorted.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
              rowsPerPageOptions={[25, 50, 100]}
              labelRowsPerPage="Filas por página"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            />
          </>
        )}
      </Paper>

      {detailId && (
        <InactiveCustomerDetail
          customerId={detailId}
          catalogs={catalogs}
          canManage={canManage}
          canRequestLoan={canRequestLoan}
          onClose={() => setDetailId(null)}
          onChanged={() => load(filters)}
        />
      )}
    </Box>
  );
}
