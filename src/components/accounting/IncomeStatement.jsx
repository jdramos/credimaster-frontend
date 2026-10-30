import React, { useMemo, useState } from "react";
import HelpButton from "../help/HelpButton";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Paper,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { printAccountingReport } from "./printAccountingReport";
import ReportExportButtons from "../common/ReportExportButtons";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportSignaturesDialog from "./ReportSignaturesDialog";
import { buildMucFormB } from "./mucReportModels";
import MucFormTable from "./MucFormTable";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const formatAmount = (v) => (typeof v === "number" ? v.toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v);

export default function IncomeStatement() {
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [previousRows, setPreviousRows] = useState([]);
  const [loading, setLoading] = useState(false);
  // Año en curso por omisión: sin fechas, la columna del año anterior repetía
  // los montos actuales.
  const [filters, setFilters] = useState({ from_date: `${today().slice(0, 4)}-01-01`, to_date: today(), branch_id: "" });
  // Vista principal: Forma B del MUC (igual que el reporte impreso).
  const [view, setView] = useState("form");
  const [generated, setGenerated] = useState({ from: "", to: "" });
  const [branchName, setBranchName] = useState("Todas");
  const [onlyWithBalance, setOnlyWithBalance] = useState(false);
  const [alert, setAlert] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const showAlert = (message, severity = "error") =>
    setAlert({ open: true, severity, message });

  const fetchData = async () => {
    try {
      setLoading(true);

      // Sin el asiento de Cierre de Ejercicio: un año ya cerrado debe seguir
      // mostrando sus ingresos y gastos (el cierre los deja en cero).
      const params = { exclude_closing: "1" };
      if (filters.from_date) params.start_date = filters.from_date;
      if (filters.to_date) params.end_date = filters.to_date;
      if (filters.branch_id) params.branch_id = filters.branch_id;

      const previousParams = { exclude_closing: "1" };
      if (filters.from_date) previousParams.start_date = `${Number(filters.from_date.slice(0, 4)) - 1}${filters.from_date.slice(4)}`;
      if (filters.to_date) previousParams.end_date = `${Number(filters.to_date.slice(0, 4)) - 1}${filters.to_date.slice(4)}`;
      if (filters.branch_id) previousParams.branch_id = filters.branch_id;
      const [res, previousRes] = await Promise.all([
        API.get("/api/accounting/trial-balance", { params }),
        API.get("/api/accounting/trial-balance", { params: previousParams }),
      ]);

      const rawData = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data?.rows)
          ? res.data.data.rows
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];

      // La balanza de comprobación ahora también trae cuentas encabezado
      // (is_movement=0) con el saldo acumulado de sus hijas, para poder
      // mostrar jerarquía ahí. Aquí ese acumulado duplicaría cada monto
      // (una vez en la cuenta hoja y otra vez en cada encabezado padre),
      // así que este reporte solo debe trabajar con cuentas de movimiento.
      const data = rawData.filter((row) => row.is_movement);

      const filtered = data.filter((row) =>
        ["INGRESO", "INCOME", "GASTO", "EXPENSE", "COSTO", "COST"].includes(
          String(row.account_type || "").toUpperCase(),
        ),
      );

      const rawPrevious = previousRes.data?.data || [];
      const previousData = rawPrevious.filter((row) => row.is_movement);

      setGenerated({ from: filters.from_date, to: filters.to_date });
      setAllRows(data);
      setRows(filtered);
      setPreviousRows(previousData);
    } catch (error) {
      showAlert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Error generando estado de resultados",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let tax = 0;

    rows.forEach((row) => {
      const type = String(row.account_type || "").toUpperCase();
      const debit = Number(row.total_debit || row.debit || 0);
      const credit = Number(row.total_credit || row.credit || 0);

      if (["INGRESO", "INCOME"].includes(type)) {
        income += credit - debit;
      }

      if (["GASTO", "EXPENSE", "COSTO", "COST"].includes(type)) {
        expenses += debit - credit;
      }
    });

    // Impuesto sobre la renta (6201): clasificado como account_type "OTRO"
    // (clase 6, fuera de ingreso/gasto), por eso no cae dentro de `rows`
    // (ya filtrado a INGRESO/GASTO/COSTO) — se toma de allRows para que el
    // "Resultado" mostrado aquí sea neto de impuesto, igual que en Balance
    // General y en el Forma B impreso.
    allRows.forEach((row) => {
      if (String(row.muc_code || "").startsWith("6201")) {
        const debit = Number(row.total_debit || row.debit || 0);
        const credit = Number(row.total_credit || row.credit || 0);
        tax += debit - credit;
      }
    });

    return {
      income,
      expenses,
      tax,
      result: income - expenses - tax,
    };
  }, [rows, allRows]);

  const columns = useMemo(
    () => [
      { field: "muc_code", headerName: "Código", width: 140 },
      { field: "account_name", headerName: "Cuenta", flex: 1, minWidth: 300 },
      { field: "account_type", headerName: "Tipo", width: 130 },
      {
        field: "amount",
        headerName: "Importe",
        width: 160,
        type: "number",
        valueGetter: (params) => {
          const type = String(params.row.account_type || "").toUpperCase();
          const debit = Number(params.row.total_debit || params.row.debit || 0);
          const credit = Number(
            params.row.total_credit || params.row.credit || 0,
          );

          if (["INGRESO", "INCOME"].includes(type)) return credit - debit;

          return debit - credit;
        },
        valueFormatter: (params) =>
          Number(params.value || 0).toLocaleString("es-NI", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
    ],
    [],
  );

  // Mismas columnas y filas en pantalla y en el reporte impreso.
  const formColumns = [
    { field: "label", label: "Concepto" },
    { field: "current", label: generated.to ? generated.to.slice(0, 4) : "Actual", numeric: true, format: formatAmount },
    { field: "previous", label: generated.to ? String(Number(generated.to.slice(0, 4)) - 1) : "Anterior", numeric: true, format: formatAmount },
  ];
  const formRows = useMemo(() => (allRows.length ? buildMucFormB(allRows, previousRows) : []), [allRows, previousRows]);

  const buildReport = () => ({
    title: "Estado de Resultados",
    fileName: `estado_resultados_${generated.from || "inicio"}_${generated.to || "corte"}`,
    subtitle: `Forma B - Manual Único de Cuentas CONAMI · Sucursal: ${branchName || "Todas"}`,
    period: `Del ${generated.from || "inicio"} al ${generated.to || "corte"}`,
    columns: formColumns,
    rows: formRows,
  });

  const printReport = () => printAccountingReport(buildReport());

  return (
    <Box sx={{ p: 2 }}>
      <Paper
        elevation={0}
        sx={{ p: 2, borderRadius: 3, border: "1px solid var(--cm-border, #E5E7EB)" }}
      >
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <AssessmentIcon sx={{ color: "var(--cm-primary-text, #0057B8)" }} />
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="h6" fontWeight={700}>
                Estado de Resultados
              </Typography>
              <HelpButton screenKey="contabilidad.estado-resultados" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Ingresos, costos, gastos y resultado del período
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            mb: 2,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "180px 180px 200px 130px 130px" },
            gap: 1,
          }}
        >
          <TextField
            size="small"
            label="Desde"
            type="date"
            value={filters.from_date}
            onChange={(e) =>
              setFilters((p) => ({ ...p, from_date: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
          />

          <ReportBranchFilter
            value={filters.branch_id}
            onChange={(id, name) => {
              setFilters((p) => ({ ...p, branch_id: id }));
              setBranchName(name);
            }}
          />

          <TextField
            size="small"
            label="Hasta"
            type="date"
            value={filters.to_date}
            onChange={(e) =>
              setFilters((p) => ({ ...p, to_date: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
          />

          <Button
            variant="outlined"
            onClick={fetchData}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Generar
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={printReport} disabled={!rows.length}>Imprimir</Button>
          <ReportExportButtons print={false} report={buildReport} disabled={!rows.length} />
          <ReportSignaturesDialog />
        </Box>


        <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            color="success"
            label={`Ingresos: ${summary.income.toLocaleString("es-NI", { minimumFractionDigits: 2 })}`}
          />
          <Chip
            color="error"
            label={`Gastos/Costos: ${summary.expenses.toLocaleString("es-NI", { minimumFractionDigits: 2 })}`}
          />
          {summary.tax !== 0 && (
            <Chip
              color="default"
              label={`Impuesto a la renta: ${summary.tax.toLocaleString("es-NI", { minimumFractionDigits: 2 })}`}
            />
          )}
          <Chip
            color={summary.result >= 0 ? "primary" : "warning"}
            label={`Resultado: ${summary.result.toLocaleString("es-NI", { minimumFractionDigits: 2 })}`}
          />
        </Box>

        <Tabs value={view} onChange={(_e, v) => setView(v)} sx={{ mb: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Tab value="form" label="Forma B (modelo CONAMI)" sx={{ textTransform: "none", fontWeight: 700 }} />
          <Tab value="detail" label="Detalle por cuenta" sx={{ textTransform: "none", fontWeight: 700 }} />
        </Tabs>

        {view === "form" && (
          <MucFormTable
            caption="Estado de Resultados - Forma B"
            columns={formColumns}
            rows={formRows}
            emptyText={loading ? "Generando…" : "Elija el período y presione Generar."}
          />
        )}

        {view === "detail" && (
        <>
        <FormControlLabel
          sx={{ mb: 1 }}
          control={
            <Checkbox
              size="small"
              checked={onlyWithBalance}
              onChange={(e) => setOnlyWithBalance(e.target.checked)}
            />
          }
          label="Solo cuentas con saldo"
        />
        <Box sx={{ height: 620 }}>
          <DataGrid
            rows={
              onlyWithBalance
                ? rows.filter((row) => {
                    const type = String(row.account_type || "").toUpperCase();
                    const debit = Number(row.total_debit || row.debit || 0);
                    const credit = Number(row.total_credit || row.credit || 0);
                    const value = ["INGRESO", "INCOME"].includes(type) ? credit - debit : debit - credit;
                    return Math.abs(value) >= 0.005;
                  })
                : rows
            }
            columns={columns}
            loading={loading}
            getRowId={(row) => row.account_id || row.id || row.muc_code}
            rowsPerPageOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: { pageSize: 25, page: 0 },
            }}
            disableSelectionOnClick
            sx={{
              border: "1px solid var(--cm-border, #E5E7EB)",
              borderRadius: 2,
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "var(--cm-surface, #F8FAFC)",
                fontWeight: 700,
              },
            }}
          />
        </Box>
        </>
        )}
      </Paper>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          severity={alert.severity}
          onClose={() => setAlert((p) => ({ ...p, open: false }))}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
