import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Button from '@mui/material/Button';
import Save from '@mui/icons-material/Save';
import Cancel from '@mui/icons-material/Cancel';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import BranchSelect from "./BranchSelect";
import ConfirmDialog from "./ConfirmDialog";

const url = process.env.REACT_APP_API_BASE_URL + '/api/vendors';
const token = process.env.REACT_APP_API_TOKEN;

const PromoterAdd = (props) => {


    const navigate = useNavigate();

    const [errors, setErrors] = useState({}); // State for error handling
    const [promoter, setPromoter] = useState({
        name: "",
        telephone: 0,
        branch_id: 0,

    });
    const [state, setState] = useState({
        open: false,
        vertical: 'top',
        horizontal: 'center',
    });
    const [alert, setAlert] = useState({ alertType: "", alertMessage: "" })

    const [openDialog, setOpenDialog] = useState(false);
    const [cancelDialog, setCancelDialog] = useState(false);

    function validateForm(data) {
        let errors = {};
        let valid = true;

        if (!data.name) {
            errors.name = 'El nombre es requerido';
            valid = false;
        }
        if (!data.branch_id || data.branch_id < 1) {
            errors.rate = 'Asigne una sucursal válida';
            valid = false;
        }

        setErrors(errors);
        return valid;
    }

    const addPromoter = async () => {
        setState({ ...state, open: true });
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Authorization': token
            },
            body: JSON.stringify(promoter)
        };

        try {
            const response = await fetch(url, requestOptions)
            const responseData = await response.json();

            if (!response.ok) {
                if (responseData.errors && responseData.errors.length > 0) {
                    responseData.errors.forEach((error) => {
                        toast.error(error.msg);
                    })

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

    function handleDialogConfirmation() {

        if (cancelDialog && promoter) {
            navigate("/promotores");
        } else {
            addPromoter(promoter);
        }

    }

    function handleCancel() {
        if (promoter) {
            setCancelDialog(true)
            setOpenDialog(true);
        } else {
            setCancelDialog(false)
            setOpenDialog(false);
            navigate("/promotores");
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
        if (validateForm(promoter)) {
            setOpenDialog(true);
            setCancelDialog(false);

        } else {
            toast.error("No es posible guardar, primero corrija errores!");
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
    }

    return (
        <div>
            <Alert variant="filled" icon={false} severity="info" className="mt-5">
                <h3>
                    Agregar nuevo promotor
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

                    <div className="mb-3 col-md-4">
                        <label htmlFor="name" className="form-label">Sucursal</label>
                        <BranchSelect
                            size="small"
                            onChange={handleInputChange}
                            error={errors.branch_id}
                            name="branch_id" />
                        {errors.rate && <span className="form-text text-danger">{errors.rate}</span>}
                    </div>

                </div>

                <Button className="btn px-5 me-5" type="submit" variant="contained" startIcon={<Save></Save>}>
                    Guardar
                </Button>

                <Button className="btn px-5 me-5" onClick={handleCancel} variant="contained" color="error" startIcon={<Cancel></Cancel>}>
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

            <ConfirmDialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                confirm={handleDialogConfirmation}
                cancel={() => setOpenDialog(false)}
                cancelOperation={cancelDialog}>

            </ConfirmDialog >
        </div>

    )
}
export default PromoterAdd;
