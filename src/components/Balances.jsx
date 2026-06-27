import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  Stack,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import { TreeTable } from "primereact/treetable";
import { Column } from "primereact/column";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import API from "../api";
import BranchSelect from "./BranchSelect";
import AccountStatementModal from "./AccountStatementModal";
import LoanDetailsModal from "./Loan/LoanDetailsModal";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PrintIcon from "@mui/icons-material/Print";
import { printCustomerBalanceReport } from "../reports/customerBalanceReport";
import { useAuth } from "../contexts/AuthContext";
// PrimeReact CSS base (tu ya lo tenías)
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primereact/resources/primereact.css";

dayjs.extend(customParseFormat);

const BAC = {
  blue: "#005AA7",
  blue2: "#1E73BE",
  bg: "#F6F9FC",
  border: "#E2E8F0",
  text: "#0F172A",
  sub: "#475569",
};

const money = (value) =>
  `C$ ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const CustomerBalanceViewer = () => {
  const [vendors, setVendors] = useState([]);

  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");

  const [stmtOpen, setStmtOpen] = useState(false);
  const [stmtLoan, setStmtLoan] = useState(null);

  const openStatement = useCallback((row) => {
    if (!row?.loan) return;

    setStmtLoan({
      loan_id: row.loan,
      customer_name: row.name,
      identification: row.identification,
    });
    setStmtOpen(true);
  }, []);

  const closeStatement = useCallback(() => {
    setStmtOpen(false);
    setStmtLoan(null);
  }, []);

  // ✅ Modal crédito
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const { tenant, user } = useAuth();

  const openCreditModal = useCallback((row) => {
    if (!row?.loan) return;

    setSelectedCredit({
      ...row,
      id: row.id || row.loan,
      loan_id: row.loan_id || row.loan,
      customer_id: row.customer_id,
      customer_name: row.customer_name || row.name,
      customer_identification:
        row.customer_identification || row.identification,
      identification: row.identification,
    });

    setCreditModalOpen(true);
  }, []);

  const closeCreditModal = useCallback(() => {
    setCreditModalOpen(false);
    setSelectedCredit(null);
  }, []);

  const loanBody = useCallback(
    (node) => {
      const isCustomerRow = !!node?.leaf && !!node?.data?.loan;
      if (!isCustomerRow) return node?.data?.loan || "";

      return (
        <Tooltip title="Ver detalle del crédito" arrow>
          <Button
            variant="text"
            size="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openCreditModal(node.data);
            }}
            startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 16 }} />}
            sx={{
              p: 0,
              minWidth: 0,
              textTransform: "none",
              fontWeight: 900,
              fontSize: 13,
              color: BAC.blue,
              borderRadius: 2,
              justifyContent: "flex-start",
              "& .MuiButton-startIcon": {
                mr: 0.5,
              },
              "&:hover": {
                bgcolor: "transparent",
                color: BAC.blue2,
                textDecoration: "underline",
              },
            }}
          >
            {node.data.loan}
          </Button>
        </Tooltip>
      );
    },
    [openCreditModal],
  );

  const daysRange = 30;

  const allDates = useMemo(() => {
    const today = dayjs();
    return Array.from({ length: daysRange }, (_, i) =>
      today.subtract(daysRange - 1 - i, "day").format("YYYY-MM-DD"),
    );
  }, []);

  const printReport = () => {
    const rows = [];

    nodes.forEach((branch) => {
      rows.push({
        level: "BRANCH",
        ...branch.data,
      });

      if (!expandedKeys[branch.key]) return;

      (branch.children || []).forEach((vendor) => {
        rows.push({
          level: "VENDOR",
          ...vendor.data,
        });

        if (!expandedKeys[vendor.key]) return;

        (vendor.children || []).forEach((customer) => {
          rows.push({
            level: "CUSTOMER",
            ...customer.data,
          });
        });
      });
    });

    const html = `
    <html>
    <head>
      <title>Reporte de Saldos</title>

      <style>
        body{
          font-family: Arial, sans-serif;
          padding:20px;
        }

        h2{
          margin-bottom:5px;
        }

        table{
          width:100%;
          border-collapse:collapse;
          font-size:12px;
        }

        th{
          background:#005AA7;
          color:white;
          padding:6px;
          border:1px solid #ccc;
        }

        td{
          padding:5px;
          border:1px solid #ddd;
        }

        .branch{
          background:#DCEEFF;
          font-weight:bold;
        }

        .vendor{
          background:#F5F8FC;
          font-weight:bold;
        }

        .customer{
          background:white;
        }

        .indent1{
          padding-left:20px;
        }

        .indent2{
          padding-left:40px;
        }
      </style>
    </head>

    <body>

      <h2>Consulta de Saldos por Cliente</h2>

      <div>
        Fecha Corte: ${dayjs(date).format("DD/MM/YYYY")}
      </div>

      <br/>

      <table>

        <thead>
          <tr>
            <th>Cliente / Grupo</th>
            <th>Identificación</th>
            <th>Crédito</th>
            <th>Saldo Capital</th>
            <th>Saldo Interés</th>
            <th>Capital Mora</th>
            <th>Capital Vencido</th>
            <th># Clientes</th>
          </tr>
        </thead>

        <tbody>

          ${rows
            .map((r) => {
              const cls =
                r.level === "BRANCH"
                  ? "branch"
                  : r.level === "VENDOR"
                    ? "vendor"
                    : "customer";

              const indent =
                r.level === "VENDOR"
                  ? "indent1"
                  : r.level === "CUSTOMER"
                    ? "indent2"
                    : "";

              return `
                <tr class="${cls}">
                  <td class="${indent}">${r.name || ""}</td>
                  <td>${r.identification || ""}</td>
                  <td>${r.loan || ""}</td>
                  <td>${r.capital || ""}</td>
                  <td>${r.interest || ""}</td>
                  <td>${r.defaulted || ""}</td>
                  <td>${r.overdue || ""}</td>
                  <td>${r.count || ""}</td>
                </tr>
              `;
            })
            .join("")}

        </tbody>

      </table>

    </body>
    </html>
  `;

    const w = window.open("", "_blank");

    w.document.write(html);
    w.document.close();

    setTimeout(() => {
      w.print();
    }, 500);
  };

  const handlePrintReport = () => {
    printCustomerBalanceReport({
      company: tenant,
      user,
      nodes,
      expandedKeys,
      date,
      balanceType,
      globalTotals,
    });
  };

  const [currentIndex, setCurrentIndex] = useState(daysRange - 1);
  const date = allDates[currentIndex];

  const [balanceType, setBalanceType] = useState("FINAL");
  const [search, setSearch] = useState("");

  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [expandedKeys, setExpandedKeys] = useState({});
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);

  const [globalTotals, setGlobalTotals] = useState({
    capital: 0,
    interest: 0,
    defaulted: 0,
    overdue: 0,
    count: 0,
  });

  // Cargar catálogos
  useEffect(() => {
    API.get(`/api/vendors`).then((res) => setVendors(res.data));
  }, []);

  const calculateTotals = (customers) =>
    customers.reduce(
      (acc, c) => {
        acc.capital += Number(c.capital_balance || 0);
        acc.interest += Number(c.interest_balance || 0);
        acc.defaulted += Number(c.defaulted_capital || 0);
        acc.overdue += Number(c.overdue_capital || 0);
        return acc;
      },
      { capital: 0, interest: 0, defaulted: 0, overdue: 0 },
    );

  const buildExpandedAll = useCallback((branchNodes) => {
    const all = {};
    branchNodes.forEach((b) => {
      all[b.key] = true;
      (b.children || []).forEach((v) => (all[v.key] = true));
    });
    return all;
  }, []);

  const fetchData = useCallback(
    async (targetDate) => {
      setLoading(true);

      const params = {
        date: targetDate,
        balance_type: balanceType,
      };
      if (selectedBranch) params.branch_id = selectedBranch;
      if (selectedVendor) params.vendor_id = selectedVendor;

      try {
        const res = await API.get(`/api/balances/vendors-balance`, {
          params,
        });

        let grand = {
          capital: 0,
          interest: 0,
          defaulted: 0,
          overdue: 0,
          count: 0,
        };

        const branchNodes = (res.data?.data || []).map((branch) => {
          const vendorNodes = (branch.vendors || []).map((vendor) => {
            const customers = vendor.customers || [];

            const customerNodes = customers
              .filter((c) => {
                const s = search.trim().toLowerCase();
                if (!s) return true;
                return (
                  (c.customer_name || "").toLowerCase().includes(s) ||
                  (c.identification || "").toLowerCase().includes(s)
                );
              })
              .map((customer) => ({
                key: `customer-${customer.identification}-${customer.loan_id}`,
                data: {
                  name: customer.customer_name,
                  identification: customer.identification,
                  customer_id: customer.customer_id,

                  loan: customer.loan_id,
                  id: customer.loan_id,
                  loan_id: customer.loan_id,

                  customer_name: customer.customer_name,
                  customer_identification: customer.identification,

                  amount:
                    customer.approved_amount ||
                    customer.amount ||
                    customer.capital_balance ||
                    0,
                  term: customer.approved_term || customer.term || 0,
                  interest_rate:
                    customer.approved_rate || customer.interest_rate || 0,
                  date:
                    customer.approval_date ||
                    customer.request_date ||
                    customer.date ||
                    null,
                  due_date: customer.due_date || null,

                  branch_id: customer.branch_id || null,
                  branch_name: customer.branch_name || null,
                  promoter_id: customer.promoter_id || null,
                  promoter_name: customer.promoter_name || null,
                  frecuency_name:
                    customer.frequency || customer.frecuency_name || "",

                  capital: money(customer.capital_balance),
                  interest: money(customer.interest_balance),
                  defaulted: money(customer.defaulted_capital),
                  overdue: money(customer.overdue_capital),
                  count: "",
                },
                leaf: true,
              }));

            const totals = calculateTotals(customers);

            grand.capital += totals.capital;
            grand.interest += totals.interest;
            grand.defaulted += totals.defaulted;
            grand.overdue += totals.overdue;
            grand.count += customers.length;

            return {
              key: `vendor-${vendor.vendor_id}`,
              data: {
                name: `Vendedor: ${vendor.vendor_name}`,
                capital: money(totals.capital),
                interest: money(totals.interest),
                defaulted: money(totals.defaulted),
                overdue: money(totals.overdue),
                count: customers.length,
              },
              children: customerNodes,
              className: "bac-row-vendor",
            };
          });

          const allCustomers = (branch.vendors || []).flatMap(
            (v) => v.customers || [],
          );
          const totals = calculateTotals(allCustomers);

          return {
            key: `branch-${branch.branch_id}`,
            data: {
              name: `Sucursal: ${branch.branch_name}`,
              capital: money(totals.capital),
              interest: money(totals.interest),
              defaulted: money(totals.defaulted),
              overdue: money(totals.overdue),
              count: allCustomers.length,
            },
            children: vendorNodes,
            className: "bac-row-branch",
          };
        });

        const totalGeneralNode = {
          key: "total-general",
          data: {
            name: "TOTAL GENERAL",
            capital: money(grand.capital),
            interest: money(grand.interest),
            defaulted: money(grand.defaulted),
            overdue: money(grand.overdue),
            count: grand.count,
          },
          children: [],
          className: "bac-row-total",
        };

        const finalNodes = [totalGeneralNode, ...branchNodes];

        setNodes(finalNodes);
        setGlobalTotals(grand);
        setExpandedKeys((prev) => {
          const next = buildExpandedAll(finalNodes);

          if (JSON.stringify(prev) === JSON.stringify(next)) return prev;

          return next;
        });
      } catch (error) {
        console.error("Error al obtener saldos:", error);
      } finally {
        setLoading(false);
      }
    },
    [balanceType, selectedBranch, selectedVendor, search, buildExpandedAll],
  );

  useEffect(() => {
    fetchData(date);
  }, [date, balanceType, selectedBranch, selectedVendor]);

  const visibleDates = useMemo(() => {
    const start = Math.max(0, currentIndex - 3);
    const end = Math.min(allDates.length, currentIndex + 4);
    return allDates.slice(start, end);
  }, [currentIndex, allDates]);

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
            "Crédito No.": customer.data.loan,
            "Saldo Capital": customer.data.capital,
            "Saldo Interés": customer.data.interest,
            "Capital en Mora": customer.data.defaulted,
            "Capital Vencido": customer.data.overdue,
          });
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Saldos");

    // Ancho de columnas más “pro”
    ws["!cols"] = [
      { wch: 28 },
      { wch: 26 },
      { wch: 30 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
    ];

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `SaldosClientes_${dayjs(date).format("YYYYMMDD")}.xlsx`);
  };

  // KPI Card pequeña
  const Kpi = ({ label, value }) => (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${BAC.border}`,
        borderRadius: 2,
        px: 2,
        py: 1,
        minWidth: 150,
        bgcolor: "#fff",
      }}
    >
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: BAC.sub }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 900, lineHeight: 1.1 }}>
        {value}
      </Typography>
    </Paper>
  );

  return (
    <Box sx={{ p: 2, bgcolor: BAC.bg, minHeight: "100vh" }}>
      {/* Header BAC */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 3,
          border: `1px solid ${BAC.border}`,
          background: `linear-gradient(90deg, ${BAC.blue}, ${BAC.blue2})`,
          color: "#fff",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
        >
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
              Consulta de Saldos por Cliente
            </Typography>
            <Typography sx={{ opacity: 0.9, fontSize: 13 }}>
              Corte: {dayjs(date).format("DD/MM/YYYY")} · Tipo:{" "}
              {balanceType === "FINAL" ? "Saldo Final" : "Saldo Inicial"}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={`Clientes: ${globalTotals.count}`}
              sx={{
                bgcolor: "rgba(255,255,255,.18)",
                color: "#fff",
                fontWeight: 800,
              }}
            />
            <Tooltip title="Exportar a Excel">
              <Button
                onClick={exportToExcel}
                variant="contained"
                startIcon={<FileDownloadIcon />}
                sx={{
                  bgcolor: "#fff",
                  color: BAC.blue,
                  fontWeight: 900,
                  "&:hover": { bgcolor: "#F1F6FF" },
                  borderRadius: 2,
                  textTransform: "none",
                }}
              >
                Exportar
              </Button>
            </Tooltip>

            <Button
              onClick={handlePrintReport}
              variant="contained"
              startIcon={<PrintIcon />}
              sx={{
                bgcolor: "#198754",
                color: "#fff",
                fontWeight: 900,
                "&:hover": { bgcolor: "#157347" },
                borderRadius: 2,
                textTransform: "none",
              }}
            >
              Imprimir
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Selector de fechas tipo “banca” */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 3,
          border: `1px solid ${BAC.border}`,
          bgcolor: "#fff",
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="center"
        >
          {/* KPIs */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            sx={{ mb: 2, flexWrap: "wrap" }}
          >
            <Kpi label="Saldo Capital" value={money(globalTotals.capital)} />
            <Kpi label="Saldo Interés" value={money(globalTotals.interest)} />
            <Kpi
              label="Capital en Mora"
              value={money(globalTotals.defaulted)}
            />
            <Kpi label="Capital Vencido" value={money(globalTotals.overdue)} />
          </Stack>

          <IconButton
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            sx={{ border: `1px solid ${BAC.border}`, borderRadius: 2 }}
          >
            <ChevronLeftIcon />
          </IconButton>

          <Stack direction="row" spacing={1} sx={{ overflowX: "auto" }}>
            {visibleDates.map((d) => (
              <Button
                key={d}
                variant={d === date ? "contained" : "outlined"}
                size="small"
                onClick={() => {
                  const idx = allDates.indexOf(d);
                  setCurrentIndex(idx);
                  fetchData(d);
                }}
                sx={{
                  minWidth: 76,
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 800,
                  ...(d === date
                    ? { bgcolor: BAC.blue, "&:hover": { bgcolor: BAC.blue2 } }
                    : { borderColor: BAC.border, color: BAC.blue }),
                }}
              >
                {dayjs(d).format("DD/MM")}
              </Button>
            ))}
          </Stack>

          <IconButton
            onClick={() =>
              setCurrentIndex((i) => Math.min(allDates.length - 1, i + 1))
            }
            disabled={currentIndex >= allDates.length - 1}
            sx={{ border: `1px solid ${BAC.border}`, borderRadius: 2 }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      </Paper>

      {/* Filtros */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 3,
          border: `1px solid ${BAC.border}`,
          bgcolor: "#fff",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems="center"
        >
          <TextField
            label="Fecha"
            type="date"
            size="small"
            value={date}
            onChange={(e) => {
              const d = e.target.value;
              const idx = allDates.indexOf(d);
              if (idx >= 0) setCurrentIndex(idx);
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 170 }}
          />

          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel>Sucursal</InputLabel>
            <BranchSelect
              size="small"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            />
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Vendedor</InputLabel>
            <Select
              value={selectedVendor}
              label="Vendedor"
              onChange={(e) => setSelectedVendor(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {vendors.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Tipo de Saldo</InputLabel>
            <Select
              value={balanceType}
              label="Tipo de Saldo"
              onChange={(e) => setBalanceType(e.target.value)}
            >
              <MenuItem value="INITIAL">Saldo Inicial</MenuItem>
              <MenuItem value="FINAL">Saldo Final</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            onClick={() => fetchData(date)}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} /> : null}
            sx={{
              bgcolor: BAC.blue,
              "&:hover": { bgcolor: BAC.blue2 },
              borderRadius: 2,
              fontWeight: 900,
              textTransform: "none",
            }}
          >
            Consultar
          </Button>

          <TextField
            label="Buscar Cliente"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 400 }}
          />
        </Stack>

        <Typography sx={{ mt: 1.5, fontSize: 12, color: BAC.sub }}>
          Tip: escribe parte del nombre o cédula. La tabla se recalcula al
          consultar.
          <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
            <Button
              variant="text"
              onClick={() => setExpandedKeys({})}
              sx={{ textTransform: "none", fontWeight: 800, color: BAC.blue }}
            >
              Contraer
            </Button>

            <Button
              variant="text"
              onClick={() => setExpandedKeys(buildExpandedAll(nodes))}
              sx={{ textTransform: "none", fontWeight: 800, color: BAC.blue }}
            >
              Expandir
            </Button>
          </Stack>
        </Typography>
        <Divider sx={{ mt: 1 }} />
      </Paper>

      {/* Tabla */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: 3,
          border: `1px solid ${BAC.border}`,
          bgcolor: "#fff",
        }}
      >
        <TreeTable
          value={nodes}
          tableStyle={{ minWidth: "100%" }}
          selectionMode="single"
          selectionKeys={selectedNodeKey}
          onSelectionChange={(e) => setSelectedNodeKey(e.value)}
          expandedKeys={expandedKeys}
          onToggle={(e) => setExpandedKeys(e.value)}
          rowHover
          className="p-treetable-hoverable-rows bac-compact"
        >
          <Column
            field="name"
            header="Cliente / Grupo"
            expander
            style={{ width: "28%" }}
          />
          <Column
            field="identification"
            header="Identificación"
            style={{ width: "14%" }}
          />
          <Column
            header="Crédito No."
            body={loanBody}
            style={{ width: "10%" }}
          />
          <Column
            field="capital"
            header="Saldo Capital"
            style={{ width: "12%" }}
          />
          <Column
            field="interest"
            header="Saldo Interés"
            style={{ width: "12%" }}
          />
          <Column
            field="defaulted"
            header="Capital en Mora"
            style={{ width: "12%" }}
          />
          <Column
            field="overdue"
            header="Capital Vencido"
            style={{ width: "12%" }}
          />
          <Column field="count" header="# Clientes" style={{ width: "8%" }} />
        </TreeTable>
      </Paper>

      {stmtOpen && stmtLoan && (
        <AccountStatementModal
          open={stmtOpen}
          onClose={closeStatement}
          loanId={stmtLoan.loan_id}
          customerName={stmtLoan.customer_name}
          identification={stmtLoan.identification}
          cutDate={date}
        />
      )}
      {creditModalOpen && selectedCredit && (
        <LoanDetailsModal
          open={creditModalOpen}
          onClose={closeCreditModal}
          loan={selectedCredit}
          clientId={selectedCredit.customer_id}
          clientIdentification={selectedCredit.identification}
          onLoanUpdated={() => fetchData(date)}
        />
      )}
    </Box>
  );
};

export default CustomerBalanceViewer;
