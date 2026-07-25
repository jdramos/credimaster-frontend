import { Box, Button, Divider, Stack, Typography } from "@mui/material";

const StudioToolbar = () => {
  return (
    <Box
      sx={{
        height: 56,
        px: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Typography variant="subtitle1" fontWeight={800}>
        CrediMaster Studio
      </Typography>

      <Stack direction="row" spacing={1} alignItems="center">
        <Button size="small" variant="outlined">
          Guardar
        </Button>

        <Button size="small" variant="outlined">
          Ejecutar
        </Button>

        <Button size="small" variant="outlined">
          Vista previa
        </Button>

        <Divider orientation="vertical" flexItem />

        <Button size="small" variant="contained">
          Exportar
        </Button>
      </Stack>
    </Box>
  );
};

export default StudioToolbar;
