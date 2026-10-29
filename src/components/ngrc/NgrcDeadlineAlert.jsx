import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Chip, Tooltip } from "@mui/material";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import API from "../../api";
import { BASE, PAGE_PATH, daysText } from "./ngrcShared";

const REFRESH_MS = 5 * 60 * 1000;

// Aviso en la barra superior cuando una obligación de la NGRC está vencida o
// por vencer. Lo monta AppLayoutMenu solo para empresas normadas con el
// módulo risk_classification_ngrc y usuarios con ngrc.cumplimiento.ver.
export default function NgrcDeadlineAlert() {
  const location = useLocation();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Promise.resolve: el aviso nunca debe romper la barra superior, ni
    // siquiera si la llamada no devuelve una promesa.
    Promise.resolve()
      .then(() => API.get(`${BASE}/alerts`))
      .then((res) => {
        if (!cancelled) setAlerts(res?.data || null);
      })
      .catch(() => {
        if (!cancelled) setAlerts(null);
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, tick]);

  if (!alerts?.total) return null;
  const label = alerts.overdue
    ? `NGRC: ${alerts.overdue} obligación${alerts.overdue === 1 ? "" : "es"} vencida${alerts.overdue === 1 ? "" : "s"}`
    : `NGRC: ${alerts.due_soon} por vencer`;
  const detail = alerts.items
    .slice(0, 8)
    .map((a) => `${a.article} ${a.title} (${a.period_label})${a.overdue_items ? `: ${a.overdue_items} vencidos` : a.days_left != null ? `: ${daysText(a.days_left)}` : ""}`)
    .join(" · ");
  return (
    <Tooltip title={detail}>
      <Chip
        size="small"
        icon={<EventBusyIcon />}
        color={alerts.overdue ? "error" : "warning"}
        label={label}
        onClick={() => navigate(PAGE_PATH)}
        sx={{ fontWeight: 700, mx: 0.5 }}
      />
    </Tooltip>
  );
}
