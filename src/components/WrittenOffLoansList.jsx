import React, { useEffect, useState } from "react";
import { Box, Paper, Typography, TextField, Alert } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import API from "../api";

const currency = (value) =>
  `C$ ${Number(value || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value) => (value ? String(value).slice(0, 10) : "");

export default function WrittenOffLoansList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

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

  const columns = [
    { field: "credit_code", headerName: "Código", width: 130 },
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
          <Typography variant="h6" fontWeight={800}>
            Cartera saneada
          </Typography>
          <TextField
            size="small"
            placeholder="Buscar cliente, identificación o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            sx={{ minWidth: 280 }}
          />
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
    </Box>
  );
}
