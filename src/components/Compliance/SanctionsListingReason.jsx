import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Link, Stack, Typography } from "@mui/material";
import API from "../../api";

// Motivo de la inclusión de una entrada de OFAC/ONU, dentro del detalle:
//   - programa(s) con su nombre oficial en español,
//   - base legal (OFAC) o el Comité de la ONU que decidió la inclusión,
//   - la información publicada sobre la entrada (traducción automática + texto oficial),
//   - OFAC: la acción publicada el día de la designación (comunicados del Tesoro),
//     que se consulta a pedido y queda en caché en el servidor.
// Ni la OFAC ni la ONU publican en sus listas un "motivo" redactado por persona:
// esto es lo que sí publican, sin inventar nada.

const Field = ({ label, children }) => (
  <Box sx={{ mb: 1.25 }}>
    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
      {label}
    </Typography>
    <Box sx={{ typography: "body2", fontWeight: 600 }}>{children}</Box>
  </Box>
);

const Original = ({ children }) => (
  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, fontWeight: 400 }}>
    Texto oficial: {children}
  </Typography>
);

function OfacDesignationAction({ id, onLoaded }) {
  const [state, setState] = useState({ loading: true, action: null, error: "" });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, action: null, error: "" });
    API.get(`/api/aml/watchlists/browse/${id}/designation-action`)
      .then(({ data }) => {
        if (cancelled) return;
        setState({ loading: false, action: data.action, error: "" });
        // El detalle la usa también para la impresión (PDF).
        onLoaded?.(data.action);
      })
      .catch((err) => !cancelled && setState({ loading: false, action: null, error: err.response?.data?.message || "No se pudo consultar a la OFAC." }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (state.loading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">Consultando la acción publicada por la OFAC…</Typography>
      </Stack>
    );
  }
  if (state.error) return <Typography variant="body2" color="text.secondary">{state.error}</Typography>;
  const a = state.action;
  if (!a || !a.found) {
    return <Typography variant="body2" color="text.secondary">La OFAC no tiene una página de acciones para esa fecha.</Typography>;
  }
  return (
    <Box>
      <Typography variant="body2" fontWeight={600}>{a.title_es || a.title_en}</Typography>
      {a.title_es && <Original>{a.title_en}</Original>}
      {a.press_releases?.length > 0 && (
        <Box component="ul" sx={{ pl: 2.5, my: 0.75 }}>
          {a.press_releases.map((p) => (
            <li key={p.url}>
              <Link href={p.url} target="_blank" rel="noopener noreferrer" variant="body2">
                {p.title_es || p.title}
              </Link>
              {p.title_es && <Original>{p.title}</Original>}
            </li>
          ))}
        </Box>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        Acciones publicadas por la OFAC ese día (traducción automática). Si hubo varias, revise cuál corresponde a esta entrada.{" "}
        <Link href={a.url} target="_blank" rel="noopener noreferrer">Ver en el sitio de la OFAC</Link>
      </Typography>
    </Box>
  );
}

export default function SanctionsListingReason({ entry, onDesignationAction }) {
  const isUn = entry.source === "ONU Consolidada";
  const programs = entry.programs_info || [];
  return (
    <Box>
      {programs.length > 0 && (
        <Field label="Programa(s) de sanciones">
          {programs.map((p) => (
            <div key={p.code}>
              {p.code}
              {p.name_es ? ` — ${p.name_es}` : ""}
              {!isUn && p.definition_en && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 400 }}>
                  Fundamento: {p.definition_en}
                </Typography>
              )}
            </div>
          ))}
        </Field>
      )}
      {isUn ? (
        entry.listed_decided_by && <Field label="Decisión de la inclusión">{entry.listed_decided_by}</Field>
      ) : (
        entry.listed_legal_basis && <Field label="Base legal de la designación">{entry.listed_legal_basis}</Field>
      )}
      {(entry.remarks_es || entry.remarks) && (
        <Field label={isUn ? "Información publicada por la ONU (traducción automática)" : "Información publicada por la OFAC (traducción automática)"}>
          {entry.remarks_es || entry.remarks}
          {entry.remarks_es && entry.remarks && <Original>{entry.remarks}</Original>}
        </Field>
      )}
      {!isUn && entry.listed_on && (
        <Field label="Acción de la OFAC el día de la designación">
          <OfacDesignationAction id={entry.id} onLoaded={onDesignationAction} />
        </Field>
      )}
      {isUn && (
        <Typography variant="caption" color="text.secondary">
          El resumen oficial de los motivos de la inclusión está en el sitio del Comité de Sanciones de la ONU.
        </Typography>
      )}
    </Box>
  );
}
