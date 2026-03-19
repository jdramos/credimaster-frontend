import React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import Alert from '@mui/material/Alert';

function ConfirmDialog(props) {
    return (
        <div>
            <Dialog
                open={props.open}
                onClose={props.onClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title" className='p-0'>
                    <Alert variant="filled" icon={true} severity="info">
                        <h3>{props.cancelOperation ? "Confirme cancelar operación" : "Confirme guardar registro"}</h3>
                    </Alert>
                </DialogTitle>

                <DialogContent>
                    <DialogContentText id="alert-dialog-description" className='mt-3'>
                        {props.cancelOperation
                            ? "Presione sí para cancelar esta operación, de lo contrario, presione no"
                            : "Presione sí para guardar el registro, de lo contrario, presione no"}
                    </DialogContentText>
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={props.confirm}
                        className="btn px-5 me-5"
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleOutlineIcon />}
                    >
                        Sí
                    </Button>
                    <Button
                        onClick={props.cancel}
                        variant="contained"
                        className="btn px-5 me-5"
                        autoFocus
                        color="error"
                        startIcon={<CancelIcon />}
                    >
                        No
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default ConfirmDialog;