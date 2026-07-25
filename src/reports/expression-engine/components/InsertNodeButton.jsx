import { IconButton, Tooltip } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

const InsertNodeButton = ({ onClick }) => {
  return (
    <Tooltip title="Insertar elemento">
      <IconButton
        size="small"
        color="primary"
        onClick={onClick}
        sx={{
          border: "1px dashed",
          borderColor: "divider",
          bgcolor: "background.paper",
          width: 28,
          height: 28,

          "&:hover": {
            bgcolor: "primary.light",
            color: "white",
          },
        }}
      >
        <AddCircleOutlineIcon fontSize="inherit" />
      </IconButton>
    </Tooltip>
  );
};

export default InsertNodeButton;
