import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import { useAuth } from "../../contexts/AuthContext";
import { buildSanctionsEntryReportHtml, formatListedOn, printSanctionsEntryReport } from "../../reports/sanctionsEntryReport";
import { openBlankReportWindow, writeReportToWindow } from "../../reports/reportViewer";
import SanctionsListingReason from "./SanctionsListingReason";

const DetailField = ({ label, value }) => (
  <Box sx={{ minWidth: 200 }}>
    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600}>
      {value || "-"}
    </Typography>
  </Box>
);

const SectionTitle = ({ children }) => (
  <Typography variant="subtitle2" fontWeight={800} sx={{ mt: 2, mb: 1 }}>
    {children}
  </Typography>
);

// Panel de detalle de una entrada de OFAC/ONU -- mismo nivel de información
// que la herramienta oficial de OFAC (Sanctions List Search): Details,
// Identifications, Aliases y (extra, disponible en el dato) Addresses.
export default function SanctionsEntryDetailDialog({ id, onClose }) {
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Acción de la OFAC del día de la designación (la carga la sección "Motivo de
  // la inclusión"); undefined = todavía no llegó.
  const [designationAction, setDesignationAction] = useState(undefined);

  const { user } = useContext(UserContext);
  const { tenant } = useAuth();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    setDesignationAction(undefined);
    API.get(`/api/aml/watchlists/browse/${id}`)
      .then(({ data }) => setEntry(data))
      .catch((err) => setError(err.response?.data?.message || "No se pudo cargar el detalle"))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = async () => {
    if (!entry) return;
    const company = {
      commercial_name: tenant?.commercial_name || tenant?.name || "",
      legal_name: tenant?.legal_name || tenant?.company_name || "",
      tax_id: tenant?.tax_id || tenant?.ruc || "",
      address: tenant?.address || "",
      phone: tenant?.phone || "",
      logo_url: tenant?.logo_url || "",
    };
    const needsAction = entry.source === "OFAC SDN" && entry.listed_on;
    if (!needsAction || designationAction !== undefined) {
      printSanctionsEntryReport({ company, user, entry, designationAction: designationAction || null });
      return;
    }
    // La acción de la OFAC aún no llegó: se abre la ventana dentro del clic (si no,
    // el navegador la bloquea) y se llena cuando llegue la consulta (está en caché).
    const reportWindow = openBlankReportWindow();
    if (!reportWindow) return;
    let action = null;
    try {
      const { data } = await API.get(`/api/aml/watchlists/browse/${entry.id}/designation-action`);
      action = data.action;
      setDesignationAction(action);
    } catch {
      action = null; // se imprime sin la acción de la OFAC
    }
    writeReportToWindow(reportWindow, buildSanctionsEntryReportHtml({ company, user, entry, designationAction: action }));
  };

  return (
    <Dialog open={Boolean(id)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>{entry?.full_name || "Detalle de la entrada"}</span>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title="Imprimir consulta">
            <span>
              <IconButton size="small" onClick={handlePrint} disabled={!entry}>
                <PrintIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {error && <Typography color="error">{error}</Typography>}

        {entry && !loading && (
          <>
            <SectionTitle>Detalles</SectionTitle>
            <Stack direction="row" spacing={1} mb={1}>
              <Chip size="small" label={entry.entry_type} />
              <Chip size="small" variant="outlined" label={entry.source} />
            </Stack>
            <Stack direction="row" flexWrap="wrap" useFlexGap columnGap={4} rowGap={1.5}>
              <DetailField label="Nombre completo" value={entry.full_name} />
              <DetailField label="Apellido" value={entry.last_name} />
              <DetailField label="Nombre" value={entry.first_name} />
              <DetailField label="Título / Cargo" value={entry.title} />
              <DetailField label="Programa(s)" value={entry.programs} />
              <DetailField label="Fecha de inclusión en la lista" value={formatListedOn(entry.listed_on)} />
              {!entry.active && (
                <DetailField
                  label="Fecha de exclusión de la lista"
                  value={
                    entry.delisted_on
                      ? `${formatListedOn(entry.delisted_on)}${entry.delisted_detected ? " (detectada por CrediMaster)" : ""}`
                      : "Retirada (fecha no disponible)"
                  }
                />
              )}
              {!entry.active && (
                <>
                  <DetailField
                    label="Programa(s) al excluirse"
                    value={
                      entry.delisted_programs_info?.length
                        ? entry.delisted_programs_info.map((p) => (p.name_es ? `${p.code} — ${p.name_es}` : p.code)).join("; ")
                        : entry.delisted_programs
                    }
                  />
                  <DetailField label="Base legal de la designación retirada" value={entry.delisted_legal_basis} />
                  {entry.delisted_decided_by && (
                    <DetailField label="Retiro decidido por" value={entry.delisted_decided_by} />
                  )}
                  <DetailField
                    label={entry.delisted_reason_es ? "Motivo de la exclusión (traducción automática)" : "Motivo de la exclusión"}
                    value={
                      entry.delisted_reason_es ||
                      entry.delisted_reason ||
                      (entry.source === "ONU Consolidada" ? "La ONU no publica el motivo del retiro, solo la decisión del Comité." : "No disponible")
                    }
                  />
                  {entry.delisted_reason_es && entry.delisted_reason && (
                    <DetailField label="Motivo — texto oficial de la OFAC" value={entry.delisted_reason} />
                  )}
                  {entry.delisted_reference_url && (
                    <DetailField
                      label="Fuente oficial de la exclusión"
                      value={
                        <Link href={entry.delisted_reference_url} target="_blank" rel="noopener noreferrer">
                          {entry.source === "ONU Consolidada"
                            ? "Aviso oficial que confirma la decisión de la ONU"
                            : "Acción publicada por la OFAC"}
                        </Link>
                      }
                    />
                  )}
                </>
              )}
              <DetailField label="Nacionalidad" value={entry.nationality} />
              <DetailField label="Ciudadanía" value={entry.citizenship} />
              <DetailField label="Fecha de nacimiento" value={entry.date_of_birth} />
              <DetailField label="Lugar de nacimiento" value={entry.place_of_birth} />
            </Stack>
            <Divider sx={{ mt: 2 }} />
            <SectionTitle>Motivo de la inclusión</SectionTitle>
            <SanctionsListingReason entry={entry} onDesignationAction={setDesignationAction} />

            <Divider sx={{ mt: 2 }} />
            <SectionTitle>Identificaciones</SectionTitle>
            {entry.identifications?.length > 0 ? (
              <TableContainer sx={{ border: "1px solid var(--cm-border, #E5E7EB)", borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "var(--cm-surface, #F9FAFB)" }}>
                      <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Número</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>País</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entry.identifications.map((i, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{i.type || "-"}</TableCell>
                        <TableCell>{i.number || "-"}</TableCell>
                        <TableCell>{i.country || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary">Sin identificaciones registradas.</Typography>
            )}

            <SectionTitle>Alias</SectionTitle>
            {entry.aliases?.length > 0 ? (
              <TableContainer sx={{ border: "1px solid var(--cm-border, #E5E7EB)", borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "var(--cm-surface, #F9FAFB)" }}>
                      <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Categoría</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entry.aliases.map((a, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{a.type || "-"}</TableCell>
                        <TableCell>{a.category || "-"}</TableCell>
                        <TableCell>{a.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary">Sin alias registrados.</Typography>
            )}

            {entry.addresses?.length > 0 && (
              <>
                <SectionTitle>Direcciones</SectionTitle>
                <TableContainer sx={{ border: "1px solid var(--cm-border, #E5E7EB)", borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "var(--cm-surface, #F9FAFB)" }}>
                        <TableCell sx={{ fontWeight: 700 }}>Dirección</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Ciudad</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>País</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {entry.addresses.map((a, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{a.address || "-"}</TableCell>
                          <TableCell>{[a.city, a.state].filter(Boolean).join(", ") || "-"}</TableCell>
                          <TableCell>{a.country || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
