// Gravedad de la alerta de respaldo (la calcula el backend:
// GET /api/data-backups/status). Lo ideal es un respaldo diario; el color
// cambia a medida que pasan los días desde el último respaldo descargado.
// Colores fijos (no del tema) para que se lean igual en claro y oscuro.
export const BACKUP_LEVELS = {
  AL_DIA: { bg: "#2e7d32", fg: "#ffffff", severity: "success", title: "Respaldo al día" },
  ATENCION: { bg: "#f9a825", fg: "#1a1a1a", severity: "warning", title: "Gravedad: atención" },
  ALTO: { bg: "#ef6c00", fg: "#ffffff", severity: "warning", title: "Gravedad: alta" },
  CRITICO: { bg: "#c62828", fg: "#ffffff", severity: "error", title: "Gravedad: crítica" },
};

export const BACKUPS_PAGE = "/configuracion/respaldo-datos";
export const BACKUPS_CHANGED_EVENT = "data-backups:changed";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const backupChipLabel = (status) => {
  if (status.days_since === null || status.days_since === undefined) return "Sin respaldo";
  if (status.level === "AL_DIA") return "Respaldo al día";
  return `Respaldo: hace ${plural(status.days_since, "día")}`;
};

export const backupStatusText = (status) => {
  const parts = [];
  if (status.days_since === null || status.days_since === undefined) {
    parts.push("La empresa nunca ha descargado un respaldo de sus datos.");
  } else if (status.days_since === 0) {
    parts.push("El último respaldo descargado es de hoy.");
  } else {
    parts.push(`El último respaldo descargado es de hace ${plural(status.days_since, "día")} (${String(status.last_backup_at).slice(0, 10)}).`);
  }
  if (status.generating) parts.push("Hay un respaldo generándose.");
  if (status.ready_not_downloaded) parts.push("Hay un respaldo listo que todavía no se ha descargado.");
  parts.push("Lo recomendable es un respaldo diario.");
  return parts.join(" ");
};
