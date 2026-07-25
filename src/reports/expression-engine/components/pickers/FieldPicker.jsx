import { useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
  TextField,
} from "@mui/material";

const FieldPicker = ({ open, fields = [], onSelect, onClose }) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return fields.filter(
      (field) =>
        field.label.toLowerCase().includes(term) ||
        field.name.toLowerCase().includes(term),
    );
  }, [fields, search]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Seleccionar campo</DialogTitle>

      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2 }}
        />

        <List dense>
          {filtered.map((field) => (
            <ListItemButton
              key={field.name}
              onClick={() => {
                onSelect(field);
                onClose();
              }}
            >
              <ListItemText primary={field.label} secondary={field.category} />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
};

export default FieldPicker;
