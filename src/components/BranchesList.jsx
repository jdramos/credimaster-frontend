import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ApartmentIcon from "@mui/icons-material/Apartment";
import EditRoadIcon from "@mui/icons-material/EditRoad";
import FmdGoodIcon from "@mui/icons-material/FmdGood";

import DataTable from "./DataTable";
import EmptyNotice from "./EmptyNotice";

const url = process.env.REACT_APP_API_BASE_URL + "/api/branches";
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };

const bacHeaderSx = {
  background: "linear-gradient(135deg, #0d47a1 0%, #1565c0 45%, #42a5f5 100%)",
  color: "#fff",
  borderRadius: 3,
  px: 3,
  py: 2.25,
  boxShadow: "0 10px 24px rgba(13, 71, 161, 0.18)",
};

const cardSx = {
  borderRadius: 3,
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  border: "1px solid",
  borderColor: "divider",
};

const actionButtonSx = {
  minWidth: 180,
  borderRadius: 2,
  textTransform: "none",
  fontWeight: 700,
  boxShadow: "none",
};

const BranchesList = () => {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [snack, setSnack] = useState({
    open: false,
    alertType: "success",
    alertMessage: "",
  });

  const showSnack = (type, msg) =>
    setSnack({ open: true, alertType: type, alertMessage: msg });

  useEffect(() => {
    const fetchApi = async () => {
      try {
        setLoading(true);

        const response = await fetch(url, { headers });
        const jsonData = await response.json().catch(() => []);

        if (!response.ok) {
          showSnack(
            "error",
            `Respuesta del servidor: ${jsonData?.errors || "Error al consultar sucursales"}`,
          );
          setData([]);
          return;
        }

        setData(Array.isArray(jsonData) ? jsonData : []);
      } catch (error) {
        console.error(error);
        showSnack("error", `Respuesta del servidor: ${error.message}`);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApi();
  }, []);

  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 90,
      },
      {
        accessorKey: "name",
        header: "Sucursal",
        size: 180,
      },
      {
        accessorKey: "address",
        header: "Dirección",
        size: 240,
      },
      {
        accessorKey: "province_name",
        header: "Departamento",
        size: 150,
      },
      {
        accessorKey: "municipality_name",
        header: "Municipio",
        size: 150,
      },
      {
        accessorKey: "manager",
        header: "Gerente / Administrador",
        size: 180,
      },
      {
        accessorKey: "telephone",
        header: "Teléfono",
        size: 140,
      },
    ],
    [],
  );

  const totalBranches = data.length;
  const withManager = data.filter((item) => item.manager?.trim()).length;
  const withLocation = data.filter(
    (item) => item.province_name || item.municipality_name,
  ).length;

  const handleCloseSnack = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((s) => ({ ...s, open: false }));
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        {/* Encabezado BAC */}
        <Box sx={bacHeaderSx}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
          >
            <Box>
              <Typography variant="h5" fontWeight={800}>
                Listado de sucursales
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.5 }}>
                Consulta, organiza y edita las sucursales registradas en el
                sistema.
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/sucursales/agregar")}
              sx={{
                ...actionButtonSx,
                bgcolor: "#fff",
                color: "primary.main",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.92)",
                  boxShadow: "none",
                },
              }}
            >
              Nueva sucursal
            </Button>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 2 }}
          >
            <Chip
              icon={<AccountBalanceIcon />}
              label={`Total: ${totalBranches}`}
              sx={{
                bgcolor: "rgba(255,255,255,0.16)",
                color: "#fff",
                fontWeight: 700,
                "& .MuiChip-icon": { color: "#fff" },
              }}
            />
            <Chip
              icon={<EditRoadIcon />}
              label={`Con gerente: ${withManager}`}
              sx={{
                bgcolor: "rgba(255,255,255,0.16)",
                color: "#fff",
                fontWeight: 700,
                "& .MuiChip-icon": { color: "#fff" },
              }}
            />
            <Chip
              icon={<FmdGoodIcon />}
              label={`Con ubicación: ${withLocation}`}
              sx={{
                bgcolor: "rgba(255,255,255,0.16)",
                color: "#fff",
                fontWeight: 700,
                "& .MuiChip-icon": { color: "#fff" },
              }}
            />
            <Chip
              icon={<ApartmentIcon />}
              label="Gestión de sucursales"
              sx={{
                bgcolor: "rgba(255,255,255,0.16)",
                color: "#fff",
                fontWeight: 700,
                "& .MuiChip-icon": { color: "#fff" },
              }}
            />
          </Stack>
        </Box>

        <Card sx={cardSx}>
          <CardContent sx={{ p: 3 }}>
            {loading ? (
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                justifyContent="center"
                sx={{ py: 6 }}
              >
                <CircularProgress size={28} />
                <Typography variant="body1">Cargando sucursales...</Typography>
              </Stack>
            ) : data.length === 0 ? (
              <EmptyNotice
                title="No hay sucursales registradas"
                subtitle="Agrega una nueva sucursal para comenzar."
              />
            ) : (
              <DataTable columns={columns} data={data} route="sucursales" />
            )}
          </CardContent>
        </Card>
      </Stack>

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
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
    </Box>
  );
};

export default BranchesList;
