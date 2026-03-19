import React from "react";
import { Box, Grid } from "@mui/material";
import LoanForm from "../components/loans/LoanForm";
import LoanList from "../components/loans/LoanList";
import { UserContext } from "../contexts/UserContext";

export default function LoansPage() {
  const user = React.useContext(UserContext);

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <LoanForm onCreated={() => {}} />
        </Grid>

        <Grid item xs={12}>
          <LoanList currentUserId={user?.user?.id || user?.id || null} />
        </Grid>
      </Grid>
    </Box>
  );
}