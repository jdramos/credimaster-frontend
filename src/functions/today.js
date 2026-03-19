

function today() {
    let today = new Date();
    let offset = today.getTimezoneOffset() * 60000; // Obtiene el desplazamiento de la zona horaria
    let localDate = new Date(today - offset).toISOString().split("T")[0];
    return localDate;
}

export default today;