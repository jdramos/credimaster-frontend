import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Alert,
  Snackbar,
  Button,
  IconButton,
  Tooltip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Autocomplete,
  Chip,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import EditNoteIcon from "@mui/icons-material/EditNote";
import SaveIcon from "@mui/icons-material/Save";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  getBudget,
  getBudgetableAccounts,
  getBudgetAccountLines,
  saveBudgetAccountLines,
} from "../../api/budget";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", minimumFractionDigits: 2 }).format(Number(value || 0));

export default function BudgetAccountLinesEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [budget, setBudget] = useState(null);
  const [accountOptions, setAccountOptions] = useState([]);
  const [rows, setRows] = useState([]); // [{account_id, muc_code, account_name, account_type, months: [12]}]
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const load = async () => {
    try {
      setLoading(true);
      const [budgetRes, accountsRes, linesRes] = await Promise.all([
        getBudget(id),
        getBudgetableAccounts(),
        getBudgetAccountLines(id),
      ]);

      setBudget(budgetRes?.data || null);
      setAccountOptions(accountsRes?.data || []);

      const byAccount = new Map();
      for (const line of linesRes?.data || []) {
        if (!byAccount.has(line.account_id)) {
          byAccount.set(line.account_id, {
            account_id: line.account_id,
            muc_code: line.muc_code,
            account_name: line.account_name,
            account_type: line.account_type,
            months: Array(12).fill(0),
          });
        }
        byAccount.get(line.account_id).months[line.month_no - 1] = Number(line.amount) || 0;
      }
      setRows([...byAccount.values()].sort((a, b) => a.muc_code.localeCompare(b.muc_code)));
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar el presupuesto operativo", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const availableAccounts = useMemo(
    () => accountOptions.filter((a) => !rows.some((r) => r.account_id === a.id)),
    [accountOptions, rows],
  );

  const handleAddAccount = (account) => {
    if (!account) return;
    setRows((prev) =>
      [
        ...prev,
        {
          account_id: account.id,
          muc_code: account.muc_code,
          account_name: account.account_name,
          account_type: account.account_type,
          months: Array(12).fill(0),
        },
      ].sort((a, b) => a.muc_code.localeCompare(b.muc_code)),
    );
  };

  const handleRemoveRow = (accountId) => {
    setRows((prev) => prev.filter((r) => r.account_id !== accountId));
  };

  const handleCellChange = (accountId, monthIdx, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.account_id !== accountId) return r;
        const months = [...r.months];
        months[monthIdx] = value === "" ? 0 : Number(value);
        return { ...r, months };
      }),
    );
  };

  const handleReplicateJanuary = (accountId) => {
    setRows((prev) =>
      prev.map((r) => (r.account_id === accountId ? { ...r, months: Array(12).fill(r.months[0]) } : r)),
    );
  };

  const handleSave = async () => {
    const lines = rows.flatMap((r) =>
      r.months.map((amount, idx) => ({ account_id: r.account_id, month_no: idx + 1, amount })),
    );

    if (!lines.length) {
      showAlert("Agrega al menos una cuenta antes de guardar", "error");
      return;
    }

    try {
      setSaving(true);
      await saveBudgetAccountLines(id, lines);
      showAlert("Presupuesto operativo guardado correctamente");
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const totalsByMonth = useMemo(() => {
    const totals = Array(12).fill(0);
    rows.forEach((r) => r.months.forEach((v, i) => { totals[i] += v; }));
    return totals;
  }, [rows]);

  return (
    <Box sx={{ p: 2 }}>
      <Breadcrumbs sx={{ mb: 1.5 }}>
        <Link component={RouterLink} to="/presupuesto" underline="hover">Presupuestos</Link>
        <Typography color="text.primary">{budget ? `${budget.name} (${budget.year_no})` : "..."}</Typography>
        <Typography color="text.primary">Presupuesto operativo</Typography>
      </Breadcrumbs>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <EditNoteIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Presupuesto operativo por cuenta</Typography>
              <Typography variant="body2" color="text.secondary">
                Monto presupuestado por cuenta MUC (gasto/ingreso) y mes
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" sx={{ textTransform: "none" }} onClick={() => navigate("/presupuesto")}>
              Volver
            </Button>
            <Button variant="contained" startIcon={<SaveIcon />} disabled={saving || loading} sx={{ textTransform: "none" }} onClick={handleSave}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </Box>
        </Box>

        <Autocomplete
          options={availableAccounts}
          getOptionLabel={(a) => `${a.muc_code} — ${a.account_name}`}
          onChange={(_, value) => handleAddAccount(value)}
          value={null}
          renderInput={(params) => <TextField {...params} size="small" label="Agregar cuenta al presupuesto" />}
          sx={{ maxWidth: 480, mb: 2 }}
        />

        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 1200 }}>
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, backgroundColor: "#F8FAFC" } }}>
                <TableCell>Cuenta</TableCell>
                <TableCell>Tipo</TableCell>
                {MONTH_LABELS.map((m) => (
                  <TableCell key={m} align="right">{m}</TableCell>
                ))}
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.account_id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <Typography variant="body2" fontWeight={600}>{row.muc_code}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.account_name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.account_type} color={row.account_type === "GASTO" ? "error" : "success"} variant="outlined" />
                  </TableCell>
                  {row.months.map((value, idx) => (
                    <TableCell key={idx} align="right" sx={{ p: 0.5 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={value}
                        onChange={(e) => handleCellChange(row.account_id, idx, e.target.value)}
                        inputProps={{ style: { textAlign: "right" }, min: 0, step: 0.01 }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                    <Tooltip title="Replicar enero en todos los meses">
                      <IconButton size="small" onClick={() => handleReplicateJanuary(row.account_id)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Quitar cuenta">
                      <IconButton size="small" onClick={() => handleRemoveRow(row.account_id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {rows.length > 0 && (
                <TableRow sx={{ "& td": { fontWeight: 700, borderTop: "2px solid #E5E7EB" } }}>
                  <TableCell colSpan={2}>Total</TableCell>
                  {totalsByMonth.map((t, idx) => (
                    <TableCell key={idx} align="right">{formatCurrency(t)}</TableCell>
                  ))}
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>

          {!rows.length && !loading && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
              Agrega una cuenta arriba para empezar a presupuestar.
            </Typography>
          )}
        </Box>
      </Paper>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
