
import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import EditIcon from '@mui/icons-material/Edit';
import AddCircle from "./AddCircle";
import EmptyNotice from "./EmptyNotice";
import Alert from '@mui/material/Alert';
import DataTable from "./DataTable";


const url = process.env.REACT_APP_API_BASE_URL + '/api/branches';
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };



const BranchesList = (props) => {
	const [error, setError] = useState(null); // State for error handling
	const [data, setData] = useState([]); // State to store fetched data
	const [state, setState] = useState({
		open: false,
		vertical: 'top',
		horizontal: 'center',
	});
	const [alert, setAlert] = useState({ alertType: "", alertMessage: "" })


	useEffect(() => {
		const fetchApi = async () => {
			setState({ ...state, open: true });
			try {
				const response = await fetch(url, { headers });
				const jsonData = await response.json();

				if (!response.ok) {
					setAlert({ alertType: "error", alertMessage: `Respuesta del servidor: ` + jsonData.errors })
				}

				setData(jsonData); // Update the state with fetched data
			} catch (error) {
				setAlert({ alertType: "error", alertMessage: `Repuesta del servidor: ` + error.message })
			}
		};

		fetchApi(); // Call the fetchApi function when the component mounts
	}, []);
	const columns = useMemo(
		() => [
			{
				accessorKey: 'id', //access nested data with dot notation
				header: 'ID',
				size: 150,
			},
			{
				accessorKey: 'name',
				header: 'Descripcion',
				size: 150,
			},
			{
				accessorKey: 'address', //normal accessorKey
				header: 'Dirección',
				size: 200,
			},
			{
				accessorKey: 'manager',
				header: 'Gerente/Administrador',
				size: 150,
			},
			{
				accessorKey: 'telephone',
				header: 'Telefono',
				size: 150,
			},
		],
		[],
	);


	const handleClose = (event, reason) => {
		if (reason === 'clickaway') {
			return;
		}

		setState({ ...state, open: false })
	};


	if (error !== null) {
		return (
			<div className="alert alert-danger mt-5 shadow-lg p-3 mb-5 d-flex align-items-center" role="alert">
				<svg className="bi flex-shrink-0 me-2" width="24" height="24" role="img" aria-label="Danger:"></svg>
				<div>
					{error}
				</div>
			</div>
		)
	}


	return (
		<div>
			<div style={{ height: 40, width: '100%' }}>
				<Alert variant="filled" icon={false} severity="info" className="mt-5">
					<h2>
						Listado de sucursales
						<AddCircle goTo="/sucursales/agregar"></AddCircle>
					</h2>

				</Alert>

				<DataTable columns={columns} data={data} route="sucursales" />

			</div>

		</div>


	)

}

export default BranchesList;