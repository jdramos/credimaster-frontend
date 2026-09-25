import React, { useState } from "react";
import HelpButton from "./help/HelpButton";
import {
  Box,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  TableContainer,
  CircularProgress,
  TextField,
  Stack,
  Tooltip,
  Tabs,
  Tab,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { NumericFormat } from "react-number-format";
import API from "../api";
import BranchSelect from "./BranchSelect";

const Money = ({ value }) => (
  <NumericFormat
    value={Number(value || 0)}
    displayType="text"
    thousandSeparator=","
    decimalSeparator="."
    decimalScale={2}
    fixedDecimalScale
  />
);

const Percent = ({ value }) =>
  value === null || value === undefined ? (
    <span style={{ color: "var(--bac-muted)" }}>—</span>
  ) : (
    <span>{Number(value).toFixed(1)}%</span>
  );

function PromoterProductivityPanel() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);

  const [dateFrom, setDateFrom] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(dayjs().format("YYYY-MM-DD"));
  const [branchId, setBranchId] = useState("");

  const fetchData = async () => {
    if (!dateFrom || !dateTo) return;
    try {
      setLoading(true);
      const params = { date_from: dateFrom, date_to: dateTo };
      if (branchId) params.branch_id = branchId;
      const res = await API.get("/api/loans/productivity/promoters", { params });
      setRows(res.data?.data || []);
      setSummary(res.data?.summary || null);
      setHasQueried(true);
    } catch (error) {
      console.error("Error al calcular la productividad de promotores:", error);
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        Promotor: r.promoter_name,
        Sucursal: r.branch_name || "",
        "Créditos colocados": r.loans_count,
        "Monto colocado": r.placed_amount,
        "Cartera actual": r.current_portfolio,
        "Mora actual": r.overdue_amount,
        "% Mora": r.overdue_pct,
        "Meta del período": r.goal_amount,
        "% Cumplimiento": r.goal_pct,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Promotores");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `ProductividadPromotores_${dateFrom}_${dateTo}.xlsx`);
  };

  return (
    <>
      {summary && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4,1fr)" }, gap: 2, mb: 2 }}>
          <Box className="bac-summary-card">
            <Typography variant="caption">Promotores</Typography>
            <Typography variant="h6">{summary.promoters_count}</Typography>
          </Box>
          <Box className="bac-summary-card">
            <Typography variant="caption">Créditos colocados</Typography>
            <Typography variant="h6">{summary.total_loans}</Typography>
          </Box>
          <Box className="bac-summary-card">
            <Typography variant="caption">Monto colocado</Typography>
            <Typography variant="h6">C$ <Money value={summary.total_placed} /></Typography>
          </Box>
          <Box className="bac-summary-card">
            <Typography variant="caption">Mora de cartera colocada</Typography>
            <Typography variant="h6">
              C$ <Money value={summary.total_overdue} /> (<Percent value={summary.total_overdue_pct} />)
            </Typography>
          </Box>
        </Box>
      )}

      <Box className="bac-filters">
        <Box className="bac-filters__body">
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(5, 1fr)" } }}>
            <TextField label="Desde" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
            <TextField label="Hasta" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
            <BranchSelect size="small" value={branchId} onChange={(e) => setBranchId(e.target.value)} />
            <Button variant="contained" onClick={fetchData} className="bac-btn-primary" disabled={loading}>
              {loading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Calcular"}
            </Button>
            <Tooltip title="Exportar a Excel">
              <span>
                <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExportExcel} className="bac-btn-muted" disabled={!rows.length} fullWidth>
                  Exportar
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <Box className="bac-table-card">
        <TableContainer>
          <Table size="small" className="bac-table">
            <TableHead>
              <TableRow>
                <TableCell>Promotor</TableCell>
                <TableCell>Sucursal</TableCell>
                <TableCell align="right">Créditos</TableCell>
                <TableCell align="right">Monto colocado</TableCell>
                <TableCell align="right">Cartera actual</TableCell>
                <TableCell align="right">Mora actual</TableCell>
                <TableCell align="right">% Mora</TableCell>
                <TableCell align="right">Meta del período</TableCell>
                <TableCell align="right">% Cumplimiento</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ py: 4 }}>
                    <Box sx={{ display: "flex", justifyContent: "center" }}><CircularProgress /></Box>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ color: "var(--bac-muted)", py: 3 }}>
                    {hasQueried ? "No hay promotores con actividad en ese rango." : "Elige un rango de fecha y presiona Calcular."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.promoter_id} hover>
                    <TableCell>{r.promoter_name}</TableCell>
                    <TableCell>{r.branch_name ?? "—"}</TableCell>
                    <TableCell align="right">{r.loans_count}</TableCell>
                    <TableCell align="right"><Money value={r.placed_amount} /></TableCell>
                    <TableCell align="right"><Money value={r.current_portfolio} /></TableCell>
                    <TableCell align="right"><Money value={r.overdue_amount} /></TableCell>
                    <TableCell align="right"><Percent value={r.overdue_pct} /></TableCell>
                    <TableCell align="right">{r.goal_amount === null ? <span style={{ color: "var(--bac-muted)" }}>Sin meta</span> : <Money value={r.goal_amount} />}</TableCell>
                    <TableCell align="right"><Percent value={r.goal_pct} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
}

function CollectorProductivityPanel() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);

  const [dateFrom, setDateFrom] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(dayjs().format("YYYY-MM-DD"));
  const [branchId, setBranchId] = useState("");

  const fetchData = async () => {
    if (!dateFrom || !dateTo) return;
    try {
      setLoading(true);
      const params = { date_from: dateFrom, date_to: dateTo };
      if (branchId) params.branch_id = branchId;
      const res = await API.get("/api/loans/productivity/collectors", { params });
      setRows(res.data?.data || []);
      setSummary(res.data?.summary || null);
      setHasQueried(true);
    } catch (error) {
      console.error("Error al calcular la productividad de cobradores:", error);
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        Cobrador: r.collector_name,
        Sucursal: r.branch_name || "",
        "Pagos recibidos": r.payments_count,
        "Monto recuperado": r.collected_amount,
        "Esperado del período": r.expected_amount,
        "% Efectividad": r.effectiveness_pct,
        "Cartera en mora que administra": r.overdue_amount,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cobradores");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `ProductividadCobradores_${dateFrom}_${dateTo}.xlsx`);
  };

  return (
    <>
      {summary && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4,1fr)" }, gap: 2, mb: 2 }}>
          <Box className="bac-summary-card">
            <Typography variant="caption">Cobradores</Typography>
            <Typography variant="h6">{summary.collectors_count}</Typography>
          </Box>
          <Box className="bac-summary-card">
            <Typography variant="caption">Monto recuperado</Typography>
            <Typography variant="h6">C$ <Money value={summary.total_collected} /></Typography>
          </Box>
          <Box className="bac-summary-card">
            <Typography variant="caption">Efectividad de cobro</Typography>
            <Typography variant="h6"><Percent value={summary.total_effectiveness_pct} /></Typography>
          </Box>
          <Box className="bac-summary-card">
            <Typography variant="caption">Cartera en mora administrada</Typography>
            <Typography variant="h6">C$ <Money value={summary.total_overdue} /></Typography>
          </Box>
        </Box>
      )}

      <Box className="bac-filters">
        <Box className="bac-filters__body">
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(5, 1fr)" } }}>
            <TextField label="Desde" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
            <TextField label="Hasta" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
            <BranchSelect size="small" value={branchId} onChange={(e) => setBranchId(e.target.value)} />
            <Button variant="contained" onClick={fetchData} className="bac-btn-primary" disabled={loading}>
              {loading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Calcular"}
            </Button>
            <Tooltip title="Exportar a Excel">
              <span>
                <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExportExcel} className="bac-btn-muted" disabled={!rows.length} fullWidth>
                  Exportar
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <Box className="bac-table-card">
        <TableContainer>
          <Table size="small" className="bac-table">
            <TableHead>
              <TableRow>
                <TableCell>Cobrador</TableCell>
                <TableCell>Sucursal</TableCell>
                <TableCell align="right">Pagos</TableCell>
                <TableCell align="right">Monto recuperado</TableCell>
                <TableCell align="right">Esperado del período</TableCell>
                <TableCell align="right">% Efectividad</TableCell>
                <TableCell align="right">Cartera en mora que administra</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 4 }}>
                    <Box sx={{ display: "flex", justifyContent: "center" }}><CircularProgress /></Box>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ color: "var(--bac-muted)", py: 3 }}>
                    {hasQueried ? "No hay cobradores con actividad en ese rango." : "Elige un rango de fecha y presiona Calcular."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.collector_id} hover>
                    <TableCell>{r.collector_name}</TableCell>
                    <TableCell>{r.branch_name ?? "—"}</TableCell>
                    <TableCell align="right">{r.payments_count}</TableCell>
                    <TableCell align="right"><Money value={r.collected_amount} /></TableCell>
                    <TableCell align="right"><Money value={r.expected_amount} /></TableCell>
                    <TableCell align="right"><Percent value={r.effectiveness_pct} /></TableCell>
                    <TableCell align="right"><Money value={r.overdue_amount} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
}

const ProductivityReport = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box className="bac-page">
      <Box className="bac-page-header">
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            <Typography variant="h5" className="bac-page-title">
              Productividad de Promotores y Cobradores
            </Typography>
            <HelpButton screenKey="creditos.productividad" />
          </Box>
          <div className="bac-page-subtitle">
            Colocación, calidad de cartera y cumplimiento de meta por promotor; recuperación y efectividad de cobro por cobrador
          </div>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => window.location.reload()} className="bac-btn-muted">
            Recargar
          </Button>
        </Stack>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Promotores" />
        <Tab label="Cobradores" />
      </Tabs>

      {tab === 0 ? <PromoterProductivityPanel /> : <CollectorProductivityPanel />}
    </Box>
  );
};

export default ProductivityReport;
