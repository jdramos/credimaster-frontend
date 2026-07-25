import { Alert, Stack } from "@mui/material";

const ExpressionErrors = ({ errors = [] }) => {
  if (!errors.length) return null;

  return (
    <Stack spacing={1}>
      {errors.map((error, index) => (
        <Alert key={index} severity="warning">
          {error}
        </Alert>
      ))}
    </Stack>
  );
};

export default ExpressionErrors;
