import React, { useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Grid,
  Chip,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LocationMapPicker from "../common/LocationMapPicker";

const HOME_COLOR = "#1565C0";
const BUSINESS_COLOR = "#C62828";

// Ubicación GPS de casa y negocio del cliente, sobre un solo mapa con dos
// marcadores. El asesor elige cuál está fijando (toggle Casa/Negocio) y
// hace clic en el mapa, o arrastra el marcador ya puesto para ajustarlo.
// Cuando la app móvil (todavía en construcción) empiece a mandar estos
// mismos campos por la misma API de crear/editar cliente, no hace falta
// tocar nada acá — es la misma fuente de datos.
const CustomerLocationTab = ({ customer, setCustomer, mode }) => {
  const disabled = mode === "show";
  const [activeKey, setActiveKey] = useState("home");

  const homePos =
    customer?.home_lat != null && customer?.home_lat !== "" &&
    customer?.home_lng != null && customer?.home_lng !== ""
      ? { lat: Number(customer.home_lat), lng: Number(customer.home_lng) }
      : null;

  const businessPos =
    customer?.business_lat != null && customer?.business_lat !== "" &&
    customer?.business_lng != null && customer?.business_lng !== ""
      ? { lat: Number(customer.business_lat), lng: Number(customer.business_lng) }
      : null;

  const handleSetPosition = (key, pos) => {
    setCustomer((prev) => ({
      ...prev,
      ...(key === "home"
        ? { home_lat: pos.lat, home_lng: pos.lng }
        : { business_lat: pos.lat, business_lng: pos.lng }),
    }));
  };

  const markers = [
    { key: "home", position: homePos, color: HOME_COLOR, label: "C" },
    { key: "business", position: businessPos, color: BUSINESS_COLOR, label: "N" },
  ];

  return (
    <Stack spacing={1.5}>
      <Paper
        elevation={0}
        sx={{ p: 1.4, borderRadius: 2, border: "1px solid", borderColor: "divider" }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="subtitle2" fontWeight={900}>
              Ubicación en el mapa
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Elija qué ubicación va a fijar y haga clic en el mapa. También puede arrastrar un
              marcador ya puesto para ajustarlo. Cuando la app móvil quede conectada, va a poder
              guardar estas mismas coordenadas automáticamente.
            </Typography>
          </Box>

          {!disabled && (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={activeKey}
              onChange={(_, v) => v && setActiveKey(v)}
            >
              <ToggleButton value="home" sx={{ textTransform: "none" }}>
                <HomeIcon fontSize="small" sx={{ mr: 0.5 }} /> Casa
              </ToggleButton>
              <ToggleButton value="business" sx={{ textTransform: "none" }}>
                <StorefrontIcon fontSize="small" sx={{ mr: 0.5 }} /> Negocio
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", overflow: "hidden" }}
      >
        <LocationMapPicker
          markers={markers}
          activeKey={activeKey}
          onSetPosition={handleSetPosition}
          disabled={disabled}
        />
      </Paper>

      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6}>
          <Paper
            elevation={0}
            sx={{ p: 1.2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Chip size="small" label="C" sx={{ bgcolor: HOME_COLOR, color: "#fff", fontWeight: 900 }} />
              <Typography variant="body2" fontWeight={700}>Casa</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {homePos ? `${homePos.lat.toFixed(6)}, ${homePos.lng.toFixed(6)}` : "Sin ubicación fijada"}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper
            elevation={0}
            sx={{ p: 1.2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Chip size="small" label="N" sx={{ bgcolor: BUSINESS_COLOR, color: "#fff", fontWeight: 900 }} />
              <Typography variant="body2" fontWeight={700}>Negocio</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {businessPos ? `${businessPos.lat.toFixed(6)}, ${businessPos.lng.toFixed(6)}` : "Sin ubicación fijada"}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default CustomerLocationTab;
