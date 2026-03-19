import React, { useState, useEffect, Children, cloneElement } from "react";
import calculateAge from "../../functions/calculateAge";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import dayjs from "dayjs";
import 'react-toastify/dist/ReactToastify.css';
import BusinessTypeSelect from "../BusinessTypeSelect";
import MunicipalitySelect from "../MunicipalitySelect";
import GuaranteesTable from "../GuranteeTable";
import {
	Box,
	TextField,
	Button,
	Alert,
	Snackbar,
	Select,
	MenuItem,
	Divider,
	InputLabel,
	FormControl,
} from '@mui/material';

import {
	Save as SaveIcon,
	Cancel as CancelIcon,
} from '@mui/icons-material';

import { LocalizationProvider, DatePicker, DateField } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import ConfirmDialog from "../ConfirmDialog";
import ProvinceSelect from "../ProvinceSelect";
import CountrySelect from "../CountrySelect";
import FormHelperText from '@mui/material/FormHelperText';
import DividerChip from "../DividerChip";
import 'dayjs/locale/en-gb';
import formatNumber from "../../functions/thousandSeparator";

const url = process.env.REACT_APP_API_BASE_URL + '/api/customers';
const token = process.env.REACT_APP_API_TOKEN;
const urlGuarantee = process.env.REACT_APP_API_BASE_URL + '/api/guarantees';

const requestOptions = {
	method: 'GET',
	headers: {
		'Content-Type': 'application/json; charset=UTF-8',
		'Authorization': token
	},

};

const DisableFields = ({ children, disabled }) => {
	return Children.map(children, child => {
		if (React.isValidElement(child)) {
			return cloneElement(child, { disabled });
		}
		return child;
	});
};


const CustomerEdit = (props) => {

	const navigate = useNavigate();
	const { customerId } = useParams();

	const [errors, setErrors] = useState({}); // State for error handling
	const [openDialog, setOpenDialog] = useState(false);
	const [cancelDialog, setCancelDialog] = useState(false);
	const [isEmployee, setIsEmployee] = useState(null);
	const [customer, setCustomer] = useState({
		age: 1,
		birth_country_id: 1,
		birth_date: dayjs(),
		business_address: "",
		business_name: "",
		business_telephone: "",
		business_type_id: 0,
		business_inventory: 0.00,
		business_monthly_income: 0.00,
		business_annual_income: 0.00,
		business_license_entity: "",
		business_license_issued: "",
		business_license_expiry: "",
		business_receivables: 0.00,
		cash_amount: 0.00,
		cash_sales: 0.00,
		cellphone: "",
		company: "",
		credit_sales: 0.00,
		customer_code: "",
		customer_name: "",
		economic_activity: 0,
		conami_id_actividad_economica: 0,
		funds_source: "",
		gender: "",
		home_address: "",
		home_status: "",
		identification: "",
		identity_expiration_date: dayjs(),
		identity_issue_country: 1,
		identity_issue_date: dayjs(),
		identity_type: 0,
		income_usd: 0,
		job_start_day: isEmployee ? dayjs() : "",
		job_telephone: "",
		job_salary: 0.00,
		marital_status: "",
		monthly_salary: 0,
		municipality_id: 1,
		nationality: 1,
		occupation: "",
		other_incomes: 0.00,
		province_id: 1,
		public_name: "",
		residence_country_id: 1,
		reference_name: "",
		reference_identity: "",
		reference_address: "",
		reference_workplace: "",
		reference_telephone: 0,
		reference_relationship: "",
		reference_known_time: "",
		reference2_name: "",
		reference2_identity: "",
		reference2_address: "",
		reference2_workplace: "",
		reference2_telephone: 0,
		reference2_relationship: "",
		reference2_known_time: "",
		spouse_address: "",
		spouse_name: "",
		spouse_telephone: "",
		spouse_position: "",
		spouse_job_company: "",
		spouse_job_telephone: 0,
		spouse_job_salary: 0,
		telephone: "",
	});
	const [customerEdit, setCustomerEdit] = useState(true);
	const [notRequiredFields, setNotRequiredFields] = useState([])

	const [state, setState] = useState({
		open: false,
		vertical: 'top',
		horizontal: 'center',
	});
	const [alert, setAlert] = useState({ alertType: "", alertMessage: "" })
	const [birthDate, setBirthDate] = useState(dayjs());
	const [guarantees, setGuarantees] = useState([]);
	const [recordChanged, setRecordChanged] = useState(false);
	const [guaranteeChanged, setGuaranteeChanged] = useState(false);

	useEffect(() => {
		const fetchCustomer = async () => {
			try {
				const response = await fetch(`${url}/${customerId}`, requestOptions);
				const data = await response.json();
				const record = data[0];

				const formattedCustomer = {
					...record,
					birth_date: dayjs(record.birth_date),
					identity_issue_date: dayjs(record.identity_issue_date),
					job_start_day: record.job_start_day ? dayjs(record.job_start_day) : "",
					identity_expiration_date: record.identity_expiration_date ? dayjs(record.identity_expiration_date) : "",
					business_license_expiry: record.business_license_expiry ? dayjs(record.business_license_expiry) : "",
					business_license_issued: record.business_license_issued ? dayjs(record.business_license_issued) : "",
					economic_activity: record.economic_activity || 1,
					annual_salary: Number((record.monthly_salary * 12), 0)
				};

				setCustomer(formattedCustomer);
				setIsEmployee(formattedCustomer.economic_activity !== 2);

				// ✅ Solo después de tener identificación válida
				if (record.identification) {
					const gResponse = await fetch(`${urlGuarantee}/${record.identification}`, requestOptions);
					const guarantees = await gResponse.json();
					setGuarantees(guarantees);
				}

			} catch (error) {
				console.error('Error fetching customer or guarantees:', error);
			}
		};

		fetchCustomer();
	}, [customerId]);


	function validateForm(data) {

		const yes = [
			isEmployee ? 'business_address' : '',
			isEmployee ? 'business_name' : '',
			isEmployee ? 'business_telephone' : '',
			isEmployee ? 'business_type' : '',
			isEmployee ? 'business_type_id' : '',
			isEmployee ? 'business_inventory' : '',
			isEmployee ? 'business_monthly_income' : '',
			isEmployee ? 'business_annual_income' : '',
			isEmployee ? 'business_annual_income' : '',
			isEmployee ? 'credit_sales' : '',
			isEmployee ? 'business_receivables' : '',
			isEmployee ? 'other_income' : '',
			!isEmployee ? 'company' : '',
			!isEmployee ? 'job_start_day' : '',
			!isEmployee ? 'job_telephone' : '',
			!isEmployee ? 'monthly_salary' : '',
			!isEmployee ? 'position' : '',
			!isEmployee ? 'annual_salary' : '',
			'branch_id',
			'business_license_entity',
			'business_license_issued',
			'business_license_expiry',
			'business_receivables',
			'business_monthly_income',
			'business_annual_income',
			'business_inventory',
			'business_type_weight',
			'business_type_risk',
			'business_risk_value',
			'municipality_name',
			'total_loans',
			'job_salary',
			'credit_sales',
			'conami_id_actividad_economica',
			'customer_code',
			'income_usd',
			'cash_amount',
			'cash_sales',
			'email',
			'other_incomes',
			'telephone',
			'spouse_name',
			'spouse_telephone',
			'spouse_position',
			'spouse_address',
			'spouse_job_company',
			'spouse_job_telephone',
			'spouse_job_salary',
			'reference_identity',
			'reference_address',
			'reference_workplace',
			'reference2_identity',
			'reference2_address',
			'reference2_workplace',
			'funds_source',
			'home_status',
			'created_by',
			'updated_by',
			'updated_at',
			'business_type_name'
		];

		setNotRequiredFields(yes.filter(field => field !== ''));

		let errors = {};
		let valid = true;

		Object.entries(data).forEach(([key, value]) => {
			if (!notRequiredFields.includes(key) && !value) {
				errors[key] = `Este campo es requerido `;
				valid = false;
			}

			// Validación adicional para el campo identity_type
			if (key === 'identity_type' && value === 1) {
				const identityKey = 'identification';
				if (data[identityKey] && data[identityKey].length !== 14) {
					errors[identityKey] = 'Cédula de identidad debe tener 14 dígitos';
					valid = false;
				}
			}

		});

		setErrors(errors);
		return valid
	}

	const addCustomer = async () => {
		setState({ ...state, open: true });

		const requestOptions = {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json; charset=UTF-8',
				'Authorization': token
			},
			body: JSON.stringify({ customer, guarantees })
		};

		try {
			const response = await fetch(`${url}/customerId`, requestOptions)
			const responseData = await response.json();

			if (!response.ok) {
				if (responseData.errors && responseData.errors.length > 0) {


					for (let i = 0; i < responseData.errors.length; i++) {

						if (i === 0 && responseData.errors.length === 1) {
							toast.error(responseData.errors[i].msg)
						} else if (i % 2 === 1) {
							toast.error(responseData.errors[i].msg)
							setAlert({ alertType: "error", alertMessage: `Repuesta del servidor: ` + responseData.errors })
						}

					}
				}
			} else {
				setAlert({ alertType: "success", alertMessage: "Registro guardado exitosamente" })
				setTimeout(() => {
					navigate("/clientes")
				}, 2000)

			}

		} catch (error) {
			setAlert({ alertType: "error", alertMessage: 'catch.Error al guardar el registro.' + error })

		}
		setOpenDialog(false)
	};

	function handleDialogConfirmation() {

		if (cancelDialog && customer) {
			navigate("/clientes");
		} else {
			addCustomer(customer);
		}

	}

	function handleCancel() {
		if (recordChanged) {

			if (customer) {
				setCancelDialog(true)
				setOpenDialog(true);
			} else {
				setCancelDialog(false)
				setOpenDialog(false);
				navigate("/clientes");
			}
		} else {
			navigate("/clientes");
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
		if (validateForm(customer)) {
			setOpenDialog(true);
			setCancelDialog(false);
		} else {
			toast.error("No es posible guardar, primero corrija errores!");
		}

	}

	function handleInputChange(e) {
		const { name, value } = e.target;

		setCustomer((prevCustomer) => ({
			...prevCustomer,
			[name]: value,
			//multiply the monthly income by 12 to get the annual income
			business_annual_income: name === "business_monthly_income" ? formatNumber(value * 12) : prevCustomer.business_annual_income,
			annual_salary: name === "monthly_salary" ? formatNumber(value * 12) : prevCustomer.annual_salary,
			// replace with upper case the first letter of every word of the name
			reference_name: name === "reference_name" ? value.replace(/\b\w/g, l => l.toUpperCase()) : prevCustomer.reference_name,
			customer_name: name === "customer_name" ? value.replace(/\b\w/g, l => l.toUpperCase()) : prevCustomer.customer_name,
			public_name: name === "public_name" ? value.replace(/\b\w/g, l => l.toUpperCase()) : prevCustomer.public_name,
			reference2_name: name === "reference2_name" ? value.replace(/\b\w/g, l => l.toUpperCase()) : prevCustomer.reference2_name,
			identity_expiration_date: name === "identity_issue_date" ? dayjs(value).add(10, 'year') : prevCustomer.identity_expiration_date,
			birth_date: name === "identification" ? dayjs() : prevCustomer.birth_date,
		}));

		if (name === "economic_activity") {
			setIsEmployee(value === 2);
		}

		// Set birth_date based on the first six digits of the identification value
		if (name === "identification" && value.length >= 6) {
			let year = parseInt(value.substring(7, 9)); // Assuming the year is in the format YY
			if (year <= 30) {
				year += 2000;
			} else {
				year += 1900;
			}
			const month = parseInt(value.substring(5, 7), 10) - 1;  // Month is zero-based in JavaScript Date
			const day = parseInt(value.substring(3, 5), 10);



			setCustomer((prevCustomer) => ({
				...prevCustomer,
				birth_date: (dayjs(new Date(year, month, day))),
				age: calculateAge((dayjs(new Date(year, month, day))))
			}));



		}

		if (name === "birth_date") {

			setCustomer((prevCustomer) => ({
				...prevCustomer,
				age: calculateAge(dayjs(value))
			}));

		}

		const newErrors = validateForm({ ...customer, [name]: value });
		setErrors({
			...newErrors,
		});

		setErrors((prevErrors) => ({
			...prevErrors,
			[name]: value ? '' : 'Este campo es requerido',
		}));

		setRecordChanged(true);

	}

	return (
		<div>
			<Alert variant="filled" icon={false} severity="info" className="mt-5">
				<h3>
					Editar cliente
				</h3>
			</Alert>

			<DisableFields disabled={!customerEdit}>
				<form onSubmit={handleSubmit} className="w-100">
					<div className="shadow-lg p-3 mb-5 bg-body rounded w-100" >

						<Box
							sx={{
								'& .MuiTextField-root': { m: 1 },
								overflow: 'scroll',
								overscrollBehavior: 'contain',
							}}
							noValidate
							autoComplete="off"
							maxHeight={700}
							maxWidth={1800}

						>

							<div id="datos-personales">
								<DividerChip label="Datos personales" />

								<TextField id="name"
									error={Boolean(errors.customer_name)}
									label="Nombre y apellidos *"
									name="customer_name"
									fullWidth
									focused
									size="small"
									sx={{ width: 400 }}
									value={customer.customer_name}
									onChange={handleInputChange}
									helperText={errors.customer_name && errors.customer_name}
								/>
								<TextField id="public_name"
									focused
									error={Boolean(errors.public_name)}
									label="Nombre conocido públicamente *"
									name="public_name"
									fullWidth
									size="small"
									sx={{ width: 400 }}
									value={customer.public_name}
									onChange={handleInputChange}
									helperText={errors.public_name && errors.public_name}
								/>

								<FormControl focused id="gender" sx={{ m: 1, minWidth: 120 }} size="small" error={Boolean(errors.gender)} >
									<InputLabel id="gender">Género</InputLabel>
									<Select
										error={Boolean(errors.gender)}
										id="gender"
										labelId="gender"
										value={customer.gender}
										label="Género"
										selected={1}
										name="gender"
										onChange={handleInputChange}

									>
										<MenuItem value={1}>Masculino</MenuItem>
										<MenuItem value={2}>Femenino</MenuItem>

									</Select>
									{errors.gender && <FormHelperText>{errors.gender}</FormHelperText>}
								</FormControl>

								<div id="datos-identificacion">
									<Divider>Datos de identificación</Divider>

									<FormControl sx={{ m: 1, minWidth: 120 }} size="small" error={Boolean(errors.identity_type)}>
										<InputLabel id="nationality">Tipo de identificación</InputLabel>
										<Select
											label="Tipo de indentificación"
											value={customer.identity_type}
											sx={{ width: 200 }}
											onChange={handleInputChange}
											name="identity_type"
											size="small"
										>
											<MenuItem value={1}>Cédula de identidad</MenuItem>
											<MenuItem value={2}>Cédula de residencia</MenuItem>
											<MenuItem value={3}>Pasaporte</MenuItem>
										</Select>
										{errors.identity_type && <FormHelperText>{errors.identity_type}</FormHelperText>}
									</FormControl>

									<TextField id="identification"
										focused
										label="Número de indentificación"
										name="identification"
										size="small"
										sx={{ width: 200 }}
										value={customer.identification}
										onChange={handleInputChange}
										error={Boolean(errors.identification)}
										helperText={errors.identification && errors.identification}
									/>

									<LocalizationProvider dateAdapter={AdapterDayjs} >
										<DatePicker
											label="Fecha de emisión"
											size="small"
											fieldName="identity_issue_date"
											name="identity_issue_date"
											inputFormat="DD/MM/YYYY" // en lugar de format
											value={customer.identity_issue_date}
											onChange={(newValue) => {
												handleInputChange({
													target:
													{
														name: "identity_issue_date",
														value: newValue
													}
												})
											}}
											renderInput={(params) => (
												<TextField {...params} size="small" sx={{ width: 150 }} />
											)}
											sx={{ width: 150 }}

										/>
									</LocalizationProvider>

									<LocalizationProvider dateAdapter={AdapterDayjs} name="identity_expiration_date" >
										<DatePicker
											label="Fecha de vencimiento"
											size="small"
											fieldName="identity_expiration_date"
											name="identity_expiration_date"
											inputFormat="DD/MM/YYYY"
											value={customer.identity_expiration_date}
											onChange={(newValue) => {
												setBirthDate(newValue);
												handleInputChange({
													target:
													{
														name: "identity_expiration_date",
														value: newValue
													}
												})
											}}
											renderInput={(params) => (
												<TextField {...params} size="small" sx={{ width: 150 }} />
											)}
											sx={{ width: 150 }}

										/>
									</LocalizationProvider>

									<CountrySelect
										error={Boolean(errors.identity_issue_country)}
										focused
										editing={false}
										selected={customer.identity_issue_country}
										label="Pais de emisión	"
										onChange={handleInputChange}
										name="identity_issue_country"
										helperText={errors.identity_issue_country}>
									</CountrySelect>

								</div>


								<TextField id="home_address"
									focused
									label="Dirección del hogar"
									name="home_address"
									size="small"
									sx={{ width: '97%' }}
									multiline={true}
									maxRows={3}
									value={customer.home_address}
									onChange={handleInputChange}
									error={Boolean(errors.home_address)}
									helperText={errors.home_address && errors.home_address}
								/>

								<CountrySelect id="residence_country_id"
									focused
									editing={true}
									selected={customer.residence_country_id}
									label="Pais de residencia"
									onChange={handleInputChange}
									name="residence_country_id"
									error={errors.residence_country_id}>

								</CountrySelect>

								<ProvinceSelect id="province_id"
									focused
									editing={true}
									provinceId={customer.province_id}
									municipalityId={customer.municipality_id}
									value={customer.province_id}
									label="Departamento"
									onChange={handleInputChange}
									provinceName="province_id"
									municipalityName="municipality_id"
									errorField={errors.province_id}>
								</ProvinceSelect>


								<FormControl focused id="marital_status" sx={{ m: 1, minWidth: 120 }} size="small" error={Boolean(errors.marital_status)}>
									<InputLabel id="marital_status">Estado civil</InputLabel>
									<Select
										labelId="marital_status"
										id="marital_status"
										value={customer.marital_status}
										label="Estado civil"
										name="marital_status"
										onChange={handleInputChange}

									>
										<MenuItem value={1}>Soltero(a)</MenuItem>
										<MenuItem value={2}>Casado(a)</MenuItem>

									</Select>
									{errors.marital_status && <FormHelperText>{errors.marital_status}</FormHelperText>}
								</FormControl>


								<CountrySelect id="birth_country_id"
									focused
									editing={false}
									selected={customer.birth_country_id}
									label="Pais de nacimiento"
									onChange={handleInputChange}
									name="birth_country_id"
									error={errors.birth_country_id}>
									{errors.birth_country_id && <FormHelperText>{errors.birth_country_id}</FormHelperText>}
								</CountrySelect>

								<LocalizationProvider id="birth_date" dateAdapter={AdapterDayjs} >
									<DatePicker
										label="Fecha de nacimiento"
										name="birth_date"
										value={customer.birth_date}
										inputFormat="DD/MM/YYYY"
										onChange={(newValue) => {
											setBirthDate(newValue);
											handleInputChange({
												target:
												{
													name: "birth_date",
													value: newValue
												}
											})
										}}
										renderInput={(params) => (
											<TextField {...params} size="small" sx={{ width: 150 }} />
										)}
										sx={{ width: 150 }}

									/>
								</LocalizationProvider>

								<TextField id="age"
									focused
									label="Edad en años"
									name="age"
									size="small"
									value={customer.age}
									sx={{ width: 130 }}
									onChange={handleInputChange}
								/>


								<TextField id="email"
									focused
									label="Correo electrónico"
									name="email"
									size="small"
									value={customer.email}
									onChange={handleInputChange}
								/>

								<TextField id="telepone"
									focused
									label="Telefono fijo"
									name="telephone"
									size="small"
									value={customer.telephone}
									onChange={handleInputChange}
									sx={{ width: 130 }}
								/>

								<TextField id="cellphone"
									focused
									label="Celular"
									name="cellphone"
									size="small"
									value={customer.cellphone}
									onChange={handleInputChange}
									sx={{ width: 130 }}
									error={Boolean(errors.cellphone)}
									helperText={errors.cellphone && errors.cellphone}
								/>



							</div>


							<div id="datos-laborales">


								<FormControl sx={{ m: 1, minWidth: 120 }} size="small">
									<InputLabel id="economic_activity">Actividad económica</InputLabel>
									<Select id="economic_activity"
										label="Actividad económica"
										value={customer.economic_activity}
										sx={{ width: 200 }}
										onChange={handleInputChange}
										name="economic_activity"
										size="small"

									>
										<MenuItem value={1}>Negocio propio</MenuItem>
										<MenuItem value={2}>Empleado</MenuItem>
									</Select>
								</FormControl>

								{isEmployee && (

									<>
										<DividerChip label="Datos laborales" />

										<TextField id="occupation"
											focused
											label="Profesión/Oficio"
											name="occupation"
											size="small"
											value={customer.occupation}
											onChange={handleInputChange}
											sx={{ m: 1, minWidth: 120 }}
											error={Boolean(errors.position && isEmployee)}
											helperText={errors.position && isEmployee}
										/>
										<TextField id="company"
											focused
											label="Empresa"
											name="company"
											size="small"
											value={customer.company}
											sx={{ width: 500 }}
											onChange={handleInputChange}
											error={Boolean(errors.company && isEmployee)}
											helperText={errors.company && isEmployee}
										/>

										<LocalizationProvider dateAdapter={AdapterDayjs} name="job_start_day" >
											<DatePicker
												label="Fecha de ingreso"
												size="small"
												name="job_start_day"
												inputFormat="DD/MM/YYYY"
												onChange={(newValue) => {
													setBirthDate(newValue);
													handleInputChange({
														target:
														{
															name: "job_start_day",
															value: newValue
														}
													})
												}}
												renderInput={(params) => (
													<TextField {...params} size="small" sx={{ width: 150 }} />
												)}
												sx={{ width: 200 }}

											/>
										</LocalizationProvider>

										<TextField
											focused
											id="salary"
											label="Salario mensual"
											name="monthly_salary"
											size="small"
											value={customer.monthly_salary}
											sx={{ width: 200 }}
											onChange={handleInputChange}
											error={Boolean(errors.monthly_salary && isEmployee)}
											helperText={errors.monthly_salary && isEmployee}
										/>

										<TextField
											focused
											id="salary"
											label="Telefono del trabajo"
											name="job_telephone"
											size="small"
											value={customer.job_telephone}
											sx={{ width: 200 }}
											onChange={handleInputChange}
											error={Boolean(errors.job_telephone && isEmployee)}
											helperText={errors.job_telephone && isEmployee}
										/>


									</>
								)}

								{!isEmployee &&
									<>
										<div id="datos-negocio">
											<DividerChip label="Datos del negocio" />

											<TextField id="business_name"
												focused
												label="Nombre del negocio"
												name="business_name"
												fullWidth
												size="small"
												sx={{ width: 600 }}
												value={customer.business_name}
												onChange={handleInputChange}
												error={Boolean(errors.business_name && !isEmployee)}
												helperText={errors.business_name && !isEmployee}
											/>

											<BusinessTypeSelect id="business_type_id"
												editing={true}
												label="Tipo de negocio"
												selected={customer.business_type_id}
												onChange={handleInputChange}
												name="business_type_id"
												error={errors.business_type_id}
											/>

											<TextField id="business_address"
												focused
												label="Dirección del negocio"
												name="business_address"
												size="small"
												sx={{ width: 600 }}
												value={customer.business_address}
												onChange={handleInputChange}
												error={Boolean(errors.business_address && !isEmployee)}
												helperText={errors.business_address && !isEmployee}
											/>
											<TextField id="business_telephone"
												focused
												label="Teléfono del negocio"
												name="business_telephone"
												size="small"
												value={customer.business_telephone}
												onChange={handleInputChange}
												error={Boolean(errors.business_telephone && !isEmployee)}
												helperText={errors.business_telephone && !isEmployee}
											/>
											<TextField id="business_inventory"
												focused
												label="Inventario"
												name="business_inventory"
												size="small"
												value={customer.business_inventory}
												onChange={handleInputChange}
												error={Boolean(errors.business_inventory && !isEmployee)}
												helperText={errors.business_inventory && !isEmployee}
											/>
											<TextField id="business_receivables"
												focused
												label="Cuentas por cobrar"
												name="business_receivables"
												size="small"
												value={customer.business_receivables}
												onChange={handleInputChange}
												error={Boolean(errors.business_receivables && !isEmployee)}
												helperText={errors.business_receivables && !isEmployee}
											/>
											<TextField id="business_monthly_income"
												focused
												label="Ingresos mensuales"
												name="business_monthly_income"
												size="small"
												value={customer.business_monthly_income}
												onChange={handleInputChange}
												error={Boolean(errors.business_monthly_income && !isEmployee)}
												helperText={errors.business_monthly_income && !isEmployee}
											/>
											<TextField id="business_annually_income"
												focused
												label="Ingresos anuales"
												size="small"
												value={customer.business_annual_income}
												onChange={handleInputChange}
												error={Boolean(errors.business_annual_income && !isEmployee)}
												helperText={errors.business_annual_income && !isEmployee}
											/>
											<div id="permisos-licencias">
												<Divider>Permisos y licencias </Divider>
												<TextField
													focused
													id="outlined-disabled"
													label="Nombre de la entidad emisora"
													name="business_monthly_income"
													size="small"
													value={customer.business_license_entity}
													onChange={handleInputChange}
													sx={{ width: 700 }}

												/>

												<LocalizationProvider dateAdapter={AdapterDayjs}  >
													<DatePicker
														label="Fecha de emisión"
														size="small"
														name="business_license_issued"
														onChange={handleInputChange}
														renderInput={(params) => (
															<TextField {...params} size="small" sx={{ width: 150 }} />
														)}
														sx={{ width: 200 }}

													/>
												</LocalizationProvider>
												<LocalizationProvider dateAdapter={AdapterDayjs}  >
													<DatePicker
														label="Fecha de vencimiento"
														size="small"
														name="business_license_expiry"
														onChange={(newValue) =>
															handleInputChange({
																target: { name: "business_license_expiry", value: newValue },
															})
														}
														renderInput={(params) => (
															<TextField {...params} size="small" sx={{ width: 150 }} />
														)}
														sx={{ width: 200 }}

													/>
												</LocalizationProvider>
											</div>

										</div>
									</>
								}


							</div>

							<div id="datos-conyuge">
								<DividerChip label="Datos del cónyuge" />
								<TextField id="spouse_name"
									label="Nombre"
									name="spouse_name"
									size="small"
									sx={{ width: 500 }}
									value={customer.spouse_name}
									onChange={handleInputChange}
								/>
								<TextField
									id="outlined-disabled"
									label="Teléfono"
									name="spouse_telephone"
									size="small"
									value={customer.spouse_telephone}
									onChange={handleInputChange}
								/>
								<TextField id="spouse_position"
									label="Ocupación"
									name="spouse_position"
									size="small"
									value={customer.spouse_position}
									onChange={handleInputChange}
								/>
								<TextField id="spouse_address"
									label="Domicilio"
									name="spouse_address"
									size="small"
									fullWidth
									sx={{ width: 500 }}
									multiline={true}
									maxRows={3}
									value={customer.spouse_address}
									onChange={handleInputChange}
								/>
								<TextField id="spouse_job_company"
									label="Empresa donde labora"
									name="spouse_job_company"
									size="small"
									sx={{ width: 500 }}
									value={customer.spouse_job_company}
									onChange={handleInputChange}
								/>
								<TextField id="spouse_job_telephone"
									label="Telefono trabajo"
									name="spouse_job_telephone"
									size="small"
									sx={{ width: 200 }}
									value={customer.spouse_job_telephone}
									onChange={handleInputChange}
								/>
								<TextField id="spouse_job_salary"
									label="Salario mensual"
									name="spouse_job_salary"
									size="small"
									sx={{ width: 200 }}
									value={customer.spouse_job_salary}
									onChange={handleInputChange}
								/>
							</div>


							<div id="referencias-personales">
								<DividerChip label="Referencias" />

								<div id="referencia1">
									<Divider>Referencia 1</Divider>
									<TextField
										focused
										id="reference_name"
										label="Nombre completo"
										name="reference_name"
										fullWidth
										size="small"
										sx={{ width: 600 }}
										value={customer.reference_name}
										onChange={handleInputChange}
										error={Boolean(errors.reference_name)}
										helperText={errors.reference_name}
									/>
									<TextField
										focused
										id="outlined-disabled"
										label="N° Identificación"
										name="reference_identity"
										fullWidth
										size="small"
										sx={{ width: 600 }}
										value={customer.reference_identity}
										onChange={handleInputChange}
										error={Boolean(errors.reference_identity)}
										helperText={errors.reference_identity}
									/>
									<TextField
										focused
										id="outlined-disabled"
										label="Dirección"
										name="reference_address"
										size="small"
										sx={{ width: 600 }}
										value={customer.reference_address}
										onChange={handleInputChange}
										error={Boolean(errors.reference_address)}
										helperText={errors.reference_address}
									/>
									<TextField
										focused
										id="outlined-disabled"
										label="Centro laboral"
										name="reference_workplace"
										size="small"
										sx={{ width: 600 }}
										value={customer.reference_workplace}
										onChange={handleInputChange}
										error={Boolean(errors.reference_workplace)}
										helperText={errors.reference_workplace}
									/>
									<TextField
										focused
										id="outlined-disabled"
										label="Teléfono"
										name="reference_telephone"
										size="small"
										value={customer.reference_telephone}
										onChange={handleInputChange}
										error={Boolean(errors.reference_telephone)}
										helperText={errors.reference_telephone}
									/>
									<TextField
										focused
										id="reference_known_time"
										label="Tiempo de conocerlo(a)"
										name="reference_known_time"
										size="small"
										value={customer.reference_known_time}
										onChange={handleInputChange}
										error={Boolean(errors.reference_known_time)}
										helperText={errors.reference_known_time}
									/>
									<TextField
										focused
										id="outlined-disabled"
										label="Tipo de relación"
										name="reference_relationship"
										size="small"
										value={customer.reference_relationship}
										onChange={handleInputChange}
										error={Boolean(errors.reference_relationship)}
										helperText={errors.reference_relationship}
									/>
								</div>

								<div id="referencia2">
									<Divider>Referencia 2</Divider>
									<TextField
										focused
										id="reference2_name"
										label="Nombre completo"
										name="reference2_name"
										fullWidth
										size="small"
										sx={{ width: 600 }}
										value={customer.reference2_name}
										onChange={handleInputChange}
										error={Boolean(errors.reference2_name)}
										helperText={errors.reference2_name}
									/>
									<TextField
										focused
										id="outlined-disabled"
										label="N° Identificación"
										name="reference2_identity"
										fullWidth
										size="small"
										sx={{ width: 600 }}
										value={customer.reference2_identity}
										onChange={handleInputChange}
										error={Boolean(errors.reference2_identity)}
										helperText={errors.reference2_identity}
									/>
									<TextField
										focused
										id="outlined-disabled"
										label="Dirección"
										name="reference2_address"
										size="small"
										sx={{ width: 600 }}
										value={customer.reference2_address}
										onChange={handleInputChange}
										error={Boolean(errors.reference2_address)}
										helperText={errors.reference2_address}
									/>
									<TextField
										focused
										id="outlined-disabled"
										label="Centro laboral"
										name="reference2_workplace"
										size="small"
										sx={{ width: 600 }}
										value={customer.reference2_workplace}
										onChange={handleInputChange}
										error={Boolean(errors.reference2_workplace)}
										helperText={errors.reference2_workplace}
									/>
									<TextField
										focused
										id="outlined-disabled"
										label="Teléfono"
										name="reference2_telephone"
										size="small"
										value={customer.reference2_telephone}
										onChange={handleInputChange}
										error={Boolean(errors.reference2_telephone)}
										helperText={errors.reference2_telephone}
									/>
									<TextField
										focused
										id="outlined-disabled"
										label="Tiempo de conocerlo(a)"
										name="reference2_known_time"
										size="small"
										value={customer.reference2_known_time}
										onChange={handleInputChange}
										error={Boolean(errors.reference2_known_time)}
										helperText={errors.reference2_known_time}
									/>
									<TextField
										focused
										id="outlined-disabled"
										label="Tipo de relación"
										name="reference2_relationship"
										size="small"
										value={customer.reference2_relationship}
										onChange={handleInputChange}
										error={Boolean(errors.reference2_relationship)}
										helperText={errors.reference2_relationship}
									/>
								</div>

							</div>


							<DividerChip label="Garantías" />
							<GuaranteesTable
								guarantees={guarantees}
								setGuarantees={setGuarantees}
							>

							</GuaranteesTable>
						</Box>
					</div>

					<Button disabled={!recordChanged} className="btn px-5 me-5" type="submit" variant="contained" startIcon={<SaveIcon />}>
						Guardar
					</Button>

					<Button className="btn px-5 me-5" onClick={handleCancel} variant="contained" color="error" startIcon={<CancelIcon />}>
						Cancelar
					</Button>

				</form >


			</DisableFields>
			<ToastContainer />

			<div id="alerts">
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

				<ConfirmDialog
					open={openDialog}
					onClose={() => setOpenDialog(false)}
					confirm={handleDialogConfirmation}
					cancel={() => setOpenDialog(false)}
					cancelOperation={cancelDialog}>

				</ConfirmDialog >
			</div>
		</div >

	)
}
export default CustomerEdit;
