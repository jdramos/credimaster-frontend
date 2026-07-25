import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";

import ViewRegistry from "../registry/ViewRegistry";
import { useStudio } from "../context/StudioContext";

const StudioSidebar = () => {
  const { currentSection, setCurrentSection } = useStudio();

  const views = Object.values(ViewRegistry);

  const groups = [...new Set(views.map((view) => view.group))];

  return (
    <Box
      sx={{
        width: 260,
        borderRight: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflowY: "auto",
        py: 1,
      }}
    >
      {groups.map((group) => (
        <Box key={group}>
          <Typography
            variant="caption"
            sx={{
              px: 2,
              pt: 1.5,
              pb: 0.5,
              display: "block",
              color: "text.secondary",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {group}
          </Typography>

          <List dense disablePadding>
            {views
              .filter((view) => view.group === group)
              .map((view) => {
                const IconComponent = view.icon;

                return (
                  <ListItemButton
                    key={view.id}
                    selected={currentSection === view.id}
                    onClick={() => setCurrentSection(view.id)}
                    sx={{
                      mx: 1,
                      borderRadius: 1.5,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {IconComponent ? (
                        <IconComponent fontSize="small" />
                      ) : null}
                    </ListItemIcon>

                    <ListItemText primary={view.title} />
                  </ListItemButton>
                );
              })}
          </List>

          <Divider sx={{ my: 1 }} />
        </Box>
      ))}
    </Box>
  );
};

export default StudioSidebar;
