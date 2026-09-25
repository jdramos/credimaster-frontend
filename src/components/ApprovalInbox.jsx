import React, { useEffect, useMemo, useState, useContext } from "react";
import { UserContext } from "../contexts/UserContext";
import HelpButton from "./help/HelpButton";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Page,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import GppMaybeIcon from "@mui/icons-material/GppMaybe";
import { toast } from "react-toastify";
import API from "../api"; // ajusta esta ruta
import LoanDetailsModal from "./Loan/detail/LoanDetailsModal";

// Excepción de garantía insuficiente (política collateral_requirement_mode =
// 'approval'): el crédito se grabó sin garantía suficiente y no puede aprobarse
// hasta que un usuario con el permiso especial la autorice. Ver backend
// api/loan/collateralExceptionController.js.
const hasPendingCollateralException = (row) =>
  Number(row?.collateral_exception) === 1 &&
  row?.collateral_exception_status === "PENDING";

const getCollateralChip = (row) => {
  if (!hasPendingCollateralException(row)) return null;
  return (
    <Tooltip title={row.collateral_exception_reason || "Garantía insuficiente"}>
      <Chip
        size="small"
        color="error"
        icon={<GppMaybeIcon />}
        label="SIN GARANTÍA SUFICIENTE"
      />
    </Tooltip>
  );
};

const moneyFormat = (value) =>
  Number(value || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const dateFormat = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-NI");
};

const getTypeChip = (row) => {
  if (row.item_type === "LOAN") {
    return <Chip size="small" label="CRÉDITO" color="primary" />;
  }

  return <Chip size="small" label="MODIFICACIÓN" color="secondary" />;
};

const getSubtypeChip = (subtype) => {
  const map = {
    NUEVO: { label: "NUEVO", color: "primary" },
    PRORROGA: { label: "PRÓRROGA", color: "warning" },
    REESTRUCTURACION: { label: "REESTRUCTURACIÓN", color: "info" },
    REFINANCIAMIENTO: { label: "REFINANCIAMIENTO", color: "success" },
  };

  const item = map[subtype] || { label: subtype || "N/D", color: "default" };

  return <Chip size="small" label={item.label} color={item.color} />;
};

const getPendingDaysChip = (days) => {
  const value = Number(days || 0);

  if (value >= 4) {
    return <Chip size="small" label={`${value} días`} color="error" />;
  }

  if (value >= 2) {
    return <Chip size="small" label={`${value} días`} color="warning" />;
  }

  return <Chip size="small" label={`${value} días`} color="default" />;
};

function getApprovalProgressChip(row, currentUserId) {
  const approvalStatus = String(
    row.approval_status || row.status || row.item_status || "PENDING",
  ).toUpperCase();
  const approvals = Array.isArray(row.approvals) ? row.approvals : [];

  // Si está rechazado, prioridad máxima
  if (["REJECTED", "RECHAZADO"].includes(approvalStatus)) {
    return <Chip size="small" color="error" label="Rechazado" />;
  }

  // Si todos aprobaron
  if (["APPROVED", "APROBADO"].includes(approvalStatus)) {
    return <Chip size="small" color="success" label="Aprobado totalmente" />;
  }

  // Busca la aprobación del usuario actual
  const myApproval = approvals.find(
    (a) => String(a.approver_id) === String(currentUserId),
  );
  const pendientes = approvals.filter((a) => a.status === "PENDING");

  if (myApproval && myApproval.status === "APPROVED") {
    return <Chip size="small" color="info" label="Ya aprobaste" />;
  }
  if (myApproval && myApproval.status === "PENDING") {
    return <Chip size="small" color="warning" label="Falta tu aprobación" />;
  }
  if (pendientes.length > 0) {
    return (
      <Chip
        size="small"
        color="warning"
        label={`Faltan ${pendientes.length} aprobaciones`}
      />
    );
  }
  return <Chip size="small" color="warning" label="Pendiente" />;
}

const getCommitteeChip = (row) => {
  // La distinción comité/aprobador único solo aplica a la solicitud
  // original de crédito (loans_data.requires_committee) — las
  // modificaciones (prórroga/reestructuración/refinanciamiento) usan su
  // propio flujo de niveles secuenciales, no este mecanismo.
  if (row.item_type !== "LOAN") return null;

  return Boolean(row.requires_committee) ? (
    <Chip size="small" color="secondary" variant="outlined" label="Comité de Crédito" />
  ) : (
    <Chip size="small" variant="outlined" label="Aprobador único" />
  );
};

const SummaryCard = ({ title, value, icon, color = "#0057B8" }) => {
  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        border: "1px solid #E6EAF2",
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {value}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              backgroundColor: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default function ApprovalInbox({ onViewLoan, onViewModification }) {
  const { user, permissions = [], role } = useContext(UserContext);
  const currentUserId = user?.id ?? user;
  const canApproveException =
    role === 1 ||
    (Array.isArray(permissions) &&
      permissions.includes("especial.creditos.excepcion_garantia.aprobar"));

  // Diálogo para resolver la excepción de garantía (aprobar/rechazar).
  const [exceptionDialog, setExceptionDialog] = useState({
    open: false,
    row: null,
    decision: null,
    comment: "",
    saving: false,
  });

  // Desglose numérico (monto vs garantía) que se carga al abrir el diálogo.
  const [exceptionSummary, setExceptionSummary] = useState(null);
  const [exceptionSummaryLoading, setExceptionSummaryLoading] = useState(false);

  const openExceptionDialog = (row, decision) => {
    setExceptionDialog({ open: true, row, decision, comment: "", saving: false });
    setExceptionSummary(null);
    setExceptionSummaryLoading(true);
    API.get(`/api/loans/${row.loan_id}/collateral-summary`)
      .then((res) => setExceptionSummary(res.data))
      .catch(() => setExceptionSummary(null))
      .finally(() => setExceptionSummaryLoading(false));
  };

  const closeExceptionDialog = () =>
    setExceptionDialog((s) => (s.saving ? s : { ...s, open: false }));

  const submitException = async () => {
    const { row, decision, comment } = exceptionDialog;
    if (!row) return;
    setExceptionDialog((s) => ({ ...s, saving: true }));
    try {
      await API.put(`/api/loans/${row.loan_id}/collateral-exception`, {
        decision,
        comment,
      });
      toast.success(
        decision === "APPROVED"
          ? "Excepción de garantía autorizada"
          : "Excepción de garantía rechazada (crédito denegado)",
      );
      setExceptionDialog({ open: false, row: null, decision: null, comment: "", saving: false });
      fetchInbox();
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudo resolver la excepción");
      setExceptionDialog((s) => ({ ...s, saving: false }));
    }
  };

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    loans: 0,
    modifications: 0,
    prorrogas: 0,
    reestructuraciones: 0,
    refinanciamientos: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getToday = () => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  };

  const get7DaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  };

  const [filters, setFilters] = useState({
    type: "ALL",
    subtype: "ALL",
    status: "PENDING",
    startDate: get7DaysAgo(),
    endDate: getToday(),
    text: "",
  });

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [loadingLoan, setLoadingLoan] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const fetchInbox = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/api/approval-inbox", {
        params: {
          status: filters.status,
          startDate: filters.startDate,
          endDate: filters.endDate,
          page,
          limit: rowsPerPage,
        },
      });

      setRows(res.data?.data || []);
      setSummary(
        res.data?.summary || {
          total: 0,
          loans: 0,
          modifications: 0,
          prorrogas: 0,
          reestructuraciones: 0,
          refinanciamientos: 0,
        },
      );
    } catch (err) {
      console.error("Error cargando bandeja:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "No se pudo cargar la bandeja de aprobaciones",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesType =
        filters.type === "ALL" || row.item_type === filters.type;

      const matchesSubtype =
        filters.subtype === "ALL" || row.item_subtype === filters.subtype;

      const rowStatus = String(
        row.approval_status || row.status || row.item_status || "PENDING",
      ).toUpperCase();

      const matchesStatus =
        filters.status === "ALL" || rowStatus === filters.status;

      const rowDate = row.requested_at ? new Date(row.requested_at) : null;

      const startDate = filters.startDate
        ? new Date(`${filters.startDate}T00:00:00`)
        : null;

      const endDate = filters.endDate
        ? new Date(`${filters.endDate}T23:59:59`)
        : null;

      const matchesStartDate = !startDate || (rowDate && rowDate >= startDate);

      const matchesEndDate = !endDate || (rowDate && rowDate <= endDate);

      const search = filters.text.trim().toLowerCase();

      const matchesText =
        !search ||
        String(row.credit_code || "")
          .toLowerCase()
          .includes(search) ||
        String(row.customer_name || "")
          .toLowerCase()
          .includes(search) ||
        String(row.branch_name || "")
          .toLowerCase()
          .includes(search);

      return (
        matchesType &&
        matchesSubtype &&
        matchesStatus &&
        matchesStartDate &&
        matchesEndDate &&
        matchesText
      );
    });
  }, [rows, filters]);

  const handleView = async (row) => {
    if (row.item_type !== "LOAN") {
      onViewModification?.(row);
      return;
    }

    const loanForModal = {
      ...row,

      // campos que espera LoanDetailsModal
      id: row.loan_id,
      amount: row.requested_amount,
      term: row.requested_term,
      interest_rate: row.requested_interest_rate,
      date: row.requested_at,

      customer_id: row.customer_id,
      customer_name: row.customer_name,
      customer_identification: row.customer_identification,

      branch_id: row.branch_id,
      branch_name: row.branch_name,

      promoter_id: row.promoter_id || null,
      promoter_name: row.promoter_name || "No asignado",

      due_date: row.due_date || null,
      frecuency_name:
        row.frecuency_name || row.frequency_name || "No especificada",
    };

    setSelectedLoan(loanForModal);
    setOpenModal(true);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        mb={2}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            <Typography variant="h5" fontWeight={700}>
              Bandeja de aprobaciones
            </Typography>
            <HelpButton screenKey="bandeja-aprobacion" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Créditos y modificaciones pendientes por aprobar
          </Typography>
        </Box>

        <Tooltip title="Actualizar">
          <IconButton onClick={fetchInbox}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={6} md={4}>
          <SummaryCard
            title="Pendientes"
            value={summary.total}
            icon={<AssignmentTurnedInIcon />}
            color="#0057B8"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <SummaryCard
            title="Créditos nuevos"
            value={summary.loans}
            icon={<AccountBalanceWalletIcon />}
            color="#0D47A1"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <SummaryCard
            title="Modificaciones"
            value={summary.modifications}
            icon={<AutorenewIcon />}
            color="#7B1FA2"
          />
        </Grid>
      </Grid>

      <Paper
        sx={{
          p: 2,
          borderRadius: 3,
          border: "1px solid #E6EAF2",
          mb: 2,
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="Estado"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <MenuItem value="ALL">Todos</MenuItem>
              <MenuItem value="PENDING">Pendientes</MenuItem>
              <MenuItem value="APPROVED">Aprobados</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="Tipo"
              value={filters.type}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, type: e.target.value }))
              }
            >
              <MenuItem value="ALL">Todos</MenuItem>
              <MenuItem value="LOAN">Créditos</MenuItem>
              <MenuItem value="MODIFICATION">Modificaciones</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="Subtipo"
              value={filters.subtype}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, subtype: e.target.value }))
              }
            >
              <MenuItem value="ALL">Todos</MenuItem>
              <MenuItem value="NUEVO">Nuevo</MenuItem>
              <MenuItem value="PRORROGA">Prórroga</MenuItem>
              <MenuItem value="REESTRUCTURACION">Reestructuración</MenuItem>
              <MenuItem value="REFINANCIAMIENTO">Refinanciamiento</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="Desde"
              value={filters.startDate}
              InputLabelProps={{ shrink: true }}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, startDate: e.target.value }))
              }
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="Hasta"
              value={filters.endDate}
              InputLabelProps={{ shrink: true }}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, endDate: e.target.value }))
              }
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Buscar"
              placeholder="Código, cliente o sucursal"
              value={filters.text}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, text: e.target.value }))
              }
            />
          </Grid>

          <Grid item xs={12}>
            <Stack direction="row" justifyContent="flex-end">
              <Chip
                clickable
                label="Limpiar filtros"
                onClick={() =>
                  setFilters({
                    type: "ALL",
                    subtype: "ALL",
                    status: "PENDING",
                    startDate: get7DaysAgo(),
                    endDate: getToday(),
                    text: "",
                  })
                }
              />
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Paper
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: "1px solid #E6EAF2",
        }}
      >
        {loading ? (
          <Box
            sx={{
              py: 6,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    background:
                      "linear-gradient(90deg, #0B3C91 0%, #1155CC 100%)",
                  }}
                >
                  <TableCell sx={{ color: "#fff", fontWeight: 700 }}>
                    Tipo
                  </TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: 700 }}>
                    Subtipo
                  </TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: 700 }}>
                    Comité
                  </TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: 700 }}>
                    Crédito
                  </TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: 700 }}>
                    Cliente
                  </TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: 700 }}>
                    Sucursal
                  </TableCell>
                  <TableCell
                    sx={{ color: "#fff", fontWeight: 700 }}
                    align="right"
                  >
                    Monto
                  </TableCell>
                  <TableCell
                    sx={{ color: "#fff", fontWeight: 700 }}
                    align="center"
                  >
                    Fecha
                  </TableCell>
                  <TableCell
                    sx={{ color: "#fff", fontWeight: 700 }}
                    align="center"
                  >
                    Estado aprobación
                  </TableCell>
                  <TableCell
                    sx={{ color: "#fff", fontWeight: 700 }}
                    align="center"
                  >
                    Antigüedad
                  </TableCell>
                  <TableCell
                    sx={{ color: "#fff", fontWeight: 700 }}
                    align="center"
                  >
                    Acción
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center">
                      <Box sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No hay elementos pendientes en la bandeja
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={`${row.item_type}-${row.approval_id}`} hover>
                      <TableCell>{getTypeChip(row)}</TableCell>
                      <TableCell>{getSubtypeChip(row.item_subtype)}</TableCell>
                      <TableCell>
                        <Stack spacing={0.5} alignItems="flex-start">
                          {getCommitteeChip(row)}
                          {getCollateralChip(row)}
                        </Stack>
                      </TableCell>
                      <TableCell>{row.credit_code}</TableCell>
                      <TableCell>{row.customer_name}</TableCell>
                      <TableCell>{row.branch_name}</TableCell>
                      <TableCell align="right">
                        C$ {moneyFormat(row.requested_amount)}
                      </TableCell>
                      <TableCell align="center">
                        {dateFormat(row.requested_at)}
                      </TableCell>
                      <TableCell align="center">
                        {getApprovalProgressChip(row, currentUserId)}
                      </TableCell>
                      <TableCell align="center">
                        {getPendingDaysChip(row.pending_days)}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Ver detalle">
                            <IconButton onClick={() => handleView(row)}>
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          {hasPendingCollateralException(row) && canApproveException && (
                            <>
                              <Tooltip title="Autorizar excepción de garantía">
                                <IconButton
                                  color="success"
                                  onClick={() => openExceptionDialog(row, "APPROVED")}
                                >
                                  <AssignmentTurnedInIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Rechazar excepción (denegar crédito)">
                                <IconButton
                                  color="error"
                                  onClick={() => openExceptionDialog(row, "REJECTED")}
                                >
                                  <GppMaybeIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={exceptionDialog.open} onClose={closeExceptionDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>
          {exceptionDialog.decision === "APPROVED"
            ? "Autorizar excepción de garantía"
            : "Rechazar excepción de garantía"}
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity={exceptionDialog.decision === "APPROVED" ? "warning" : "error"} sx={{ mb: 2 }}>
            {exceptionDialog.row?.collateral_exception_reason || "Garantía insuficiente."}
          </Alert>

          {exceptionSummaryLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={22} />
            </Box>
          ) : exceptionSummary ? (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>
                Relación garantía / monto
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>Monto del crédito</TableCell>
                    <TableCell align="right">C$ {moneyFormat(exceptionSummary.amount)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Cobertura mínima requerida</TableCell>
                    <TableCell align="right">{exceptionSummary.min_coverage_pct}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Garantía requerida</TableCell>
                    <TableCell align="right">C$ {moneyFormat(exceptionSummary.required_value)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Garantía del crédito</TableCell>
                    <TableCell align="right">C$ {moneyFormat(exceptionSummary.linked_guarantee_value)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Cobertura actual</TableCell>
                    <TableCell align="right">
                      {Number(exceptionSummary.coverage_pct || 0).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: "error.main" }}>Faltante</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: "error.main" }}>
                      C$ {moneyFormat(exceptionSummary.shortfall)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {exceptionSummary.customer_guarantees?.length > 0 && (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, mb: 0.5 }}>
                    Garantías del cliente ({exceptionSummary.customer_guarantees.length}):
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Garantía</TableCell>
                        <TableCell align="right">Valor</TableCell>
                        <TableCell align="center">Estado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {exceptionSummary.customer_guarantees.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell>
                            {g.article || `#${g.id}`}
                            {g.brand ? ` · ${g.brand}` : ""}
                          </TableCell>
                          <TableCell align="right">C$ {moneyFormat(g.value)}</TableCell>
                          <TableCell align="center">
                            {g.is_committed ? (
                              <Chip
                                size="small"
                                color="warning"
                                label={`Comprometida (#${g.committed_loan_id})`}
                              />
                            ) : (
                              <Chip size="small" color="success" label="Disponible" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </Box>
          ) : null}

          <Typography variant="body2" sx={{ mb: 2 }}>
            {exceptionDialog.decision === "APPROVED"
              ? `Vas a autorizar que el crédito No. ${exceptionDialog.row?.loan_id} continúe pese a no tener garantía suficiente. Quedará registrado en auditoría.`
              : `Vas a rechazar la excepción: el crédito No. ${exceptionDialog.row?.loan_id} será denegado por no tener garantía suficiente.`}
          </Typography>
          <TextField
            label="Comentario (opcional)"
            value={exceptionDialog.comment}
            onChange={(e) =>
              setExceptionDialog((s) => ({ ...s, comment: e.target.value }))
            }
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeExceptionDialog} disabled={exceptionDialog.saving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={exceptionDialog.decision === "APPROVED" ? "success" : "error"}
            onClick={submitException}
            disabled={exceptionDialog.saving}
          >
            {exceptionDialog.saving
              ? "Guardando..."
              : exceptionDialog.decision === "APPROVED"
                ? "Autorizar"
                : "Rechazar crédito"}
          </Button>
        </DialogActions>
      </Dialog>

      <LoanDetailsModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        loan={selectedLoan}
        loading={loadingLoan}
        clientId={selectedLoan?.customer_id}
        clientIdentification={selectedLoan?.customer_identification}
        guarantees={[]}
        onLoanUpdated={() => fetchInbox()}
      />
    </Box>
  );
}
