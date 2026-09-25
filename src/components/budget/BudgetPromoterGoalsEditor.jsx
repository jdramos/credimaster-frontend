import React, { useEffect, useMemo, useState } from "react";
import HelpButton from "../help/HelpButton";
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
  Breadcrumbs,
  Link,
} from "@mui/material";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import PersonPinIcon from "@mui/icons-material/PersonPin";
import SaveIcon from "@mui/icons-material/Save";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { getBudget, getBudgetPromoterGoals, saveBudgetPromoterGoals } from "../../api/budget";
import { getDashboardCatalogs } from "../../api/dashboardBalances";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", minimumFractionDigits: 2 }).format(Number(value || 0));

export default function BudgetPromoterGoalsEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [budget, setBudget] = useState(null);
  const [promoterOptions, setPromoterOptions] = useState([]);
  const [rows, setRows] = useState([]); // [{key: promoter_id, promoter_id, promoter_name, months: [12]}]
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const load = async () => {
    try {
      setLoading(true);
      const [budgetRes, catalogsRes, goalsRes] = await Promise.all([
        getBudget(id),
        getDashboardCatalogs(),
        getBudgetPromoterGoals(id),
      ]);

      setBudget(budgetRes?.data || null);
      setPromoterOptions(catalogsRes?.data?.promoters || []);

      const byKey = new Map();
      for (const goal of goalsRes?.data || []) {
        const key = goal.promoter_id;
        if (!byKey.has(key)) {
          byKey.set(key, {
            key,
            promoter_id: goal.promoter_id,
            promoter_name: goal.promoter_name,
            months: Array(12).fill(0),
          });
        }
        byKey.get(key).months[goal.month_no - 1] = Number(goal.target_amount) || 0;
      }

      setRows([...byKey.values()].sort((a, b) => a.promoter_name.localeCompare(b.promoter_name)));
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar las metas por promotor", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const availablePromoters = useMemo(
    () => promoterOptions.filter((p) => !rows.some((r) => r.promoter_id === p.id)),
    [promoterOptions, rows],
  );

  const handleAddPromoter = (promoter) => {
    if (!promoter) return;
    setRows((prev) => [...prev, { key: promoter.id, promoter_id: promoter.id, promoter_name: promoter.name, months: Array(12).fill(0) }]);
  };

  const handleRemoveRow = (key) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const handleCellChange = (key, monthIdx, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const months = [...r.months];
        months[monthIdx] = value === "" ? 0 : Number(value);
        return { ...r, months };
      }),
    );
  };

  const handleReplicateJanuary = (key) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, months: Array(12).fill(r.months[0]) } : r)));
  };

  const handleSave = async () => {
    const goals = rows.flatMap((r) =>
      r.months.map((amount, idx) => ({ promoter_id: r.promoter_id, month_no: idx + 1, target_amount: amount })),
    );

    if (!goals.length) {
      showAlert("Agregá al menos un promotor antes de guardar", "error");
      return;
    }

    try {
      setSaving(true);
      await saveBudgetPromoterGoals(id, goals);
      showAlert("Metas por promotor guardadas correctamente");
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
        <Typography color="text.primary">Metas por promotor</Typography>
      </Breadcrumbs>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PersonPinIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                <Typography variant="h6" fontWeight={700}>Metas de colocación por promotor</Typography>
                <HelpButton screenKey="presupuesto.metas-promotores" />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Monto meta de desembolso individual por promotor y mes, usado en el reporte de Productividad.
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
          options={availablePromoters}
          getOptionLabel={(p) => p.name}
          onChange={(_, value) => handleAddPromoter(value)}
          value={null}
          renderInput={(params) => <TextField {...params} size="small" label="Agregar meta por promotor" />}
          sx={{ maxWidth: 480, mb: 2 }}
        />

        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, backgroundColor: "#F8FAFC" } }}>
                <TableCell>Promotor</TableCell>
                {MONTH_LABELS.map((m) => (
                  <TableCell key={m} align="right">{m}</TableCell>
                ))}
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <Typography variant="body2" fontWeight={600}>{row.promoter_name}</Typography>
                  </TableCell>
                  {row.months.map((value, idx) => (
                    <TableCell key={idx} align="right" sx={{ p: 0.5 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={value}
                        onChange={(e) => handleCellChange(row.key, idx, e.target.value)}
                        inputProps={{ style: { textAlign: "right" }, min: 0, step: 0.01 }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                    <Tooltip title="Replicar enero en todos los meses">
                      <IconButton size="small" onClick={() => handleReplicateJanuary(row.key)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Quitar promotor">
                      <IconButton size="small" onClick={() => handleRemoveRow(row.key)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {rows.length > 0 && (
                <TableRow sx={{ "& td": { fontWeight: 700, borderTop: "2px solid #E5E7EB" } }}>
                  <TableCell>Total por promotores</TableCell>
                  {totalsByMonth.map((t, idx) => (
                    <TableCell key={idx} align="right">{formatCurrency(t)}</TableCell>
                  ))}
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
