import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import EditIcon from '@mui/icons-material/Edit';
import EmptyNotice from "./EmptyNotice";
import Alert from '@mui/material/Alert';
import AddCircle from './AddCircle';
import DataTable from "./DataTable";


const url = process.env.REACT_APP_API_BASE_URL + '/api/provinces/';
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };



const ProvincesList = (props) => {
	const [error, setError] = useState(null); // State for error handling
	const [data, setData] = useState([]); // State to store fetched data

	const columns = useMemo(
		() => [
			{
				accessorKey: 'id', //access nested data with dot notation
				header: 'ID',
				size: 20,
			},
			{
				accessorKey: 'name',
				header: 'Descripcion',
				size: 150,
			},
			{
				accessorKey: 'risk_name', //normal accessorKey
				header: 'Tipo de riesgo',
				size: 200,
			},
		],
		[],
	);



	useEffect(() => {
		const fetchApi = async () => {
			try {
				const response = await fetch(url, { headers });
				const jsonData = await response.json();
				if (!response.ok) {
					throw new Error('Failed to retrieve data.');
				}

				setData(jsonData); // Update the state with fetched data

			} catch (error) {
				console.error(error);
				setError('Ocurrio un error al cargar los datos. Intente mas tarde.');
				return;
			}
		};

		fetchApi(); // Call the fetchApi function when the component mounts
	}, []);

	return <div>
		{error !== null ?
			<div className="alert alert-danger mt-5 shadow-lg p-3 mb-5 d-flex align-items-center" role="alert">
				<svg className="bi flex-shrink-0 me-2" width="24" height="24" role="img" aria-label="Danger:"></svg>
				<div>
					{error}
				</div>
			</div>
			: data.length < 0 ?

				<EmptyNotice route="/departamentos/agregar"></EmptyNotice>

				:
				<div style={{ mt: 1, ml: 1, height: 40, width: '100%' }}>
					<Alert variant="filled" icon={false} severity="info" className="mt-5">
						<h2>Departamentos del país.
							<AddCircle goTo="/departamentos/agregar" />
						</h2>
					</Alert>

					<DataTable data={data} columns={columns} route="sucursales" />
				</div>


		}



	</div >
}

export default ProvincesList;