import React, { useState, useEffect } from 'react';
import { TextField, Button, Grid, InputAdornment, IconButton, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Save from '@mui/icons-material/Save';
import Cancel from '@mui/icons-material/Cancel';
import Alert from '@mui/material/Alert';
import { ToastContainer, toast } from 'react-toastify';
import RoleSelect from './RoleSelect';
import Snackbar from '@mui/material/Snackbar';
import ConfirmDialog from './ConfirmDialog';
import BranchAllSelect from './BranchAllSelect';



const URL_API = process.env.REACT_APP_API_BASE_URL;
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };

const UserAdd = ({ onClose, userToEdit }) => {

  const navigate = useNavigate();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const [user, setUser] = useState({
    branch_ids: '',
    user_name: '',
    password: '',
    full_name: '',
    email: '',
    role_id: '',
  });

  const [errors, setErrors] = useState({
    user_name: '',
    password: ''
  });


  const [alert, setAlert] = useState({ alertType: "", alertMessage: "" });
  const [state, setState] = useState({
    open: false,
    vertical: 'top',
    horizontal: 'center',
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetPasswordModal, setResetPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordResetError, setPasswordResetError] = useState('');


  useEffect(() => {
    if (userToEdit) {
      setUser({
        branch_ids: userToEdit.branch_ids || [],
        user_name: userToEdit.user_name || '',
        password: '', // no mostramos la actual
        full_name: userToEdit.full_name || '',
        email: userToEdit.email || '',
        role_id: userToEdit.rol_id || '',
      });
    } else {
      setUser({
        branch_ids: [],
        user_name: '',
        password: '',
        full_name: '',
        email: '',
        role_id: '',
      });
    }

    setErrors({});
    setAlert({ alertType: "", alertMessage: "" });
    setShowPassword(false);
    setIsPasswordValid(false);
  }, [userToEdit]);

  function handleCancel() {
    const hasData = Object.values(user).some(value => {
      if (typeof value === 'string') return value.trim() !== '';
      if (Array.isArray(value)) return value.length > 0;
      return !!value;
    });

    if (hasData) {
      // mostrar confirmación
      setCancelDialog(true);
      setOpenDialog(true);
    } else {
      // cerrar directamente
      if (onClose) onClose(); // si está en modal
      else navigate("/usuarios"); // si no es modal
    }
  }


  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser({
      ...user,
      [name]: value,
    });

    if (name === 'password') {
      validatePassword(value);
    }
  };

  const validatePassword = (password) => {
    const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordPattern.test(password)) {
      setErrors({ ...errors, password: 'La contraseña debe tener al menos 8 caracteres, una letra mayúscula, una minúscula, un número y un carácter especial.' });
      setIsPasswordValid(false);
      return false;
    }
    setErrors({ ...errors, password: '' });
    setIsPasswordValid(true);
    return true;
  };

  const isStrongPassword = (password) => {
    const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordPattern.test(password);
  };

  function validateForm(data) {
    let errors = {};
    let valid = true;

    if (!data.user_name) {
      errors.user_name = 'El nombre de usuario es requerido';
      valid = false;
    }

    if (!data.full_name) {
      errors.full_name = 'El nombre completo es requerido';
      valid = false;
    }

    if (!data.password && !userToEdit) {
      errors.password = 'La contraseña es requerida';
      valid = false;
    }

    if (data.role_id === 0) {
      errors.role_id = 'Seleccione el rol asignado';
      valid = false;
    }

    if (data.branch_ids.length === 0) {
      errors.branch_ids = 'Seleccione al menos una sucursal';
      valid = false;
    }

    setErrors(errors);
    return valid;
  }

  function handleDialogConfirmation() {
    if (cancelDialog) {
      // Confirmación de cancelación
      if (onClose) onClose();
      else navigate("/usuarios");
    } else {
      // Confirmación de guardado
      addUser();
    }
  }



  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setState({ ...state, open: false })
  };

  const addUser = async () => {
    setState({ ...state, open: true });
    const url = userToEdit ? `/api/users/${userToEdit.id}` : `/api/users`;
    const method = userToEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(URL_API + url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(user),
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (responseData.errors && responseData.errors.length > 0) {
          const errorMessages = responseData.errors.map(error => error.msg).join(', ');
          setAlert({ alertType: "error", alertMessage: "Mensaje del servidor: " + errorMessages });
          setOpenDialog(false);
        } else {
          setAlert({ alertType: "success", alertMessage: "Registro guardado exitosamente.." });
        }
      } else {
        setAlert({ alertType: "success", alertMessage: "Registro guardado exitosamente" });
        setOpenDialog(false);

        setTimeout(() => {
          if (onClose) onClose(); // 👉 cerrar el modal después de guardar
          else navigate("/usuarios");
        }, 2000);
      }
    } catch (error) {
      toast.error('Error al crear el usuario:', error);
      setOpenDialog(false);
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();


    if (validateForm(user)) {
      setOpenDialog(true);
      setCancelDialog(false);

    } else {
      toast.error("No es posible guardar, primero corrija errores!");
    }

  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };


  const isNewPasswordValid = isStrongPassword(newPassword);

  const passwordsMatch = newPassword === confirmPassword;


  return (
    <div>
      <Alert
        variant="filled"
        severity={userToEdit ? 'info' : 'success'}
        icon={false}
        className="mt-5"
      >
        <h2>{userToEdit ? 'Editar usuario' : 'Agregar nuevo usuario'}</h2>
      </Alert>




      <form onSubmit={handleSubmit}>
        <div className="shadow-lg p-3 mb-5 bg-body rounded">
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <BranchAllSelect
                multiple={true}
                onChange={handleChange}
                label='Sucursal'
                value={user.branch_ids}
                error={!!errors.branch_ids}
                errorField={errors.branch_ids} />

            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre de Usuario"
                name="user_name"
                value={user.user_name}
                onChange={handleChange}
                error={!!errors.user_name}
                helperText={errors.user_name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre Completo"
                name="full_name"
                value={user.full_name}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={user.email}
                onChange={handleChange}
              />
            </Grid>
            {!userToEdit && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Contraseña"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={user.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  helperText={errors.password}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                        {isPasswordValid && (
                          <IconButton edge="end" disabled>
                            <CheckCircleIcon color="success" />
                          </IconButton>
                        )}
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <RoleSelect
                label="Rol"
                name="role_id"
                value={user.role_id}
                onChange={handleChange}
                error={!!errors.role_id}
                errorField={errors.role_id}
              >

              </RoleSelect>
            </Grid>
            {userToEdit && (
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => {
                    setResetPasswordModal(true)

                  }}
                >
                  Restablecer contraseña
                </Button>
              </Grid>
            )}


          </Grid>
        </div>



        <div>
          <Button
            type="submit"
            variant="contained"
            startIcon={<Save />}
          >
            {userToEdit ? 'Actualizar' : 'Guardar'}
          </Button>


          <Button className="btn btn-primary px-5 me-5" onClick={handleCancel} variant="contained" color="error" startIcon={<Cancel></Cancel>}>
            Cancelar
          </Button>

        </div>


      </form>

      <ToastContainer />
      <Snackbar open={state.open} autoHideDuration={3000} onClose={handleClose}>
        <Alert
          onClose={handleClose}
          severity={alert.alertType}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alert.alertMessage}
        </Alert>
      </Snackbar>
      <ConfirmDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        confirm={handleDialogConfirmation}
        cancel={() => setOpenDialog(false)}
        cancelOperation={cancelDialog}>

      </ConfirmDialog >



      {/* Modal para restablecer contraseña */}
      <Dialog
        open={resetPasswordModal}
        onClose={() => {
          setResetPasswordModal(false);
          setNewPassword('');
          setConfirmPassword('');
          setPasswordResetError('');
        }}
      >
        <DialogTitle>Restablecer contraseña</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Nueva contraseña"
                type={showNewPassword ? 'text' : 'password'}
                fullWidth
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Confirmar contraseña"
                type={showConfirmPassword ? 'text' : 'password'}
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={!passwordsMatch}
                helperText={
                  !passwordsMatch ? 'Las contraseñas no coinciden' : ''
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

            </Grid>
            {passwordResetError && (
              <Grid item xs={12}>
                <Alert severity="error">{passwordResetError}</Alert>
              </Grid>
            )}
            <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
              <Button
                onClick={() => setResetPasswordModal(false)}
                color="inherit"
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                color="primary"
                disabled={!isNewPasswordValid || !passwordsMatch}


                onClick={async () => {

                  if (!newPassword || typeof newPassword !== 'string') {
                    setPasswordResetError("La contraseña es inválida o no está definida.");
                    return;
                  }

                  try {
                    const response = await fetch(`${URL_API}/api/users/${userToEdit.id}/reset-password`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: token,
                      },
                      body: JSON.stringify({ newPassword }),
                    });

                    const data = await response.json()

                    if (!response.ok) {

                      if (data && data.errors) {
                        const mensaje = Array.isArray(data.errors)
                          ? data.errors.map(e => e.msg || e.message).join(', ')
                          : data.errors.message || JSON.stringify(data.errors);

                        setPasswordResetError(mensaje);
                      } else {
                        setPasswordResetError(data.message || 'Error desconocido al restablecer contraseña.');
                      }
                      return
                    }

                    toast.success('Contraseña restablecida correctamente');
                    setResetPasswordModal(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordResetError('');
                  } catch (err) {
                    setPasswordResetError('No se pudo restablecer la contraseña.' + err.message);
                  }
                }}
              >
                Guardar
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>


    </div>


  );
};

export default UserAdd;