import { reduce } from 'lodash';

import Decimal from 'decimal.js';

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

export function roundDecimal(num) {
   return num.mul(100).round().div(100).toString();
}

export function sumAsDecimals(arrayOfStrings) {
    return reduce(arrayOfStrings, (sum, val) => sum.plus(new Decimal(val)), new Decimal('0'));
}

export function to2DecimalPlacesOr4SignificantDigits(number) {
    let value = new Decimal(number);
    if (value.abs().comparedTo(new Decimal(1)) < 0) {
        Decimal.set({
            toExpNeg: -8,
        });
        return value.toSignificantDigits(4).toString();
    } else {
        value = value.mul(100).round().div(100);
        return value.toString();
    }

}