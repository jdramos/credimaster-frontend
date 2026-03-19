import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import Button from '@mui/material/Button';
import Save from '@mui/icons-material/Save';
import { Cancel } from '@mui/icons-material';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Switch from '@mui/material/Switch';
import { SaveButton, CancelButton } from './MyButtons';

const url = process.env.REACT_APP_API_BASE_URL + '/api/risks/';
const token = process.env.REACT_APP_API_TOKEN;

const RiskEdit = () => {
	const location = useLocation();
	const navigate = useNavigate();

	const [state, setState] = useState({
		open: false,
		vertical: 'top',
		horizontal: 'center',
	});
	const [alert, setAlert] = useState({ alertType: "", alertMessage: "" })

	const [errors, setErrors] = useState({});
	const [risk, setRisk] = useState({});
	const [changed, setChanged] = useState(false)
	const [checked, setChecked] = useState(null);


	useEffect(() => {
		if (location.state && location.state.risk) {
			setRisk(location.state.risk)
			setChecked(location.state.risk.risk_status === 1 ? true : false);
			// Set record initially with risk data
		}
	}, [location.state]);

	function validateForm(data) {
		let errors = {};
		let valid = true;

		if (!data.risk_name) {
			errors.name = 'El nombre es requerido';
			valid = false;
		}
		if (!data.risk_value || data.risk_value <= 0) {
			errors.rate = 'Asigne una puntuación válida';
			valid = false;
		}

		setErrors(errors);
		return valid;
	}

	function handleSwitchChange(e) {
		setChecked(e.target.checked)
		setRisk({ ...risk, risk_status: risk.risk_status === 1 ? 0 : 1 })
		setChanged(true);
	}

	function handleCancel() {
		if (changed) {
			toast.warning(
				<div>
					¿Estás seguro que desa cancelar esta operacion?
					<div>
						<Button onClick={() => navigate("/riesgos")} variant="contained" color="primary">
							Sí
						</Button>
						<Button onClick={() => toast.dismiss()} variant="contained" color="secondary">
							No
						</Button>
					</div>
				</div>,
				{
					position: toast.POSITION.TOP_CENTER,
					autoClose: false,
					closeOnClick: true,
					draggable: false,
				}
			);
		} else {
			navigate("/riesgos");
		}

	}


	const editRisk = async () => {

		toast.info(
			<div>
				¿Estás seguro de que deseas editar este riesgo?
				<div>
					<Button onClick={handleConfirmation} variant="contained" color="primary">
						Sí
					</Button>
					<Button onClick={() => toast.dismiss()} variant="contained" color="secondary">
						No
					</Button>
				</div>
			</div>,
			{
				position: toast.POSITION.TOP_CENTER,
				autoClose: false,
				closeOnClick: true,
				draggable: false,
			}
		);

	};

	const handleConfirmation = async () => {
		const requestOptions = {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json; charset=UTF-8',
				'Authorization': token
			},
			body: JSON.stringify(risk)
		};

		try {
			const response = await fetch(url + risk.id, requestOptions)
			const responseData = await response.json();
			if (!response.ok) {
				if (responseData.errors && responseData.errors.length > 0) {
					responseData.errors.forEach(error => {
						setAlert({ alertType: "error", alertMessage: error.msg })
					});
				} else {
					setAlert({ alertType: "success", alertMessage: "Registro guardado exitosamente" })
				}
			} else {
				setAlert({ alertType: "success", alertMessage: "Registro guardado exitosamente" })
			}

		} catch (error) {
			setAlert({ alertType: "error", alertMessage: error.message });
		}
		setState({ ...state, open: true });
	}

	const handleClose = (event, reason) => {
		if (reason === 'clickaway') {
			return;
		}

		setState({ ...state, open: false })
	};


	const handleSubmit = (e) => {
		e.preventDefault();
		if (validateForm(risk)) {
			setRisk(risk); // Update risk state with valid data
			editRisk(risk);

		} else {
			toast.error("No es posible guardar, primero corrija errores!", {
				position: toast.POSITION.BOTTOM_RIGHT,
				autoClose: 1800
			});
		}
	};

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setRisk({
			...risk,
			[name]: value,
		});

		// Validate the input data
		const newErrors = validateForm({ ...risk, [name]: value });
		setErrors({
			...newErrors,
		});

		setChanged(true);
	};


	return (
		<div>
			<Alert variant="filled" icon={false} severity="info" className="mt-5">
				<h2>
					Editar Registro # {risk.id}
				</h2>

			</Alert>
			<form onSubmit={handleSubmit} >

				<div className="shadow-lg p-3 mb-5 bg-body  border border-primary">

					<div className="mb-3">
						<label htmlFor="name" className="form-label">Nombre</label>
						<input type="text" className="form-control" id="name" name="risk_name" onChange={handleInputChange} value={risk.risk_name} />
						{errors.name && <span className="form-text text-danger">{errors.name}</span>}
					</div>

					<div className="mb-3">
						<label htmlFor="name" className="form-label">Estado</label>
						<input type="text" className="form-control" id="name" name="risk_status" onChange={handleInputChange} value={risk.risk_status} />
						{errors.name && <span className="form-text text-danger">{errors.name}</span>}
					</div>

					<Switch checked={checked} onChange={handleSwitchChange}></Switch>

					<div className="mb-3">
						<label htmlFor="rate" className="form-label">Calificación del riesgo</label>
						<input type="number" min={1} className="form-control w-25" id="risk_value" name="risk_value" onChange={handleInputChange} value={risk.risk_value} />
						{errors.rate && <span className="form-text text-danger">{errors.rate}</span>}
					</div>

				</div>


				<Button
					disabled={changed}
					className="btn btn-primary px-5 me-5"
					type="submit"
					variant="contained"
					startIcon={<Save></Save>}>
					Guardar
				</Button>
				<Button
					className="btn btn-primary px-5 me-5"
					onClick={handleCancel}
					variant="contained"
					color="error"
					startIcon={<Cancel></Cancel>}>
					Cancelar
				</Button>

			</form>

			<ToastContainer />

			<Snackbar open={state.open} autoHideDuration={3000} onClose={handleClose}>
				<Alert
					onClose={handleClose}
					severity={alert.alertType}
					variant="filled"
					sx={{ width: '100%' }}
				>
					{alert.alertMessage}
				</Alert>
			</Snackbar>
		</div>
	);
};

export default RiskEdit;
