import React, { useEffect, useMemo, useState } from "react";
import HelpButton from "../help/HelpButton";
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Paper, Snackbar, Stack, TextField, Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import WaterfallChartIcon from "@mui/icons-material/WaterfallChart";
import PrintIcon from "@mui/icons-material/Print";
import EditNoteIcon from "@mui/icons-material/EditNote";
import DeleteIcon from "@mui/icons-material/Delete";
import API from "../../api";
import { printAccountingReport } from "../accounting/printAccountingReport";

const money = (v) => Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const iso = (d) => d.toISOString().slice(0, 10);
const MES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const bucketLabel = (b, gran) => {
  if (gran === "WEEK") {
    const [y, m, d] = String(b).split("-");
    return `Sem. ${d}/${m}/${y}`;
  }
  const [y, m] = String(b).split("-");
  return `${MES[Number(m) - 1] || m} ${y}`;
};

export default function CashFlowProjection() {
  const today = new Date();
  const [filters, setFilters] = useState({
    from: iso(today),
    to: iso(new Date(today.getFullYear(), today.getMonth() + 3, today.getDate())),
    granularity: "MONTH",
    opening_balance: "0",
  });
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [gran, setGran] = useState("MONTH");
  const [loading, setLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [concepts, setConcepts] = useState([]);
  const [items, setItems] = useState([]);
  const [itemForm, setItemForm] = useState({ concept_name: "", type: "OUTFLOW", amount: "", item_date: iso(today), note: "" });
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const notify = (message, severity = "error") => setAlert({ open: true, severity, message });

  const fetchManual = async () => {
    try {
      const [c, it] = await Promise.all([
        API.get("/api/cashflow/concepts"),
        API.get("/api/cashflow/items", { params: { from: filters.from, to: filters.to } }),
      ]);
      setConcepts(c.data?.data || []);
      setItems(it.data?.data || []);
    } catch (e) { /* opcional */ }
  };

  useEffect(() => { fetchManual(); /* eslint-disable-next-line */ }, []);

  const addItem = async () => {
    if (!itemForm.concept_name.trim() || !(Number(itemForm.amount) > 0)) {
      notify("Concepto y monto (>0) son obligatorios", "warning"); return;
    }
    try {
      await API.post("/api/cashflow/items", {
        concept_name: itemForm.concept_name.trim(), type: itemForm.type,
        amount: Number(itemForm.amount), item_date: itemForm.item_date, note: itemForm.note || null,
      });
      setItemForm({ concept_name: "", type: itemForm.type, amount: "", item_date: itemForm.item_date, note: "" });
      await fetchManual();
      generate();
    } catch (e) { notify(e.response?.data?.message || "Error agregando concepto", "error"); }
  };

  const deleteItem = async (id) => {
    try {
      await API.delete(`/api/cashflow/items/${id}`);
      await fetchManual();
      generate();
    } catch (e) { notify(e.response?.data?.message || "Error", "error"); }
  };

  const generate = async () => {
    setLoading(true);
    try {
      const res = await API.get("/api/cashflow/projection", {
        params: {
          from: filters.from, to: filters.to,
          granularity: filters.granularity,
          opening_balance: Number(filters.opening_balance || 0),
        },
      });
      setRows((res.data?.data || []).map((r) => ({ id: r.bucket, ...r })));
      setTotals(res.data?.totals || null);
      setGran(res.data?.granularity || filters.granularity);
    } catch (e) {
      notify(e.response?.data?.message || "Error generando el flujo de caja");
    } finally {
      setLoading(false);
    }
  };

  const setF = (k, v) => setFilters((p) => ({ ...p, [k]: v }));

  const useBankBalance = async () => {
    try {
      const res = await API.get("/api/cashflow/opening-balance");
      setFilters((p) => ({ ...p, opening_balance: String(res.data?.balance ?? 0) }));
      notify("Saldo inicial tomado del disponible en bancos/caja", "success");
    } catch (e) {
      notify(e.response?.data?.message || "No se pudo obtener el saldo de bancos", "error");
    }
  };

  const columns = useMemo(() => [
    { field: "bucket", headerName: "Período", width: 150, valueGetter: (p) => bucketLabel(p.value, gran) },
    { field: "inflow", headerName: "Entradas (cobros)", width: 160, type: "number", valueFormatter: (p) => money(p.value) },
    { field: "outflow", headerName: "Salidas (CxP)", width: 150, type: "number", valueFormatter: (p) => money(p.value) },
    {
      field: "net", headerName: "Neto", width: 150, type: "number",
      renderCell: (p) => (
        <span style={{ color: Number(p.value) < 0 ? "#b91c1c" : "#166534", fontWeight: 600 }}>{money(p.value)}</span>
      ),
    },
    {
      field: "balance", headerName: "Saldo proyectado", width: 170, type: "number",
      renderCell: (p) => (
        <span style={{ color: Number(p.value) < 0 ? "#b91c1c" : "inherit", fontWeight: 700 }}>{money(p.value)}</span>
      ),
    },
  ], [gran]);

  const printReport = () => printAccountingReport({
    title: "Flujo de Caja Proyectado",
    subtitle: `Del ${filters.from} al ${filters.to} · Saldo inicial: C$ ${money(filters.opening_balance)}`,
    period: "",
    columns: [
      { field: "bucket", label: "Período", value: (r) => bucketLabel(r.bucket, gran) },
      { field: "inflow", label: "Entradas", numeric: true, format: money },
      { field: "outflow", label: "Salidas", numeric: true, format: money },
      { field: "net", label: "Neto", numeric: true, format: money },
      { field: "balance", label: "Saldo proyectado", numeric: true, format: money },
    ],
    rows,
    totals: totals ? [
      { value: "Totales", colspan: 1 },
      { value: money(totals.inflow), numeric: true },
      { value: money(totals.outflow), numeric: true },
      { value: money(totals.net), numeric: true },
      { value: money(totals.ending_balance), numeric: true },
    ] : [],
  });

  const firstNegative = rows.find((r) => Number(r.balance) < 0);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <WaterfallChartIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="h6" fontWeight={700}>Flujo de Caja Proyectado</Typography>
              <HelpButton screenKey="creditos.flujo-caja" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Cobros esperados de créditos vs. pagos a proveedores, por período
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
          <TextField size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }}
            value={filters.from} onChange={(e) => setF("from", e.target.value)} />
          <TextField size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }}
            value={filters.to} onChange={(e) => setF("to", e.target.value)} />
          <TextField select size="small" label="Agrupar por" value={filters.granularity}
            onChange={(e) => setF("granularity", e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="MONTH">Mes</MenuItem>
            <MenuItem value="WEEK">Semana</MenuItem>
          </TextField>
          <TextField size="small" type="number" label="Saldo inicial (caja/banco)"
            value={filters.opening_balance} onChange={(e) => setF("opening_balance", e.target.value)} sx={{ minWidth: 190 }} />
          <Button variant="text" onClick={useBankBalance} sx={{ textTransform: "none" }}>Saldo de bancos</Button>
          <Button variant="contained" onClick={generate} disabled={loading}
            sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" }, textTransform: "none" }}>
            Generar
          </Button>
          <Button variant="outlined" startIcon={<EditNoteIcon />} onClick={() => { fetchManual(); setManualOpen(true); }}
            sx={{ textTransform: "none" }}>Conceptos manuales</Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={printReport} disabled={!rows.length}
            sx={{ textTransform: "none" }}>Imprimir</Button>
        </Stack>

        {totals && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
            <Chip color="success" label={`Entradas: C$ ${money(totals.inflow)}`} />
            <Chip color="warning" label={`Salidas: C$ ${money(totals.outflow)}`} />
            <Chip color={totals.net < 0 ? "error" : "primary"} label={`Neto: C$ ${money(totals.net)}`} />
            <Chip color={totals.ending_balance < 0 ? "error" : "default"} label={`Saldo final: C$ ${money(totals.ending_balance)}`} />
          </Stack>
        )}

        {firstNegative && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Se proyecta un <strong>saldo negativo</strong> en {bucketLabel(firstNegative.bucket, gran)} (C$ {money(firstNegative.balance)}). Considere adelantar cobros o reprogramar pagos.
          </Alert>
        )}

        {rows.length > 0 && <CashFlowChart rows={rows} gran={gran} />}

        <Box sx={{ height: 520 }}>
          <DataGrid rows={rows} columns={columns} loading={loading} getRowId={(r) => r.id}
            density="compact" hideFooter={rows.length <= 100} disableRowSelectionOnClick
            sx={{
              border: "1px solid #E5E7EB", borderRadius: 2,
              "& .MuiDataGrid-columnHeaders": { backgroundColor: "#F8FAFC", fontWeight: 700 },
            }} />
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          Entradas = cuotas pendientes de créditos vigentes por fecha de pago. Salidas = facturas por pagar (por vencimiento) + cuotas de obligaciones financieras + conceptos manuales de salida. Es una proyección de tesorería, no afecta la contabilidad.
        </Typography>
      </Paper>

      <Dialog open={manualOpen} onClose={() => setManualOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Conceptos manuales del flujo</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Agrega entradas o salidas que no vienen de créditos ni de CxP (aportes, alquiler, impuestos…). Los conceptos quedan guardados para reutilizarlos en futuros flujos.
          </Alert>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }} alignItems="center">
            <Autocomplete freeSolo size="small" sx={{ flex: 1, minWidth: 180 }}
              options={concepts.filter((c) => c.type === itemForm.type).map((c) => c.name)}
              value={itemForm.concept_name}
              onInputChange={(_, v) => setItemForm((f) => ({ ...f, concept_name: v }))}
              renderInput={(params) => <TextField {...params} label="Concepto" />} />
            <TextField select size="small" label="Tipo" value={itemForm.type}
              onChange={(e) => setItemForm((f) => ({ ...f, type: e.target.value }))} sx={{ minWidth: 120 }}>
              <MenuItem value="INFLOW">Entrada</MenuItem>
              <MenuItem value="OUTFLOW">Salida</MenuItem>
            </TextField>
            <TextField size="small" type="number" label="Monto" value={itemForm.amount}
              onChange={(e) => setItemForm((f) => ({ ...f, amount: e.target.value }))} sx={{ width: 130 }} />
            <TextField size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }}
              value={itemForm.item_date} onChange={(e) => setItemForm((f) => ({ ...f, item_date: e.target.value }))} />
            <Button variant="contained" onClick={addItem}
              sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" }, textTransform: "none" }}>Agregar</Button>
          </Stack>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>Ítems registrados</Typography>
          <Stack spacing={0.5}>
            {items.map((it) => (
              <Stack key={it.id} direction="row" spacing={1} alignItems="center">
                <Chip size="small" color={it.type === "INFLOW" ? "success" : "warning"}
                  label={it.type === "INFLOW" ? "Entrada" : "Salida"} sx={{ width: 90 }} />
                <Typography variant="body2" sx={{ width: 110 }}>{String(it.item_date).slice(0, 10)}</Typography>
                <Typography variant="body2" sx={{ flex: 1 }}>{it.concept_name}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>C$ {money(it.amount)}</Typography>
                <IconButton size="small" color="error" onClick={() => deleteItem(it.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
            {!items.length && <Typography variant="body2" color="text.secondary">Sin ítems manuales en el rango.</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualOpen(false)} sx={{ textTransform: "none" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={4000}
        onClose={() => setAlert((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}

// Gráfico de la curva de saldo proyectado (SVG propio, sin dependencias).
const shortLabel = (b, gran) => {
  if (gran === "WEEK") { const [, m, d] = String(b).split("-"); return `${d}/${m}`; }
  const [y, m] = String(b).split("-");
  return `${MES[Number(m) - 1] || m}${String(y).slice(2)}`;
};
const fmtK = (v) => {
  const n = Number(v);
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
};

function CashFlowChart({ rows, gran }) {
  const W = Math.max(640, rows.length * 64);
  const H = 240, padL = 56, padR = 20, padT = 20, padB = 42;
  const vals = rows.map((r) => Number(r.balance));
  const min = Math.min(0, ...vals);
  const max = Math.max(0, ...vals);
  const range = max - min || 1;
  const x = (i) => (rows.length === 1 ? padL + (W - padL - padR) / 2 : padL + (i * (W - padL - padR)) / (rows.length - 1));
  const y = (v) => padT + (H - padT - padB) * (1 - (v - min) / range);
  const zeroY = y(0);
  const points = rows.map((r, i) => `${x(i)},${y(r.balance)}`).join(" ");
  const areaPts = `${padL},${zeroY} ${points} ${x(rows.length - 1)},${zeroY}`;
  const labelEvery = Math.max(1, Math.ceil(rows.length / 12));

  return (
    <Box sx={{ overflowX: "auto", mb: 2, border: "1px solid #E5E7EB", borderRadius: 2, p: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>Saldo proyectado</Typography>
      <svg width={W} height={H} role="img">
        <polygon points={areaPts} fill="#0057B8" opacity="0.08" />
        <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="#94A3B8" strokeDasharray="4 4" />
        <polyline fill="none" stroke="#0057B8" strokeWidth="2" points={points} />
        {rows.map((r, i) => (
          <circle key={i} cx={x(i)} cy={y(r.balance)} r="3.5" fill={Number(r.balance) < 0 ? "#b91c1c" : "#0057B8"} />
        ))}
        {rows.map((r, i) => (i % labelEvery === 0 ? (
          <text key={`x${i}`} x={x(i)} y={H - padB + 16} fontSize="10" textAnchor="middle" fill="#475569">
            {shortLabel(r.bucket, gran)}
          </text>
        ) : null))}
        <text x={padL - 8} y={y(max) + 3} fontSize="10" textAnchor="end" fill="#475569">{fmtK(max)}</text>
        <text x={padL - 8} y={zeroY + 3} fontSize="10" textAnchor="end" fill="#475569">0</text>
        {min < 0 && <text x={padL - 8} y={y(min) + 3} fontSize="10" textAnchor="end" fill="#b91c1c">{fmtK(min)}</text>}
      </svg>
    </Box>
  );
}
