import {
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
} from "@mui/material";

import { useReportDefinition } from "../../../custom/context/ReportDefinitionContext";
import InspectorSection from "../../components/InspectorSection";

const FieldProperties = ({ object }) => {
  const { definition, updateField } = useReportDefinition();

  if (!object || object.index === undefined) {
    return null;
  }

  const field = definition.fields[object.index];

  if (!field) {
    return null;
  }

  const handleChange = (changes) => {
    updateField(object.index, changes);
  };

  return (
    <Stack spacing={1}>
      <InspectorSection title="General">
        <Stack spacing={2}>
          <TextField
            label="Etiqueta"
            size="small"
            value={field.label || ""}
            fullWidth
            onChange={(e) =>
              handleChange({
                label: e.target.value,
              })
            }
          />

          <TextField
            label="Nombre interno"
            size="small"
            value={field.name || ""}
            fullWidth
            disabled
          />

          <FormControlLabel
            control={
              <Switch
                checked={field.visible ?? true}
                onChange={(e) =>
                  handleChange({
                    visible: e.target.checked,
                  })
                }
              />
            }
            label="Visible"
          />
        </Stack>
      </InspectorSection>

      <InspectorSection title="Formato">
        <Stack spacing={2}>
          <TextField
            label="Ancho"
            type="number"
            size="small"
            value={field.width || 120}
            onChange={(e) =>
              handleChange({
                width: Number(e.target.value || 0),
              })
            }
          />

          <FormControl size="small" fullWidth>
            <InputLabel>Alineación</InputLabel>
            <Select
              label="Alineación"
              value={field.align || "left"}
              onChange={(e) =>
                handleChange({
                  align: e.target.value,
                })
              }
            >
              <MenuItem value="left">Izquierda</MenuItem>
              <MenuItem value="center">Centro</MenuItem>
              <MenuItem value="right">Derecha</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Formato"
            size="small"
            value={field.format || ""}
            onChange={(e) =>
              handleChange({
                format: e.target.value,
              })
            }
          />
        </Stack>
      </InspectorSection>

      <InspectorSection title="Comportamiento">
        <Stack spacing={1}>
          <FormControlLabel
            control={
              <Switch
                checked={field.wrap ?? false}
                onChange={(e) =>
                  handleChange({
                    wrap: e.target.checked,
                  })
                }
              />
            }
            label="Ajustar texto"
          />

          <FormControlLabel
            control={
              <Switch
                checked={field.totalable ?? false}
                onChange={(e) =>
                  handleChange({
                    totalable: e.target.checked,
                  })
                }
              />
            }
            label="Totalizable"
          />
        </Stack>
      </InspectorSection>
    </Stack>
  );
};

export default FieldProperties;
