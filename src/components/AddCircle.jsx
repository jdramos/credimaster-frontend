import React from "react";
import { Link } from "react-router-dom";
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

function AddCircle(props) {
    return (
        <Link to={props.goTo}>
            <Tooltip title="Agregar">
                <IconButton aria-label='add' sx={{ color: 'white' }} onClick={props.onClick}>
                    <AddCircleOutlineIcon fontSize="large" />
                </IconButton>
            </Tooltip>
        </Link>
    )
}

export default AddCircle;