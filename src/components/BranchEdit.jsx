import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import RiskSelect from "./RiskSelect";
import ProvinceSelect from "./ProvinceSelect";
import { ToastContainer, toast } from 'react-toastify';
import Button from '@mui/material/Button';
import Save from '@mui/icons-material/Save';
import Cancel from '@mui/icons-material/Cancel';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import 'react-toastify/dist/ReactToastify.css';
import ConfirmDialog from "./ConfirmDialog";

const url = process.env.REACT_APP_API_BASE_URL + '/api/branches/';
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };



const BranchEdit = (props) => {

    const navigate = useNavigate();
    const location = useLocation();
    const [edited, setEdited] = useState(false);
    const [errors, setErrors] = useState({}); // State for error handling
    const [alert, setAlert] = useState({ alertType: "", alertMessage: "" })
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [branch, setBranch] = useState({
        name: "",
        address: "",
        telephone: "",
        manager: "",
        risk_id: 0,
        province_id: 0
    });

    const [openDialog, setOpenDialog] = useState(false);
    const [cancelDialog, setCancelDialog] = useState(false);

    useEffect(() => {
        if (location.state && location.state.record) {
            setBranch(location.state.record)

            // Set record initially with risk data
        }
    }, [location.state]);

    function validateForm(data) {
        let errors = {};
        let valid = true;

        if (!data.name) {
            errors.name = 'El nombre es requerido';
            valid = false;
        }

        if (!data.address) {
            errors.address = 'La dirección es requerida';
            valid = false;
        }

        if (!data.manager) {
            errors.manager = 'Nombre de gerente es requerido';
            valid = false;
        }

        if (data.risk_id === 0) {
            errors.risk_id = 'Seleccione un tipo de riesgo';
            valid = false;
        }

        if (data.province_id === 0) {
            errors.province_id = 'Seleccione una provincia';
            valid = false;
        }

        setErrors(errors);
        return valid;
    }

    const editBranch = async () => {

        const requestOptions = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Authorization': token
            },
            body: JSON.stringify(branch)
        };

        try {
            const response = await fetch(url + branch.id, requestOptions)
            const responseData = await response.json();

            if (!response.ok) {
                if (responseData.errors && responseData.errors.length > 0) {
                    responseData.errors.forEach(error => {
                        setAlert({ alertType: "error", alertMessage: error.msg })
                    });

                } else {
                    setAlert({ alertType: "success", alertMessage: "Registro guardado exitosamente" })
                    setTimeout(() => {
                        navigate("/sucursales")
                    }, 2000)

                }
            } else {
                setAlert({ alertType: "success", alertMessage: "Registro guardado exitosamente." })
                setTimeout(() => {
                    navigate("/sucursales")
                }, 2000)

            }
        } catch (error) {
            setAlert({ alertType: "error", alertMessage: "catch" + error })
        }
        setSnackbarOpen(true);  // Mostrar el Snackbar
        setOpenDialog(false)

    };

    const handleSubmit = async e => {
        e.preventDefault();

        if (validateForm(branch)) {
            setCancelDialog(false);
            setOpenDialog(true);

        } else {
            toast.error("No es posible guardar, primero corrija errores!");
        }

    }

    function handleDialogConfirmation() {

        if (cancelDialog && edited) {
            navigate("/sucursales");
        } else {
            editBranch(branch);
        }

    }

    function handleCancel() {
        if (edited) {
            setCancelDialog(true)
            setOpenDialog(true);
        } else {
            setCancelDialog(false)
            setOpenDialog(false);
            navigate("/sucursales");
        }

    }

    function handleInputChange(e) {
        const { name, value } = e.target;
        setBranch({
            ...branch,
            [name]: value,
        });

        // Validate the input data
        const newErrors = validateForm({ ...branch, [name]: value });
        setErrors({
            ...newErrors,
        });
        setEdited(true);

    }
    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        setSnackbarOpen(false)
    };


    return (
        <div>
            <Alert variant="filled" icon={false} severity="info" className="mt-5">
                <h2>
                    Editar sucursal # {branch.id} - {branch.name}
                </h2>
            </Alert>

            <form onSubmit={handleSubmit} autocomplete="off">

                <div className="shadow-lg p-3 mb-5 bg-body rounded">

                    <div className="mb-3">
                        <label htmlFor="name" className="form-label">Nombre</label>
                        <input type="text" className="form-control" id="name" name="name" onChange={handleInputChange} value={branch.name} autocomplete="off" />
                        {errors.name && <span className="form-text text-danger">{errors.name}</span>}
                    </div>

                    <div className="mb-3">
                        <label htmlFor="address" className="form-label">Direccion</label>
                        <textarea className="form-control" id="address" name="address" rows="3" onChange={handleInputChange} value={branch.address}></textarea>
                        {errors.address && <span className="form-text text-danger">{errors.address}</span>}
                    </div>

                    <div className="mb-3">
                        <label htmlFor="telephone" className="form-label">Telefono</label>
                        <input type="text" className="form-control" id="telephone" name="telephone" onChange={handleInputChange} value={branch.telephone} />
                    </div>

                    <div className="mb-3">
                        <label htmlFor="manager" className="form-label">Gerente de sucursal</label>
                        <input type="text" className="form-control" id="manager" name="manager" onChange={handleInputChange} value={branch.manager} />
                    </div>

                    <RiskSelect
                        editing={true}
                        selected={branch.risk_id}
                        onchange={handleInputChange}
                        error={errors.rate}
                    />

                    <ProvinceSelect
                        editing={true}
                        selected={branch.province_id}
                        onChange={handleInputChange}
                        error={errors.province_id} />

                </div>

                <div>
                    <Button disabled={!edited} className="btn btn-primary px-5 me-5" type="submit" variant="contained" startIcon={<Save></Save>}>
                        Guardar
                    </Button>

                    <Button className="btn btn-primary px-5 me-5" onClick={handleCancel} variant="contained" color="error" startIcon={<Cancel></Cancel>}>
                        Cancelar
                    </Button>

                </div>

            </form>
            <ToastContainer />
            <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleClose}>
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
export default BranchEdit;