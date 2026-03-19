import React from "react";
import { Link } from "react-router-dom";
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Add from '@mui/icons-material/Add';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';


function EmptyNotice(props) {
	return (
		<div>
			<Card className="mt-5">
				<Alert severity="info" className="">
					<Box sx={{ p: 2 }}>
						No hay registros disponible, agregue uno nuevo.
					</Box>
					<Divider />
					<Box sx={{ p: 2 }}>
						<div>
							<Link to={props.route}>
								<Button height="10px" variant="contained" startIcon={<Add></Add>}>
									Agregar
								</Button>
							</Link>
						</div>
					</Box>
				</Alert>
			</Card>
		</div>
	)
}

export default EmptyNotice;