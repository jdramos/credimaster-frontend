import React from "react";
import { Alert, Box, Typography } from "@mui/material";

const PlaceholderTab = ({ title }) => {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>

      <Alert severity="info" sx={{ mt: 2 }}>
        Esta sección la conectamos en el siguiente paso.
      </Alert>
    </Box>
  );
};

export default PlaceholderTab;
