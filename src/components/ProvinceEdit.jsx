import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Button from '@mui/material/Button';
import Save from '@mui/icons-material/Save';
import Cancel from '@mui/icons-material/Cancel';
import Alert from '@mui/material/Alert';
import RiskSelect from "./RiskSelect";
import Snackbar from '@mui/material/Snackbar';

const url = process.env.REACT_APP_API_BASE_URL + '/api/provinces/';
const token = process.env.REACT_APP_API_TOKEN;

const ProvinceEdit = (props) => {

	const navigate = useNavigate();
	const location = useLocation();
	const [errors, setErrors] = useState({}); // State for error handling
	const [changed, setChanged] = useState(false);
	const [province, setProvince] = useState({});
	const [state, setState] = useState({
		open: false,
		vertical: 'top',
		horizontal: 'center',
	});
	const [alert, setAlert] = useState({ alertType: "", alertMessage: "" })

	useEffect(() => {
		if (location.state && location.state.record) {
			setProvince(location.state.record)

			// Set record initially with province data
		}
	}, [location.state]);


	function validateForm(data) {
		let errors = {};
		let valid = true;

		if (!data.name) {
			errors.name = 'El nombre es requerido';
			valid = false;
		}
		if (!data.risk_id || data.risk_id < 1) {
			errors.rate = 'Asigne una puntuación válida';
			valid = false;
		}

		setErrors(errors);
		return valid;
	}

	const editProvince = async () => {
		setState({ ...state, open: true });

		const requestOptions = {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json; charset=UTF-8',
				'Authorization': token
			},
			body: JSON.stringify(province)
		};


		try {
			const response = await fetch(url + province.id, requestOptions)
			const responseData = await response.json();

			if (!response.ok) {
				if (responseData.errors && responseData.errors.length > 0) {
					responseData.errors.forEach(error => {
						setAlert({ alertType: "error", alertMessage: `Repuesta del servidor: ` + error.msg })
					});
				} else {

					setAlert({ alertType: "success", alertMessage: "Registro guardado exitosamente." })
				}
			} else {
				setAlert({ alertType: "success", alertMessage: "Registro guardado exitosamente" })

				setTimeout(() => {
					navigate("/departamentos")
				}, 2000)

			}

		} catch (error) {

			setAlert({ alertType: "error", alertMessage: 'Catch: Error al guardar el registro departamento.' + error })
		}

	};

	const handleConfirmation = async () => {

		if (changed) {

			// Confirmación antes de guardar el registro
			toast.info(
				<div>
					¿Estás seguro de que deseas guardar este riesgo?
					<div>
						<Button onClick={editProvince} variant="contained" color="primary">
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
		}


	}

	const handleClose = (event, reason) => {
		if (reason === 'clickaway') {
			return;
		}

		setState({ ...state, open: false })
	};


	const handleSubmit = async (e) => {
		e.preventDefault();
		if (validateForm(province)) {
			await handleConfirmation();

		} else {
			toast.error("No es posible guardar, primero corrija errores!");
		}


	}

	function handleCancel() {
		if (changed) {
			toast.warning(
				<div>
					¿Estás seguro que desa cancelar esta operacion?
					<div>
						<Button onClick={() => navigate("/departamentos")} variant="contained" color="primary">
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
			navigate("/departamentos");
		}

	}

	function handleInputChange(e) {
		const { name, value } = e.target;
		setProvince({ ...province, [name]: value });
		setChanged(true);
		validateForm({ ...province, [name]: value });
	}

	return (
		<div>
			<Alert variant="filled" icon={false} severity="info" className="mt-5">
				<h3>
					Editar departamento ID # {[province.id]}
				</h3>
			</Alert>
			<form onSubmit={handleSubmit} >
				<div className="shadow-lg p-3 mb-5 bg-body rounded">
					<div className="mb-3">
						<label htmlFor="name" className="form-label">Nombre del departemento</label>
						<input type="text" className="form-control" id="name" name="name" onChange={handleInputChange} value={province.name} />
						{errors.name && <span className="form-text text-danger">{errors.name}</span>}
					</div>

					<div className="mb-3">
						<label htmlFor="name" className="form-label">Tipo de riesgo</label>
						<RiskSelect
							editing={true}
							selected={province.risk_id}
							onchange={handleInputChange}
							error={errors.rate}
						/>


					</div>
				</div>
				<Button disabled={!changed} className="btn btn-primary px-5 me-5" type="submit" variant="contained" startIcon={<Save></Save>}>
					Guardar
				</Button>

				<Button className="btn btn-primary px-5 me-5" onClick={handleCancel} variant="contained" color="error" startIcon={<Cancel></Cancel>}>
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

	)
}
export default ProvinceEdit;
