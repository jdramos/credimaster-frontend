import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import EditIcon from "@mui/icons-material/Edit";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PlaceIcon from "@mui/icons-material/Place";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import ProvinceSelect from "./ProvinceSelect";
import MunicipalitySelect from "./MunicipalitySelect";
import ConfirmDialog from "./ConfirmDialog";

const baseUrl = process.env.REACT_APP_API_BASE_URL + "/api/branches/";
const token = process.env.REACT_APP_API_TOKEN;

const emptyBranch = {
  name: "",
  address: "",
  telephone: "",
  manager: "",
  risk_id: "",
  province_id: "",
  municipality_id: "",
};

function normalizeBranch(data = {}) {
  return {
    name: data.name ?? "",
    address: data.address ?? "",
    telephone: data.telephone ?? "",
    manager: data.manager ?? "",
    risk_id: data.risk_id ? Number(data.risk_id) : "",
    province_id: data.province_id ? Number(data.province_id) : "",
    municipality_id: data.municipality_id ? Number(data.municipality_id) : "",
  };
}

function validateBranch(data) {
  const errs = {};
  if (!data.name?.trim()) errs.name = "El nombre es requerido";
  if (!data.address?.trim()) errs.address = "La dirección es requerida";
  if (!data.manager?.trim()) errs.manager = "Nombre de gerente es requerido";
  if (!data.risk_id || Number(data.risk_id) === 0) {
    errs.risk_id = "Seleccione un tipo de riesgo";
  }
  if (!data.province_id || Number(data.province_id) === 0) {
    errs.province_id = "Seleccione un departamento";
  }
  if (!data.municipality_id || Number(data.municipality_id) === 0) {
    errs.municipality_id = "Seleccione un municipio";
  }
  return errs;
}

const bacHeaderSx = {
  background: "linear-gradient(135deg, #0d47a1 0%, #1565c0 45%, #42a5f5 100%)",
  color: "#fff",
  borderRadius: 3,
  px: 3,
  py: 2.25,
  boxShadow: "0 10px 24px rgba(13, 71, 161, 0.18)",
};

const actionButtonSx = {
  minWidth: 160,
  borderRadius: 2,
  textTransform: "none",
  fontWeight: 700,
  boxShadow: "none",
};

const cardSx = {
  borderRadius: 3,
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  border: "1px solid",
  borderColor: "divider",
};

const sectionTitleSx = {
  fontSize: 15,
  fontWeight: 700,
  color: "primary.main",
};

const BranchEdit = () => {
  const navigate = useNavigate();
  const { branchId } = useParams();

  const [branch, setBranch] = useState(emptyBranch);
  const [originalBranch, setOriginalBranch] = useState(emptyBranch);
  const [errors, setErrors] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [snack, setSnack] = useState({
    open: false,
    alertType: "success",
    alertMessage: "",
  });

  const hasChanges = useMemo(
    () => JSON.stringify(branch) !== JSON.stringify(originalBranch),
    [branch, originalBranch],
  );

  const showSnack = (type, msg) =>
    setSnack({ open: true, alertType: type, alertMessage: msg });

  useEffect(() => {
    const loadBranch = async () => {
      try {
        setLoading(true);

        const resp = await fetch(`${baseUrl}${branchId}`, {
          method: "GET",
          headers: {
            Authorization: token,
          },
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          throw new Error(data?.errors || "No se pudo cargar la sucursal.");
        }

        if (!data) {
          throw new Error("La sucursal no fue encontrada.");
        }

        const normalized = normalizeBranch(data);

        setBranch(normalized);
        setOriginalBranch(normalized);
      } catch (e) {
        console.error("Error cargando sucursal:", e);
        showSnack("error", e.message || "Error al cargar la sucursal.");
      } finally {
        setLoading(false);
      }
    };

    if (!branchId) {
      setLoading(false);
      showSnack("error", "No se recibió el id de la sucursal.");
      return;
    }

    loadBranch();
  }, [branchId]);

  const updateBranch = async () => {
    try {
      setSaving(true);

      const resp = await fetch(`${baseUrl}${branchId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          Authorization: token,
        },
        body: JSON.stringify({
          ...branch,
          name: branch.name.trim(),
          address: branch.address.trim(),
          manager: branch.manager.trim(),
          telephone: branch.telephone.trim(),
          risk_id: Number(branch.risk_id),
          province_id: Number(branch.province_id),
          municipality_id: Number(branch.municipality_id),
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        showSnack("error", data?.errors || "Error al actualizar la sucursal.");
        setOpenDialog(false);
        return;
      }

      const normalized = normalizeBranch(branch);
      setOriginalBranch(normalized);

      showSnack("success", "Sucursal actualizada exitosamente.");
      setOpenDialog(false);

      setTimeout(() => navigate("/sucursales"), 1200);
    } catch (e) {
      console.error("Error actualizando sucursal:", e);
      showSnack("error", "Error de conexión: " + e.message);
      setOpenDialog(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const errs = validateBranch(branch);
    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      toast.error("No es posible guardar, primero corrija los errores.");
      return;
    }

    if (!hasChanges) {
      toast.info("No hay cambios para guardar.");
      return;
    }

    setCancelDialog(false);
    setOpenDialog(true);
  };

  const handleDialogConfirmation = () => {
    if (cancelDialog) {
      navigate("/sucursales");
      return;
    }
    updateBranch();
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
        name === "risk_id" ||
        name === "province_id" ||
        name === "municipality_id"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    };

    if (
      name === "province_id" &&
      Number(value) !== Number(branch.province_id)
    ) {
      next.municipality_id = "";
    }

    setBranch(next);
    setErrors(validateBranch(next));
  };

  const handleCloseSnack = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((s) => ({ ...s, open: false }));
  };

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Card sx={cardSx}>
          <CardContent>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              justifyContent="center"
              sx={{ py: 5 }}
            >
              <CircularProgress size={28} />
              <Typography variant="body1">Cargando sucursal...</Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        <Box sx={bacHeaderSx}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
          >
            <Box>
              <Typography variant="h5" fontWeight={800}>
                Editar sucursal
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.5 }}>
                Actualiza la información general y la ubicación de la sucursal.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                icon={<EditIcon />}
                label={hasChanges ? "Cambios pendientes" : "Sin cambios"}
                sx={{
                  bgcolor: "rgba(255,255,255,0.16)",
                  color: "#fff",
                  fontWeight: 700,
                  "& .MuiChip-icon": { color: "#fff" },
                }}
              />
              <Chip
                label={`Sucursal #${branchId}`}
                sx={{
                  bgcolor: "rgba(255,255,255,0.16)",
                  color: "#fff",
                  fontWeight: 700,
                }}
              />
            </Stack>
          </Stack>
        </Box>

        <form id="branch-edit-form" onSubmit={handleSubmit}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography sx={sectionTitleSx}>
                    Información general
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Modifica los datos principales de la sucursal.
                  </Typography>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Nombre"
                      name="name"
                      value={branch.name}
                      onChange={handleInputChange}
                      error={Boolean(errors.name)}
                      helperText={errors.name || " "}
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <AccountBalanceIcon
                            fontSize="small"
                            sx={{ mr: 1, color: "action.active" }}
                          />
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Gerente de sucursal"
                      name="manager"
                      value={branch.manager}
                      onChange={handleInputChange}
                      error={Boolean(errors.manager)}
                      helperText={errors.manager || " "}
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <PersonIcon
                            fontSize="small"
                            sx={{ mr: 1, color: "action.active" }}
                          />
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Teléfono"
                      name="telephone"
                      value={branch.telephone}
                      onChange={handleInputChange}
                      size="small"
                      helperText=" "
                      InputProps={{
                        startAdornment: (
                          <PhoneIcon
                            fontSize="small"
                            sx={{ mr: 1, color: "action.active" }}
                          />
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Dirección"
                      name="address"
                      value={branch.address}
                      onChange={handleInputChange}
                      error={Boolean(errors.address)}
                      helperText={errors.address || " "}
                      multiline
                      minRows={3}
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <PlaceIcon
                            fontSize="small"
                            sx={{ mr: 1, mt: 0.5, color: "action.active" }}
                          />
                        ),
                      }}
                    />
                  </Grid>
                </Grid>

                <Box>
                  <Typography sx={sectionTitleSx}>Ubicación</Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Actualiza el departamento y municipio de la sucursal.
                  </Typography>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <ProvinceSelect
                      value={branch.province_id}
                      name="province_id"
                      label="Departamento"
                      onChange={handleInputChange}
                      error={errors.province_id}
                      helperText={errors.province_id || " "}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <MunicipalitySelect
                      name="municipality_id"
                      label="Municipio"
                      value={branch.municipality_id}
                      provinceId={branch.province_id}
                      onChange={handleInputChange}
                      error={errors.municipality_id}
                      helperText={errors.municipality_id || " "}
                    />
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        </form>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="flex-end"
        >
          <Button
            type="submit"
            form="branch-edit-form"
            variant="contained"
            startIcon={
              saving ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            sx={actionButtonSx}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>

          <Button
            onClick={handleCancel}
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            sx={actionButtonSx}
            disabled={saving}
          >
            Cancelar
          </Button>
        </Stack>
      </Stack>

      <ToastContainer />

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={handleCloseSnack}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnack}
          severity={snack.alertType}
          variant="filled"
          sx={{ width: "100%" }}
        >
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
    </Box>
  );
};

export default BranchEdit;
