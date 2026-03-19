import dayjs from 'dayjs';

function calculateAge(birthDate) {
    const birthDateObj = dayjs(birthDate);

    const now = dayjs();
    if (birthDateObj.isAfter(now)) {
        throw new Error("birthDate cannot be in the future");
    }

    const age = now.diff(birthDateObj, 'year');
    return age;
}

export default calculateAge;