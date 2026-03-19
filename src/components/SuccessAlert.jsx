import React from "react";
import { Link } from 'react-router-dom';

function SuccessAlert(props) {
    return (
        <div className="card w-75 mb-3 mx-auto p-2 shadow p-3 mb-5 bg-body-tertiary rounded mt-5">
            <div className="alert alert-success" role="alert">
                {props.description}
            </div>
            {props.button}
        </div >
    );
}

export default SuccessAlert;