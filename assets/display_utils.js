

export function trimTrailingDecimalZeroes(numberAsString) {
    // If the number doesn't have a decimal point, then trimming decimal zeroes would
    // instead trim meaningful zeroes.
    // We don't want to do that.
    if (!numberAsString.includes(".")) {
        return numberAsString;
    }
    let end = numberAsString.length - 1;
    while (end > 0) {
        if (numberAsString[end] === "0") {
            end -= 1;
        } else {
            break;
        }
    }
    if (numberAsString[end] === ".") {
        end -= 1;
    }
    return numberAsString.slice(0, end+1);
}