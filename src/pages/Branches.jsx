import React, { useEffect, useState } from "react";
import BranchesList from '../components/BranchesList'
import BranchAdd from "../components/BranchAdd";
import * as FaIcons from 'react-icons/ri'

function Branches() {
	const [error, setError] = useState(null); // State for error handling
	const [view, setView] = useState(true)


	const isHiden = () => {
		view ? setView(false) : setView(true)
	}

	return (

		<div>
			{!view ?
				<BranchAdd hiden={isHiden}></BranchAdd>
				:
				<BranchesList hiden={isHiden}></BranchesList>
			}


		</div>
	);

}

export default Branches;

