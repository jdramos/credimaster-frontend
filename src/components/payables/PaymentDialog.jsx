import React, { useEffect, useMemo, useState } from "react";
import {
  Autocomplete, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import API from "../../api";
import { printRetentionCertificate } from "../retentions/printRetentionCertificate";

const money = (v) => Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

export default function PaymentDialog({ open, onClose, providers, accounts, onSaved, notify }) {
  const [provider, setProvider] = useState(null);
  const [method, setMethod] = useState("CASH");
  const [sourceAccount, setSourceAccount] = useState(null);
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(today());
  const [invoices, setInvoices] = useState([]);
  const [sel, setSel] = useState({});
  const [saving, setSaving] = useState(false);
  // Solo para forma de pago = Cheque
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccount, setBankAccount] = useState(null);
  const [checkNumber, setCheckNumber] = useState("");
  // Modo anticipo
  const [isAdvance, setIsAdvance] = useState(false);
  const [advanceAccount, setAdvanceAccount] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState("");

  useEffect(() => {
    if (open) {
      setProvider(null); setMethod("CASH"); setSourceAccount(null);
      setReference(""); setDate(today()); setInvoices([]); setSel({});
      setBankAccount(null); setCheckNumber("");
      setIsAdvance(false); setAdvanceAccount(null); setAdvanceAmount("");
      API.get("/api/banks/accounts", { params: { status: "ACTIVA" } })
        .then((res) => setBankAccounts(res.data?.data || []))
        .catch(() => setBankAccounts([]));
      // Precarga la cuenta de anticipos parametrizada (MUC 1602.01).
      API.get("/api/payables/config")
        .then((res) => { if (res.data?.advance_account) setAdvanceAccount(res.data.advance_account); })
        .catch(() => {});
    }
  }, [open]);

  // Al elegir cuenta bancaria, sugiere el próximo número de cheque.
  const onPickBankAccount = (acc) => {
    setBankAccount(acc);
    setCheckNumber(acc?.next_check_number ? String(acc.next_check_number) : "");
  };

  const isCheck = method === "CHECK";

  const loadInvoices = async (prov) => {
    setSel({});
    if (!prov) { setInvoices([]); return; }
    try {
      const res = await API.get("/api/payables/invoices", { params: { provider_id: prov.id, open: 1 } });
      setInvoices(res.data?.data || []);
    } catch (e) { setInvoices([]); }
  };

  const net = useMemo(
    () => Object.entries(sel).reduce((s, [id, amt]) => {
      const inv = invoices.find((i) => String(i.id) === String(id));
      const amount = Number(amt) || 0;
      const ret = inv && Number(inv.amount) > 0 ? (Number(inv.retention_amount) * amount) / Number(inv.amount) : 0;
      return s + amount - ret;
    }, 0),
    [sel, invoices],
  );

  const save = async () => {
    setSaving(true);
    try {
      if (isAdvance) {
        if (!provider) { notify("Elija el proveedor", "warning"); setSaving(false); return; }
        if (!(Number(advanceAmount) > 0)) { notify("Indique el monto del anticipo", "warning"); setSaving(false); return; }
        if (!advanceAccount) { notify("Elija la cuenta de anticipos a proveedores", "warning"); setSaving(false); return; }
        const body = {
          provider_id: provider.id, amount: Number(advanceAmount), method,
          advance_account_id: advanceAccount.id, reference: reference || null, payment_date: date,
        };
        if (isCheck) {
          if (!bankAccount) { notify("Elija la cuenta bancaria", "warning"); setSaving(false); return; }
          if (!checkNumber) { notify("Indique el número de cheque", "warning"); setSaving(false); return; }
          body.bank_account_id = bankAccount.id; body.check_number = checkNumber;
        } else {
          if (!sourceAccount) { notify("Elija la cuenta de origen", "warning"); setSaving(false); return; }
          body.source_account_id = sourceAccount.id;
        }
        await API.post("/api/payables/advances", body);
        notify("Anticipo registrado");
        onSaved?.(); onClose();
        return;
      }

      const payments = Object.entries(sel)
        .map(([id, amt]) => ({ invoice_id: Number(id), amount: Number(amt) || 0 }))
        .filter((p) => p.amount > 0);
      if (!payments.length) { notify("Seleccione al menos una factura", "warning"); setSaving(false); return; }

      if (isCheck) {
        if (!bankAccount) { notify("Elija la cuenta bancaria", "warning"); setSaving(false); return; }
        if (!checkNumber) { notify("Indique el número de cheque", "warning"); setSaving(false); return; }
        // El cheque se emite por el módulo de bancos; el backend arma el asiento
        // desde las facturas y aplica los pagos.
        await API.post("/api/banks/checks", {
          bank_account_id: bankAccount.id,
          check_number: checkNumber,
          issue_date: date,
          beneficiary_name: provider?.name || "",
          provider_id: provider?.id || null,
          concept: reference || "Pago a proveedor",
          invoice_payments: payments,
          lines: [],
        });
        notify("Cheque emitido y pago registrado");
      } else {
        if (!sourceAccount) { notify("Elija la cuenta de origen (caja/banco)", "warning"); setSaving(false); return; }
        await API.post("/api/payables/payments", {
          payments, method, source_account_id: sourceAccount.id,
          reference: reference || null, payment_date: date,
        });
        notify("Pago registrado");
      }
      // Constancia de retención: si el pago involucró facturas con retención,
      // se ofrece imprimir la constancia del proveedor del período.
      const hadRetention = payments.some((p) => {
        const inv = invoices.find((i) => String(i.id) === String(p.invoice_id));
        return Number(inv?.retention_amount) > 0;
      });
      onSaved?.();
      onClose();
      if (hadRetention && provider?.ruc &&
        window.confirm("¿Imprimir la constancia de retención del proveedor?")) {
        try {
          const res = await API.get("/api/retentions/certificate", {
            params: { period: String(date).slice(0, 7), ruc: provider.ruc },
          });
          printRetentionCertificate(res.data);
        } catch (e) { /* la retención puede estar en otro período (modo a la factura) */ }
      }
    } catch (e) {
      notify(e.response?.data?.message || "Error registrando pago", "error");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Registrar pago a proveedor</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <Autocomplete size="small" options={providers} value={provider}
            getOptionLabel={(o) => (o.ruc ? `${o.name} (${o.ruc})` : o.name)}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            onChange={(_, v) => { setProvider(v); loadInvoices(v); }}
            renderInput={(params) => <TextField {...params} label="Proveedor" />} />

          <FormControlLabel
            control={<Checkbox checked={isAdvance} onChange={(e) => setIsAdvance(e.target.checked)} />}
            label="Registrar como anticipo (sin factura, para aplicar después)" />

          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField select size="small" label="Forma de pago" value={method}
              onChange={(e) => setMethod(e.target.value)} sx={{ minWidth: 150 }}>
              <MenuItem value="CASH">Efectivo</MenuItem>
              <MenuItem value="TRANSFER">Transferencia</MenuItem>
              <MenuItem value="CHECK">Cheque</MenuItem>
            </TextField>
            {isCheck ? (
              <>
                <Autocomplete size="small" options={bankAccounts} value={bankAccount} sx={{ flex: 1 }}
                  getOptionLabel={(o) => o.account_alias || o.account_name || `#${o.id}`}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  onChange={(_, v) => onPickBankAccount(v)}
                  renderInput={(params) => <TextField {...params} label="Cuenta bancaria" />} />
                <TextField size="small" label="N° de cheque" value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)} sx={{ width: 140 }} />
              </>
            ) : (
              <Autocomplete size="small" options={accounts} value={sourceAccount} sx={{ flex: 1 }}
                getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, v) => setSourceAccount(v)}
                renderInput={(params) => <TextField {...params} label="Cuenta de origen (caja/banco)" />} />
            )}
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }}
              value={date} onChange={(e) => setDate(e.target.value)} />
            <TextField size="small" label="Referencia" value={reference}
              onChange={(e) => setReference(e.target.value)} sx={{ flex: 1 }} />
          </Stack>

          {isAdvance && (
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <Autocomplete size="small" options={accounts} value={advanceAccount} sx={{ flex: 1 }}
                getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, v) => setAdvanceAccount(v)}
                renderInput={(params) => <TextField {...params} label="Cuenta de anticipos a proveedores" />} />
              <TextField size="small" type="number" label="Monto del anticipo" value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)} sx={{ width: 180 }} />
            </Stack>
          )}

          {!isAdvance && invoices.length > 0 && (
            <Box sx={{ p: 1, border: "1px dashed #CBD5E1", borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">FACTURAS PENDIENTES</Typography>
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {invoices.map((inv) => {
                  const on = sel[inv.id] != null;
                  return (
                    <Stack key={inv.id} direction="row" spacing={1} alignItems="center">
                      <Checkbox size="small" checked={on} sx={{ p: 0.5 }}
                        onChange={(e) => setSel((m) => {
                          const n = { ...m };
                          if (e.target.checked) n[inv.id] = String(inv.balance);
                          else delete n[inv.id];
                          return n;
                        })} />
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {inv.document_number || `#${inv.id}`} · saldo C$ {money(inv.balance)}
                      </Typography>
                      {on && (
                        <TextField size="small" type="number" label="Aplicar" value={sel[inv.id]}
                          onChange={(e) => setSel((m) => ({ ...m, [inv.id]: e.target.value }))}
                          sx={{ width: 120 }} />
                      )}
                    </Stack>
                  );
                })}
              </Stack>
            </Box>
          )}

          <Stack direction="row" justifyContent="flex-end">
            <Chip color="primary"
              label={isAdvance
                ? `Anticipo: C$ ${money(advanceAmount)}`
                : `Neto a pagar: C$ ${money(net)}`} />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancelar</Button>
        <Button variant="contained" onClick={save} disabled={saving}
          sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" }, textTransform: "none" }}>
          {saving ? "Registrando..." : "Registrar pago"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
