import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControlLabel, IconButton, InputAdornment, ListItemText,
  MenuItem, Snackbar, Stack, Switch, Tab, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tabs, TextField, Tooltip, Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import API from "../../api";
import { fetchWithCache } from "../../hooks/useCachedFetch";
import { UserContext } from "../../contexts/UserContext";

const EMPTY = {
  code: "", name: "", description: "", loan_group_id: "", conami_tipo_credito_id: "", currency_id: "",
  allowed_frequencies: [], branch_ids: [],
  min_amount: "", max_amount: "", min_term_months: "", max_term_months: "",
  min_interest_rate: "", max_interest_rate: "", default_interest_rate: "",
  fee_percentage: "", other_charges_percentage: "", late_interest_rate: "", grace_period_days: "",
  insurance_product_id: "", collateral_requirement_mode: "", guarantor_requirement_mode: "",
  is_default: false, status: "ACTIVE",
};

const COLLATERAL_MODES = [
  ["", "Según política general"], ["off", "No exige"], ["warn", "Advierte"],
  ["approval", "Requiere aprobación especial"], ["block", "Bloquea"],
];
const GUARANTOR_MODES = [["", "Según política general"], ["NO_APLICA", "No aplica"], ["OPCIONAL", "Opcional"], ["OBLIGATORIO", "Obligatorio"]];

const toStr = (v) => (v === null || v === undefined ? "" : String(v));
const money = (v) => `C$ ${Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (v) => `${Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const range = (min, max, fmt) => {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  return min != null ? `≥ ${fmt(min)}` : `≤ ${fmt(max)}`;
};
const today = () => new Date().toISOString().slice(0, 10);

const AML_LABEL = { DRAFT: "En evaluación", APPROVED: "Aprobada" };

export default function LoanProductsManager() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canManage = Number(role) === 1 || permissions.includes("configuracion.productos.gestionar");

  const [tab, setTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [regulated, setRegulated] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [catalogs, setCatalogs] = useState({ groups: [], tipos: [], monedas: [], frequencies: [], branches: [], insurance: [] });
  const [policies, setPolicies] = useState({});
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState([]);
  const [message, setMessage] = useState({ open: false, type: "success", text: "" });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/api/loan-products");
      setProducts(Array.isArray(data?.data) ? data.data : []);
      setRegulated(data?.regulated !== false);
      setLoadError("");
    } catch (err) {
      setLoadError(err.response?.data?.message || "No fue posible cargar los productos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const loadCatalogs = async () => {
      const safe = (p) => Promise.resolve(p).catch(() => null);
      const [conami, frequencies, branches, insurance, pols] = await Promise.all([
        safe(fetchWithCache("/api/conami/catalogs")),
        safe(fetchWithCache("/api/frecuencies")),
        safe(fetchWithCache("/api/branches")),
        safe(API.get("/api/insurance/products").then((r) => r.data)),
        safe(fetchWithCache("/api/credit-policies")),
      ]);
      const ins = Array.isArray(insurance) ? insurance : Array.isArray(insurance?.data) ? insurance.data : [];
      setCatalogs({
        groups: conami?.tiposAgrupacionCredito || [],
        tipos: conami?.tiposCredito || [],
        monedas: conami?.monedas || [],
        frequencies: Array.isArray(frequencies) ? frequencies : [],
        branches: Array.isArray(branches) ? branches : [],
        insurance: ins.filter((i) => i.status === "ACTIVO"),
      });
      setPolicies(Object.fromEntries((Array.isArray(pols) ? pols : []).map((p) => [p.policy_key, p.policy_value])));
    };
    loadCatalogs();
  }, []);

  const openNew = () => {
    setServerErrors([]);
    setForm({ ...EMPTY });
  };
  const openEdit = (p) => {
    setServerErrors([]);
    setForm({
      ...EMPTY,
      ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] === null || p[k] === undefined ? EMPTY[k] : p[k]])),
      id: p.id,
      is_default: Number(p.is_default) === 1,
      allowed_frequencies: p.allowed_frequencies || [],
      branch_ids: p.branch_ids || [],
    });
  };
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setServerErrors([]);
    try {
      const body = { ...form, is_default: form.is_default ? 1 : 0 };
      const { data } = form.id
        ? await API.put(`/api/loan-products/${form.id}`, body)
        : await API.post("/api/loan-products", body);
      setMessage({ open: true, type: "success", text: data.message });
      setForm(null);
      await load();
    } catch (err) {
      setServerErrors(err.response?.data?.errors || []);
      setMessage({ open: true, type: "error", text: err.response?.data?.message || "No fue posible guardar." });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (p) => {
    const status = p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const { data } = await API.put(`/api/loan-products/${p.id}/status`, { status });
      setMessage({ open: true, type: "success", text: data.message });
      await load();
    } catch (err) {
      const extra = (err.response?.data?.errors || []).join(" ");
      setMessage({ open: true, type: "error", text: `${err.response?.data?.message || "No fue posible cambiar el estado."} ${extra}`.trim() });
    }
  };

  const nameOf = (list, id) => list.find((x) => String(x.id) === String(id))?.name;

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Inventory2RoundedIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Productos financieros</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Cada producto define las condiciones y los límites de la solicitud de crédito. Un límite vacío significa que rige la
        política de crédito general. Los productos se desactivan, nunca se borran.
      </Typography>

      <Alert severity={regulated ? "info" : "warning"} sx={{ mb: 2 }}>
        {regulated
          ? "Su empresa está normada por la CONAMI: los límites de un producto no pueden superar las políticas de crédito (tasa máxima anual, mora, plazo y monto)."
          : "Su empresa no está normada por la CONAMI: los límites de cada producto se editan libremente y sobrescriben las políticas de crédito."}
      </Alert>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Productos" />
        <Tab label="Cartera por producto" />
      </Tabs>

      {tab === 0 && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
              {canManage && (
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openNew}>Nuevo producto</Button>
              )}
            </Stack>
            {loading ? (
              <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
            ) : loadError ? (
              <Alert severity="error">{loadError}</Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Producto</TableCell>
                      <TableCell>Tipo NGRC</TableCell>
                      <TableCell>Monto</TableCell>
                      <TableCell>Plazo (meses)</TableCell>
                      <TableCell>Tasa mensual</TableCell>
                      <TableCell>Frecuencias</TableCell>
                      <TableCell>Sucursales</TableCell>
                      <TableCell align="right">Créditos</TableCell>
                      <TableCell>Riesgo LA/FT</TableCell>
                      <TableCell>Estado</TableCell>
                      {canManage && <TableCell align="right">Acciones</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {products.map((p) => (
                      <TableRow key={p.id} hover sx={{ opacity: p.status === "ACTIVE" ? 1 : 0.6 }}>
                        <TableCell sx={{ fontWeight: 700 }}>{p.code}</TableCell>
                        <TableCell>
                          {p.name}
                          {Number(p.is_default) === 1 && <Chip size="small" label="Predeterminado" sx={{ ml: 1 }} />}
                        </TableCell>
                        <TableCell>{p.loan_group_name || "—"}</TableCell>
                        <TableCell>{range(p.min_amount, p.max_amount, money)}</TableCell>
                        <TableCell>{range(p.min_term_months, p.max_term_months, (v) => Number(v))}</TableCell>
                        <TableCell>
                          {range(p.min_interest_rate, p.max_interest_rate, pct)}
                          {p.default_interest_rate != null && (
                            <Typography variant="caption" display="block" color="text.secondary">Sugerida {pct(p.default_interest_rate)}</Typography>
                          )}
                        </TableCell>
                        <TableCell>{p.allowed_frequencies?.length ? p.allowed_frequencies.join(", ") : "Todas"}</TableCell>
                        <TableCell>
                          {p.branch_ids?.length ? p.branch_ids.map((b) => nameOf(catalogs.branches, b) || `#${b}`).join(", ") : "Todas"}
                        </TableCell>
                        <TableCell align="right">
                          {p.loans_count}
                          <Typography variant="caption" display="block" color="text.secondary">{p.active_loans_count} vigentes</Typography>
                        </TableCell>
                        <TableCell>
                          {p.aml_assessment ? (
                            <Chip size="small" color={p.aml_assessment.status === "APPROVED" ? "success" : "warning"}
                              label={AML_LABEL[p.aml_assessment.status] || p.aml_assessment.status} />
                          ) : (
                            <Typography variant="caption" color="text.secondary">Sin evaluación</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" color={p.status === "ACTIVE" ? "success" : "default"} label={p.status === "ACTIVE" ? "Activo" : "Inactivo"} />
                        </TableCell>
                        {canManage && (
                          <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => openEdit(p)} aria-label={`Editar ${p.code}`}><EditRoundedIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title={p.status === "ACTIVE" ? "Desactivar" : "Activar"}>
                              <IconButton size="small" onClick={() => toggleStatus(p)} aria-label={`${p.status === "ACTIVE" ? "Desactivar" : "Activar"} ${p.code}`}>
                                {p.status === "ACTIVE" ? <BlockRoundedIcon fontSize="small" /> : <CheckCircleRoundedIcon fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {!products.length && (
                      <TableRow><TableCell colSpan={12} align="center">No hay productos.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 1 && <ProductPortfolioReport />}

      {form && (
        <ProductDialog
          form={form}
          setForm={setForm}
          set={set}
          catalogs={catalogs}
          policies={policies}
          regulated={regulated}
          saving={saving}
          serverErrors={serverErrors}
          onClose={() => setForm(null)}
          onSave={save}
        />
      )}

      <Snackbar open={message.open} autoHideDuration={6000} onClose={() => setMessage((m) => ({ ...m, open: false }))}>
        <Alert severity={message.type} onClose={() => setMessage((m) => ({ ...m, open: false }))}>{message.text}</Alert>
      </Snackbar>
    </Box>
  );
}

function ProductDialog({ form, setForm, set, catalogs, policies, regulated, saving, serverErrors, onClose, onSave }) {
  const num = (field, label, { adornment, helper } = {}) => (
    <TextField
      size="small"
      type="number"
      label={label}
      value={toStr(form[field])}
      onChange={set(field)}
      helperText={helper}
      inputProps={{ min: 0, step: "any", "aria-label": label }}
      InputProps={adornment ? { endAdornment: <InputAdornment position="end">{adornment}</InputAdornment> } : undefined}
      fullWidth
    />
  );
  const maxRateMonthly = policies.max_interest_rate ? Number(policies.max_interest_rate) / 12 : null;
  const policyHint = (text) => (regulated && text ? `Política: ${text}` : undefined);

  const multi = (field, label, options, valueKey, labelOf) => (
    <TextField
      select
      size="small"
      fullWidth
      label={label}
      value={form[field]}
      onChange={(e) => setForm((f) => ({ ...f, [field]: typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value }))}
      SelectProps={{
        multiple: true,
        renderValue: (sel) => (sel.length ? sel.map((v) => labelOf(options.find((o) => String(o[valueKey]) === String(v)) || { [valueKey]: v })).join(", ") : "Todas"),
        displayEmpty: true,
      }}
      InputLabelProps={{ shrink: true }}
      helperText="Ninguna seleccionada = todas"
    >
      {options.map((o) => (
        <MenuItem key={o[valueKey]} value={o[valueKey]}>
          <Checkbox size="small" checked={form[field].map(String).includes(String(o[valueKey]))} />
          <ListItemText primary={labelOf(o)} />
        </MenuItem>
      ))}
    </TextField>
  );

  const select = (field, label, options, { emptyLabel = "—", required = false } = {}) => (
    <TextField select size="small" fullWidth label={label} value={toStr(form[field])} onChange={set(field)} required={required}>
      <MenuItem value="">{emptyLabel}</MenuItem>
      {options.map((o) => <MenuItem key={o.id} value={String(o.id)}>{o.name}</MenuItem>)}
    </TextField>
  );

  const grid = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.5 };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{form.id ? `Editar producto ${form.code}` : "Nuevo producto financiero"}</DialogTitle>
      <DialogContent dividers>
        {!!serverErrors.length && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverErrors.map((e) => <div key={e}>{e}</div>)}
          </Alert>
        )}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Identificación</Typography>
        <Box sx={grid}>
          <TextField size="small" label="Código" value={form.code} onChange={set("code")} required inputProps={{ maxLength: 20, "aria-label": "Código" }} />
          <TextField size="small" label="Nombre" value={form.name} onChange={set("name")} required inputProps={{ maxLength: 120, "aria-label": "Nombre" }} sx={{ gridColumn: { sm: "span 2" } }} />
          <TextField size="small" label="Descripción" value={form.description || ""} onChange={set("description")} multiline minRows={2} sx={{ gridColumn: { sm: "span 3" } }} />
        </Box>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Clasificación</Typography>
        <Box sx={grid}>
          {select("loan_group_id", "Tipo de crédito NGRC", catalogs.groups, { emptyLabel: "Seleccione", required: true })}
          {select("conami_tipo_credito_id", "Tipo de crédito CONAMI", catalogs.tipos, { emptyLabel: "Lo elige la solicitud" })}
          {select("currency_id", "Moneda", catalogs.monedas, { emptyLabel: "La elige la solicitud" })}
        </Box>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Límites</Typography>
        <Box sx={grid}>
          {num("min_amount", "Monto mínimo", { adornment: "C$", helper: policyHint(policies.min_amount && `mín. C$ ${policies.min_amount}`) })}
          {num("max_amount", "Monto máximo", { adornment: "C$", helper: policyHint(policies.max_amount && `máx. C$ ${policies.max_amount}`) })}
          {multi("allowed_frequencies", "Frecuencias permitidas", catalogs.frequencies, "tag", (o) => o.name || o.tag)}
          {num("min_term_months", "Plazo mínimo (meses)", { helper: policyHint(policies.min_term_months && `mín. ${policies.min_term_months} meses`) })}
          {num("max_term_months", "Plazo máximo (meses)", { helper: policyHint(policies.max_term_months && `máx. ${policies.max_term_months} meses`) })}
          <Box />
          {num("min_interest_rate", "Tasa mínima mensual", { adornment: "%" })}
          {num("max_interest_rate", "Tasa máxima mensual", { adornment: "%", helper: policyHint(maxRateMonthly && `máx. ${maxRateMonthly.toFixed(2)}% mensual (${policies.max_interest_rate}% anual)`) })}
          {num("default_interest_rate", "Tasa sugerida mensual", { adornment: "%" })}
        </Box>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Cargos</Typography>
        <Box sx={grid}>
          {num("fee_percentage", "Comisión de apertura", { adornment: "%" })}
          {num("other_charges_percentage", "Otros cargos", { adornment: "%" })}
          {num("late_interest_rate", "Tasa de mora (máxima)", { adornment: "%", helper: policyHint(policies.max_late_interest_rate && `máx. ${policies.max_late_interest_rate}%`) })}
          {num("grace_period_days", "Días de gracia")}
          {select("insurance_product_id", "Seguro asociado", catalogs.insurance, { emptyLabel: "Sin seguro" })}
        </Box>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Requisitos y alcance</Typography>
        <Box sx={grid}>
          <TextField select size="small" label="Exigencia de garantía" value={form.collateral_requirement_mode || ""} onChange={set("collateral_requirement_mode")}>
            {COLLATERAL_MODES.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Exigencia de fiador" value={form.guarantor_requirement_mode || ""} onChange={set("guarantor_requirement_mode")}>
            {GUARANTOR_MODES.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
          </TextField>
          {multi("branch_ids", "Sucursales donde se ofrece", catalogs.branches, "id", (o) => o.name || `#${o.id}`)}
        </Box>
        <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
          <FormControlLabel
            control={<Switch checked={!!form.is_default} onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))} />}
            label="Predeterminado (lo usa la app móvil)"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={onSave} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
      </DialogActions>
    </Dialog>
  );
}

function ProductPortfolioReport() {
  const [date, setDate] = useState(today());
  const [from, setFrom] = useState(`${today().slice(0, 7)}-01`);
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/api/loan-products/report", { params: { date, from, to } });
      setRows(Array.isArray(data?.data) ? data.data : []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "No fue posible generar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const totals = useMemo(() => rows.reduce((t, r) => ({
    portfolio_loans: t.portfolio_loans + r.portfolio_loans,
    portfolio_capital: t.portfolio_capital + r.portfolio_capital,
    overdue_capital: t.overdue_capital + r.overdue_capital,
    par30_capital: t.par30_capital + r.par30_capital,
    placement_loans: t.placement_loans + r.placement_loans,
    placement_amount: t.placement_amount + r.placement_amount,
  }), { portfolio_loans: 0, portfolio_capital: 0, overdue_capital: 0, par30_capital: 0, placement_loans: 0, placement_amount: 0 }), [rows]);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField size="small" type="date" label="Cartera al" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label="Colocación desde" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label="hasta" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="contained" onClick={run} disabled={loading}>Consultar</Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Cartera y cartera en riesgo (capital de créditos con algún atraso): último cierre del día de cada sucursal hasta la fecha indicada. Colocación: créditos desembolsados en el período.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        {loading ? (
          <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell align="right">Créditos</TableCell>
                  <TableCell align="right">Cartera (capital)</TableCell>
                  <TableCell align="right">En riesgo</TableCell>
                  <TableCell align="right">% en riesgo</TableCell>
                  <TableCell align="right">PAR 30</TableCell>
                  <TableCell align="right">Colocados</TableCell>
                  <TableCell align="right">Monto colocado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.product_id ?? "none"}>
                    <TableCell>{r.code ? `${r.code} — ${r.name}` : r.name}</TableCell>
                    <TableCell align="right">{r.portfolio_loans}</TableCell>
                    <TableCell align="right">{money(r.portfolio_capital)}</TableCell>
                    <TableCell align="right">{money(r.overdue_capital)}</TableCell>
                    <TableCell align="right">{pct(r.overdue_pct)}</TableCell>
                    <TableCell align="right">{pct(r.par30_pct)}</TableCell>
                    <TableCell align="right">{r.placement_loans}</TableCell>
                    <TableCell align="right">{money(r.placement_amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ "& td": { fontWeight: 800 } }}>
                  <TableCell>Total</TableCell>
                  <TableCell align="right">{totals.portfolio_loans}</TableCell>
                  <TableCell align="right">{money(totals.portfolio_capital)}</TableCell>
                  <TableCell align="right">{money(totals.overdue_capital)}</TableCell>
                  <TableCell align="right">{pct(totals.portfolio_capital ? (totals.overdue_capital / totals.portfolio_capital) * 100 : 0)}</TableCell>
                  <TableCell align="right">{pct(totals.portfolio_capital ? (totals.par30_capital / totals.portfolio_capital) * 100 : 0)}</TableCell>
                  <TableCell align="right">{totals.placement_loans}</TableCell>
                  <TableCell align="right">{money(totals.placement_amount)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
