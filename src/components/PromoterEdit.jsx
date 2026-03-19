import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Button from '@mui/material/Button';
import Save from '@mui/icons-material/Save';

import Cancel from '@mui/icons-material/Cancel';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import BranchSelect from "./BranchSelect";
import ConfirmDialog from "./ConfirmDialog";


const url = process.env.REACT_APP_API_BASE_URL + '/api/vendors/';
const token = process.env.REACT_APP_API_TOKEN;

const PromoterEdit = (props) => {

    const navigate = useNavigate();
    const location = useLocation();

    const [openDialog, setOpenDialog] = useState(false);
    const [cancelDialog, setCancelDialog] = useState(false);

    const [snackState, setSnackState] = useState({
        open: false,
        vertical: 'top',
        horizontal: 'center',
    });

    const [errors, setErrors] = useState({}); // State for error handling
    const [edited, setEdited] = useState(false) // State to verify is the record has been edited
    const [promoter, setPromoter] = useState({
        name: "",
        telephone: 0,
        branch_id: 0,

    });

    const [alert, setAlert] = useState({ alertType: "", alertMessage: "" })

    useEffect(() => {
        if (location.state && location.state.record) {
            setPromoter(location.state.record)

            // Set record initially with  data
        }
    }, [location.state]);


    function validateForm(data) {
        let errors = {};
        let valid = true;

        if (!data.name) {
            errors.name = 'El nombre es requerido';
            valid = false;
        }
        if (!data.branch_id || data.branch_id < 1) {
            errors.branch_id = 'Asigne una sucursal válida';
            valid = false;
        }

        setErrors(errors);
        return valid;
    }

    async function editPromoter() {
        setSnackState({ ...snackState, open: true });
        const requestOptions = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Authorization': token
            },
            body: JSON.stringify(promoter)
        };

        try {
            const response = await fetch(url + promoter.id, requestOptions)
            const responseData = await response.json();

            if (!response.ok) {
                if (responseData.errors && responseData.errors.length > 0) {

                    setAlert({ alertType: "error", alertMessage: `Repuesta del servidor: ` + responseData.errors })
                }
            } else {
                setAlert({ alertType: "success", alertMessage: "Registro guardado exitosamente" })
                setOpenDialog(false);
                setTimeout(() => {
                    navigate("/promotores")
                }, 2000)

            }

        } catch (error) {
            setAlert({ alertType: "error", alertMessage: 'catch.Error al guardar el registro.' + error })
            console.log(error);
        }

    };


    function handleClose(event, reason) {
        if (reason === 'clickaway') {
            return;
        }

        setSnackState({ ...snackState, open: false })
    };


    function handleSubmit(e) {
        e.preventDefault();
        if (validateForm(promoter)) {
            setOpenDialog(true);
            setCancelDialog(false);
        } else {
            toast.error("No es posible guardar, primero corrija errores!");
        }
    }

    function handleDialogConfirmation() {

        if (cancelDialog && edited) {
            navigate("/promotores");
        } else {
            editPromoter(promoter);
        }

    }

    function handleCancel() {
        if (edited) {
            setCancelDialog(true)
            setOpenDialog(true);
        } else {
            setCancelDialog(false)
            setOpenDialog(false);
            navigate("/promotores");
        }

    }

    function handleInputChange(e) {
        const { name, value } = e.target;
        setPromoter({
            ...promoter,
            [name]: value,
        });

        // Validate the input data
        const newErrors = validateForm({ ...promoter, [name]: value });
        setErrors({
            ...newErrors,
        });

        setEdited(true)
    }

    return (
        <div>
            <Alert variant="filled" icon={false} severity="info" className="mt-5">
                <h3>
                    Editar promotor {promoter.id}
                </h3>
            </Alert>
            <form onSubmit={handleSubmit} >
                <div className="shadow-lg p-3 mb-5 bg-body rounded">

                    <div className="mb-3">
                        <label htmlFor="name" className="form-label">Nombre del promotor</label>
                        <input type="text" className="form-control" id="name" name="name" onChange={handleInputChange} value={promoter.name} />
                        {errors.name && <span className="form-text text-danger">{errors.name}</span>}
                    </div>

                    <div className="mb-3">
                        <label htmlFor="telephone" className="form-label">Teléfono</label>
                        <input type="text" className="form-control" id="telephone" name="telephone" onChange={handleInputChange} value={promoter.telephone} />
                    </div>

                    <div className="mb-3">
                        <label htmlFor="name" className="form-label">Sucursal</label>
                        <BranchSelect
                            selected={promoter.branch_id}
                            editing={true}
                            onChange={handleInputChange}
                            name="branch_id"
                        />
                        {errors.branch_id && <span className="form-text text-danger">{errors.branch_id}</span>}
                    </div>

                </div>

                <Button disabled={!edited} className="btn px-5 me-5" type="submit" variant="contained" startIcon={<Save></Save>}>
                    Guardar
                </Button>

                <Button className="btn px-5 me-5" onClick={handleCancel} variant="contained" color="error" startIcon={<Cancel></Cancel>}>
                    Cancelar
                </Button>

                <ConfirmDialog />

            </form>
            <ToastContainer />
            <Snackbar open={snackState.open} autoHideDuration={3000} onClose={handleClose}>
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


        </div >

    )
}
export default PromoterEdit;
