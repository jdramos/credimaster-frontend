import React, { useEffect, useState, useMemo } from "react";
import AddCircle from './AddCircle';
import DataTable from "./DataTable";
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';


const url = process.env.REACT_APP_API_BASE_URL + '/api/vendors';
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };


const PromoterList = () => {

    const [error, setError] = useState(null); // State for error handling
    const [data, setData] = useState([]); // State to store fetched data
    const [state, setState] = useState(false); // State to store fetched data
    const [alert, setAlert] = useState({ alertType: "", alertMessage: "" })

    const columns = useMemo(
        () => [
            {
                accessorKey: 'id', //access nested data with dot notation
                header: 'ID',
                size: 20,
            },
            {
                accessorKey: 'name',
                header: 'Nombre',
                size: 150,
            },
            {
                accessorKey: 'telephone', //normal accessorKey
                header: 'Teléfono',
                size: 80,
            },
            {
                accessorKey: 'branch_name', //normal accessorKey
                header: 'Sucursal',
                size: 80,
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
                    setState({ ...state, open: true });
                    if (jsonData.errors && jsonData.errors.length > 0) {


                        setAlert({ alertType: "error", alertMessage: 'Catch: Error al obtener los registros.' + response.statusText })
                    }
                }

                setData(jsonData); // Update the state with fetched data

            } catch (error) {
                console.error(error);
                setState({ ...state, open: true });
                setAlert({ alertType: "error", alertMessage: 'Catch: Error al obtener los registros.' + error })
                return;
            }

        };


        fetchApi(); // Call the fetchApi function when the component mounts
    }, []);

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        setState({ ...state, open: false })
    };

    return (
        <div>

            <div style={{ height: 40, width: '100%' }}>
                <Alert variant="filled" icon={false} severity="info" className="mt-5">
                    <h2>Listado de promotores
                        <AddCircle goTo="/promotores/agregar" />
                    </h2>
                </Alert>

                <DataTable data={data} columns={columns} route="promotores" />
            </div>



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

export default PromoterList;