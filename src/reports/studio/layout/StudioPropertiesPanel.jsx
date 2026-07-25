import { Box, Divider, Stack, Typography } from "@mui/material";

import { useStudio } from "../context/StudioContext";

import PropertyRegistry from "../properties/PropertyRegistry";

const StudioPropertiesPanel = () => {
  const { selectedObject } = useStudio();

  const type = selectedObject?.type || "empty";

  const Editor = PropertyRegistry[type] || PropertyRegistry.empty;

  return (
    <Box
      sx={{
        width: 320,
        borderLeft: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflowY: "auto",
        p: 2,
      }}
    >
      <Stack spacing={2}>
        <Typography variant="overline" color="primary" fontWeight={700}>
          INSPECTOR
        </Typography>

        <Divider />

        <Editor object={selectedObject} />
      </Stack>
    </Box>
  );
};

export default StudioPropertiesPanel;
