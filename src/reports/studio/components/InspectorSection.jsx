import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const InspectorSection = ({ title, defaultExpanded = true, children }) => {
  return (
    <Accordion defaultExpanded={defaultExpanded} elevation={0} disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" fontWeight={700}>
          {title}
        </Typography>
      </AccordionSummary>

      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
};

export default InspectorSection;
