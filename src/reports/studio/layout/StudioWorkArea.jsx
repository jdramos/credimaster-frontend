import { Box, Paper } from "@mui/material";

import ViewRegistry from "../registry/ViewRegistry";
import { useStudio } from "../context/StudioContext";
import StudioNavigator from "../navigation/StudioNavigator";
import WorkspaceLayout from "./WorkspaceLayout";

const StudioWorkArea = () => {
  const { currentSection } = useStudio();

  const view = ViewRegistry[currentSection];

  return (
    <Box
      sx={{
        flex: 1,
        overflow: "auto",
        bgcolor: "#f5f6f8",
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          minHeight: "100%",
          p: 3,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <WorkspaceLayout
          group={view?.group || "Studio"}
          title={view?.title || "Vista"}
          description={view?.description}
        >
          <StudioNavigator />
        </WorkspaceLayout>
      </Paper>
    </Box>
  );
};

export default StudioWorkArea;
