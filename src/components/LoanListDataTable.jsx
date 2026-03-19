import React, { useContext, useMemo, useState } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Snackbar,
  Alert,
  TablePagination,
  TableSortLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  Typography,
  Stack,
} from "@mui/material";
import Show from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CancelIcon from "@mui/icons-material/Cancel";
import PaidIcon from "@mui/icons-material/Paid";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { UserContext } from "../contexts/UserContext";
import LoanDetailsModal from "./LoanDetailsModal";
import PaymentForm from "./PaymentForm";
import AccountStatementModal from "./AccountStatementModal";
import axios from "axios";
import dayjs from "dayjs";

const API_URL = process.env.REACT_APP_API_BASE_URL;
const token = process.env.REACT_APP_API_TOKEN;
const urlGuarantee = `${API_URL}/api/guarantees`;

const todayISO = () => dayjs().format("YYYY-MM-DD");

function LoanListDataTable({
  columns,
  data = [],
  onUpdate,

  rowCount = 0,
  page = 0,
  onPageChange,
  pageSize = 10,
  onPageSizeChange,

  sortBy,
  sortOrder,
  setSortBy,
  setSortOrder,
}) {
  const { permissions, role, user } = useContext(UserContext);

  const currentUserId = user?.id ?? null;

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [guarantees, setGuarantees] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [selectedPaymentLoan, setSelectedPaymentLoan] = useState(null);
  const [selectedStatementLoan, setSelectedStatementLoan] = useState(null);

  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalMode, setApprovalMode] = useState(null); // approve | reject
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [approvalForm, setApprovalForm] = useState({
    amount: "",
    term: "",
    interest_rate: "",
    date: todayISO(),
  });
  const [approvalLoading, setApprovalLoading] = useState(false);

  const [disburseDialogOpen, setDisburseDialogOpen] = useState(false);
  const [selectedDisburseLoan, setSelectedDisburseLoan] = useState(null);
  const [disburseLoading, setDisburseLoading] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("error");

  const headers = useMemo(() => ({ Authorization: token }), []);

  const openSnack = (msg, severity = "error") => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleLoanUpdated = (updatedLoan) => {
    onUpdate?.(updatedLoan);
  };

  const normalizeLoanResponse = (resp) => {
    if (Array.isArray(resp?.data)) return resp.data[0] || null;
    return resp?.data || null;
  };

  const handleShowDetails = async (loanId, customerId, customerIdentification) => {
    setLoadingDetails(true);
    setSelectedLoan(null);
    setGuarantees([]);
    setSelectedClient({ id: customerId, identification: customerIdentification });

    try {
      const loanResponse = await axios.get(`${API_URL}/api/loans/${loanId}`, { headers });
      const guaranteeResponse = await axios.get(`${urlGuarantee}/${customerIdentification}`, { headers });

      const loanData = normalizeLoanResponse(loanResponse);

      if (loanData) {
        setSelectedLoan(loanData);
        setGuarantees(guaranteeResponse.data || []);
        setModalOpen(true);
      } else {
        openSnack("No se encontró información del préstamo.", "warning");
      }
    } catch (error) {
      console.error("Error al obtener los datos:", error);
      openSnack("Ocurrió un error al obtener los datos del préstamo.", "error");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenPayment = (row) => {
    setSelectedPaymentLoan(row);
    setPaymentOpen(true);
  };

  const handleClosePayment = () => {
    setPaymentOpen(false);
    setSelectedPaymentLoan(null);
  };

  const handleOpenStatement = (row) => {
    setSelectedStatementLoan(row);
    setStatementOpen(true);
  };

  const handleCloseStatement = () => {
    setStatementOpen(false);
    setSelectedStatementLoan(null);
  };

  const handleOpenApprovalDialog = async (row, mode) => {
    try {
      const [loanResp, approvalsResp] = await Promise.all([
        axios.get(`${API_URL}/api/loans/${row.id}`, { headers }),
        axios.get(`${API_URL}/api/approvals/${row.id}`, { headers }),
      ]);

      const loanData = normalizeLoanResponse(loanResp);
      const approvals = Array.isArray(approvalsResp.data) ? approvalsResp.data : [];

      const pendingApproval =
        approvals.find(
          (item) =>
            String(item.approver_id) === String(currentUserId) &&
            String(item.status).toUpperCase() === "PENDING"
        ) ||
        approvals.find((item) => String(item.status).toUpperCase() === "PENDING") ||
        null;

      if (!loanData) {
        openSnack("No se pudo cargar el crédito.", "warning");
        return;
      }

      if (!pendingApproval) {
        openSnack("No se encontró una aprobación pendiente para este crédito.", "warning");
        return;
      }

      setSelectedLoan(loanData);
      setSelectedApproval(pendingApproval);
      setApprovalMode(mode);
      setApprovalForm({
        amount: loanData.approved_amount ?? loanData.amount ?? "",
        term: loanData.approved_term ?? loanData.term ?? "",
        interest_rate: loanData.approved_rate ?? loanData.interest_rate ?? "",
        date: todayISO(),
      });
      setApprovalDialogOpen(true);
    } catch (error) {
      console.error("Error al abrir aprobación:", error);
      openSnack(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "No se pudo cargar la aprobación.",
        "error"
      );
    }
  };

  const handleCloseApprovalDialog = () => {
    setApprovalDialogOpen(false);
    setApprovalMode(null);
    setSelectedApproval(null);
  };

  const handleApprovalFormChange = (e) => {
    const { name, value } = e.target;
    setApprovalForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitApproval = async () => {
    if (!selectedApproval?.id) {
      openSnack("No se encontró la aprobación a procesar.", "warning");
      return;
    }

    try {
      setApprovalLoading(true);

      const payload =
        approvalMode === "approve"
          ? {
              status: "APPROVED",
              amount: Number(approvalForm.amount || 0),
              term: Number(approvalForm.term || 0),
              interest_rate: Number(approvalForm.interest_rate || 0),
              date: approvalForm.date,
            }
          : {
              status: "REJECTED",
              date: approvalForm.date,
            };

      await axios.put(
        `${API_URL}/api/approvals/${selectedApproval.id}`,
        payload,
        { headers }
      );

      openSnack(
        approvalMode === "approve"
          ? "Aprobación registrada correctamente."
          : "Rechazo registrado correctamente.",
        "success"
      );

      handleCloseApprovalDialog();
      onUpdate?.();
    } catch (error) {
      console.error("Error al actualizar aprobación:", error);
      openSnack(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "No se pudo actualizar la aprobación.",
        "error"
      );
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleOpenDisburseDialog = async (row) => {
    try {
      const loanResp = await axios.get(`${API_URL}/api/loans/${row.id}`, { headers });
      const loanData = normalizeLoanResponse(loanResp);

      if (!loanData) {
        openSnack("No se pudo cargar el crédito.", "warning");
        return;
      }

      setSelectedDisburseLoan(loanData);
      setDisburseDialogOpen(true);
    } catch (error) {
      console.error("Error al abrir desembolso:", error);
      openSnack("No se pudo cargar el crédito para desembolsar.", "error");
    }
  };

  const handleCloseDisburseDialog = () => {
    setDisburseDialogOpen(false);
    setSelectedDisburseLoan(null);
  };

  const handleSubmitDisburse = async () => {
    if (!selectedDisburseLoan?.id) {
      openSnack("No se encontró el crédito a desembolsar.", "warning");
      return;
    }

    try {
      setDisburseLoading(true);

      await axios.post(
        `${API_URL}/api/loans/disburse/${selectedDisburseLoan.id}`,
        {
          disbursed_by: currentUserId,
        },
        { headers }
      );

      openSnack("Crédito desembolsado correctamente.", "success");
      handleCloseDisburseDialog();
      onUpdate?.();
    } catch (error) {
      console.error("Error al desembolsar:", error);
      openSnack(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "No se pudo desembolsar el crédito.",
        "error"
      );
    } finally {
      setDisburseLoading(false);
    }
  };

  const renderCell = (col, value, row) => {
    if (typeof col.Cell === "function") {
      return col.Cell({ row: { original: row }, value });
    }

    if (
      col.accessorKey === "amount" ||
      col.accessorKey === "current_balance" ||
      col.accessorKey === "approved_amount" ||
      col.accessorKey === "disbursed_amount" ||
      col.accessorKey === "balance" ||
      col.accessorKey === "total_balance"
    ) {
      const num = Number(value || 0);
      return `C$ ${num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    if (col.accessorKey === "date" || col.accessorKey?.includes("date")) {
      const d = dayjs(value);
      return d.isValid() ? d.format("DD/MM/YYYY") : "N/A";
    }

    if (col.accessorKey === "approval_status") {
      const raw = String(value || "").toUpperCase();
      const pending = Number(row.pending_approvals || 0);

      const normalized =
        raw === "APPROVED" || raw === "APROBADO"
          ? "APROBADO"
          : raw === "REJECTED" || raw === "RECHAZADO"
          ? "RECHAZADO"
          : "PENDIENTE";

      const map = {
        APROBADO: {
          label: "Aprobado",
          color: "success",
          icon: <CheckCircleIcon fontSize="small" />,
        },
        RECHAZADO: {
          label: "Rechazado",
          color: "error",
          icon: <CancelIcon fontSize="small" />,
        },
        PENDIENTE: {
          label: `Pendiente (${pending})`,
          color: "warning",
          icon: <HourglassEmptyIcon fontSize="small" />,
        },
      };

      const chip = map[normalized] || {
        label: "Desconocido",
        color: "default",
        icon: null,
      };

      return <Chip label={chip.label} color={chip.color} icon={chip.icon} size="small" />;
    }

    if (col.accessorKey === "status") {
      const raw = String(value || "").toUpperCase();

      const map = {
        SUBMITTED: {
          label: "Enviado",
          color: "default",
          icon: <HourglassEmptyIcon fontSize="small" />,
        },
        UNDER_REVIEW: {
          label: "En revisión",
          color: "warning",
          icon: <HourglassEmptyIcon fontSize="small" />,
        },
        APPROVED: {
          label: "Aprobado",
          color: "success",
          icon: <CheckCircleIcon fontSize="small" />,
        },
        A: {
          label: "Aprobado",
          color: "success",
          icon: <CheckCircleIcon fontSize="small" />,
        },
        REJECTED: {
          label: "Rechazado",
          color: "error",
          icon: <CancelIcon fontSize="small" />,
        },
        DISBURSED: {
          label: "Desembolsado",
          color: "info",
          icon: <PaidIcon fontSize="small" />,
        },
        CANCELLED: {
          label: "Cancelado",
          color: "secondary",
          icon: <CancelIcon fontSize="small" />,
        },
      };

      const chip = map[raw] || {
        label: value || "N/A",
        color: "default",
        icon: null,
      };

      return <Chip label={chip.label} color={chip.color} icon={chip.icon} size="small" />;
    }

    return value ?? "";
  };

  const handleSortClick = (accessorKey) => {
    if (!setSortBy || !setSortOrder) return;

    if (sortBy === accessorKey) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(accessorKey);
      setSortOrder("asc");
    }

    onPageChange?.(0);
  };

  const canShow = role === 1 || permissions.includes("creditos.mostrar");
  const canPay =
    role === 1 ||
    permissions.includes("pagos.crear") ||
    permissions.includes("creditos.pagar");
  const canStatement =
    role === 1 ||
    permissions.includes("creditos.estado_cuenta") ||
    permissions.includes("creditos.mostrar");

  const canApprove =
    role === 1 ||
    permissions.includes("creditos.aprobar") ||
    permissions.includes("approvals.update") ||
    permissions.includes("creditos.gestion_aprobacion");

  const canReject =
    role === 1 ||
    permissions.includes("creditos.rechazar") ||
    permissions.includes("approvals.update") ||
    permissions.includes("creditos.gestion_aprobacion");

  const canDisburse =
    role === 1 ||
    permissions.includes("creditos.desembolsar") ||
    permissions.includes("loans.disburse");

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((col, index) => {
              const sortable = !!setSortBy && !!setSortOrder;
              const active = sortable && sortBy === col.accessorKey;

              return (
                <TableCell key={index}>
                  {sortable ? (
                    <TableSortLabel
                      active={active}
                      direction={active ? sortOrder : "asc"}
                      onClick={() => handleSortClick(col.accessorKey)}
                    >
                      <strong>{col.header}</strong>
                    </TableSortLabel>
                  ) : (
                    <strong>{col.header}</strong>
                  )}
                </TableCell>
              );
            })}
            <TableCell>
              <strong>Acciones</strong>
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {data.map((row, rowIndex) => {
            const rowStatus = String(row.status || "").toUpperCase();
            const canApproveRow = ["SUBMITTED", "UNDER_REVIEW"].includes(rowStatus);
            const canDisburseRow = ["APPROVED", "A"].includes(rowStatus);

            return (
              <TableRow key={row.id ?? rowIndex} hover>
                {columns.map((col, colIndex) => (
                  <TableCell key={colIndex}>
                    {renderCell(col, row[col.accessorKey], row)}
                  </TableCell>
                ))}

                <TableCell>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {canShow && (
                      <Tooltip title="Mostrar detalles del préstamo">
                        <IconButton
                          size="small"
                          onClick={() => handleShowDetails(row.id, row.customer_id, row.customer_identification)}
                        >
                          <Show fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}

                    {canApprove && (
                      <Tooltip title="Aprobar crédito">
                        <span>
                          <IconButton
                            size="small"
                            color="success"
                            disabled={!canApproveRow}
                            onClick={() => handleOpenApprovalDialog(row, "approve")}
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}

                    {canReject && (
                      <Tooltip title="Rechazar crédito">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={!canApproveRow}
                            onClick={() => handleOpenApprovalDialog(row, "reject")}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}

                    {canDisburse && (
                      <Tooltip title="Desembolsar crédito">
                        <span>
                          <IconButton
                            size="small"
                            color="info"
                            disabled={!canDisburseRow}
                            onClick={() => handleOpenDisburseDialog(row)}
                          >
                            <PaidIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}

                    {canPay && (
                      <Tooltip title="Agregar pago">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleOpenPayment(row)}
                        >
                          <PaidIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}

                    {canStatement && (
                      <Tooltip title="Estado de cuenta">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenStatement(row)}
                        >
                          <ReceiptLongIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}

          {!loadingDetails && data.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 3 }}>
                No hay datos para mostrar.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <TablePagination
        component="div"
        count={rowCount}
        page={page}
        onPageChange={(_, newPage) => onPageChange?.(newPage)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e) => onPageSizeChange?.(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[5, 10, 25, 50, 100]}
        labelRowsPerPage="Filas por página"
      />

      {modalOpen && selectedLoan && (
        <LoanDetailsModal
          open={modalOpen}
          loan={selectedLoan}
          guarantees={guarantees}
          loading={loadingDetails}
          onUpdate={onUpdate}
          onClose={() => {
            setModalOpen(false);
            setSelectedLoan(null);
          }}
          clientId={selectedClient.id}
          clientIdentification={selectedClient.identification}
          onLoanUpdated={handleLoanUpdated}
        />
      )}

      {paymentOpen && selectedPaymentLoan && (
        <PaymentForm
          open={paymentOpen}
          onClose={handleClosePayment}
          initialLoan={selectedPaymentLoan}
          readOnlyLoan
          onSuccess={(response) => {
            openSnack("Pago registrado correctamente.", "success");

            if (response?.loan) {
              onUpdate?.(response.loan);
            } else {
              onUpdate?.();
            }

            handleClosePayment();
          }}
        />
      )}

      {statementOpen && selectedStatementLoan && (
        <AccountStatementModal
          open={statementOpen}
          onClose={handleCloseStatement}
          loan={selectedStatementLoan}
        />
      )}

      <Dialog
        open={approvalDialogOpen}
        onClose={handleCloseApprovalDialog}
        fullWidth
        maxWidth={approvalMode === "approve" ? "md" : "sm"}
      >
        <DialogTitle>
          {approvalMode === "approve" ? "Aprobar crédito" : "Rechazar crédito"}
        </DialogTitle>

        <DialogContent dividers>
          {selectedLoan && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Stack spacing={0.5}>
                <Typography variant="body2">
                  <strong>Crédito:</strong> #{selectedLoan.id}
                </Typography>
                <Typography variant="body2">
                  <strong>Cliente:</strong>{" "}
                  {selectedLoan.customer_name || selectedLoan.customer_identification}
                </Typography>
              </Stack>
            </Alert>
          )}  

          {approvalMode === "approve" ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Monto aprobado"
                  name="amount"
                  type="number"
                  value={approvalForm.amount}
                  onChange={handleApprovalFormChange}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Plazo aprobado"
                  name="term"
                  type="number"
                  value={approvalForm.term}
                  onChange={handleApprovalFormChange}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Tasa aprobada"
                  name="interest_rate"
                  type="number"
                  value={approvalForm.interest_rate}
                  onChange={handleApprovalFormChange}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha aprobación"
                  name="date"
                  value={approvalForm.date}
                  onChange={handleApprovalFormChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha decisión"
                  name="date"
                  value={approvalForm.date}
                  onChange={handleApprovalFormChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseApprovalDialog}>Cerrar</Button>
          <Button
            variant="contained"
            color={approvalMode === "approve" ? "success" : "error"}
            onClick={handleSubmitApproval}
            disabled={approvalLoading}
          >
            {approvalMode === "approve" ? "Aprobar" : "Rechazar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={disburseDialogOpen}
        onClose={handleCloseDisburseDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Desembolsar crédito</DialogTitle>

        <DialogContent dividers>
          {selectedDisburseLoan && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Stack spacing={0.5}>
                <Typography variant="body2">
                  <strong>Crédito:</strong> #{selectedDisburseLoan.id}
                </Typography>
                <Typography variant="body2">
                  <strong>Cliente:</strong>{" "}
                  {selectedDisburseLoan.customer_name ||
                    selectedDisburseLoan.customer_identification}
                </Typography>
                <Typography variant="body2">
                  <strong>Monto:</strong> C${" "}
                  {Number(
                    selectedDisburseLoan.approved_amount || selectedDisburseLoan.amount || 0
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Stack>
            </Alert>
          )}

          <Typography variant="body2">
            Esta acción marcará el crédito como desembolsado y generará su plan final según
            las condiciones aprobadas.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDisburseDialog}>Cerrar</Button>
          <Button
            variant="contained"
            color="info"
            onClick={handleSubmitDisburse}
            disabled={disburseLoading}
          >
            Desembolsar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </TableContainer>
  );
}

export default LoanListDataTable;