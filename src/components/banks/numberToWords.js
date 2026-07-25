// Convierte un monto a letras en español, formato típico de cheque
// (ej. "NUEVE MIL CON 00/100"). Soporta hasta 999,999,999.99.

const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const DECENAS_10_19 = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
const DECENAS = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

// Apócope: "veintiUNO"/"...y UNO" pierden la "O" al modificar un sustantivo
// masculino ("veintiún mil", "treinta y un mil"), no aplica a "uno" solo.
const apocopar = (texto) => texto.replace(/UNO$/, "UN");

const seccion = (num, divisor, singular, plural) => {
  const cientos = Math.floor(num / divisor);
  const resto = num % divisor;
  let letras = "";

  if (cientos > 0) {
    letras = cientos === 1 ? singular : `${apocopar(convertirGrupo(cientos))} ${plural}`;
  }

  return { letras, resto };
};

const convertirGrupo = (num) => {
  if (num === 0) return "";
  if (num < 10) return UNIDADES[num];
  if (num < 20) return DECENAS_10_19[num - 10];
  if (num < 100) {
    const d = Math.floor(num / 10);
    const u = num % 10;
    if (num === 20) return "VEINTE";
    if (num < 30) return `VEINTI${UNIDADES[u]}`;
    return u > 0 ? `${DECENAS[d]} Y ${UNIDADES[u]}` : DECENAS[d];
  }
  if (num === 100) return "CIEN";
  const c = Math.floor(num / 100);
  const resto = num % 100;
  return resto > 0 ? `${CENTENAS[c]} ${convertirGrupo(resto)}` : CENTENAS[c];
};

export const numberToWords = (value) => {
  const amount = Math.abs(Number(value) || 0);
  const entero = Math.floor(amount);
  const centavos = Math.round((amount - entero) * 100);

  let resto = entero;
  let partes = [];

  const millones = seccion(resto, 1000000, "UN MILLON", "MILLONES");
  if (millones.letras) partes.push(millones.letras);
  resto = millones.resto;

  const miles = seccion(resto, 1000, "MIL", "MIL");
  if (miles.letras) partes.push(miles.letras === "MIL" ? "MIL" : miles.letras);
  resto = miles.resto;

  const grupoFinal = convertirGrupo(resto);
  if (grupoFinal) partes.push(grupoFinal);

  const letras = partes.length ? partes.join(" ") : "CERO";

  return `${letras} CON ${String(centavos).padStart(2, "0")}/100`;
};

export default numberToWords;
