import { useState } from "react";

import { Chip } from "@mui/material";

import CalculateIcon from "@mui/icons-material/Calculate";

import FieldPopover from "../popovers/FieldPopover";

const FieldChip = ({ node, fields = [], onChange, onRemove }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const field = fields.find((f) => f.name === node.value);

  return (
    <>
      <Chip
        icon={<CalculateIcon />}
        clickable
        color="primary"
        variant="filled"
        label={field?.label || "Seleccionar campo"}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        onDelete={onRemove}
      />

      <FieldPopover
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        fields={fields}
        onClose={() => setAnchorEl(null)}
        onSelect={(field) => {
          onChange({
            value: field.name,
          });
        }}
      />
    </>
  );
};

export default FieldChip;
