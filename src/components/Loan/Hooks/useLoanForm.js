import { useReducer, useEffect, useState } from "react";
import dayjs from "dayjs";

const initialState = {
    customer_identification: "",
    requestDate: dayjs().format("YYYY-MM-DD"),
    branch_id: 0,
    vendor_id: "",
    promoter_id: "",
    amount: 1,
    fee: 0.0,
    deduction: 0.0,
    insurance: 0.0,
    other_charges: 0.0,
    term: 1,
    due_date: dayjs().format("YYYY-MM-DD"),
    loan_group_id: "",
    interest_type_id: 1,
    interest_type_name: "compound",
    interest_rate: 1,
    frequency_id: "",
    frequency_name: "",
    current_balance: 0,
    status: "",
    guaranteeValue: 0.0,
};

function loanReducer(state, action) {
    switch (action.type) {
        case "SET_FIELD":
            return { ...state, [action.field]: action.value };
        case "SET_MULTIPLE":
            return { ...state, ...action.payload };
        case "RESET":
            return initialState;
        default:
            return state;
    }
}

export const useLoanForm = (fetchAmortizationTable) => {
    const [state, dispatch] = useReducer(loanReducer, initialState);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (
            state.amount &&
            state.interest_rate &&
            state.term &&
            state.frequency_id &&
            state.due_date &&
            state.fee >= 0 &&
            state.insurance >= 0 &&
            state.other_charges >= 0
        ) {
            fetchAmortizationTable(state);
        }
    }, [
        state.amount,
        state.interest_rate,
        state.term,
        state.frequency_id,
        state.fee,
        state.insurance,
        state.due_date,
        state.other_charges,
    ]);

    const validateForm = () => {
        let newErrors = {};
        let valid = true;

        if (!state.customer_identification) {
            newErrors.customer_identification = "La identificación del cliente es requerida";
            valid = false;
        }
        if (!state.requestDate) {
            newErrors.requestDate = "La fecha de solicitud es requerida";
            valid = false;
        }
        if (!state.amount || state.amount <= 0) {
            newErrors.amount = "El monto debe ser mayor que cero";
            valid = false;
        }
        if (!state.term) {
            newErrors.term = "El plazo es requerido";
            valid = false;
        }
        if (!state.due_date) {
            newErrors.due_date = "La fecha de vencimiento es requerida";
            valid = false;
        }
        if (!state.interest_rate) {
            newErrors.interest_rate = "La tasa de interés es requerida";
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    return { state, dispatch, errors, validateForm };
};
