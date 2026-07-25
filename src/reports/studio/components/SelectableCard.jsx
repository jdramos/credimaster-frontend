import { Box } from "@mui/material";

const SelectableCard = ({ selected = false, onClick, children }) => {
  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected ? "primary.50" : "background.paper",
        cursor: "pointer",
        transition: "all .15s",

        "&:hover": {
          borderColor: "primary.main",
          boxShadow: 1,
        },
      }}
    >
      {children}
    </Box>
  );
};

export default SelectableCard;
