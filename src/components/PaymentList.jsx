import React, { useEffect, useMemo, useState } from "react";
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
  TablePagination,
  CircularProgress,
  TextField,
  MenuItem,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import { NumericFormat } from "react-number-format";
import dayjs from "dayjs";

import PaymentForm from "./PaymentForm";

const API_URL = process.env.REACT_APP_API_BASE_URL + "/api/payments";
const HEADERS = { Authorization: process.env.REACT_APP_API_TOKEN };

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

const PaymentList = () => {
  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // UI
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // pagination (server-side)
  const [page, setPage] = useState(0); // MUI is 0-based
  const [pageSize, setPageSize] = useState(10);

  // filters
  const [dateFrom, setDateFrom] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(dayjs().format("YYYY-MM-DD"));
  const [branchId, setBranchId] = useState("");
  const [collectorId, setCollectorId] = useState("");

  // options (branches/collectors)
  const [branches, setBranches] = useState([]);
  const [collectors, setCollectors] = useState([]);

  const [summary, setSummary] = useState(null);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const fetchBranches = async () => {
    // Ajusta endpoints si en tu API tienen otro nombre
    try {
      const res = await fetch(process.env.REACT_APP_API_BASE_URL + "/api/branches", { headers: HEADERS });
      const json = await res.json();
      setBranches(Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []);
    } catch (e) {
      setBranches([]);
    }
  };

  const fetchCollectors = async () => {
    // Ajusta endpoints si en tu API tienen otro nombre
    try {
      const res = await fetch(process.env.REACT_APP_API_BASE_URL + "/api/collectors", { headers: HEADERS });
      const json = await res.json();
      setCollectors(Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []);
    } catch (e) {
      setCollectors([]);
    }
  };

  const buildQuery = () => {
    const params = new URLSearchParams();

    // server-side paging
    params.set("page", String(page + 1)); // backend 1-based
    params.set("pageSize", String(pageSize));

    // filters
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (branchId) params.set("branchId", String(branchId));
    if (collectorId) params.set("collectorId", String(collectorId));

    return params.toString();
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const qs = buildQuery();
      const response = await fetch(`${API_URL}?${qs}`, { headers: HEADERS });
      const json = await response.json();

      // ✅ Esperado: { data, total }
      const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      const count = Number(json?.total ?? data.length ?? 0);

      setTotal(json.total);
      setRows(data);
      setTotal(count);
    } catch (error) {
      console.error("Error fetching payments:", error);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // initial loads
  useEffect(() => {
    fetchBranches();
    fetchCollectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refetch when paging or filters change
  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const applyFilters = () => {
    setPage(0); // reset to first page
    fetchPayments();
  };

  const clearFilters = () => {
    setDateFrom(dayjs().startOf("month").format("YYYY-MM-DD"));
    setDateTo(dayjs().format("YYYY-MM-DD"));
    setBranchId("");
    setCollectorId("");
    setPage(0);
    // fetch right away with reset values
    setTimeout(fetchPayments, 0);
  };

  const handlePaymentSaved = () => {
    fetchPayments();
    handleClose();
  };

  return (
    <Box className="bac-page">
      {/* Header */}
          <Box
        sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(4,1fr)" },
            gap: 2,
            mb: 2
        }}
        >
        <Box className="bac-summary-card">
            <Typography variant="caption">Cantidad de Pagos</Typography>
            <Typography variant="h6">{summary?.payments_count || 0}</Typography>
        </Box>

        <Box className="bac-summary-card">
            <Typography variant="caption">Capital Cobrado</Typography>
            <Typography variant="h6">
            C$ {Number(summary?.total_principal || 0).toLocaleString()}
            </Typography>
        </Box>

        <Box className="bac-summary-card">
            <Typography variant="caption">Intereses Cobrados</Typography>
            <Typography variant="h6">
            C$ {Number(summary?.total_interest || 0).toLocaleString()}
            </Typography>
        </Box>

        <Box className="bac-summary-card">
            <Typography variant="caption">Total Cobrado</Typography>
            <Typography variant="h6">
            C$ {Number(summary?.total_collected || 0).toLocaleString()}
            </Typography>
        </Box>
        </Box>
      <Box className="bac-page-header">
        <Box>
          <Typography variant="h5" className="bac-page-title">
            Listado de Pagos
          </Typography>
          <div className="bac-page-subtitle">
            Filtra por fecha, sucursal y colector · Vista paginada
          </div>
          
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchPayments}
            className="bac-btn-muted"
            disabled={loading}
          >
            Actualizar
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpen}
            className="bac-btn-primary"
          >
            Agregar Pago
          </Button>
        </Stack>
      </Box>

      {/* Filters */}
      <Box className="bac-filters">
        <Box className="bac-filters__head">
          <Typography sx={{ fontWeight: 950, color: "var(--bac-text)" }}>
            Filtros
          </Typography>
          <Typography sx={{ fontSize: 12, color: "var(--bac-muted)" }}>
            Aplica para paginación y listado
          </Typography>
        </Box>

        <Box className="bac-filters__body">
          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: { xs: "1fr", md: "repeat(6, 1fr)" },
            }}
          >
            <TextField
              label="Desde"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Hasta"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              select
              label="Sucursal"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              size="small"
            >
              <MenuItem value="">Todas</MenuItem>
              {branches.map((b) => (
                <MenuItem key={b.id ?? b.branch_id} value={b.id ?? b.branch_id}>
                  {b.name ?? b.branch_name ?? b.description ?? `Sucursal ${b.id ?? b.branch_id}`}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Colector"
              value={collectorId}
              onChange={(e) => setCollectorId(e.target.value)}
              size="small"
            >
              <MenuItem value="">Todos</MenuItem>
              {collectors.map((c) => (
                <MenuItem key={c.id ?? c.collector_id} value={c.id ?? c.collector_id}>
                  {c.name ?? c.full_name ?? c.collector_name ?? `Colector ${c.id ?? c.collector_id}`}
                </MenuItem>
              ))}
            </TextField>
              
            
            
            <Button variant="outlined" onClick={clearFilters} className="bac-btn-muted">
              Limpiar
            </Button>
            <Button
              variant="contained"
              onClick={applyFilters}
              className="bac-btn-primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Aplicar"}
            </Button>
          
            
          </Box>

        
        </Box>
      </Box>

  

      {/* Table */}
      <Box className="bac-table-card">
        <TableContainer>
          <Table size="small" className="bac-table">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Crédito</TableCell>

                {/* ✅ nuevos */}
                <TableCell>Cédula</TableCell>
                <TableCell>Cliente</TableCell>

                <TableCell>Fecha</TableCell>
                <TableCell align="right">Capital</TableCell>
                <TableCell align="right">Interés</TableCell>
                <TableCell>Sucursal</TableCell>
                <TableCell>Colector</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ py: 4 }}>
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                      <CircularProgress />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ color: "var(--bac-muted)", py: 3 }}>
                    No hay pagos para mostrar con esos filtros.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.id}</TableCell>
                    <TableCell>{p.credit_code ?? p.loan_id ?? p.credit_id ?? "—"}</TableCell>

                    {/* ✅ nuevos campos (ajusta keys según tu API) */}
                    <TableCell>{p.customer_identification ?? p.identification ?? "—"}</TableCell>
                    <TableCell>{p.customer_name ?? p.client_name ?? "—"}</TableCell>

                    <TableCell>{p.payment_date}</TableCell>

                    <TableCell align="right">
                      <Money value={p.principal_payment} />
                    </TableCell>
                    <TableCell align="right">
                      <Money value={p.interest_payment} />
                    </TableCell>

                    <TableCell>{p.branch_name ?? "—"}</TableCell>
                    <TableCell>{p.collector_name ?? p.collector ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="Filas"
        />
      </Box>

      {/* ✅ PaymentForm ya es Dialog (no anidar Dialogs) */}
      <PaymentForm open={open} onClose={handleClose} onSuccess={handlePaymentSaved} />
    </Box>
  );
};

export default PaymentList;