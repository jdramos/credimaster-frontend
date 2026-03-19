import React from "react";

function AddButton(props) {
    return (<div>
        <button on onClick={props.onClick} className="btn btn-primary px-5 me-5">{props.caption}</button>
    </div>)
}

export default AddButton;