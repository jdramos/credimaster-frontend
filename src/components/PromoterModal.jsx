import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import BranchSelect from "./BranchSelect";
import TipoDocumentoSelect from "./TipoDocumentoSelect";
import GenreSelect from "./Genre/GenreSelect";

const BAC = {
  primary: "#0057B8",
  primaryDark: "#003E8A",
  soft: "#EAF2FF",
  bg: "#F6F8FC",
  border: "#D8E2F0",
  text: "#1F2937",
  muted: "#6B7280",
  white: "#FFFFFF",
};

const url = process.env.REACT_APP_API_BASE_URL + "/api/promoters";
const token = process.env.REACT_APP_API_TOKEN;

const initialForm = {
  id: null,
  name: "",
  identification: "",
  id_tipo_documento: 1,
  id_genero: "",
  telephone: "",
  branch_id: "",
};

export default function PromoterModal({
  open,
  onClose,
  promoterSelected = null,
  onSaved,
}) {
  const isEdit = Boolean(promoterSelected?.id);

  const [promoter, setPromoter] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (open) {
      setPromoter({
        id: promoterSelected?.id ?? null,
        name: promoterSelected?.name ?? "",
        identification: promoterSelected?.identification ?? "",
        id_tipo_documento:
          promoterSelected?.id_tipo_documento !== null &&
          promoterSelected?.id_tipo_documento !== undefined
            ? Number(promoterSelected.id_tipo_documento)
            : "",
        id_genero:
          promoterSelected?.id_genero !== null &&
          promoterSelected?.id_genero !== undefined
            ? Number(promoterSelected.id_genero)
            : "",
        telephone: promoterSelected?.telephone ?? "",
        branch_id:
          promoterSelected?.branch_id !== null &&
          promoterSelected?.branch_id !== undefined
            ? Number(promoterSelected.branch_id)
            : "",
      });

      setErrors({});
      setServerError("");
    }
  }, [open, promoterSelected]);

  const validateForm = () => {
    const newErrors = {};

    if (!promoter.name?.trim()) {
      newErrors.name = "El nombre es requerido";
    }

    if (!promoter.identification?.trim()) {
      newErrors.identification = "La identificación es requerida";
    }

    if (!promoter.id_tipo_documento) {
      newErrors.id_tipo_documento = "Seleccione el tipo de documento";
    }

    if (promoter.id_genero === "" || promoter.id_genero === null) {
      newErrors.id_genero = "Seleccione el género";
    }

    if (!promoter.branch_id || Number(promoter.branch_id) < 1) {
      newErrors.branch_id = "Asigne una sucursal válida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setPromoter((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      setServerError("");

      const method = isEdit ? "PUT" : "POST";
      const endpoint = isEdit ? `${url}/${promoter.id}` : url;

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          Authorization: token,
        },
        body: JSON.stringify({
          name: promoter.name,
          identification: promoter.identification,
          id_tipo_documento: Number(promoter.id_tipo_documento),
          id_genero: Number(promoter.id_genero),
          telephone: promoter.telephone,
          branch_id: promoter.branch_id ? Number(promoter.branch_id) : null,
        }),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          responseData?.errors?.[0]?.msg ||
            responseData?.errors?.[0] ||
            responseData?.errors ||
            responseData?.message ||
            "No fue posible guardar el registro.",
        );
      }

      onSaved?.({
        type: "success",
        message: isEdit
          ? "Promotor actualizado correctamente."
          : "Promotor guardado correctamente.",
      });

      onClose();
    } catch (error) {
      console.error(error);
      setServerError(error.message || "Ocurrió un error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${BAC.primaryDark}, ${BAC.primary})`,
          color: BAC.white,
          px: 3,
          py: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <GroupsOutlinedIcon />
          </Box>

          <Box>
            <Typography fontWeight={800} fontSize={18}>
              {isEdit ? "Editar promotor" : "Agregar promotor"}
            </Typography>
            <Typography fontSize={13} sx={{ opacity: 0.85 }}>
              Complete la información del promotor
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent
        sx={{
          bgcolor: BAC.bg,
          px: 3,
          pt: "28px !important",
          pb: 3,
        }}
      >
        {serverError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {serverError}
          </Alert>
        )}

        <Stack spacing={2}>
          <TextField
            label="Nombre del promotor"
            name="name"
            value={promoter.name}
            onChange={handleInputChange}
            size="small"
            fullWidth
            error={Boolean(errors.name)}
            helperText={errors.name}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: BAC.white,
              },
            }}
          />

          <TextField
            label="Identificación"
            name="identification"
            value={promoter.identification}
            onChange={handleInputChange}
            size="small"
            fullWidth
            error={Boolean(errors.identification)}
            helperText={errors.identification}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: BAC.white,
              },
            }}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TipoDocumentoSelect
              label="Tipo de documento"
              name="id_tipo_documento"
              value={promoter.id_tipo_documento}
              selected={promoter.id_tipo_documento}
              onChange={handleInputChange}
              size="small"
              fullWidth
              error={Boolean(errors.id_tipo_documento)}
              helperText={errors.id_tipo_documento}
            />

            <GenreSelect
              label="Género"
              name="id_genero"
              value={promoter.id_genero}
              onChange={handleInputChange}
              size="small"
              fullWidth
              required
              error={Boolean(errors.id_genero)}
              helperText={errors.id_genero}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: BAC.white,
                },
              }}
            ></GenreSelect>
          </Stack>

          <TextField
            label="Teléfono"
            name="telephone"
            value={promoter.telephone}
            onChange={handleInputChange}
            size="small"
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: BAC.white,
              },
            }}
          />

          <BranchSelect
            label="Sucursal"
            name="branch_id"
            value={promoter.branch_id}
            selected={promoter.branch_id}
            onChange={handleInputChange}
            size="small"
            fullWidth
            error={Boolean(errors.branch_id)}
            helperText={errors.branch_id}
          />
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, bgcolor: BAC.white }}>
        <Button
          onClick={onClose}
          disabled={saving}
          variant="outlined"
          startIcon={<CancelIcon />}
          sx={{
            borderColor: BAC.border,
            color: BAC.text,
            borderRadius: 2,
            fontWeight: 700,
            textTransform: "none",
          }}
        >
          Cancelar
        </Button>

        <Button
          onClick={handleSave}
          disabled={saving}
          variant="contained"
          startIcon={<SaveIcon />}
          sx={{
            bgcolor: BAC.primary,
            borderRadius: 2,
            fontWeight: 800,
            textTransform: "none",
            "&:hover": {
              bgcolor: BAC.primaryDark,
            },
          }}
        >
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
