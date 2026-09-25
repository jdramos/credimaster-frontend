import React from "react";
import { Box } from "@mui/material";
import credimasterMark from "../assets/credimaster-mark.png";

// Isotipo de CrediMaster: el mismo arte original (moneda + mano), presentado
// en círculo -- se hace zoom con background-size para recortar el borde
// negro/esquinas cuadradas de la imagen fuente, sin redibujar nada. Ver la
// lámina de marca aprobada por el usuario para el criterio de recorte.
export default function BrandMark({ size = 36, sx = {} }) {
  return (
    <Box
      aria-label="CrediMaster"
      role="img"
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        backgroundImage: `url(${credimasterMark})`,
        backgroundSize: "122% 122%",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        ...sx,
      }}
    />
  );
}
