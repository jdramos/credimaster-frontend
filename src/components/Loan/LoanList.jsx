import React, { useEffect, useState } from "react";
import {
  Paper,
  Stack,
  Typography,
  Divider,
  Box,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CalculateIcon from "@mui/icons-material/Calculate";
import PaidIcon from "@mui/icons-material/Paid";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import LoanStatusChip from "./LoanStatusChip";
import ApprovalStatusChip from "./ApprovalStatusChip";
import LoanAmortizationModal from "./LoanAmortizationModal";
import LoanDisburseDialog from "./LoanDisburseDialog";
import LoanApprovalDialog from "./LoanApprovalDialog";
import { loanApi } from "../../api/loanApi";
import { approvalApi } from "../../api/approvalApi";

const money = (n) =>
  new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    minimumFractionDigits: 2,
  }).format(Number(n || 0));

export default function LoanList({ currentUserId = null }) {
  const [filters, setFilters] = useState({
    search: "",
    branch_id: "",
    status: "",
    startDate: "",
    endDate: "",
    sortBy: "a.id",
    sortOrder: "DESC",
    page: 1,
    limit: 10,
  });

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openAmortization, setOpenAmortization] = useState(false);
  const [amortizationRows, setAmortizationRows] = useState([]);

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [openDisburse, setOpenDisburse] = useState(false);
  const [loadingDisburse, setLoadingDisburse] = useState(false);

  const [openApprovalDialog, setOpenApprovalDialog] = useState(false);
  const [approvalMode, setApprovalMode] = useState(null);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [loadingApproval, setLoadingApproval] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await loanApi.getAll(filters);
      setRows(data?.data || []);
      setTotal(Number(data?.total || 0));
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Error al cargar créditos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters.page, filters.limit, filters.sortBy, filters.sortOrder]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setFilters((prev) => ({ ...prev, page: 1 }));
    loadData();
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      branch_id: "",
      status: "",
      startDate: "",
      endDate: "",
      sortBy: "a.id",
      sortOrder: "DESC",
      page: 1,
      limit: 10,
    });
  };

  const handleViewAmortization = async (loanId) => {
    try {
      const data = await loanApi.showAmortization(loanId);
      setAmortizationRows(data || []);
      setOpenAmortization(true);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Error al cargar amortización.");
    }
  };

  const handleOpenDisburse = async (loanId) => {
    try {
      const loan = await loanApi.getOne(loanId);
      setSelectedLoan(loan);
      setOpenDisburse(true);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Error al cargar crédito.");
    }
  };

  const handleDisburse = async (payload) => {
    try {
      if (!selectedLoan) return;
      setLoadingDisburse(true);
      await loanApi.disburse(selectedLoan.id, payload);
      setOpenDisburse(false);
      setSelectedLoan(null);
      loadData();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Error al desembolsar.");
    } finally {
      setLoadingDisburse(false);
    }
  };

const handleOpenApproval = async (loanId, mode) => {
  try {
    const [loan, approvals] = await Promise.all([
      loanApi.getOne(loanId),
      approvalApi.getByRequest(loanId),
    ]);

    const pendingApproval =
      approvals.find(
        (item) =>
          String(item.approver_id) === String(currentUserId) &&
          item.status === "PENDING"
      ) ||
      approvals.find((item) => item.status === "PENDING") ||
      null;

    setSelectedLoan(loan);
    setSelectedApproval(pendingApproval);
    setApprovalMode(mode);
    setOpenApprovalDialog(true);
  } catch (err) {
    setError(err?.response?.data?.error || err?.response?.data?.message || err.message || "Error al cargar aprobación.");
  }
};

const handleApprovalSubmit = async (payload) => {
  try {
    if (!selectedApproval?.id) {
      throw new Error("No se encontró una aprobación pendiente para actualizar.");
    }

    setLoadingApproval(true);

    await approvalApi.updateStatus(selectedApproval.id, payload);

    setOpenApprovalDialog(false);
    setSelectedApproval(null);
    setSelectedLoan(null);
    setApprovalMode(null);

    await loadData();
  } catch (err) {
    setError(err?.response?.data?.error || err?.response?.data?.message || err.message || "Error actualizando aprobación.");
  } finally {
    setLoadingApproval(false);
  }
};

  return (
    <>
      <Paper sx={{ p: 2.5 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1.5}
          mb={2}
        >
          <Typography variant="h6" fontWeight={700}>
            Listado de créditos
          </Typography>

          <Button startIcon={<RefreshIcon />} onClick={loadData}>
            Recargar
          </Button>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        <Box mb={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} useFlexGap flexWrap="wrap">
            <TextField
              size="small"
              label="Buscar"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
            />

            <TextField
              size="small"
              label="Sucursal"
              name="branch_id"
              value={filters.branch_id}
              onChange={handleFilterChange}
            />

            <TextField
              select
              size="small"
              label="Estado"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="SUBMITTED">Enviado</MenuItem>
              <MenuItem value="UNDER_REVIEW">En revisión</MenuItem>
              <MenuItem value="APPROVED">Aprobado</MenuItem>
              <MenuItem value="REJECTED">Rechazado</MenuItem>
              <MenuItem value="DISBURSED">Desembolsado</MenuItem>
              <MenuItem value="CANCELLED">Cancelado</MenuItem>
            </TextField>

            <TextField
              size="small"
              type="date"
              label="Desde"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              size="small"
              type="date"
              label="Hasta"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              InputLabelProps={{ shrink: true }}
            />

            <Button variant="contained" onClick={applyFilters}>
              Filtrar
            </Button>

            <Button variant="outlined" onClick={resetFilters}>
              Limpiar
            </Button>
          </Stack>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell align="right">Saldo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Aprobación</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Stack direction="row" justifyContent="center" spacing={1} alignItems="center">
                      <CircularProgress size={22} />
                      <Typography>Cargando...</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No hay datos
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {row.customer_name || "Sin nombre"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.customer_identification}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.request_date}</TableCell>
                    <TableCell align="right">{money(row.amount)}</TableCell>
                    <TableCell align="right">{money(row.current_balance)}</TableCell>
                    <TableCell>
                      <LoanStatusChip status={row.status} />
                    </TableCell>
                    <TableCell>
                      <ApprovalStatusChip
                        approvalStatus={row.approval_status}
                        pendingApprovals={row.pending_approvals}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver amortización">
                        <IconButton size="small" onClick={() => handleViewAmortization(row.id)}>
                          <CalculateIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Aprobar">
                        <span>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleOpenApproval(row.id, "approve")}
                            disabled={!["SUBMITTED", "UNDER_REVIEW"].includes(row.status)}
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="Rechazar">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenApproval(row.id, "reject")}
                            disabled={!["SUBMITTED", "UNDER_REVIEW"].includes(row.status)}
                          >
                            <CancelIcon />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="Desembolsar">
                        <span>
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleOpenDisburse(row.id)}
                            disabled={row.status !== "APPROVED"}
                          >
                            <PaidIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={filters.page - 1}
          onPageChange={(_, newPage) =>
            setFilters((prev) => ({ ...prev, page: newPage + 1 }))
          }
          rowsPerPage={filters.limit}
          onRowsPerPageChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              limit: parseInt(e.target.value, 10),
              page: 1,
            }))
          }
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      <LoanAmortizationModal
        open={openAmortization}
        onClose={() => setOpenAmortization(false)}
        rows={amortizationRows}
        title="Tabla de amortización"
      />

      <LoanDisburseDialog
        open={openDisburse}
        onClose={() => {
          setOpenDisburse(false);
          setSelectedLoan(null);
        }}
        loan={selectedLoan}
        onSubmit={handleDisburse}
        loading={loadingDisburse}
        currentUserId={currentUserId}
      />

      <LoanApprovalDialog
        open={openApprovalDialog}
        onClose={() => {
          setOpenApprovalDialog(false);
          setSelectedApproval(null);
          setSelectedLoan(null);
          setApprovalMode(null);
        }}
        mode={approvalMode}
        loan={selectedLoan}
        approval={selectedApproval}
        onSubmit={handleApprovalSubmit}
        loading={loadingApproval}
        currentUserId={currentUserId}
      />
    </>
  );
}