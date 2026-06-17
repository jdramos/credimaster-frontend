import React, { useEffect, useState, useContext } from "react";
import AddCircle from "./AddCircle";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CreditScoreOutlinedIcon from "@mui/icons-material/CreditScoreOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { UserContext } from "../contexts/UserContext";
import LoanListDataTable from "./LoanListDataTable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import BranchSelect from "./BranchSelect";
import LinearProgress from "@mui/material/LinearProgress";
import LoanModificationModal from "./Loan/LoanModificationModal";
import RefreshIcon from "@mui/icons-material/Refresh";
import API from "../api";

const BAC = {
  primary: "#0057B8",
  primaryDark: "#003E8A",
  soft: "#EAF2FF",
  bg: "#F6F8FC",
  border: "#D8E2F0",
  text: "#1F2937",
  muted: "#6B7280",
  white: "#FFFFFF",
};

const API_URL = "/api/loans";

const getPaymentPercent = (row) => {
  const approvalStatus = String(row.approval_status || "").toUpperCase();

  if (!["APPROVED", "APROBADO"].includes(approvalStatus)) return 0;

  const disbursed = String(row.disbursed || "").toUpperCase();

  // Si aún no está desembolsado, no debe mostrar avance de pago
  if (disbursed !== "Y") return 0;

  const original = Number(row.approved_amount || row.amount || 0);
  const balance = Number(row.current_balance ?? original);

  if (original <= 0) return 0;

  const paid = original - balance;
  const percent = (paid / original) * 100;

  return Math.max(0, Math.min(100, percent));
};

const columns = [
  { accessorKey: "id", header: "Crédito nro.", size: 10 },
  { accessorKey: "customer_id", header: "Código Cliente", size: 10 },
  { accessorKey: "customer_identification", header: "Cédula", size: 50 },
  { accessorKey: "customer_name", header: "Nombre del cliente", size: 80 },
  { accessorKey: "date", header: "Fecha solicitud", size: 150 },
  {
    accessorKey: "amount",
    header: "Monto solicitado",
    size: 150,
    number: true,
  },
  {
    accessorKey: "current_balance",
    header: "Saldo actual",
    size: 150,
    number: true,
  },
  { accessorKey: "approval_status", header: "Estado aprobación", size: 100 },
  {
    accessorKey: "payment_progress",
    header: "% Pago",
    size: 120,
    Cell: ({ row }) => {
      const percent = getPaymentPercent(row.original);

      return (
        <Box sx={{ width: "100%" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 0.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {percent.toFixed(0)}%
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={percent}
            sx={{
              height: 8,
              borderRadius: 5,
              bgcolor: BAC.soft,
              "& .MuiLinearProgress-bar": {
                bgcolor:
                  percent >= 100
                    ? "#2E7D32"
                    : percent >= 70
                      ? BAC.primaryDark
                      : percent >= 40
                        ? BAC.primary
                        : "#90CAF9",
              },
            }}
          />
        </Box>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Estado registro",
    size: 120,
    Cell: ({ row }) => {
      const status = String(row.original.status || "").toUpperCase();

      if (status === "DRAFT") {
        return (
          <Chip
            size="small"
            label="Borrador"
            sx={{
              bgcolor: "#FFF3E0",
              color: "#ED6C02",
              fontWeight: 800,
            }}
          />
        );
      }

      return (
        <Chip
          size="small"
          label="Final"
          sx={{
            bgcolor: "#E8F5E9",
            color: "#2E7D32",
            fontWeight: 800,
          }}
        />
      );
    },
  },
];

const exportToExcel = (data) => {
  const formattedData = data.map((row) => ({
    "Crédito #": row.id,
    Cédula: row.customer_identification,
    Cliente: row.customer_name,
    "Fecha solicitud": dayjs(row.date).format("DD/MM/YYYY"),
    Monto: row.amount,
    "Saldo actual": row.current_balance,
    "% Pago": getPaymentPercent(row).toFixed(0) + "%",
    Estado: row.approval_status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Créditos");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const file = new Blob([excelBuffer], {
    type: "application/octet-stream",
  });

  saveAs(file, `creditos_${dayjs().format("YYYY-MM-DD")}.xlsx`);
};

const inputSx = {
  minWidth: 220,
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    bgcolor: BAC.white,
  },
};

const LoanList = () => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, type: "", message: "" });
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");

  const [openModificationModal, setOpenModificationModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const { permissions, role } = useContext(UserContext);

  const fetchApi = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: page + 1,
        limit: pageSize,
        status: statusFilter || "",
        sortBy,
        sortOrder,
      });

      if (branchId) params.append("branch_id", branchId);

      if (startDate) {
        params.append("startDate", dayjs(startDate).format("YYYY-MM-DD"));
      }

      if (endDate) {
        params.append("endDate", dayjs(endDate).format("YYYY-MM-DD"));
      }

      if (search) params.append("search", search);

      const response = await API.get(`${API_URL}?${params.toString()}`);
      const json = response.data;

      setData(Array.isArray(json.data) ? json.data : []);
      setTotal(Number(json.total || 0));
    } catch (error) {
      console.error("Error al obtener créditos:", error);

      setAlert({
        open: true,
        type: "error",
        message:
          "Error al obtener los créditos: " +
          (error.response?.data?.error ||
            error.response?.data?.message ||
            error.message),
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchApi();
  }, [
    page,
    pageSize,
    statusFilter,
    sortBy,
    sortOrder,
    startDate,
    endDate,
    search,
    branchId,
  ]);

  const handleCloseAlert = () => setAlert({ ...alert, open: false });

  const handleUpdateLoanInList = async (updatedLoan = null) => {
    if (!updatedLoan?.id) {
      await fetchApi();
      return;
    }

    setData((prev) =>
      prev.map((row) =>
        Number(row.id) === Number(updatedLoan.id)
          ? { ...row, ...updatedLoan }
          : row,
      ),
    );
  };

  const handleOpenModificationModal = (loan) => {
    setSelectedLoan(loan);
    setOpenModificationModal(true);
  };

  const handleCloseModificationModal = () => {
    setOpenModificationModal(false);
    setSelectedLoan(null);
  };

  const handleModificationSuccess = async () => {
    await fetchApi();

    setAlert({
      open: true,
      type: "success",
      message: "Modificación aplicada correctamente.",
    });
  };

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid ${BAC.border}`,
          bgcolor: BAC.white,
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2.2,
            background: `linear-gradient(135deg, ${BAC.primaryDark}, ${BAC.primary})`,
            color: BAC.white,
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.16)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CreditScoreOutlinedIcon />
              </Box>

              <Box>
                <Typography variant="h6" fontWeight={800} lineHeight={1.1}>
                  Listado de créditos.
                </Typography>
                <Typography fontSize={13} sx={{ opacity: 0.85 }}>
                  Consulta, seguimiento y administración de créditos
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={`${total || data.length} registros`}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.18)",
                  color: BAC.white,
                  fontWeight: 700,
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              />

              {(role === 1 || permissions.includes("creditos.crear")) && (
                <AddCircle goTo="/creditos/agregar" />
              )}
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ p: 2.5 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2.5,
              border: `1px solid ${BAC.border}`,
              bgcolor: BAC.bg,
            }}
          >
            <Stack
              direction="row"
              flexWrap="wrap"
              gap={1.5}
              alignItems="center"
            >
              <TextField
                size="small"
                label="Buscar por nombre o cédula"
                value={search}
                onChange={(e) => {
                  setPage(0);
                  setSearch(e.target.value);
                }}
                InputProps={{
                  startAdornment: (
                    <SearchOutlinedIcon
                      sx={{ color: BAC.muted, mr: 1, fontSize: 20 }}
                    />
                  ),
                }}
                sx={{
                  ...inputSx,
                  minWidth: { xs: "100%", sm: 280 },
                }}
              />

              <TextField
                select
                size="small"
                label="Filtrar por estado"
                value={statusFilter}
                onChange={(e) => {
                  setPage(0);
                  setStatusFilter(e.target.value);
                }}
                sx={{ ...inputSx, minWidth: 200 }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="DRAFT">Borrador</MenuItem>
                <MenuItem value="APROBADO">Aprobado</MenuItem>
                <MenuItem value="RECHAZADO">Rechazado</MenuItem>
                <MenuItem value="PENDIENTE">Pendiente</MenuItem>
              </TextField>

              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Desde"
                  value={startDate}
                  onChange={(newValue) => {
                    setPage(0);
                    setStartDate(newValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      sx={{ ...inputSx, minWidth: 170 }}
                    />
                  )}
                />

                <DatePicker
                  label="Hasta"
                  value={endDate}
                  onChange={(newValue) => {
                    setPage(0);
                    setEndDate(newValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      sx={{ ...inputSx, minWidth: 170 }}
                    />
                  )}
                />
              </LocalizationProvider>

              <BranchSelect
                value={branchId}
                selected={branchId}
                size="small"
                label="Sucursal"
                onChange={(e) => {
                  setPage(0);
                  setBranchId(e.target.value);
                }}
                sx={{
                  ...inputSx,
                  minWidth: 220,
                }}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchApi}
                  disabled={loading}
                  sx={{
                    height: 40,
                    borderRadius: 2,
                    fontWeight: 800,
                    textTransform: "none",
                  }}
                >
                  Actualizar
                </Button>

                <Button
                  variant="contained"
                  onClick={() => exportToExcel(data)}
                  startIcon={<FileDownloadOutlinedIcon />}
                  sx={{
                    height: 40,
                    bgcolor: BAC.primary,
                    borderRadius: 2,
                    fontWeight: 800,
                    textTransform: "none",
                    boxShadow: "none",
                    "&:hover": {
                      bgcolor: BAC.primaryDark,
                      boxShadow: "none",
                    },
                  }}
                >
                  Exportar
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {loading ? (
            <Box
              sx={{
                height: 360,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress sx={{ color: BAC.primary }} />
            </Box>
          ) : (
            <LoanListDataTable
              data={data}
              columns={columns}
              route="loans"
              onUpdate={handleUpdateLoanInList}
              onModifyLoan={handleOpenModificationModal}
              rowCount={total}
              page={page}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={(v) => {
                setPage(0);
                setPageSize(v);
              }}
              sortBy={sortBy}
              sortOrder={sortOrder}
              setSortBy={setSortBy}
              setSortOrder={setSortOrder}
              draftEditRoute="/creditos/agregar"
              hideActionsWhenDraft
            />
          )}
        </Box>
      </Paper>

      <LoanModificationModal
        open={openModificationModal}
        onClose={handleCloseModificationModal}
        loan={selectedLoan}
        onSuccess={handleModificationSuccess}
      />

      <Snackbar
        open={alert.open}
        autoHideDuration={3000}
        onClose={handleCloseAlert}
      >
        <Alert
          onClose={handleCloseAlert}
          severity={alert.type}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default LoanList;
