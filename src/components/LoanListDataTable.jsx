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
  Autocomplete,
} from "@mui/material";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import EditIcon from "@mui/icons-material/Edit";
import DescriptionIcon from "@mui/icons-material/Description";
import { useNavigate } from "react-router-dom";
import Show from "@mui/icons-material/Visibility";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CancelIcon from "@mui/icons-material/Cancel";
import PaidIcon from "@mui/icons-material/Paid";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import UndoIcon from "@mui/icons-material/Undo";
import BlockIcon from "@mui/icons-material/Block";
import { UserContext } from "../contexts/UserContext";
import LoanDetailsModal from "./Loan/detail/LoanDetailsModal";
import PaymentForm from "./PaymentForm";
import AccountStatementModal from "./AccountStatementModal";
import axios from "axios";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import API from "../api";

const urlGuarantee = `/api/guarantees`;

const todayISO = () => dayjs().format("YYYY-MM-DD");

function LoanListDataTable({
  columns,
  data = [],
  onUpdate,
  onModifyLoan,
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
  const navigate = useNavigate();
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
  const [deliveryAgents, setDeliveryAgents] = useState([]);
  const [deliveryAgentId, setDeliveryAgentId] = useState(null);

  const [returnRemittanceLoading, setReturnRemittanceLoading] = useState(false);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedCancelLoan, setSelectedCancelLoan] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("error");

  const openSnack = (msg, severity = "error") => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleLoanUpdated = (updatedLoan) => {
    onUpdate?.(updatedLoan);
  };

  // Anulación de una solicitud (solo DRAFT/PENDING sin aprobaciones; el backend
  // valida la regla). El motivo es obligatorio.
  const handleOpenCancel = (row) => {
    setSelectedCancelLoan(row);
    setCancelReason("");
    setCancelDialogOpen(true);
  };

  const handleCloseCancel = () => {
    if (cancelLoading) return;
    setCancelDialogOpen(false);
    setSelectedCancelLoan(null);
    setCancelReason("");
  };

  const handleSubmitCancel = async () => {
    if (!selectedCancelLoan) return;
    if (!cancelReason.trim()) {
      openSnack("El motivo de la anulación es obligatorio.", "warning");
      return;
    }
    setCancelLoading(true);
    try {
      await API.put(`/api/loans/${selectedCancelLoan.id}/cancel`, {
        reason: cancelReason.trim(),
      });
      openSnack("Solicitud de crédito anulada.", "success");
      setCancelDialogOpen(false);
      setSelectedCancelLoan(null);
      setCancelReason("");
      onUpdate?.();
    } catch (error) {
      openSnack(
        error?.response?.data?.message || "No se pudo anular la solicitud.",
        "error",
      );
    } finally {
      setCancelLoading(false);
    }
  };

  const normalizeLoanResponse = (resp) => {
    const body = resp?.data;
    if (Array.isArray(body)) return body[0] || null;
    return body?.data || body || null;
  };

  const handleShowDetails = async (
    loanId,
    customerId,
    customerIdentification,
  ) => {
    setLoadingDetails(true);
    setSelectedLoan(null);
    setGuarantees([]);
    setSelectedClient({
      id: customerId,
      identification: customerIdentification,
    });

    try {
      const loanResponse = await API.get(`/api/loans/${loanId}`);
      const guaranteeResponse = await API.get(
        `${urlGuarantee}/${customerId}`,
      );

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
    const approvalStatus = String(row?.approval_status || "").toUpperCase();
    const pendingApprovals = Number(row?.pending_approvals || 0);

    if (
      !["APPROVED", "APROBADO"].includes(approvalStatus) ||
      pendingApprovals > 0
    ) {
      return;
    }

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

      await API.put(`$/api/approvals/${selectedApproval.id}`, payload);

      openSnack(
        approvalMode === "approve"
          ? "Aprobación registrada correctamente."
          : "Rechazo registrado correctamente.",
        "success",
      );

      handleCloseApprovalDialog();
      onUpdate?.();
    } catch (error) {
      console.error("Error al actualizar aprobación:", error);
      openSnack(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "No se pudo actualizar la aprobación.",
        "error",
      );
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleOpenDisburseDialog = async (row) => {
    try {
      const loanResp = await API.get(`/api/loans/${row.id}`);
      const loanData = normalizeLoanResponse(loanResp);

      if (!loanData) {
        openSnack("No se pudo cargar el crédito.", "warning");
        return;
      }

      setSelectedDisburseLoan(loanData);
      setDeliveryAgentId(currentUserId);
      setDisburseDialogOpen(true);

      try {
        const usersResp = await API.get("/api/users");
        const active = (usersResp.data || []).filter(
          (u) => u.user_status === 1 || u.user_status === undefined,
        );
        setDeliveryAgents(active);
      } catch (usersError) {
        console.error("Error al cargar usuarios:", usersError);
        setDeliveryAgents([]);
      }
    } catch (error) {
      console.error("Error al abrir desembolso:", error);
      openSnack("No se pudo cargar el crédito para desembolsar.", "error");
    }
  };

  const handleCloseDisburseDialog = () => {
    setDisburseDialogOpen(false);
    setSelectedDisburseLoan(null);
    setDeliveryAgentId(null);
  };

  const handleReturnRemittance = async (row) => {
    const return_reason = window.prompt(
      "Motivo de la devolución (el crédito no pudo desembolsarse):",
    );
    if (return_reason === null) return;

    try {
      setReturnRemittanceLoading(true);
      await API.put(`/api/loans/${row.id}/remittance/return`, { return_reason });
      openSnack("Remesa devuelta correctamente.", "success");
      onUpdate?.();
    } catch (error) {
      console.error("Error al devolver la remesa:", error);
      openSnack(
        error?.response?.data?.message || "No se pudo devolver la remesa.",
        "error",
      );
    } finally {
      setReturnRemittanceLoading(false);
    }
  };

  const handleSubmitDisburse = async () => {
    if (!selectedDisburseLoan?.id) {
      openSnack("No se encontró el crédito a desembolsar.", "warning");
      return;
    }
    if (!deliveryAgentId) {
      openSnack("Debe indicar quién va a entregarle el cheque/efectivo al cliente.", "warning");
      return;
    }

    try {
      setDisburseLoading(true);

      await API.post(`/api/loans/${selectedDisburseLoan.id}/disburse`, {
        disbursed_by: currentUserId,
        delivery_agent_id: deliveryAgentId,
      });

      openSnack("Crédito desembolsado correctamente.", "success");
      handleCloseDisburseDialog();
      onUpdate?.();
    } catch (error) {
      console.error("Error al desembolsar:", error);
      openSnack(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "No se pudo desembolsar el crédito.",
        "error",
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

      // El estado REAL del crédito (loans_data.status) manda sobre el derivado
      // de las aprobaciones: un crédito anulado/rechazado/desembolsado debe
      // mostrarse como tal aunque sus aprobaciones quedaran en otro estado.
      const loanStatus = String(row.status || "").toUpperCase();
      if (loanStatus === "CANCELLED") {
        return (
          <Chip
            size="small"
            label="Anulado"
            color="secondary"
            icon={<BlockIcon fontSize="small" />}
          />
        );
      }
      if (loanStatus === "REJECTED") {
        return (
          <Chip
            size="small"
            label="Rechazado"
            color="error"
            icon={<CancelIcon fontSize="small" />}
          />
        );
      }
      if (loanStatus === "DISBURSED") {
        if (row.delivered_at) {
          return (
            <Chip
              size="small"
              label="Entregado"
              color="success"
              icon={<CheckCircleIcon fontSize="small" />}
            />
          );
        }
        return (
          <Chip
            size="small"
            label="Desembolsado"
            color="info"
            icon={<PaidIcon fontSize="small" />}
          />
        );
      }

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

      return (
        <Chip
          label={chip.label}
          color={chip.color}
          icon={chip.icon}
          size="small"
        />
      );
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
        DISBURSED: row.delivered_at
          ? {
              label: "Entregado",
              color: "success",
              icon: <CheckCircleIcon fontSize="small" />,
            }
          : {
              label: "Desembolsado",
              color: "info",
              icon: <PaidIcon fontSize="small" />,
            },
        CANCELLED: {
          label: "Cancelado",
          color: "secondary",
          icon: <CancelIcon fontSize="small" />,
        },
        DRAFT: {
          label: "Borrador",
          color: "warning",
          icon: <DescriptionIcon fontSize="small" />,
        },
        WRITTEN_OFF: {
          label: "Castigado",
          color: "error",
          icon: <CancelIcon fontSize="small" />,
        },
      };

      const chip = map[raw] || {
        label: value || "N/A",
        color: "default",
        icon: null,
      };

      return (
        <Chip
          label={chip.label}
          color={chip.color}
          icon={chip.icon}
          size="small"
        />
      );
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

  const canShow = role === 1 || permissions.includes("creditos.detalle.ver");
  const canPay =
    role === 1 ||
    permissions.includes("pagos.insertar") ||
    permissions.includes("pagos.aplicar");
  const canStatement =
    role === 1 ||
    permissions.includes("creditos.estado_cuenta.ver") ||
    permissions.includes("creditos.detalle.ver");

  const canApprove =
    role === 1 ||
    permissions.includes("aprobaciones.creditos.aprobar");

  const canReject =
    role === 1 ||
    permissions.includes("aprobaciones.creditos.rechazar");

  const canDisburse =
    role === 1 ||
    permissions.includes("especial.creditos.desembolsar");

  const canReturnRemittance =
    role === 1 || permissions.includes("especial.creditos.remesa.devolver");

  const canModifyNormative =
    role === 1 ||
    permissions.includes("creditos.modificaciones.solicitar");

  const canEditPending = role === 1 || permissions.includes("creditos.editar");

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
            const rowApprovalStatus = String(
              row.approval_status || "",
            ).toUpperCase();
            const pendingApprovals = Number(row.pending_approvals || 0);
            const canApproveRow = ["SUBMITTED", "UNDER_REVIEW"].includes(
              rowStatus,
            );
            const canDisburseRow = ["APPROVED", "A"].includes(rowStatus);
            const canPayRow =
              ["APPROVED", "APROBADO"].includes(rowApprovalStatus) &&
              pendingApprovals === 0;

            const isDraft = rowStatus === "DRAFT";

            // Anular solicitud: solo en borrador o pendiente. El backend
            // revalida que no tenga aprobaciones otorgadas. Reusa creditos.editar.
            const canCancelRow =
              canEditPending && ["DRAFT", "PENDING"].includes(rowStatus);

            const canModifyNormativeRow =
              !!onModifyLoan &&
              (rowStatus === "DISBURSED" ||
                String(row.disbursed || "").toUpperCase() === "Y") &&
              !["CANCELLED"].includes(rowStatus);

            return (
              <TableRow key={row.id ?? rowIndex} hover>
                {columns.map((col, colIndex) => (
                  <TableCell key={colIndex}>
                    {renderCell(col, row[col.accessorKey], row)}
                  </TableCell>
                ))}

                <TableCell>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {/* =========================================
        BORRADOR
    ========================================= */}
                    {isDraft ? (
                      <>
                        <Tooltip title="Abrir borrador">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() =>
                              navigate(`/creditos/agregar?loanId=${row.id}`)
                            }
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {canCancelRow && (
                          <Tooltip title="Anular solicitud">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenCancel(row)}
                            >
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </>
                    ) : (
                      <>
                        {/* =========================================
            EDITAR (solo mientras el crédito está pendiente de aprobación)
        ========================================= */}
                        {canEditPending && rowStatus === "PENDING" && (
                          <Tooltip title="Editar crédito (aún no aprobado)">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() =>
                                navigate(`/creditos/agregar?loanId=${row.id}`)
                              }
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* =========================================
            ANULAR SOLICITUD (solo pendiente, sin aprobaciones)
        ========================================= */}
                        {canCancelRow && rowStatus === "PENDING" && (
                          <Tooltip title="Anular solicitud">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenCancel(row)}
                            >
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* =========================================
            VER DETALLE
        ========================================= */}
                        {canShow && (
                          <Tooltip title="Mostrar detalles del préstamo">
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleShowDetails(
                                  row.id,
                                  row.customer_id,
                                  row.customer_identification,
                                )
                              }
                            >
                              <Show fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* =========================================
            PAGOS
        ========================================= */}
                        {canPay && (
                          <Tooltip
                            title={
                              canPayRow
                                ? "Agregar pago"
                                : "Disponible solo cuando el crédito esté totalmente aprobado"
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                color="success"
                                disabled={!canPayRow}
                                onClick={() => handleOpenPayment(row)}
                              >
                                <PaidIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}

                        {/* =========================================
            ESTADO DE CUENTA
        ========================================= */}
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

                        {/* =========================================
                              REMESA DE DESEMBOLSO — elegir forma de
                              desembolso ya NO se hace desde aquí; se elige
                              en Bancos/Caja > "Desembolsar créditos", que
                              permite agrupar varios créditos en un solo
                              cheque/movimiento (ver LoanBatchDisbursementDialog).
                          ========================================= */}
                        {canReturnRemittance && canDisburseRow && row.disbursement_method && (
                          <Tooltip title={`Devolver remesa (${row.disbursement_method})`}>
                            <span>
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => handleReturnRemittance(row)}
                                disabled={returnRemittanceLoading}
                              >
                                <UndoIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}

                        {/* =========================================
                              DESEMBOLSO
                          ========================================= */}
                        {canDisburse && canDisburseRow && (
                          <Tooltip
                            title={
                              row.disbursement_method
                                ? "Desembolsar crédito"
                                : "Primero debe elegir la forma de desembolso"
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                color="info"
                                onClick={() => handleOpenDisburseDialog(row)}
                                disabled={!row.disbursement_method}
                              >
                                <AccountBalanceWalletIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}

                        {/* =========================================
                              MODIFICACIONES
                          ========================================= */}
                        {canModifyNormative && canModifyNormativeRow && (
                          <Tooltip title="Prórroga / Refinanciamiento / Reestructuración">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => onModifyLoan(row)}
                            >
                              <AutorenewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}

          {!loadingDetails && data.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns.length + 1}
                align="center"
                sx={{ py: 3 }}
              >
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
        onRowsPerPageChange={(e) =>
          onPageSizeChange?.(parseInt(e.target.value, 10))
        }
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
          loanId={selectedStatementLoan.id}
          customerName={selectedStatementLoan.customer_name}
          identification={selectedStatementLoan.customer_identification}
          cutDate={todayISO()}
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
                  {selectedLoan.customer_name ||
                    selectedLoan.customer_identification}
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
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Fecha de aprobación "
                    inputFormat="DD/MM/YYYY"
                    value={approvalForm.date || null}
                    onChange={(newValue) => {
                      setApprovalForm((prev) => ({
                        ...prev,
                        date: newValue
                          ? dayjs(newValue).format("YYYY-MM-DD")
                          : "",
                      }));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        sx={{ width: 150, m: 1 }}
                      />
                    )}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Fecha de decisión"
                    inputFormat="DD/MM/YYYY"
                    value={approvalForm.date || null}
                    onChange={(newValue) => {
                      setApprovalForm((prev) => ({
                        ...prev,
                        date: newValue
                          ? dayjs(newValue).format("YYYY-MM-DD")
                          : "",
                      }));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        sx={{ width: 150, m: 2 }}
                      />
                    )}
                  />
                </LocalizationProvider>
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
                    selectedDisburseLoan.approved_amount ||
                      selectedDisburseLoan.amount ||
                      0,
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Stack>
            </Alert>
          )}

          <Typography variant="body2" sx={{ mb: 2 }}>
            Esta acción marcará el crédito como desembolsado y generará su plan
            final según las condiciones aprobadas.
          </Typography>

          <Autocomplete
            options={deliveryAgents}
            getOptionLabel={(o) => o.full_name || ""}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            value={deliveryAgents.find((u) => u.id === deliveryAgentId) || null}
            onChange={(_, newValue) => setDeliveryAgentId(newValue?.id || null)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="¿Quién le va a entregar el cheque/efectivo al cliente?"
                helperText="Puede ser usted mismo, o un gestor que lo entregará después"
              />
            )}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDisburseDialog}>Cerrar</Button>
          <Button
            variant="contained"
            color="info"
            onClick={handleSubmitDisburse}
            disabled={disburseLoading || !deliveryAgentId}
          >
            Desembolsar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ANULAR SOLICITUD DE CRÉDITO */}
      <Dialog open={cancelDialogOpen} onClose={handleCloseCancel} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Anular solicitud de crédito</DialogTitle>
        <DialogContent dividers>
          {selectedCancelLoan && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Vas a anular la solicitud de crédito #{selectedCancelLoan.id}
              {selectedCancelLoan.customer_name
                ? ` de ${selectedCancelLoan.customer_name}`
                : ""}
              . Esta acción no se puede deshacer y liberará las garantías vinculadas.
            </Alert>
          )}
          <TextField
            label="Motivo de la anulación"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            fullWidth
            required
            multiline
            minRows={3}
            autoFocus
            inputProps={{ maxLength: 255 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancel} disabled={cancelLoading}>
            Cerrar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSubmitCancel}
            disabled={cancelLoading || !cancelReason.trim()}
          >
            {cancelLoading ? "Anulando..." : "Anular solicitud"}
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
