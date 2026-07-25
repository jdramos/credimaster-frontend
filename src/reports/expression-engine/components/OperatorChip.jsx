import { useState } from "react";
import { Chip } from "@mui/material";

import OperatorPicker from "./pickers/OperatorPicker";

const OperatorChip = ({ value, operators = [], onChange }) => {
  const [open, setOpen] = useState(false);

  const operator = operators.find((item) => item.id === value) || operators[0];

  return (
    <>
      <Chip
        clickable
        color="secondary"
        variant="outlined"
        label={operator?.symbol || "+"}
        onClick={() => setOpen(true)}
      />

      <OperatorPicker
        open={open}
        operators={operators}
        onClose={() => setOpen(false)}
        onSelect={onChange}
      />
    </>
  );
};

export default OperatorChip;
