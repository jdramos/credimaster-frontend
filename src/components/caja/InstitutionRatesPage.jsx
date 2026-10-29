import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import dayjs from "dayjs";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import ReportExportButtons from "../common/ReportExportButtons";
import { reportDate, reportInteger } from "../common/reportFormat";

const fmtRate = (v) => (v == null ? "—" : Number(v).toFixed(4));
const emptyCurrency = { code: "", name: "", symbol: "", denominations: "", is_active: true };

// Tipo de cambio de compra/venta de la institución por moneda para la
// ventanilla (pagos en divisas, vuelto y compraventa de divisas), y el
// catálogo de monedas extranjeras que se manejan. Distinto del TC oficial del
// BCN (Catálogos → Tipos de cambio).
export default function InstitutionRatesPage() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canEdit = role === 1 || permissions.includes("caja.tc.gestionar");
  const [rows, setRows] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [official, setOfficial] = useState(null);
  const emptyForm = () => ({ rate_date: dayjs().format("YYYY-MM-DD"), date_to: "", currency_code: "USD", buy_rate: "", sell_rate: "", notes: "" });
  const [form, setForm] = useState(emptyForm);
  // Registro que se está corrigiendo (fila de la tabla), o null.
  const [editing, setEditing] = useState(null);
  const [currencyForm, setCurrencyForm] = useState(emptyCurrency);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      // Últimos 30 días y los ya registrados a futuro (p. ej. un fin de semana).
      const res = await API.get("/api/caja/fx-rates", {
        params: {
          date_from: dayjs().subtract(30, "day").format("YYYY-MM-DD"),
          date_to: dayjs().add(62, "day").format("YYYY-MM-DD"),
        },
      });
      const data = res.data?.data || {};
      setRows(data.rates || []);
      setCurrencies(data.currencies || []);
      setOfficial(data.official_today ?? null);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo cargar el tipo de cambio");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Al cambiar fecha o moneda, precarga lo ya registrado (salvo al editar una
  // fila, que ya trae sus valores).
  useEffect(() => {
    if (editing) return;
    const existing = rows.find((r) => String(r.rate_date).slice(0, 10) === form.rate_date && r.currency_code === form.currency_code);
    setForm((f) => ({
      ...f,
      buy_rate: existing ? String(existing.buy_rate) : "",
      sell_rate: existing?.sell_rate != null ? String(existing.sell_rate) : "",
    }));
  }, [rows, form.rate_date, form.currency_code, editing]);

  const startEdit = (r) => {
    setError("");
    setNotice("");
    setEditing(r);
    setForm({
      rate_date: String(r.rate_date).slice(0, 10),
      date_to: "",
      currency_code: r.currency_code,
      buy_rate: String(r.buy_rate),
      sell_rate: r.sell_rate == null ? "" : String(r.sell_rate),
      notes: r.notes || "",
    });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm());
  };

  const saveRate = async () => {
    setError("");
    setNotice("");
    const buy = Number(form.buy_rate);
    const sell = form.sell_rate === "" ? null : Number(form.sell_rate);
    if (!(buy > 0)) return setError("Indique el TC de compra.");
    if (sell != null && sell < buy) return setError("El TC de venta no puede ser menor que el de compra.");
    const dateTo = !editing && form.date_to ? form.date_to : undefined;
    if (dateTo && dateTo < form.rate_date) return setError("La fecha final no puede ser anterior a la inicial.");
    setSaving(true);
    try {
      const res = await API.put(`/api/caja/fx-rates/${form.rate_date}/${form.currency_code}`, {
        buy_rate: buy, sell_rate: sell, notes: form.notes || undefined, date_to: dateTo,
      });
      const saved = res.data?.data || {};
      setNotice(
        editing
          ? `Tipo de cambio de ${form.currency_code} del ${form.rate_date} corregido.`
          : saved.days > 1
            ? `Tipo de cambio de ${form.currency_code} guardado del ${saved.date_from} al ${saved.date_to} (${saved.days} días${saved.replaced ? `, ${saved.replaced} ya registrados se actualizaron` : ""}).`
            : `Tipo de cambio de ${form.currency_code} del ${form.rate_date} guardado.`,
      );
      setEditing(null);
      setForm(emptyForm());
      load();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const saveCurrency = async () => {
    setError("");
    setNotice("");
    const code = currencyForm.code.trim().toUpperCase();
    const denominations = String(currencyForm.denominations).split(",").map((d) => Number(d.trim())).filter((d) => d > 0);
    if (!/^[A-Z]{3}$/.test(code) || code === "NIO") return setError("El código debe tener 3 letras (ISO 4217), distinto de NIO.");
    if (!currencyForm.name.trim() || !currencyForm.symbol.trim() || !denominations.length) {
      return setError("Indique nombre, símbolo y las denominaciones (separadas por coma).");
    }
    try {
      await API.put(`/api/caja/currencies/${code}`, {
        name: currencyForm.name.trim(),
        symbol: currencyForm.symbol.trim(),
        denominations,
        is_active: currencyForm.is_active,
      });
      setNotice(`Moneda ${code} guardada.`);
      setCurrencyForm(emptyCurrency);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo guardar la moneda");
    }
  };

  // Histórico que se muestra en la tabla (últimos 30 días y los ya registrados a futuro).
  const buildReport = () => {
    const dates = rows.map((r) => String(r.rate_date).slice(0, 10)).sort();
    return {
      title: "Tipo de cambio de ventanilla",
      period: dates.length ? `Del ${dates[0]} al ${dates[dates.length - 1]}` : "",
      subtitle: official != null ? `TC oficial BCN del dólar hoy: ${fmtRate(official)}` : "",
      fileName: "tipo_cambio_ventanilla",
      sheetName: "Tipo de cambio",
      columns: [
        { field: "rate_date", label: "Fecha", format: reportDate },
        { field: "currency_code", label: "Moneda" },
        { label: "Compra", value: (r) => (r.buy_rate == null ? null : Number(r.buy_rate)), numeric: true, format: fmtRate },
        { label: "Venta", value: (r) => (r.sell_rate == null ? null : Number(r.sell_rate)), numeric: true, format: fmtRate },
        { label: "Operaciones", value: (r) => Number(r.uses || 0), numeric: true, format: reportInteger },
        { field: "updated_by_name", label: "Registrado por" },
      ],
      rows,
    };
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <CurrencyExchangeIcon color="primary" />
        <Typography variant="h5" sx={{ flexGrow: 1 }}>Tipo de cambio de ventanilla</Typography>
        <ReportExportButtons report={buildReport} disabled={!rows.length} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Al TC de <strong>compra</strong> la institución recibe divisas (pagos y compra de divisas); al de <strong>venta</strong> las entrega
        (vuelto y venta de divisas).
        {official != null && <> TC oficial BCN del dólar hoy: <strong>{fmtRate(official)}</strong>.</>}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      {canEdit && (
        <Paper sx={{ p: 2, mb: 2 }}>
          {editing && (
            <Alert severity={editing.uses ? "warning" : "info"} sx={{ mb: 2 }} data-testid="editing-notice">
              Corrigiendo el TC de {editing.currency_code} del {String(editing.rate_date).slice(0, 10)}.
              {editing.uses > 0 && ` Ya hay ${editing.uses} operación(es) de ventanilla con el TC anterior: conservan el TC con que se hicieron; el nuevo aplica a las siguientes.`}
            </Alert>
          )}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6} sm={2}>
              <TextField type="date" label={editing ? "Fecha" : "Desde"} size="small" fullWidth InputLabelProps={{ shrink: true }}
                value={form.rate_date} disabled={!!editing} onChange={(e) => setForm({ ...form, rate_date: e.target.value })} />
            </Grid>
            {!editing && (
              <Grid item xs={6} sm={2}>
                <TextField type="date" label="Hasta (opcional)" size="small" fullWidth InputLabelProps={{ shrink: true }}
                  value={form.date_to} inputProps={{ min: form.rate_date }}
                  helperText={form.date_to ? `${dayjs(form.date_to).diff(dayjs(form.rate_date), "day") + 1} días` : "Mismo TC para varios días"}
                  onChange={(e) => setForm({ ...form, date_to: e.target.value })} />
              </Grid>
            )}
            <Grid item xs={4} sm={editing ? 2 : 1}>
              <TextField select label="Moneda" size="small" fullWidth value={form.currency_code} disabled={!!editing} onChange={(e) => setForm({ ...form, currency_code: e.target.value })}>
                {currencies.map((c) => <MenuItem key={c.code} value={c.code}>{c.code}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={4} sm={2}>
              <TextField type="number" label="Compra" size="small" fullWidth inputProps={{ min: 0, step: "0.0001" }}
                value={form.buy_rate} onChange={(e) => setForm({ ...form, buy_rate: e.target.value })} />
            </Grid>
            <Grid item xs={4} sm={2}>
              <TextField type="number" label="Venta" size="small" fullWidth inputProps={{ min: 0, step: "0.0001" }}
                value={form.sell_rate} onChange={(e) => setForm({ ...form, sell_rate: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={editing ? 4 : 3}>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" fullWidth onClick={saveRate} disabled={saving}>
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Guardar TC"}
                </Button>
                {editing && <Button onClick={cancelEdit} disabled={saving}>Cancelar</Button>}
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Paper sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Moneda</TableCell>
              <TableCell align="right">Compra</TableCell>
              <TableCell align="right">Venta</TableCell>
              <TableCell align="right">Operaciones</TableCell>
              <TableCell>Registrado por</TableCell>
              {canEdit && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={canEdit ? 7 : 6}>Sin tipos de cambio en los últimos 30 días.</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={`${String(r.rate_date)}-${r.currency_code}`}>
                <TableCell>{String(r.rate_date).slice(0, 10)}</TableCell>
                <TableCell>{r.currency_code}</TableCell>
                <TableCell align="right">{fmtRate(r.buy_rate)}</TableCell>
                <TableCell align="right">{fmtRate(r.sell_rate)}</TableCell>
                <TableCell align="right">{r.uses || 0}</TableCell>
                <TableCell>{r.updated_by_name}</TableCell>
                {canEdit && (
                  <TableCell>
                    <Button size="small" aria-label={`Editar TC ${r.currency_code} ${String(r.rate_date).slice(0, 10)}`} onClick={() => startEdit(r)}>
                      Editar
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Typography variant="h6" sx={{ mb: 1 }}>Monedas extranjeras</Typography>
      <Paper sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Símbolo</TableCell>
              <TableCell>Denominaciones</TableCell>
              <TableCell>Estado</TableCell>
              {canEdit && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {currencies.map((c) => (
              <TableRow key={c.code}>
                <TableCell>{c.code}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.symbol}</TableCell>
                <TableCell>{c.denominations.join(", ")}</TableCell>
                <TableCell>{c.is_active ? <Chip size="small" color="success" label="Activa" /> : <Chip size="small" label="Inactiva" />}</TableCell>
                {canEdit && (
                  <TableCell>
                    <Button size="small" onClick={() => setCurrencyForm({ ...c, denominations: c.denominations.join(", ") })}>Editar</Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      {canEdit && (
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={4} sm={2}>
              <TextField label="Código" size="small" fullWidth value={currencyForm.code} inputProps={{ maxLength: 3 }}
                onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })} />
            </Grid>
            <Grid item xs={8} sm={3}>
              <TextField label="Nombre" size="small" fullWidth value={currencyForm.name} onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })} />
            </Grid>
            <Grid item xs={4} sm={1}>
              <TextField label="Símbolo" size="small" fullWidth value={currencyForm.symbol} onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })} />
            </Grid>
            <Grid item xs={8} sm={3}>
              <TextField label="Denominaciones (separadas por coma)" size="small" fullWidth value={currencyForm.denominations}
                onChange={(e) => setCurrencyForm({ ...currencyForm, denominations: e.target.value })} />
            </Grid>
            <Grid item xs={6} sm={1}>
              <FormControlLabel control={<Switch checked={currencyForm.is_active} onChange={(e) => setCurrencyForm({ ...currencyForm, is_active: e.target.checked })} />} label="Activa" />
            </Grid>
            <Grid item xs={6} sm={2}>
              <Button variant="outlined" fullWidth onClick={saveCurrency}>Guardar moneda</Button>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
}
