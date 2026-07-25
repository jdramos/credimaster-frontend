import { Box } from "@mui/material";

import Toolbar from "./components/Toolbar";
import Sidebar from "./components/Sidebar";
import WorkArea from "./components/WorkArea";

const StudioLayout = ({ currentSection, onSectionChange, children }) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Toolbar />

      <Box
        sx={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <Sidebar
          currentSection={currentSection}
          onSectionChange={onSectionChange}
        />

        <WorkArea>{children}</WorkArea>
      </Box>
    </Box>
  );
};

export default StudioLayout;
