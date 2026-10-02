import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import RouteIcon from "@mui/icons-material/Route";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import dayjs from "dayjs";
import API from "../api";
import HelpButton from "./help/HelpButton";

const MAP_HEIGHT = 520;
const DEFAULT_CENTER = { lat: 12.1364, lng: -86.2514 }; // Managua

const money = (v) =>
  Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hhmm = (ms) => (ms ? dayjs(ms).format("HH:mm") : "—");

const RESULT_LABEL = {
  CONTACTED: "Contactado",
  PROMISE: "Promesa de pago",
  PARTIAL_PAYMENT: "Pago parcial",
  NO_ANSWER: "No contesta",
  NOT_LOCATED: "No localizado",
  REFUSED: "Se niega a pagar",
  OTHER: "Otro",
};

// Rutas del día (rastreo GPS de la app móvil): quién se movió, y el recorrido
// de uno -- ruta, paradas, visitas y pagos sobre el mapa. Permiso rastreo.ver;
// el backend limita los usuarios a las sucursales del que consulta.
export default function TrackingRoutes() {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [focus, setFocus] = useState(null);
  const mapRef = useRef(null);

  const tzOffset = useMemo(() => new Date().getTimezoneOffset(), []);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "credimaster-google-maps",
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
  });

  // Lista de usuarios con ruta ese día.
  useEffect(() => {
    let cancelled = false;
    setLoadingUsers(true);
    setUsersError("");
    setSelectedId(null);
    setDetail(null);
    API.get("/api/tracking/day", { params: { date, tz_offset: tzOffset } })
      .then(({ data }) => {
        if (!cancelled) setUsers(data?.data || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setUsers([]);
          setUsersError(err.response?.data?.message || "No se pudo cargar las rutas del día.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, tzOffset]);

  // Detalle del usuario elegido.
  useEffect(() => {
    if (!selectedId) return undefined;
    let cancelled = false;
    setLoadingDetail(true);
    setDetailError("");
    setDetail(null);
    setFocus(null);
    API.get(`/api/tracking/day/${selectedId}`, { params: { date, tz_offset: tzOffset } })
      .then(({ data }) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setDetailError(err.response?.data?.message || "No se pudo cargar la ruta.");
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, date, tzOffset]);

  const path = useMemo(() => (detail?.route || []).map((p) => ({ lat: p.lat, lng: p.lng })), [detail]);

  // Eventos de la jornada ordenados por hora (línea de tiempo).
  const events = useMemo(() => {
    if (!detail) return [];
    const list = [];
    if (detail.route?.length) {
      const first = detail.route[0];
      const last = detail.route[detail.route.length - 1];
      list.push({ key: "start", t: first.t_ms, kind: "start", title: "Inicio del recorrido", lat: first.lat, lng: first.lng });
      list.push({ key: "end", t: last.t_ms, kind: "end", title: "Último punto registrado", lat: last.lat, lng: last.lng });
    }
    (detail.stops || []).forEach((s, i) =>
      list.push({
        key: `stop-${i}`,
        t: s.start_ms,
        kind: "stop",
        title: `Parada de ${s.minutes} min`,
        subtitle: `${hhmm(s.start_ms)} a ${hhmm(s.end_ms)}`,
        lat: s.lat,
        lng: s.lng,
      }),
    );
    (detail.visits || []).forEach((v) =>
      list.push({
        key: `visit-${v.id}`,
        t: v.t_ms,
        kind: "visit",
        title: `Visita: ${v.customer_name || `Crédito ${v.credit_code}`}`,
        subtitle: RESULT_LABEL[v.result] || "",
        lat: v.lat,
        lng: v.lng,
      }),
    );
    (detail.payments || []).forEach((p) =>
      list.push({
        key: `pay-${p.id}`,
        t: p.t_ms,
        kind: "payment",
        title: `Pago C$ ${money(p.amount)}: ${p.customer_name || `Crédito ${p.credit_code}`}`,
        subtitle: p.lat == null ? "Sin ubicación en la ruta a esa hora" : "",
        lat: p.lat,
        lng: p.lng,
      }),
    );
    return list.sort((a, b) => a.t - b.t);
  }, [detail]);

  const fitToRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    let any = false;
    path.forEach((p) => {
      bounds.extend(p);
      any = true;
    });
    events.forEach((e) => {
      if (e.lat != null) {
        bounds.extend({ lat: e.lat, lng: e.lng });
        any = true;
      }
    });
    if (any) map.fitBounds(bounds, 48);
  }, [path, events]);

  useEffect(() => {
    fitToRoute();
  }, [fitToRoute]);

  useEffect(() => {
    if (focus && mapRef.current) {
      mapRef.current.panTo({ lat: focus.lat, lng: focus.lng });
      mapRef.current.setZoom(17);
    }
  }, [focus]);

  const markerIcon = (kind) => {
    if (!window.google) return undefined;
    const SymbolPath = window.google.maps.SymbolPath;
    const base = { path: SymbolPath.CIRCLE, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 };
    switch (kind) {
      case "start":
        return { ...base, scale: 9, fillColor: "#16A34A" };
      case "end":
        return { ...base, scale: 9, fillColor: "#EF4444" };
      case "stop":
        return { ...base, scale: 8, fillColor: "#F59E0B" };
      case "visit":
        return { ...base, scale: 8, fillColor: "#1D4ED8" };
      case "payment":
        return { ...base, scale: 8, fillColor: "#7C3AED" };
      default:
        return undefined;
    }
  };

  const hasKey = !!process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <RouteIcon color="primary" />
          <Typography variant="h5" fontWeight={900}>Rutas del día</Typography>
          <HelpButton screenKey="cobranza.rutas_del_dia" />
        </Stack>
        <Typography color="text.secondary">
          Recorrido GPS de los usuarios de la app móvil que iniciaron su jornada: ruta, paradas, visitas y pagos del día.
          Solo se ve a los usuarios de tus sucursales. La ruta se registra con la app abierta (ver nota abajo).
        </Typography>
      </Box>

      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          type="date"
          size="small"
          label="Fecha"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          inputProps={{ max: dayjs().format("YYYY-MM-DD") }}
        />
        {loadingUsers && <CircularProgress size={22} />}
      </Stack>

      {!!usersError && <Alert severity="error">{usersError}</Alert>}
      {!loadingUsers && !usersError && users.length === 0 && (
        <Alert severity="info">Nadie registró su ruta ese día.</Alert>
      )}

      <Grid container spacing={1.5}>
        {users.map((u) => (
          <Grid item xs={12} sm={6} md={4} key={u.user_id}>
            <Card
              variant="outlined"
              sx={{ borderColor: selectedId === u.user_id ? "primary.main" : undefined, borderWidth: selectedId === u.user_id ? 2 : 1 }}
            >
              <CardActionArea onClick={() => setSelectedId(u.user_id)}>
                <CardContent>
                  <Typography fontWeight={800} noWrap>{u.user_name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {[u.collector_name, u.branch_name].filter(Boolean).join(" · ")}
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1 }} useFlexGap>
                    <Chip size="small" label={`${hhmm(u.first_ms)} – ${hhmm(u.last_ms)}`} />
                    <Chip size="small" color="primary" variant="outlined" label={`${u.distance_km} km`} />
                    <Chip size="small" variant="outlined" label={`${u.stops_count} paradas`} />
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {selectedId && (
        <Card variant="outlined">
          <CardContent>
            {loadingDetail && <Box textAlign="center" py={4}><CircularProgress /></Box>}
            {!!detailError && <Alert severity="error">{detailError}</Alert>}

            {detail && (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" fontWeight={800}>{detail.user.name}</Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 0.5 }} useFlexGap>
                    <Chip size="small" label={`${hhmm(detail.summary.first_ms)} – ${hhmm(detail.summary.last_ms)}`} />
                    <Chip size="small" color="primary" label={`${detail.summary.distance_km} km`} />
                    <Chip size="small" variant="outlined" label={`${detail.summary.stops_count} paradas`} />
                    <Chip size="small" variant="outlined" label={`${detail.summary.visits_count} visitas`} />
                    <Chip size="small" variant="outlined" label={`${detail.summary.payments_count} pagos`} />
                    <Chip size="small" variant="outlined" label={`${detail.summary.points_count} puntos GPS`} />
                  </Stack>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    {!hasKey ? (
                      <Alert severity="warning">
                        No hay una API key de Google Maps configurada (REACT_APP_GOOGLE_MAPS_API_KEY).
                      </Alert>
                    ) : loadError ? (
                      <Alert severity="error">No se pudo cargar Google Maps.</Alert>
                    ) : !isLoaded ? (
                      <Box textAlign="center" py={4}><CircularProgress size={28} /></Box>
                    ) : (
                      <GoogleMap
                        mapContainerStyle={{ width: "100%", height: MAP_HEIGHT, borderRadius: 8 }}
                        center={path[0] || DEFAULT_CENTER}
                        zoom={13}
                        onLoad={(map) => {
                          mapRef.current = map;
                          fitToRoute();
                        }}
                        onUnmount={() => {
                          mapRef.current = null;
                        }}
                        options={{ streetViewControl: false, mapTypeControl: false }}
                      >
                        <Polyline path={path} options={{ strokeColor: "#1D4ED8", strokeOpacity: 0.85, strokeWeight: 4 }} />
                        {events
                          .filter((e) => e.lat != null)
                          .map((e) => (
                            <Marker
                              key={e.key}
                              position={{ lat: e.lat, lng: e.lng }}
                              icon={markerIcon(e.kind)}
                              title={`${hhmm(e.t)} · ${e.title}`}
                              onClick={() => setFocus({ lat: e.lat, lng: e.lng })}
                            />
                          ))}
                      </GoogleMap>
                    )}
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mt: 1 }} useFlexGap>
                      {[
                        ["#16A34A", "Inicio"],
                        ["#EF4444", "Último punto"],
                        ["#F59E0B", "Parada"],
                        ["#1D4ED8", "Visita"],
                        ["#7C3AED", "Pago"],
                      ].map(([color, label]) => (
                        <Stack key={label} direction="row" spacing={0.5} alignItems="center">
                          <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: color }} />
                          <Typography variant="caption">{label}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" fontWeight={800} gutterBottom>Línea de tiempo</Typography>
                    <Stack spacing={0.75} sx={{ maxHeight: MAP_HEIGHT, overflowY: "auto" }}>
                      {events.length === 0 && (
                        <Typography variant="body2" color="text.secondary">Sin eventos.</Typography>
                      )}
                      {events.map((e) => (
                        <Card
                          key={e.key}
                          variant="outlined"
                          sx={{ cursor: e.lat != null ? "pointer" : "default" }}
                          onClick={() => e.lat != null && setFocus({ lat: e.lat, lng: e.lng })}
                        >
                          <Box sx={{ p: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: { start: "#16A34A", end: "#EF4444", stop: "#F59E0B", visit: "#1D4ED8", payment: "#7C3AED" }[e.kind] }} />
                              <Typography variant="caption" fontWeight={800}>{hhmm(e.t)}</Typography>
                              <Typography variant="body2" sx={{ flex: 1 }}>{e.title}</Typography>
                            </Stack>
                            {!!e.subtitle && (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 2.5 }} display="block">
                                {e.subtitle}
                              </Typography>
                            )}
                          </Box>
                        </Card>
                      ))}
                    </Stack>
                  </Grid>
                </Grid>

                {detail.sessions?.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Jornadas: {detail.sessions.map((s) => `${hhmm(s.started_ms)}–${s.ended_ms ? hhmm(s.ended_ms) : "en curso"}`).join(", ")}
                  </Typography>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      <Typography variant="caption" color="text.secondary">
        Nota: hoy el registro funciona con la app abierta; con el teléfono bloqueado o la app en segundo plano la ruta
        puede tener huecos. Las paradas son tramos de 5 minutos o más a menos de 50 m de un mismo lugar.
      </Typography>
    </Stack>
  );
}
