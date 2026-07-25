import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";

const OperatorPicker = ({ open, operators = [], onClose, onSelect }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Seleccionar operador</DialogTitle>

      <DialogContent dividers>
        <List dense>
          {operators.map((operator) => (
            <ListItemButton
              key={operator.id}
              onClick={() => {
                onSelect(operator.id);
                onClose();
              }}
            >
              <ListItemText
                primary={`${operator.symbol}   ${operator.label}`}
                secondary={operator.category}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
};

export default OperatorPicker;
