import { TextField } from "@mui/material";

const SearchField = ({ value, onChange }) => {
  return (
    <TextField
      label="Buscar campo"
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
    />
  );
};

export default SearchField;
