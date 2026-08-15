import React, { useEffect, useState } from "react";
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { DataGrid } from "@mui/x-data-grid";
import API from "../../api";
import { printAccountingReport } from "../accounting/printAccountingReport";

const money = (v) => Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateStr = (v) => (v ? String(v).slice(0, 10) : "");
const TYPE_LABEL = { FACTURA: "Factura", CHECK: "Cheque", CASH: "Efectivo", TRANSFER: "Transferencia", CREDIT_NOTE: "Nota de crédito" };

export default function StatementDialog({ open, onClose, providerId, notify }) {
  const [rows, setRows] = useState([]);
  const [provider, setProvider] = useState(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!open || !providerId) return;
    API.get(`/api/payables/providers/${providerId}/statement`)
      .then((res) => {
        setRows((res.data?.data || []).map((r, i) => ({ id: i, ...r })));
        setProvider(res.data?.provider || null);
        setBalance(res.data?.balance || 0);
      })
      .catch((e) => notify?.(e.response?.data?.message || "Error cargando estado de cuenta", "error"));
  }, [open, providerId, notify]);

  const columns = [
    { field: "date", headerName: "Fecha", width: 110, valueGetter: (p) => dateStr(p.value) },
    { field: "type", headerName: "Tipo", width: 130, valueGetter: (p) => TYPE_LABEL[p.value] || p.value },
    { field: "reference", headerName: "Referencia", width: 130, valueGetter: (p) => p.value || "—" },
    { field: "charge", headerName: "Cargo", width: 120, type: "number", valueFormatter: (p) => money(p.value) },
    { field: "credit", headerName: "Abono", width: 120, type: "number", valueFormatter: (p) => money(p.value) },
    { field: "balance", headerName: "Saldo", width: 130, type: "number", valueFormatter: (p) => money(p.value) },
  ];

  const print = () => printAccountingReport({
    title: "Estado de Cuenta - Proveedor",
    subtitle: `${provider?.name || ""}${provider?.ruc ? ` · RUC: ${provider.ruc}` : ""}`,
    period: "",
    columns: [
      { field: "date", label: "Fecha", value: (r) => dateStr(r.date) },
      { field: "type", label: "Tipo", value: (r) => TYPE_LABEL[r.type] || r.type },
      { field: "reference", label: "Referencia" },
      { field: "charge", label: "Cargo", numeric: true, format: money },
      { field: "credit", label: "Abono", numeric: true, format: money },
      { field: "balance", label: "Saldo", numeric: true, format: money },
    ],
    rows,
    totals: [{ value: "Saldo final", colspan: 5 }, { value: money(balance), numeric: true }],
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        Estado de cuenta — {provider?.name || ""}
      </DialogTitle>
      <DialogContent dividers>
        <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            {provider?.ruc ? `RUC: ${provider.ruc}` : ""}
          </Typography>
          <Button size="small" startIcon={<PrintIcon />} onClick={print} disabled={!rows.length}>Imprimir</Button>
        </Stack>
        {rows.length === 0 && <Alert severity="info">Sin movimientos.</Alert>}
        <Box sx={{ height: 420 }}>
          <DataGrid rows={rows} columns={columns} getRowId={(r) => r.id} density="compact"
            hideFooter disableRowSelectionOnClick />
        </Box>
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
          <Typography variant="subtitle1" fontWeight={800}>Saldo: C$ {money(balance)}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
