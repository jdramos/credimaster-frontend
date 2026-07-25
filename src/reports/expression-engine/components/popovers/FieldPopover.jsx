import { useMemo, useState } from "react";
import {
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popover,
  TextField,
} from "@mui/material";

const FieldPopover = ({ anchorEl, open, fields = [], onClose, onSelect }) => {
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
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={() => {
        setSearch("");
        onClose();
      }}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
    >
      <Paper
        sx={{
          width: 340,
          maxHeight: 420,
          overflow: "hidden",
        }}
      >
        <TextField
          autoFocus
          placeholder="Buscar campo..."
          size="small"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ p: 1 }}
        />

        <List dense sx={{ maxHeight: 340, overflow: "auto" }}>
          {filtered.map((field) => (
            <ListItemButton
              key={field.name}
              onClick={() => {
                onSelect(field);
                setSearch("");
                onClose();
              }}
            >
              <ListItemText primary={field.label} secondary={field.category} />
            </ListItemButton>
          ))}
        </List>
      </Paper>
    </Popover>
  );
};

export default FieldPopover;
