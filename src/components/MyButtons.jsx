import React from "react";
import Button from '@mui/material/Button';
import Save from '@mui/icons-material/Save';
import { Cancel } from '@mui/icons-material';


function SaveButton(props) {
    return (
        <div>
            <Button
                disabled={!props.changed}
                className="btn btn-primary px-5 me-5"
                type="submit"
                variant="contained"
                startIcon={<Save></Save>}>
                Guardar
            </Button>
        </div>

    )

}

function CancelButton(props) {
    return (
        <div>
            <Button
                className="btn btn-primary px-5 me-5"
                onClick={props.handleCancel}
                variant="contained"
                color="error"
                startIcon={<Cancel></Cancel>}>
                Cancelar
            </Button>
        </div>
    )

}

export { SaveButton, CancelButton }