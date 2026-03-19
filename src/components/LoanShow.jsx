import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { Button, Snackbar, Alert } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import LoanForm from "./Loan/LoanForm";
import AmortizationTable from "./AmortizationTable";
import ConfirmDialog from "./ConfirmDialog";
import { useLoanForm } from "./Loan/Hooks/useLoanForm";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const API_TOKEN = process.env.REACT_APP_API_TOKEN;
const HEADERS = { Authorization: API_TOKEN, "Content-Type": "application/json" };

const LoanShow = () => {
	const navigate = useNavigate();
	const [amortizationTable, setAmortizationTable] = useState([]);
	const [alert, setAlert] = useState({ type: "", message: "" });
	const [openDialog, setOpenDialog] = useState(false);
	const [cancelDialog, setCancelDialog] = useState(false);

	const { state: loan, dispatch, errors, validateForm } = useLoanForm(fetchAmortizationTable);

	async function fetchAmortizationTable(loanData) {
		try {
			const response = await fetch(`${API_BASE_URL}/api/loans/amortization`, {
				method: "POST",
				headers: HEADERS,
				body: JSON.stringify(loanData),
			});

			if (!response.ok) throw new Error("Error al obtener la tabla de amortización");

			const data = await response.json();
			setAmortizationTable(data);
		} catch (error) {
			toast.error(error.message);
		}
	}

	async function handleLoanSubmission() {
		try {
			const response = await fetch(`${API_BASE_URL}/api/loans`, {
				method: "POST",
				headers: HEADERS,
				body: JSON.stringify(loan),
			});

			const data = await response.json();
			if (!response.ok) throw new Error(data.errors || "Error al guardar el préstamo");

			setAlert({ type: "success", message: "Préstamo guardado exitosamente" });
			setTimeout(() => navigate("/loans"), 2000);
		} catch (error) {
			setAlert({ type: "error", message: error.message });
		}
	}

	function handleSubmit(e) {
		e.preventDefault();
		if (validateForm()) {
			setOpenDialog(true);
		} else {
			toast.error("Corrija los errores antes de continuar");
		}
	}

	function handleDialogConfirmation() {
		if (cancelDialog) {
			navigate("/creditos");
		} else {
			handleLoanSubmission();
			setOpenDialog(false);
		}
	}

	function handleCancel() {
		setCancelDialog(true);
		setOpenDialog(true);
	}

	return (
		<div>
			<Alert variant="filled" severity="info">
				<h2>Solicitud de Préstamo</h2>
			</Alert>

			<form onSubmit={handleSubmit}>
				<LoanForm state={loan} dispatch={dispatch} errors={errors} fetchGuarantees={fetchAmortizationTable} />

				<AmortizationTable amortizationTable={amortizationTable} />

				<div>
					<Button type="submit" variant="contained" startIcon={<SaveIcon />}>
						Guardar
					</Button>
					<Button onClick={handleCancel} variant="contained" color="error" startIcon={<CancelIcon />}>
						Cancelar
					</Button>
				</div>
			</form>

			<ToastContainer />
			<Snackbar open={alert.message !== ""} autoHideDuration={3000} onClose={() => setAlert({ type: "", message: "" })}>
				<Alert severity={alert.type} variant="filled">
					{alert.message}
				</Alert>
			</Snackbar>
			<ConfirmDialog open={openDialog} onClose={() => setOpenDialog(false)} confirm={handleDialogConfirmation} cancel={() => setOpenDialog(false)} cancelOperation={cancelDialog} />
		</div>
	);
};

export default LoanShow;
