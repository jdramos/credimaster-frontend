import { Box, Breadcrumbs, Divider, Stack, Typography } from "@mui/material";

const WorkspaceLayout = ({
  group,
  title,
  description,
  actions = null,
  children,
  footer = null,
}) => {
  return (
    <Box>
      <Stack spacing={2}>
        <Box>
          <Breadcrumbs sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {group}
            </Typography>

            <Typography variant="body2" color="text.primary">
              {title}
            </Typography>
          </Breadcrumbs>

          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography variant="h5" fontWeight={800}>
                {title}
              </Typography>

              {description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {description}
                </Typography>
              )}
            </Box>

            {actions}
          </Stack>
        </Box>

        <Divider />

        <Box>{children}</Box>

        {footer && (
          <>
            <Divider />
            <Box>{footer}</Box>
          </>
        )}
      </Stack>
    </Box>
  );
};

export default WorkspaceLayout;
