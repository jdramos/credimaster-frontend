import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import API from "../../api";

const money = (value) => Number(value || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const FIELD_LABELS = {
  date: "Fecha *",
  description: "Descripción",
  reference: "Referencia / N° documento",
  debit: "Débito (cargo)",
  credit: "Crédito (abono)",
  amount: "Monto con signo",
  balance: "Saldo",
};

const columnLetter = (index) => {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const MAX_PREVIEW_LINES = 300;

// Importa el estado de cuenta del banco (Excel/CSV). El backend lee el
// archivo y propone el mapeo (plantilla guardada de la cuenta o sugerido por
// los encabezados); aquí el usuario lo ajusta, ve la vista previa y confirma.
export default function BankStatementImportDialog({ open, onClose, bankAccount, defaultStatementDate, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState(null);
  const [statementDate, setStatementDate] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [saveTemplate, setSaveTemplate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setPreview(null);
    setMapping(null);
    setStatementDate(defaultStatementDate || "");
    setClosingBalance("");
    setSaveTemplate(true);
    setError("");
  }, [open, defaultStatementDate]);

  const requestPreview = async (selectedFile, mappingOverride) => {
    if (!selectedFile || !bankAccount) return;
    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("bank_account_id", bankAccount.id);
    if (mappingOverride) fd.append("mapping", JSON.stringify(mappingOverride));
    try {
      setBusy(true);
      setError("");
      const res = await API.post("/api/banks/reconciliation/statement/preview", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const data = res.data;
      setPreview(data);
      setMapping(data.mapping);
      setSaveTemplate(data.mapping_source !== "PLANTILLA");
      const summary = data.parsed?.summary;
      if (summary) {
        if (summary.period_end) setStatementDate(summary.period_end);
        setClosingBalance(summary.closing_balance === null || summary.closing_balance === undefined ? "" : String(summary.closing_balance));
      }
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo leer el archivo");
    } finally {
      setBusy(false);
    }
  };

  const onFileChosen = (event) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    setFile(selected);
    requestPreview(selected, null);
  };

  const headerOptions = useMemo(() => {
    if (!preview) return [];
    if (Number(mapping?.header_row || 0) > 0) {
      const headerRow = preview.sample_rows?.[Number(mapping.header_row) - 1] || [];
      return headerRow
        .map((h, i) => ({ value: String(h ?? "").trim(), label: `${columnLetter(i)} · ${String(h ?? "").trim()}` }))
        .filter((o) => o.value);
    }
    const width = Math.max(0, ...(preview.sample_rows || []).map((r) => r.length));
    return Array.from({ length: width }, (_, i) => ({ value: i, label: `Columna ${columnLetter(i)}` }));
  }, [preview, mapping?.header_row]);

  const setColumn = (field, value) => setMapping((prev) => ({ ...prev, columns: { ...(prev.columns || {}), [field]: value === "" ? undefined : value } }));
  const setOption = (key, value) => setMapping((prev) => ({ ...prev, [key]: value }));

  const changeHeaderRow = (value) => {
    // Cambiar la fila de encabezados invalida las columnas elegidas por nombre.
    setMapping((prev) => ({ ...prev, header_row: Number(value) || 0, columns: {} }));
  };

  const parsed = preview?.parsed;
  const importable = parsed ? parsed.lines.filter((l) => !l.duplicate && !l.closed_period).length : 0;

  const doImport = async () => {
    if (!file || !mapping) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bank_account_id", bankAccount.id);
    fd.append("mapping", JSON.stringify(mapping));
    if (statementDate) fd.append("statement_date", statementDate);
    if (closingBalance !== "") fd.append("closing_balance", closingBalance);
    fd.append("save_template", saveTemplate ? "1" : "0");
    try {
      setBusy(true);
      setError("");
      const res = await API.post("/api/banks/reconciliation/statement/import", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onImported?.(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo importar el estado de cuenta");
    } finally {
      setBusy(false);
    }
  };

  const fields = mapping?.amount_mode === "SIGNED"
    ? ["date", "description", "reference", "amount", "balance"]
    : ["date", "description", "reference", "debit", "credit", "balance"];

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Importar estado de cuenta — {bankAccount?.account_alias}</DialogTitle>
      <DialogContent dividers>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} disabled={busy}>
            {file ? "Cambiar archivo" : "Elegir archivo"}
            <input hidden type="file" accept=".xlsx,.xls,.csv,.txt" onChange={onFileChosen} data-testid="statement-file-input" />
          </Button>
          <Typography variant="body2" color="text.secondary">
            {file ? file.name : "Excel (.xlsx, .xls) o CSV exportado de la banca en línea, máximo 5 MB"}
          </Typography>
          {preview && (
            <Chip
              size="small"
              color={preview.mapping_source === "PLANTILLA" ? "success" : "default"}
              label={preview.mapping_source === "PLANTILLA" ? "Plantilla guardada de la cuenta" : preview.mapping_source === "SUGERIDO" ? "Mapeo sugerido por los encabezados" : "Mapeo manual"}
            />
          )}
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {preview && mapping && (
          <>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Mapeo de columnas</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 1, mb: 1 }}>
              <TextField
                size="small" type="number" label="Fila de encabezados (0 = sin encabezado)"
                value={mapping.header_row ?? 0}
                onChange={(e) => changeHeaderRow(e.target.value)}
              />
              <TextField select size="small" label="Montos" value={mapping.amount_mode || "DEBIT_CREDIT"} onChange={(e) => setOption("amount_mode", e.target.value)}>
                <MenuItem value="DEBIT_CREDIT">Columnas separadas de débito y crédito</MenuItem>
                <MenuItem value="SIGNED">Una columna de monto con signo</MenuItem>
              </TextField>
              <TextField select size="small" label="Formato de fecha" value={mapping.date_format || "AUTO"} onChange={(e) => setOption("date_format", e.target.value)}>
                <MenuItem value="AUTO">Automático (día/mes/año)</MenuItem>
                <MenuItem value="DD/MM/YYYY">día/mes/año</MenuItem>
                <MenuItem value="MM/DD/YYYY">mes/día/año</MenuItem>
                <MenuItem value="YYYY-MM-DD">año-mes-día</MenuItem>
              </TextField>
              <TextField select size="small" label="Separador decimal" value={mapping.decimal_separator || "AUTO"} onChange={(e) => setOption("decimal_separator", e.target.value)}>
                <MenuItem value="AUTO">Automático</MenuItem>
                <MenuItem value=".">Punto (1,234.56)</MenuItem>
                <MenuItem value=",">Coma (1.234,56)</MenuItem>
              </TextField>
              {mapping.amount_mode === "SIGNED" && (
                <TextField select size="small" label="Un monto positivo es" value={mapping.signed_positive || "CREDIT"} onChange={(e) => setOption("signed_positive", e.target.value)}>
                  <MenuItem value="CREDIT">Crédito / abono (entra dinero)</MenuItem>
                  <MenuItem value="DEBIT">Débito / cargo (sale dinero)</MenuItem>
                </TextField>
              )}
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1, mb: 1 }}>
              {fields.map((field) => (
                <TextField
                  key={field} select size="small" label={FIELD_LABELS[field]}
                  value={mapping.columns?.[field] ?? ""}
                  onChange={(e) => setColumn(field, e.target.value)}
                  inputProps={{ "data-testid": `map-${field}` }}
                >
                  <MenuItem value="">(no usar)</MenuItem>
                  {headerOptions.map((o) => <MenuItem key={`${field}-${o.value}`} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
              ))}
            </Box>
            <Button size="small" variant="outlined" disabled={busy} onClick={() => requestPreview(file, mapping)} sx={{ mb: 2 }}>
              Aplicar mapeo
            </Button>

            {preview.mapping_errors?.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>{preview.mapping_errors.join(". ")}</Alert>
            )}

            {!parsed && (
              <>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Primeras filas del archivo ({preview.sheet_name})</Typography>
                <Box sx={{ overflowX: "auto", mb: 2 }}>
                  <Table size="small">
                    <TableBody>
                      {(preview.sample_rows || []).slice(0, 15).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ color: "text.secondary" }}>{i + 1}</TableCell>
                          {row.map((cell, j) => <TableCell key={j}>{String(cell)}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </>
            )}

            {parsed && (
              <>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                  <Chip label={`${parsed.summary.line_count} movimiento(s)`} />
                  <Chip label={`Período ${parsed.summary.period_start || "—"} al ${parsed.summary.period_end || "—"}`} />
                  <Chip label={`Débitos ${money(parsed.summary.total_debits)}`} />
                  <Chip label={`Créditos ${money(parsed.summary.total_credits)}`} />
                  {parsed.summary.opening_balance !== null && <Chip label={`Saldo inicial ${money(parsed.summary.opening_balance)}`} />}
                  {parsed.summary.closing_balance !== null && <Chip color="info" label={`Saldo final ${money(parsed.summary.closing_balance)}`} />}
                  {parsed.duplicates > 0 && <Chip color="warning" label={`${parsed.duplicates} ya importado(s), se omitirán`} />}
                  {parsed.closed_period > 0 && <Chip color="warning" label={`${parsed.closed_period} de un período ya conciliado, se omitirán`} />}
                </Stack>
                {parsed.warnings.map((w) => <Alert key={w} severity="warning" sx={{ mb: 1 }}>{w}</Alert>)}

                <Box sx={{ maxHeight: 320, overflow: "auto", mb: 2, border: "1px solid #E5E7EB", borderRadius: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Referencia</TableCell>
                        <TableCell>Descripción</TableCell>
                        <TableCell align="right">Débito</TableCell>
                        <TableCell align="right">Crédito</TableCell>
                        <TableCell align="right">Saldo</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parsed.lines.slice(0, MAX_PREVIEW_LINES).map((l) => (
                        <TableRow key={`${l.line_no}-${l.fingerprint}`} sx={{ opacity: l.duplicate || l.closed_period ? 0.5 : 1 }}>
                          <TableCell>{l.txn_date}</TableCell>
                          <TableCell>{l.reference}</TableCell>
                          <TableCell>{l.description}</TableCell>
                          <TableCell align="right">{l.debit ? money(l.debit) : ""}</TableCell>
                          <TableCell align="right">{l.credit ? money(l.credit) : ""}</TableCell>
                          <TableCell align="right">{l.balance === null ? "" : money(l.balance)}</TableCell>
                          <TableCell>
                            {l.duplicate && <Chip size="small" label="Ya importado" />}
                            {!l.duplicate && l.closed_period && <Chip size="small" label="Período conciliado" />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
                {parsed.skipped?.length > 0 && (
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 2 }}>
                    Filas ignoradas (títulos, totales o sin monto): {parsed.skipped.map((s) => s.row).join(", ")}
                  </Typography>
                )}

                <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                  <TextField
                    size="small" type="date" label="Fecha de corte del estado" InputLabelProps={{ shrink: true }}
                    value={statementDate} onChange={(e) => setStatementDate(e.target.value)}
                  />
                  <TextField
                    size="small" type="number" label="Saldo final según el banco"
                    value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)}
                    helperText={parsed.summary.closing_balance === null ? "El archivo no trae saldo; escríbalo del estado impreso" : " "}
                  />
                  <FormControlLabel
                    control={<Checkbox checked={saveTemplate} onChange={(e) => setSaveTemplate(e.target.checked)} />}
                    label="Guardar este mapeo como plantilla de la cuenta"
                  />
                </Stack>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button variant="contained" onClick={doImport} disabled={busy || !parsed || importable === 0}>
          {busy ? "Procesando..." : `Importar ${importable} movimiento(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
