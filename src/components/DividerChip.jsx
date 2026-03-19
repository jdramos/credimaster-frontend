import React from "react";
import { Chip, Divider } from "@mui/material";

const DividerChip = (props) => {
    return (
        <Divider className="mb-3 mt-2" textAlign="left" >
            <Chip sx={{ fontWeight: 'bold', fontSize: 'medium' }}
                color="primary"
                variant="outlined"
                label={props.label}
                size="medium" />
        </Divider>
    )
}

export default DividerChip;    