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
import { MarginTwoTone } from "@mui/icons-material";

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

const url = process.env.REACT_APP_API_BASE_URL + "/api/collectors";
const token = process.env.REACT_APP_API_TOKEN;

const initialForm = {
  id: null,
  name: "",
  telephone: "",
  branch_id: "",
};

export default function CollectorModal({
  open,
  onClose,
  collectorSelected = null,
  onSaved,
}) {
  const isEdit = Boolean(collectorSelected?.id);

  const [collector, setCollector] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (open) {
      setCollector({
        id: collectorSelected?.id ?? null,
        name: collectorSelected?.name ?? "",
        telephone: collectorSelected?.telephone ?? "",
        branch_id: collectorSelected?.branch_id ?? "",
      });

      setErrors({});
      setServerError("");
    }
  }, [open, collectorSelected]);

  const validateForm = () => {
    const newErrors = {};

    if (!collector.name?.trim()) {
      newErrors.name = "El nombre es requerido";
    }

    if (!collector.branch_id || Number(collector.branch_id) < 1) {
      newErrors.branch_id = "Asigne una sucursal válida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setCollector((prev) => ({
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
      const endpoint = isEdit ? `${url}/${collector.id}` : url;

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          Authorization: token,
        },
        body: JSON.stringify({
          name: collector.name,
          telephone: collector.telephone,
          branch_id: collector.branch_id,
        }),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          responseData?.errors?.[0] ||
            responseData?.message ||
            "No fue posible guardar el registro.",
        );
      }

      onSaved?.({
        type: "success",
        message: isEdit
          ? "Colector actualizado correctamente."
          : "Colector guardado correctamente.",
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
          borderRadius: 3,
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
          marginBottom: 2,
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
              {isEdit ? "Editar colector" : "Agregar colector"}
            </Typography>
            <Typography fontSize={13} sx={{ opacity: 0.85 }}>
              Complete la información del colector
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

        <Stack spacing={2} sx={[]}>
          <TextField
            label="Nombre del colector"
            name="name"
            value={collector.name}
            onChange={handleInputChange}
            size="small"
            fullWidth
            error={Boolean(errors.name)}
            helperText={errors.name}
          />

          <TextField
            label="Teléfono"
            name="telephone"
            value={collector.telephone}
            onChange={handleInputChange}
            size="small"
            fullWidth
          />

          <BranchSelect
            label="Sucursal"
            name="branch_id"
            value={collector.branch_id}
            selected={collector.branch_id}
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
            fontWeight: 700,
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
