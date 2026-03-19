import React, { useContext, useEffect, useState } from "react";
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import { FormHelperText } from "@mui/material";
import { UserContext } from "../contexts/UserContext";

const url = process.env.REACT_APP_API_BASE_URL + '/api/branches';
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };

const BranchMultipleSelect = (props) => {
	const [data, setData] = useState([]);
	const [error, setError] = useState(null);
	const [selectedBranches, setSelectedBranches] = useState([]);
	const [loading, setLoading] = useState(true);
	const { userBranches } = useContext(UserContext);

	useEffect(() => {
		const fetchApi = async () => {
			try {
				setLoading(true);
				const response = await fetch(url, { headers });

				if (!response.ok) {
					throw new Error('Failed to retrieve data.');
				}

				const jsonData = await response.json();
				const filteredData = jsonData.filter(branch => userBranches.includes(branch.id));
				setData(jsonData);
			} catch (error) {
				console.error(error);
				setError('Failed to retrieve data. Please try again later.');
			} finally {
				setLoading(false);
			}
		};

		fetchApi();
	}, [userBranches]);

	useEffect(() => {
		// Reset selection if userBranches change
		setSelectedBranches([]);
	}, [userBranches]);

	const handleSelectAll = () => {
		const allSelected = selectedBranches.length === data.length;
		const newSelection = allSelected ? [] : [...data];
		setSelectedBranches(newSelection);

		const syntheticEvent = {
			target: {
				name: 'branch_ids',
				value: newSelection.map(branch => branch.id)
			}
		};
		props.onChange(syntheticEvent);
	};

	const handleChange = (event, newValue) => {
		if (!Array.isArray(newValue)) newValue = [];

		setSelectedBranches(newValue);

		const syntheticEvent = {
			target: {
				name: 'branch_ids',
				value: newValue.map(branch => branch.id)
			}
		};
		props.onChange(syntheticEvent);
	};

	return (
		<FormControl sx={{ mt: 0, mr: 1, ml: 1, minWidth: 240 }} size="small" error={props.error}>
			<Autocomplete
				multiple
				loading={loading}
				options={data}
				size="small"
				disableCloseOnSelect
				getOptionLabel={(option) => option.name}
				value={userBranches.filter(branch => props.value?.includes(branch.id))}
				onChange={handleChange}
				renderInput={(params) => (
					<TextField
						{...params}
						label={props.label || "Sucursales"}
						variant="outlined"
						error={!!error}
						helperText={error || ''}
						placeholder="Selecciona sucursales..."
						InputProps={{
							...params.InputProps,
							endAdornment: (
								<>
									{loading ? <CircularProgress color="inherit" size={20} /> : null}
									{params.InputProps.endAdornment}
								</>
							),
						}}
					/>
				)}
				renderOption={(props, option, { selected }) => (
					<li {...props} key={option.id}>
						<Checkbox
							style={{ marginRight: 8 }}
							checked={selected}
						/>
						{option.name}
					</li>
				)}
			/>

			{/* Botón "Seleccionar todas" */}
			<FormHelperText>
				<span
					onClick={handleSelectAll}
					style={{
						color: '#1976d2',
						cursor: 'pointer',
						textDecoration: 'underline',
						fontSize: '0.8rem',
					}}
				>
					{selectedBranches.length === data.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
				</span>
			</FormHelperText>

			{/* Error de validación desde props */}
			{props.errorField && <FormHelperText>{props.errorField}</FormHelperText>}
		</FormControl>
	);
};

export default BranchMultipleSelect;
