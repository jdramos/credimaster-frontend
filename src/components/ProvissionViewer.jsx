// Agrupado por sucursal y vendedor usando PrimeReact TreeTable con exportación y colores (BAC)
import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  IconButton,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  Chip,
  Divider,
  Tooltip,
} from "@mui/material";
import { TreeTable } from "primereact/treetable";
import { Column } from "primereact/column";
import { FileDownload } from "@mui/icons-material";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import API from "../api";
import BranchSelect from "./BranchSelect";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primereact/resources/primereact.css";


dayjs.extend(customParseFormat);

const API_URL = process.env.REACT_APP_API_BASE_URL;

/** 🎨 BAC palette */
const BAC = {
  primary: "#0057B8",
  primaryDark: "#003E8A",
  soft: "#EAF2FF",
  border: "#E6EAF2",
  text: "#0B1F3B",
  muted: "#5B6B7F",
  bg: "#F6F8FC",
  white: "#FFFFFF",
};

const money = (n) =>
  `C$ ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const ProvissionViewer = () => {
  const [branches, setBranches] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [globalTotals, setGlobalTotals] = useState({
    capital: 0,
    interest: 0,
    defaulted: 0,
    overdue: 0,
    count: 0,
    provission_amount: 0,
  });
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState({});
  const [balanceType, setBalanceType] = useState("FINAL");

  useEffect(() => {
    API.get(`${API_URL}/api/branches`).then((res) => setBranches(res.data));
    API.get(`${API_URL}/api/vendors`).then((res) => setVendors(res.data));
  }, []);

  const calculateTotals = (customers) => {
    return customers.reduce(
      (acc, c) => {
        acc.capital += Number(c.capital_balance || 0);
        acc.interest += Number(c.interest_balance || 0);
        acc.defaulted += Number(c.defaulted_capital || 0);
        acc.overdue += Number(c.overdue_capital || 0);
        acc.provission_amount += Number(c.provission_amount || 0);
        return acc;
      },
      { capital: 0, interest: 0, defaulted: 0, overdue: 0, provission_amount: 0, count: 0 }
    );
  };

  /** ✅ BAC row styles for group levels */
  const colorRow = (level) => {
    if (level === "branch")
      return {
        background: `linear-gradient(135deg, ${BAC.primary} 0%, ${BAC.primaryDark} 100%)`,
        fontWeight: 900,
        color: BAC.white,
      };
    if (level === "vendor")
      return {
        backgroundColor: BAC.soft,
        fontWeight: 900,
        color: BAC.text,
      };
    return {};
  };

  const fetchData = async (targetDate = date) => {
    setLoading(true);

    const params = { date: targetDate, balance_type: balanceType };
    if (selectedBranch) params.branch_id = selectedBranch;
    if (selectedVendor) params.vendor_id = selectedVendor;

    try {
      const res = await API.get(`${API_URL}/api/balances/loan-provisions`, { params });

      let grandTotal = {
        capital: 0,
        interest: 0,
        defaulted: 0,
        overdue: 0,
        count: 0,
        provission_amount: 0,
      };

      const branchNodes = res.data.data.map((branch) => {
        const vendorNodes = branch.vendors.map((vendor) => {
          const customerNodes = vendor.customers
            .filter(
              (c) =>
                c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
                c.identification.toLowerCase().includes(search.toLowerCase())
            )
            .map((customer) => ({
              key: `customer-${customer.identification}-${customer.loan_id}`,
              data: {
                name: customer.customer_name,
                identification: customer.identification,
                loan: customer.loan_id,
                capital: money(customer.capital_balance),
                interest: money(customer.interest_balance),
                defaulted: money(customer.defaulted_capital),
                overdue: money(customer.overdue_capital),
                overdue_days: customer.overdue_days,
                provission_code: customer.provission_code,
                provission_percentage: customer.provission_percentage,
                provission_amount: money(customer.provission_amount),
                count: "",
              },
              leaf: true,
            }));

          const totals = calculateTotals(vendor.customers);

          grandTotal.capital += totals.capital;
          grandTotal.interest += totals.interest;
          grandTotal.defaulted += totals.defaulted;
          grandTotal.overdue += totals.overdue;
          grandTotal.count += vendor.customers.length;
          grandTotal.provission_amount += totals.provission_amount;

          return {
            key: `vendor-${vendor.vendor_id}`,
            data: {
              name: `Vendedor: ${vendor.vendor_name}`,
              capital: money(totals.capital),
              interest: money(totals.interest),
              defaulted: money(totals.defaulted),
              overdue: money(totals.overdue),
              provission_amount: money(totals.provission_amount),
              count: vendor.customers.length,
            },
            children: customerNodes,
            style: colorRow("vendor"),
          };
        });

        const allCustomers = branch.vendors.flatMap((v) => v.customers);
        const totals = calculateTotals(allCustomers);

        return {
          key: `branch-${branch.branch_id}`,
          data: {
            name: `Sucursal: ${branch.branch_name}`,
            capital: money(totals.capital),
            interest: money(totals.interest),
            defaulted: money(totals.defaulted),
            overdue: money(totals.overdue),
            provission_amount: money(totals.provission_amount),
            count: allCustomers.length,
          },
          children: vendorNodes,
          style: colorRow("branch"),
        };
      });

      const totalGeneralNode = {
        key: "total-general",
        data: {
          name: "TOTAL GENERAL",
          capital: money(grandTotal.capital),
          interest: money(grandTotal.interest),
          defaulted: money(grandTotal.defaulted),
          overdue: money(grandTotal.overdue),
          provission_amount: money(grandTotal.provission_amount),
          count: grandTotal.count,
        },
        children: [],
        style: {
          background: `linear-gradient(135deg, ${BAC.primaryDark} 0%, ${BAC.primary} 100%)`,
          fontWeight: 900,
          color: BAC.white,
        },
      };

      branchNodes.unshift(totalGeneralNode);
      setNodes(branchNodes);
      setGlobalTotals(grandTotal);

      // Expand by default (branch + vendor)
      const allKeys = {};
      branchNodes.forEach((b) => {
        allKeys[b.key] = true;
        (b.children || []).forEach((v) => (allKeys[v.key] = true));
      });
      setExpandedKeys(allKeys);
    } catch (error) {
      console.error("Error al obtener saldos:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const rows = [];
    nodes.forEach((branch) => {
      (branch.children || []).forEach((vendor) => {
        (vendor.children || []).forEach((customer) => {
          rows.push({
            Sucursal: branch.data.name,
            Vendedor: vendor.data.name,
            Cliente: customer.data.name,
            Identificación: customer.data.identification,
            Crédito: customer.data.loan,
            "Saldo Capital": customer.data.capital,
            "Saldo Interés": customer.data.interest,
            "Clasificacion riesgo": customer.data.provission_code,
            "Capital Vencido": customer.data.overdue,
            "Monto Provisión": customer.data.provission_amount,
          });
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Provisiones");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `Provisiones_${dayjs(date).format("YYYYMMDD")}.xlsx`);
  };

  /** 📅 Date strip (30 days) */
  const daysRange = 30;
  const allDates = useMemo(() => {
    const today = dayjs();
    return Array.from({ length: daysRange }, (_, i) =>
      today.subtract(daysRange - 1 - i, "day").format("YYYY-MM-DD")
    );
  }, []);
  const [currentIndex, setCurrentIndex] = useState(daysRange - 1);

  useEffect(() => setDate(allDates[currentIndex]), [currentIndex, allDates]);

  const visibleDates = useMemo(() => {
    const start = Math.max(0, currentIndex - 3);
    const end = Math.min(allDates.length, currentIndex + 4);
    return allDates.slice(start, end);
  }, [currentIndex, allDates]);

  return (
    <Box sx={{ background: BAC.bg, minHeight: "calc(100vh - 64px)", p: 2 }}>
      {/* Header BAC */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          p: 2,
          color: BAC.white,
          background: `linear-gradient(135deg, ${BAC.primary} 0%, ${BAC.primaryDark} 100%)`,
          boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Provisiones por Sucursal y Vendedor
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Corte: {dayjs(date).format("DD/MM/YYYY")} · Balance: {balanceType}
            </Typography>
          </Box>

          <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
            <Chip
              label={`Clientes: ${Number(globalTotals.count || 0).toLocaleString()}`}
              sx={{ bgcolor: "rgba(255,255,255,0.16)", color: BAC.white, fontWeight: 800 }}
            />
            <Chip
              label={`Capital: ${money(globalTotals.capital)}`}
              sx={{ bgcolor: "rgba(255,255,255,0.16)", color: BAC.white, fontWeight: 800 }}
            />
            <Chip
              label={`Provisión: ${money(globalTotals.provission_amount)}`}
              sx={{ bgcolor: "rgba(255,255,255,0.16)", color: BAC.white, fontWeight: 800 }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Date strip */}
      <Paper
        elevation={0}
        sx={{
          mt: 2,
          p: 1,
          borderRadius: 3,
          border: `1px solid ${BAC.border}`,
          background: BAC.white,
          boxShadow: "0 8px 22px rgba(12, 36, 68, 0.08)",
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            sx={{ color: BAC.primary }}
          >
            <ChevronLeftIcon fontSize="large" />
          </IconButton>

          {visibleDates.map((d) => (
            <Button
              key={d}
              variant={d === date ? "contained" : "outlined"}
              size="small"
              onClick={() => {
                setDate(d);
                setCurrentIndex(allDates.indexOf(d));
                fetchData(d);
              }}
              sx={{
                minWidth: 74,
                borderRadius: 2,
                fontWeight: 900,
                ...(d === date
                  ? { bgcolor: BAC.primary, "&:hover": { bgcolor: BAC.primaryDark } }
                  : { borderColor: "rgba(0,87,184,0.35)", color: BAC.primary, "&:hover": { bgcolor: BAC.soft } }),
              }}
            >
              {dayjs(d).format("DD/MM")}
            </Button>
          ))}

          <IconButton
            onClick={() => setCurrentIndex((i) => Math.min(allDates.length - 1, i + 1))}
            disabled={currentIndex >= allDates.length - 1}
            sx={{ color: BAC.primary }}
          >
            <ChevronRightIcon fontSize="large" />
          </IconButton>

          <Box sx={{ flex: 1 }} />

          <Tooltip title="Exportar a Excel">
            <Button
              variant="outlined"
              onClick={exportToExcel}
              startIcon={<FileDownload />}
              sx={{
                borderRadius: 2,
                fontWeight: 900,
                borderColor: "rgba(0,87,184,0.35)",
                color: BAC.primary,
                "&:hover": { borderColor: BAC.primary, bgcolor: BAC.soft },
              }}
            >
              Exportar
            </Button>
          </Tooltip>
        </Box>
      </Paper>

      {/* Filters card */}
      <Paper
        elevation={0}
        sx={{
          mt: 2,
          p: 2,
          borderRadius: 3,
          border: `1px solid ${BAC.border}`,
          background: BAC.white,
          boxShadow: "0 8px 22px rgba(12, 36, 68, 0.08)",
        }}
      >
        <Typography sx={{ fontWeight: 900, color: BAC.text, mb: 1 }}>
          Filtros
        </Typography>
        <Divider sx={{ mb: 2, borderColor: BAC.border }} />

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            label="Fecha"
            type="date"
            size="small"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 170 }}
          />

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <BranchSelect value={selectedBranch} size="small" onChange={(e) => setSelectedBranch(e.target.value)} />
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Vendedor</InputLabel>
            <Select value={selectedVendor} label="Vendedor" onChange={(e) => setSelectedVendor(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              {vendors.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Tipo de saldo</InputLabel>
            <Select value={balanceType} label="Tipo de saldo" onChange={(e) => setBalanceType(e.target.value)}>
              <MenuItem value="FINAL">FINAL</MenuItem>
              <MenuItem value="INICIAL">INICIAL</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Buscar Cliente"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 220 }}
          />

          <Button
            variant="contained"
            onClick={() => fetchData(date)}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} /> : null}
            sx={{
              borderRadius: 2,
              fontWeight: 900,
              px: 3,
              bgcolor: BAC.primary,
              "&:hover": { bgcolor: BAC.primaryDark },
            }}
          >
            Consultar
          </Button>

          <Button
            variant="text"
            onClick={() => setExpandedKeys({})}
            sx={{ fontWeight: 900, color: BAC.primary }}
          >
            Contraer todo
          </Button>

          <Button
            variant="text"
            onClick={() => {
              const allKeys = {};
              nodes.forEach((branch) => {
                allKeys[branch.key] = true;
                (branch.children || []).forEach((vendor) => (allKeys[vendor.key] = true));
              });
              setExpandedKeys(allKeys);
            }}
            sx={{ fontWeight: 900, color: BAC.primary }}
          >
            Expandir todo
          </Button>
        </Box>
      </Paper>

      {/* Table */}
      <Box mt={2}>
        <TreeTable
          value={nodes}
          tableStyle={{ minWidth: "100%" }}
          selectionMode="single"
          selectionKeys={selectedNodeKey}
          onSelectionChange={(e) => setSelectedNodeKey(e.value)}
          expandedKeys={expandedKeys}
          onToggle={(e) => setExpandedKeys(e.value)}
          rowHover
          className="bac-treetable p-treetable-hoverable-rows"
        >
          <Column field="name" header="Cliente / Grupo" expander style={{ width: "30%" }} />
          <Column field="identification" header="Identificación" style={{ width: "10%" }} />
          <Column field="loan" header="Crédito No." style={{ width: "10%" }} />
          <Column field="capital" header="Saldo Capital" style={{ width: "10%" }} />
          <Column field="interest" header="Saldo Interés" style={{ width: "10%" }} />
          <Column field="overdue_days" header="Días de Mora" style={{ width: "6%" }} />
          <Column field="provission_code" header="Clasificación Riesgo" style={{ width: "7%" }} />
          <Column field="provission_percentage" header="Provisión (%)" style={{ width: "7%" }} />
          <Column field="provission_amount" header="Monto Provisión" style={{ width: "10%" }} />
          <Column field="count" header="# Clientes" style={{ width: "5%" }} />
        </TreeTable>
      </Box>
    </Box>
  );
};

export default ProvissionViewer;