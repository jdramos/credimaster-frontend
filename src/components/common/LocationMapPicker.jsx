import React, { useCallback, useMemo } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Box, CircularProgress, Typography } from "@mui/material";

const containerStyle = { width: "100%", height: "420px" };

// Centro por defecto (Managua) — solo se usa mientras ningún marcador
// tiene coordenadas todavía.
const DEFAULT_CENTER = { lat: 12.114993, lng: -86.236174 };

// Selector de ubicación reutilizable sobre Google Maps: recibe una lista
// de marcadores con posición opcional, y deja que el usuario fije la
// posición del marcador "activo" haciendo clic en el mapa o arrastrándolo.
// No asume nada sobre qué representa cada marcador — eso lo decide quien
// lo usa (ver CustomerLocationTab.jsx).
export default function LocationMapPicker({
  markers = [],
  activeKey = null,
  onSetPosition,
  disabled = false,
  zoom = 13,
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "credimaster-google-maps",
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
  });

  const handleMapClick = useCallback(
    (e) => {
      if (disabled || !activeKey || !onSetPosition) return;
      onSetPosition(activeKey, { lat: e.latLng.lat(), lng: e.latLng.lng() });
    },
    [disabled, activeKey, onSetPosition],
  );

  const handleMarkerDragEnd = useCallback(
    (key) => (e) => {
      if (disabled || !onSetPosition) return;
      onSetPosition(key, { lat: e.latLng.lat(), lng: e.latLng.lng() });
    },
    [disabled, onSetPosition],
  );

  const positioned = markers.filter((m) => m && m.position);
  const mapCenter = useMemo(
    () => (positioned[0] ? positioned[0].position : DEFAULT_CENTER),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [positioned.length, positioned[0]?.position?.lat, positioned[0]?.position?.lng],
  );

  if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography color="error" variant="body2">
          No hay una API key de Google Maps configurada (REACT_APP_GOOGLE_MAPS_API_KEY).
        </Typography>
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography color="error" variant="body2">
          No se pudo cargar Google Maps. Verifique la API key y que "Maps JavaScript API" esté habilitada.
        </Typography>
      </Box>
    );
  }

  if (!isLoaded) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 420 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapCenter}
      zoom={zoom}
      onClick={handleMapClick}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
    >
      {positioned.map((m) => (
        <Marker
          key={m.key}
          position={m.position}
          label={m.label ? { text: m.label, color: "#fff", fontWeight: "bold" } : undefined}
          icon={
            m.color
              ? {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: m.color,
                  fillOpacity: 1,
                  strokeColor: "#fff",
                  strokeWeight: 2,
                }
              : undefined
          }
          draggable={!disabled}
          onDragEnd={handleMarkerDragEnd(m.key)}
        />
      ))}
    </GoogleMap>
  );
}
