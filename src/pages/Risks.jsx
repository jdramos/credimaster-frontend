import React, { useEffect, useState } from "react";
import RiskList from '../components/RiskList'
import * as FaIcons from 'react-icons/ri'

function Risks() {
    const [error, setError] = useState(null); // State for error handling
    const [view, setView] = useState(true)


    const isHiden = () => {
        view ? setView(false) : setView(true)
    }

    return (

        <div>


            <RiskList hiden={isHiden}></RiskList>


        </div>
    );

}

export default Risks;

