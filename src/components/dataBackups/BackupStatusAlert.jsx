import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Chip, Tooltip } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import API from "../../api";
import { BACKUP_LEVELS, BACKUPS_CHANGED_EVENT, BACKUPS_PAGE, backupChipLabel, backupStatusText } from "./backupAlert";

const REFRESH_MS = 30 * 60 * 1000;
const ICONS = {
  AL_DIA: CheckCircleRoundedIcon,
  ATENCION: WarningAmberRoundedIcon,
  ALTO: ReportProblemRoundedIcon,
  CRITICO: ErrorRoundedIcon,
};

// Alerta de respaldo en la barra superior: verde, amarillo, naranja o rojo
// según los días sin respaldo. La monta AppLayoutMenu solo para quien puede
// generar respaldos (respaldos.generar o Administrador).
export default function BackupStatusAlert({ compact = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener(BACKUPS_CHANGED_EVENT, refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener(BACKUPS_CHANGED_EVENT, refresh);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // La alerta nunca debe romper la barra superior.
    Promise.resolve()
      .then(() => API.get("/api/data-backups/status"))
      .then((res) => {
        if (!cancelled) setStatus(res?.data?.migrated ? res.data.data : null);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, tick]);

  if (!status || !BACKUP_LEVELS[status.level]) return null;
  const level = BACKUP_LEVELS[status.level];
  const Icon = ICONS[status.level];
  return (
    <Tooltip title={`${level.title}. ${backupStatusText(status)}`}>
      <Chip
        size="small"
        icon={<Icon style={{ color: level.fg }} />}
        label={compact ? undefined : backupChipLabel(status)}
        aria-label={`${backupChipLabel(status)}. ${level.title}`}
        onClick={() => navigate(BACKUPS_PAGE)}
        sx={{
          fontWeight: 700,
          mx: 0.5,
          bgcolor: level.bg,
          color: level.fg,
          "&:hover": { bgcolor: level.bg, filter: "brightness(0.92)" },
          // En pantallas medianas solo el ícono de color (el texto va en el
          // tooltip) para no apretar la barra superior.
          "& .MuiChip-label": { display: compact ? "none" : { xs: "none", lg: "inline" } },
          "& .MuiChip-icon": compact ? { mx: 0.75 } : { ml: { xs: 0.75, lg: "4px" }, mr: { xs: 0.75, lg: "-4px" } },
        }}
      />
    </Tooltip>
  );
}
