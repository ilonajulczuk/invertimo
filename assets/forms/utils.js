const number2Regex = /^[+-]?\d*(\.\d{0,2})?$/;
const number10Regex = /^[+-]?\d*(\.\d{0,10})?$/;


export function matchNumberUpToTwoDecimalPlaces(value) {
    return value === undefined || (value + "").match(number2Regex);
}


export function matchNumberUpToTenDecimalPlaces(value) {
    return value === undefined || (value + "").match(number10Regex);
}


export function roundToTwoDecimalString(toRound) {
    const originalAmount = Number(toRound);
    const roundedAmount = Math.round(originalAmount * 100) / 100;
    return  originalAmount === roundedAmount ? originalAmount : "~" + roundedAmount;
}
