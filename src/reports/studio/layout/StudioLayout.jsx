import { Box } from "@mui/material";

import StudioToolbar from "./StudioToolbar";
import StudioSidebar from "./StudioSidebar";
import StudioWorkArea from "./StudioWorkArea";
import StudioPropertiesPanel from "./StudioPropertiesPanel";

const StudioLayout = () => {
  return (
    <Box
      sx={{
        height: "calc(100vh - 80px)",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      <StudioToolbar />

      <Box
        sx={{
          flex: 1,
          display: "flex",
          minHeight: 0,
        }}
      >
        <StudioSidebar />
        <StudioWorkArea />
        <StudioPropertiesPanel />
      </Box>
    </Box>
  );
};

export default StudioLayout;
