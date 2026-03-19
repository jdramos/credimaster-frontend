import React, { useEffect, useState } from "react";
import * as FaIcon from 'react-icons/fa'


function Branches() {
	const [data, setData] = useState([]); // State to store fetched data
	const [error, setError] = useState(null); // State for error handling
	const url = process.env.REACT_APP_API_BASE_URL + '/api/vendors';
	const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJuYW1lIjoiamRyYW1vcyIsInJvbCI6MX0sImlhdCI6MTY5MjQ4NjczNX0.efud7zyOTL5Im56rwjF_gBoUovXlAx3Se3tfOmW-Vv0'
	const headers = { Authorization: token };

	useEffect(() => {
		const fetchApi = async () => {
			try {
				const response = await fetch(url, { headers });
				if (!response.ok) {
					throw new Error('Failed to retrieve data.');
				}
				const jsonData = await response.json();
				setData(jsonData); // Update the state with fetched data
			} catch (error) {
				console.error(error);
				setError('Failed to retrieve data. Please try again later.');
			}
		};

		fetchApi(); // Call the fetchApi function when the component mounts
	}, []);

	return (


		<div>
			{error !== null
				?
				<div class="alert mt-5 alert-danger" role="alert">
					Ha ocurrido un error al cargar las Sucursales
				</div>
				:
				<table className="table caption-top mt-5 shadow-lg p-3 mb-5 bg-body rounded">
					<caption className="shadow-pg">Lista de gestores</caption>
					<thead className="">
						<tr>
							<th scope="col">#</th>
							<th scope="col">Nombre</th>
							<th scope="col">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{data.map((item, index) => (
							<tr key={item.id}>
								<th scope="row">{item.id}</th>
								<td>{item.name}</td>
								<td><button className="btn btn-primary">{<FaIcon.FaEdit/>}</button></td>
							</tr>
						))}
					</tbody>
				</table>
			}
		</div>
	);

}

export default Branches;
