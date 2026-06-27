import React from "react";
import { MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useReportDefinition } from "../customs/context/ReportDefinitionContext";

const GeneralTab = () => {
  const {
    definition,
    sources,
    updateDefinition,
    changeSource,
    updatePageHeader,
  } = useReportDefinition();

  return (
    <Stack spacing={2} sx={{ maxWidth: 900 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
        Información general
      </Typography>

      <TextField
        select
        label="Fuente de datos"
        value={definition.source || ""}
        onChange={(e) => changeSource(e.target.value)}
      >
        <MenuItem value="">Seleccione...</MenuItem>

        {sources.map((source) => (
          <MenuItem key={source.key} value={source.key}>
            {source.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="Nombre del reporte"
        value={definition.name || ""}
        onChange={(e) => updateDefinition({ name: e.target.value })}
      />

      <TextField
        label="Descripción"
        multiline
        minRows={3}
        value={definition.description || ""}
        onChange={(e) => updateDefinition({ description: e.target.value })}
      />

      <TextField
        label="Subtítulo"
        value={definition.pageHeader?.subtitle || ""}
        onChange={(e) => updatePageHeader({ subtitle: e.target.value })}
      />

      <Stack direction="row" spacing={2}>
        <TextField
          select
          label="Orientación"
          value={definition.orientation || "landscape"}
          onChange={(e) => updateDefinition({ orientation: e.target.value })}
          sx={{ width: 220 }}
        >
          <MenuItem value="portrait">Vertical</MenuItem>
          <MenuItem value="landscape">Horizontal</MenuItem>
        </TextField>

        <TextField
          select
          label="Tamaño de papel"
          value={definition.paperSize || "letter"}
          onChange={(e) => updateDefinition({ paperSize: e.target.value })}
          sx={{ width: 220 }}
        >
          <MenuItem value="letter">Carta</MenuItem>
          <MenuItem value="legal">Legal</MenuItem>
          <MenuItem value="a4">A4</MenuItem>
        </TextField>

        <TextField
          select
          label="Visibilidad"
          value={Number(definition.is_public || 0)}
          onChange={(e) =>
            updateDefinition({ is_public: Number(e.target.value) })
          }
          sx={{ width: 220 }}
        >
          <MenuItem value={0}>Privado</MenuItem>
          <MenuItem value={1}>Público</MenuItem>
        </TextField>
      </Stack>
    </Stack>
  );
};

export default GeneralTab;
