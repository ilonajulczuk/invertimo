

const numberRegex = /^[+-]?\d*(\.\d{0,2})?$/;

export function matchNumberUpToTwoDecimalPlaces(value) {
    return value === undefined || (value + "").match(numberRegex);
}
