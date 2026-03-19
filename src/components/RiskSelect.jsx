import React, { useEffect, useState } from "react";
import { FormControl, MenuItem, Autocomplete, TextField, Typography } from "@mui/material";

const url = process.env.REACT_APP_API_BASE_URL + '/api/risks';
const token = process.env.REACT_APP_API_TOKEN;
const headers = {
	Authorization: token,
	"Content-Type": "application/json"
};

const CollectorSelect = (props) => {
	const [risk, setRisk] = useState([]); // State to store fetched data
	const [error, setError] = useState(null); // State for error handling

	useEffect(() => {
		const fetchApi = async () => {


			try {
				const response = await fetch(`${url}`, { headers });
				if (!response.ok) {
					throw new Error('Failed to retrieve data.');
				}
				const jsonData = await response.json();

				if (jsonData.error) {
					setError(jsonData.error);
					setRisk([]);
				} else {
					setError(null);
					setRisk(jsonData || [])
				}

			} catch (error) {
				setError('Failed to retrieve data. Please try again later.');
			}
		};

		fetchApi(); // Call the fetchApi function when the component mounts
	},
	); // Empty dependency array ensures this runs once on mount


	return (
		<FormControl sx={{ mt: 0, mr: 1, minWidth: 300 }} >
			<Autocomplete
				size="small"
				fullWidth
				options={risk}
				getOptionLabel={(option) => `${option.risk_name} `}
				onChange={(event, newValue) => {
					const syntheticEvent = {
						target: {
							name: props.name,
							value: newValue ? newValue.id : ''
						}
					};
					props.onChange(syntheticEvent);
				}}
				renderInput={(params) => (
					<TextField
						{...params}
						label={props.label}
						variant="outlined"
						error={!!error} // Highlight if there's an error
						helperText={error || ''} // Display error message if it exists
					/>
				)}
				renderOption={(props, option) => (
					<MenuItem {...props} key={option.id} value={option.id}>
						<div>
							<Typography variant="body1">{option.risk_name}</Typography>
						</div>
					</MenuItem>
				)}
				error={error}
			/>
			{props.error === 0 ? null : <span className="form-text text-danger">{props.error}</span>}
		</FormControl>
	);
}

export default CollectorSelect;
