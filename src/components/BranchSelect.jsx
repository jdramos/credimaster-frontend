import React, { useContext, useEffect, useState } from "react";
import InputLabel from '@mui/material/InputLabel';
import { FormHelperText } from "@mui/material";
import { UserContext } from "../contexts/UserContext";
import { FormControl, MenuItem, Autocomplete, TextField, Typography } from "@mui/material";
import { PropaneSharp } from "@mui/icons-material";

const url = process.env.REACT_APP_API_BASE_URL + '/api/branches';
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };

const BranchSelect = (props) => {
	const [data, setData] = useState([]); // State to store fetched data
	const [error, setError] = useState(null); // State for error handling
	const [selectAll, setSelectAll] = useState(false); // State to track "Select All"
	const [selectedBranches, setSelectedBranches] = useState([]); // Control the selected value
	const { userBranches } = useContext(UserContext);

	useEffect(() => {
		const fetchApi = async () => {
			try {
				const response = await fetch(url, { headers });

				if (!response.ok) {
					throw new Error('Failed to retrieve data.');	
				}
				const jsonData = await response.json();
				const filteredData = jsonData.filter(branch => userBranches.includes(branch.id));
				setData(filteredData); // Update the state with filtered data
			} catch (error) {
				console.error(error);
				setError('Failed to retrieve data. Please try again later.');
			}
		};

		fetchApi(); // Call the fetchApi function when the component mounts
	}, [userBranches]);


	return (
		<FormControl sx={{ mt: 0, ml: 1, minWidth: 200 }} >
			<Autocomplete
				size={props.size}
				fullWidth
				options={data}
				getOptionLabel={(option) => `${option.name} `}
				filterOptions={(options, state) =>
					options.filter(option =>
						option.name.toLowerCase().includes(state.inputValue.toLowerCase())
					)
				}
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
							<Typography variant="body1">{option.name}</Typography>
						</div>
					</MenuItem>
				)}
				error={error}
			/>
			{props.error === 0 ? null : <span className="form-text text-danger">{props.error}</span>}
		</FormControl>
	);
}

export default BranchSelect;
