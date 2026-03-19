import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RiskSelect from "./RiskSelect";
import ProvinceSelect from "./ProvinceSelect";
import { ToastContainer, toast } from "react-toastify";
import Button from "@mui/material/Button";
import Save from "@mui/icons-material/Save";
import Cancel from "@mui/icons-material/Cancel";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import "react-toastify/dist/ReactToastify.css";
import ConfirmDialog from "./ConfirmDialog";

const url = process.env.REACT_APP_API_BASE_URL + "/api/branches/";
const token = process.env.REACT_APP_API_TOKEN;

const initialBranch = {
  name: "",
  address: "",
  telephone: "",
  manager: "",
  risk_id: "",
  province_id: "",
};

function validateBranch(data) {
  const errs = {};
  if (!data.name) errs.name = "El nombre es requerido";
  if (!data.address) errs.address = "La dirección es requerida";
  if (!data.manager) errs.manager = "Nombre de gerente es requerido";
  if (!data.risk_id || Number(data.risk_id) === 0) errs.risk_id = "Seleccione un tipo de riesgo";
  if (!data.province_id || Number(data.province_id) === 0) errs.province_id = "Seleccione una provincia";
  return errs;
}

const BranchAdd = () => {
  const navigate = useNavigate();

  const [branch, setBranch] = useState(initialBranch);
  const [errors, setErrors] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);

  const [snack, setSnack] = useState({ open: false, alertType: "success", alertMessage: "" });

  const hasChanges = useMemo(
    () => JSON.stringify(branch) !== JSON.stringify(initialBranch),
    [branch]
  );

  const showSnack = (type, msg) => setSnack({ open: true, alertType: type, alertMessage: msg });

  const addBranch = async () => {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          Authorization: token,
        },
        body: JSON.stringify({
          ...branch,
          risk_id: Number(branch.risk_id),
          province_id: Number(branch.province_id),
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        showSnack("error", data?.errors ? `Mensaje del servidor: ${data.errors}` : "Error al guardar");
        setOpenDialog(false);
        return;
      }

      showSnack("success", "Registro guardado exitosamente.");
      setOpenDialog(false);

      setTimeout(() => navigate("/sucursales"), 1200);
    } catch (e) {
      console.error(e);
      showSnack("error", "Error de conexión: " + e.message);
      setOpenDialog(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const errs = validateBranch(branch);
    setErrors(errs);

    if (Object.keys(errs).length === 0) {
      setCancelDialog(false);
      setOpenDialog(true);
    } else {
      toast.error("No es posible guardar, primero corrija errores!");
    }
  };

  const handleDialogConfirmation = () => {
    if (cancelDialog) {
      navigate("/sucursales");
      return;
    }
    addBranch();
  };

  const handleCancel = () => {
    if (hasChanges) {
      setCancelDialog(true);
      setOpenDialog(true);
    } else {
      navigate("/sucursales");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    const next = {
      ...branch,
      [name]:
        name === "risk_id" || name === "province_id"
          ? Number(value)
          : value,
    };

    setBranch(next);
    setErrors(validateBranch(next));
  };

  const handleCloseSnack = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((s) => ({ ...s, open: false }));
  };

  return (
    <div>
      <Alert variant="filled" icon={false} severity="info" className="mt-5">
        <h2>Agregar nueva sucursal</h2>
      </Alert>

      <form onSubmit={handleSubmit}>
        <div className="shadow-lg p-3 mb-5 bg-body rounded">
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Nombre</label>
            <input
              type="text"
              className="form-control"
              id="name"
              name="name"
              onChange={handleInputChange}
              value={branch.name}
            />
            {errors.name && <span className="form-text text-danger">{errors.name}</span>}
          </div>

          <div className="mb-3">
            <label htmlFor="address" className="form-label">Direccion</label>
            <textarea
              className="form-control"
              id="address"
              name="address"
              rows="3"
              onChange={handleInputChange}
              value={branch.address}
            />
            {errors.address && <span className="form-text text-danger">{errors.address}</span>}
          </div>

          <div className="mb-3">
            <label htmlFor="telephone" className="form-label">Telefono</label>
            <input
              type="text"
              className="form-control"
              id="telephone"
              name="telephone"
              onChange={handleInputChange}
              value={branch.telephone}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="manager" className="form-label">Gerente de sucursal</label>
            <input
              type="text"
              className="form-control"
              id="manager"
              name="manager"
              onChange={handleInputChange}
              value={branch.manager}
            />
            {errors.manager && <span className="form-text text-danger">{errors.manager}</span>}
          </div>

          <RiskSelect
            onChange={handleInputChange}
            error={errors.risk_id}
            value={branch.risk_id}
            name="risk_id"
          />

            <ProvinceSelect
              onChange={handleInputChange}
              error={errors.province_id}
              helperText={errors.province_id}
              name="province_id"
              label="Departamento"
              value={branch.province_id}
            />

        </div>

        <div>
          <Button type="submit" variant="contained" startIcon={<Save />} className="px-5 me-5">
            Guardar
          </Button>

          <Button onClick={handleCancel} variant="contained" color="error" startIcon={<Cancel />} className="px-5 me-5">
            Cancelar
          </Button>
        </div>
      </form>

      <ToastContainer />

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={handleCloseSnack}>
        <Alert onClose={handleCloseSnack} severity={snack.alertType} variant="filled" sx={{ width: "100%" }}>
          {snack.alertMessage}
        </Alert>
      </Snackbar>

      <ConfirmDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        confirm={handleDialogConfirmation}
        cancel={() => setOpenDialog(false)}
        cancelOperation={cancelDialog}
      />
    </div>
  );
};

export default BranchAdd;
