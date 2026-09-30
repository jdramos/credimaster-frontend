import React, { useContext, useEffect, useState } from "react";
import HelpButton from "./help/HelpButton";
import { Box, Paper, Typography, TextField, Alert, Button, Stack } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import API from "../api";
import LoanDetailsModal from "./Loan/detail/LoanDetailsModal";
import { UserContext } from "../contexts/UserContext";
import { useAuth } from "../contexts/AuthContext";
import { printWrittenOffLoansReport } from "../reports/writtenOffLoansReport";

const currency = (value) =>
  `C$ ${Number(value || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value) => (value ? String(value).slice(0, 10) : "");

const normalizeLoanResponse = (resp) => {
  const body = resp?.data;
  if (Array.isArray(body)) return body[0] || null;
  return body?.data || body || null;
};

export default function WrittenOffLoansList() {
  const { user } = useContext(UserContext);
  const { tenant } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedLoanGuarantees, setSelectedLoanGuarantees] = useState([]);
  const [selectedClient, setSelectedClient] = useState({ id: null, identification: null });
  const [loadingLoanDetails, setLoadingLoanDetails] = useState(false);

  const fetchData = async (searchValue) => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/api/loans/written-off", {
        params: searchValue ? { search: searchValue } : {},
      });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Error al consultar cartera saneada");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") fetchData(search);
  };

  const openLoanDetail = async (row) => {
    setLoadingLoanDetails(true);
    setSelectedLoan(null);
    setSelectedLoanGuarantees([]);
    setSelectedClient({ id: row.customer_id, identification: row.customer_identification });

    try {
      const [loanRes, guaranteesRes] = await Promise.all([
        API.get(`/api/loans/${row.id}`),
        row.customer_id ? API.get(`/api/guarantees/${row.customer_id}`) : Promise.resolve({ data: [] }),
      ]);

      const loanData = normalizeLoanResponse(loanRes);

      if (loanData) {
        setSelectedLoan(loanData);
        setSelectedLoanGuarantees(guaranteesRes.data || []);
        setLoanModalOpen(true);
      } else {
        setError("No se encontró información del crédito.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error al obtener los datos del crédito");
    } finally {
      setLoadingLoanDetails(false);
    }
  };

  const totalWrittenOff = rows.reduce((sum, r) => sum + Number(r.writeoff_original_amount || 0), 0);

  const buildCompany = () => ({
    commercial_name: tenant?.commercial_name || tenant?.name || "",
    legal_name: tenant?.legal_name || tenant?.company_name || "",
    tax_id: tenant?.tax_id || tenant?.ruc || "",
    address: tenant?.address || "",
    phone: tenant?.phone || "",
    logo_url: tenant?.logo_url || "",
  });

  const handlePrint = () => {
    printWrittenOffLoansReport({ company: buildCompany(), user, rows });
  };

  const columns = [
    {
      field: "credit_code",
      headerName: "Código",
      width: 130,
      renderCell: (params) => (
        <Button
          size="small"
          variant="text"
          onClick={() => openLoanDetail(params.row)}
          sx={{ minWidth: 0, textTransform: "none", fontWeight: 700 }}
        >
          #{params.value}
        </Button>
      ),
    },
    { field: "customer_name", headerName: "Cliente", flex: 1, minWidth: 220 },
    { field: "customer_identification", headerName: "Identificación", width: 160 },
    { field: "branch_name", headerName: "Sucursal", width: 160 },
    {
      field: "writeoff_original_amount",
      headerName: "Monto saneado",
      width: 160,
      valueFormatter: (params) => currency(params.value),
    },
    {
      field: "writeoff_date",
      headerName: "Fecha de saneamiento",
      width: 170,
      valueFormatter: (params) => formatDate(params.value),
    },
    {
      field: "disbursement_date",
      headerName: "Fecha de desembolso",
      width: 170,
      valueFormatter: (params) => formatDate(params.value),
    },
  ];

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            <Typography variant="h6" fontWeight={800}>
              Cartera saneada
            </Typography>
            <HelpButton screenKey="cartera.saneada" />
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Buscar cliente, identificación o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              sx={{ minWidth: 280 }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<PrintRoundedIcon />}
              onClick={handlePrint}
              disabled={!rows.length}
            >
              Imprimir
            </Button>
          </Stack>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {rows.length} crédito{rows.length === 1 ? "" : "s"} saneado{rows.length === 1 ? "" : "s"} — Total:{" "}
            <Typography component="span" fontWeight={800} color="text.primary">
              {currency(totalWrittenOff)}
            </Typography>
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ height: 560 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            slots={{ toolbar: GridToolbar }}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            disableRowSelectionOnClick
            sx={{
              border: "1px solid #E5E7EB",
              borderRadius: 2,
              "& .MuiDataGrid-columnHeaders": { backgroundColor: "#F8FAFC", fontWeight: 700 },
            }}
          />
        </Box>
      </Paper>

      {loanModalOpen && selectedLoan && (
        <LoanDetailsModal
          open={loanModalOpen}
          loan={selectedLoan}
          guarantees={selectedLoanGuarantees}
          loading={loadingLoanDetails}
          clientId={selectedClient.id}
          clientIdentification={selectedClient.identification}
          onClose={() => {
            setLoanModalOpen(false);
            setSelectedLoan(null);
          }}
        />
      )}
    </Box>
  );
}
