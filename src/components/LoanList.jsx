import React, { useEffect, useState, useContext } from "react";
import AddCircle from './AddCircle';
import {
	Box, TextField, MenuItem, Alert, Snackbar, CircularProgress, Button
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { UserContext } from "../contexts/UserContext";
import LoanListDataTable from "./LoanListDataTable";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import BranchSelect from "./BranchSelect";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";

const API_URL = process.env.REACT_APP_API_BASE_URL + '/api/loans';
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };

const columns = [
	{ accessorKey: 'id', header: 'Crédito nro.', size: 10 },
	{ accessorKey: 'customer_id', header: 'Codigo Cliente', size: 10 },
	{ accessorKey: 'customer_identification', header: 'Cédula', size: 50 },
	{ accessorKey: 'customer_name', header: 'Nombre del cliente', size: 80 },
	{ accessorKey: 'date', header: 'Fecha solicitud', size: 150 },
	{ accessorKey: 'amount', header: 'Monto solicitado', size: 150, number: true },
	{ accessorKey: 'current_balance', header: 'Saldo actual', size: 150, number: true },
	{ accessorKey: 'approval_status', header: 'Estado aprobación', size: 100 },
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
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {percent.toFixed(0)}%
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={percent}
          sx={{
            height: 8,
            borderRadius: 5,
            backgroundColor: "#E3F2FD",
            "& .MuiLinearProgress-bar": {
              backgroundColor:
                percent >= 100
                  ? "#2E7D32"
                  : percent >= 70
                  ? "#1565C0"
                  : percent >= 40
                  ? "#42A5F5"
                  : "#90CAF9",
            },
          }}
        />
      </Box>
    );
  },
}
];
const exportToExcel = (data) => {
	// Formatea los datos si es necesario
	const formattedData = data.map(row => ({
		'Crédito #': row.id,
		'Cédula': row.customer_identification,
		'Cliente': row.customer_name,
		'Fecha solicitud': dayjs(row.date).format('DD/MM/YYYY'),
		'Monto': row.amount,
		'Estado': row.approval_status,
	}));

	const worksheet = XLSX.utils.json_to_sheet(formattedData);
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Créditos');

	const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
	const file = new Blob([excelBuffer], { type: 'application/octet-stream' });
	saveAs(file, `creditos_${dayjs().format('YYYY-MM-DD')}.xlsx`);
};

const getPaymentPercent = (row) => {
  const original = Number(row.amount || 0);
  const balance = Number(row.current_balance || 0);

  if (original <= 0) return 0;

  const paid = original - balance;
  const percent = (paid / original) * 100;

  return Math.max(0, Math.min(100, percent));
};

const LoanList = () => {
	const [data, setData] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(0); // 0-based
	const [pageSize, setPageSize] = useState(10);
	const [statusFilter, setStatusFilter] = useState('');
	const [sortBy, setSortBy] = useState('id');
	const [sortOrder, setSortOrder] = useState('desc');
	const [startDate, setStartDate] = useState(null);
	const [endDate, setEndDate] = useState(null);
	const [loading, setLoading] = useState(false);
	const [alert, setAlert] = useState({ open: false, type: '', message: '' });
	const [search, setSearch] = useState('');
	const [branchId, setBranchId] = useState('');



	const { permissions, role } = useContext(UserContext);

	const fetchApi = async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({
				page: page + 1,
				limit: pageSize,
				status: statusFilter || '',
				sortBy,
				sortOrder,
			});
			if (branchId) params.append('branch_id', branchId);
			if (startDate) params.append('startDate', dayjs(startDate).format('YYYY-MM-DD'));
			if (endDate) params.append('endDate', dayjs(endDate).format('YYYY-MM-DD'));
			if (search) params.append('search', search);
			if (branchId) params.append('branch_id', branchId);

			const response = await fetch(`${API_URL}?${params.toString()}`, { headers });
			const json = await response.json();

			if (!response.ok) {
				throw new Error(json?.errors?.[0] || response.statusText);
			}

			setData(json.data);
			setTotal(json.total);
		} catch (error) {
			console.error('Error al obtener créditos:', error);
			setAlert({ open: true, type: 'error', message: 'Error al obtener los créditos: ' + error.message });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchApi();
	}, [page, pageSize, statusFilter, sortBy, sortOrder, startDate, endDate, search, branchId]);

	const handleCloseAlert = () => setAlert({ ...alert, open: false });


	const handleUpdateLoanInList = (updatedLoan) => {
	setData((prev) =>
		prev.map((row) =>
		row.id === updatedLoan.id
			? { ...row, ...updatedLoan } // sobrescribe approval_status/pending_approvals
			: row
		)
	);
	};

	return (
		<Box>
			<Alert variant="filled" icon={false} severity="info" className="mt-5">
				<h2>Listado de créditos
					{(role === 1 || permissions.includes('creditos.crear')) &&
						<AddCircle goTo="/creditos/agregar" />
					}
				</h2>
			</Alert>

			<Box display="flex" flexWrap="wrap" gap={1} mt={1} mb={1}>
				<TextField
					size="large"
					label="Buscar por nombre o cédula"
					value={search}
					onChange={(e) => {
						setPage(0);
						setSearch(e.target.value);
					}}
					sx={{ width: 300 }}
				/>
				
				<TextField
					select
					size="large"
					label="Filtrar por estado"
					sx={{ width: 200 }}
					value={statusFilter}
					onChange={(e) => {
						setPage(0);
						setStatusFilter(e.target.value);
					}}
				>
					<MenuItem value="">Todos</MenuItem>
					<MenuItem value="APROBADO">Aprobado</MenuItem>
					<MenuItem value="RECHAZADO">Rechazado</MenuItem>
					<MenuItem value="PENDIENTE">Pendiente</MenuItem>
				</TextField>

				<LocalizationProvider dateAdapter={AdapterDayjs}>
					<DatePicker
						label="Desde"
						size="small"
						value={startDate}
						onChange={(newValue) => {
							setPage(0);
							setStartDate(newValue);
						}}
						renderInput={(params) => <TextField {...params} />}
					/>
					<DatePicker
						label="Hasta"
						value={endDate}
						onChange={(newValue) => {
							setPage(0);
							setEndDate(newValue);
						}}
						renderInput={(params) => <TextField {...params} />}
					/>
				</LocalizationProvider>
				
				<BranchSelect
					value={branchId}
					size="large"
					label="Seleccione Sucursal"
					onChange={(e) => {
						setPage(0);
						setBranchId(e.target.value);
					}}

				/>

				<Button
					variant="contained"
					color="primary"
					onClick={() => exportToExcel(data)}
					sx={{ height: 40 }}
				>
					Exportar a Excel
				</Button>

			</Box>

			{loading ? (
				<CircularProgress />
			) : (
				<LoanListDataTable
					data={data}
					columns={columns}
					route="loans"
					onUpdate={handleUpdateLoanInList}
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
					/>
			)}

			<Snackbar open={alert.open} autoHideDuration={3000} onClose={handleCloseAlert}>
				<Alert onClose={handleCloseAlert} severity={alert.type} variant="filled" sx={{ width: '100%' }}>
					{alert.message}
				</Alert>
			</Snackbar>
		</Box>
	);
};

export default LoanList;
