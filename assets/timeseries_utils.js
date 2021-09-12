
// TODO: write tests for these functions.
export function filterPointsWithNoChange(points, pickEvery) {
    if (points.length <= 2) {
        return points;
    }
    let selectedPoints = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
        // TODO: Refactor this part to facilitate different types of comparisons.
        if ((points[i].value != points[i + 1].value) ||
            (points[i].value != points[i - 1].value)) {
            selectedPoints.push(points[i]);
        } else if (i % pickEvery == 0) {
            selectedPoints.push(points[i]);
        }
    }
    selectedPoints.push(points[points.length - 1]);
    return selectedPoints;
}

export function filterPoints(points, pickEvery) {
    if (points.length <= 2) {
        return points;
    }
    let selectedPoints = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
        if (i % pickEvery == 0) {
            selectedPoints.push(points[i]);
        }
    }
    selectedPoints.push(points[points.length - 1]);
    return selectedPoints;
}

export function findClosestValue(x, data) {
    // Assumes the data is sorted latest to earliest.
    let start = 0;
    let end = data.length - 1;
    let index;
    if (end == -1) {
        return 0;
    }
    if (end == 0) {
        return data[0].value;
    }

    if (data[end].date > x) {
        return 0;
    }

    while (end - start > 1) {
        index = Math.floor((start + end) / 2);
        if (data[index].date > x) {
            start = index;
        } else {
            end = index;
        }
    }
    if (Math.abs(data[start].date - x) < Math.abs(data[end].date - x)) {
        return data[start].value;
    } else {
        return data[end].value;
    }

}

export function combineValues(firstSequence, secondSequence, combineFn) {

    let values = [];
    const maxFirst = firstSequence.length;
    const maxSecond = secondSequence.length;
    let i = 0;
    let j = 0;

    while (i < maxFirst && j < maxSecond) {
        if (firstSequence[i].date > secondSequence[j].date) {
            i += 1;
        } else if (firstSequence[i].date < secondSequence[j].date) {
            j += 1;
        } else {
            values.push(
                {
                    date: firstSequence[i].date,
                    value: combineFn(firstSequence[i].value, secondSequence[j].value)
                });
            j += 1;
            i += 1;
        }
    }
    return values;
}

export function generateDates(startDate, endDate) {
    let dates = [];
    let date = new Date(startDate);
    // Use just dates for comparison as adding a date for long periods of time
    // might result with some "additional hours" due to timezones.
    // If data has the same data, but e.g. is one our later then the last date would
    // be absent.
    const endDateStr = endDate.toISOString().slice(0, 10);
    while (date.toISOString().slice(0, 10) <= endDateStr) {
        // Since the date will be changed in place, we need to make a copy.
        dates.push(new Date(date));
        // Add one more day.
        date.setDate(date.getDate() + 1);
    }
    return dates;
}

export function generateDatesAsStrings(startDate, endDate) {
    let dates = [];
    let date = new Date(startDate.toISOString().slice(0, 10));

    // Use just dates for comparison as adding a date for long periods of time
    // might result with some "additional hours" due to timezones.
    // If data has the same data, but e.g. is one our later then the last date would
    // be absent.
    const endDateStr = endDate.toISOString().slice(0, 10);
    while (date.toISOString().slice(0, 10) <= endDateStr) {
        // Since the date will be changed in place, we need to make a copy.
        dates.push(date.toISOString().slice(0, 10));
        // Add one more day.
        date.setDate(date.getDate() + 1);
    }
    return dates;
}

// TODO: add tests for those two pretty complex functions.

export function addAcrossDates(rowsOfValues, compareFunc) {
    const NumRows = rowsOfValues.length;
    let indices = new Array(NumRows);
    indices.fill(0);

    if (rowsOfValues.length == 0) {
        return [];
    }
    let combinedValues = [];
    const firstRowOfValues = rowsOfValues[0];
    let currentDate = firstRowOfValues[0][0];
    let currentVal = 0;

    let finishedSomeRow = false;
    while (!finishedSomeRow) {

        currentVal = 0;
        for (let i = 0; i < NumRows; i++) {
            let currentIndexForCurrentRow = indices[i];
            if (currentIndexForCurrentRow >= rowsOfValues[i].length) {

                finishedSomeRow = true;
                if (i != NumRows - 1) {
                    currentVal = null;
                }
                break;
            }

            while (compareFunc(rowsOfValues[i][currentIndexForCurrentRow][0], currentDate) < 0) {
                indices[i] += 1;
                currentIndexForCurrentRow = indices[i];
                if (currentIndexForCurrentRow >= rowsOfValues[i].length) {
                    finishedSomeRow = true;
                    break;
                }
            }
            if (currentIndexForCurrentRow >= rowsOfValues[i].length) {
                finishedSomeRow = true;
                break;
            }

            if (compareFunc(rowsOfValues[i][currentIndexForCurrentRow][0], currentDate) == 0) {
                currentVal += rowsOfValues[i][currentIndexForCurrentRow][1];
                indices[i] += 1;
                currentIndexForCurrentRow = indices[i];
            } else {
                currentDate = rowsOfValues[i][currentIndexForCurrentRow][0];
                currentVal = null;
                break;
            }

        }
        if (currentVal != null) {
            combinedValues.push([currentDate, currentVal]);
        }
    }
    return combinedValues;
}

// Each row should have at least one point in it.
export function addAcrossDatesWithFill(rowsOfValues) {
    if (rowsOfValues.length < 1) {
        return [];
    }
    for (let row of rowsOfValues) {
        if (row.length < 1) {
            return [];
        }
    }

    const firstRow = rowsOfValues[0];

    // Latest date is in the beginning.
    let latestDate = new Date(firstRow[0][0]);
    let earliestDate =  new Date(firstRow[firstRow.length -1][0]);
    for (let row of rowsOfValues) {
        const possibleLatestDate = new Date(row[0][0]);
        if (possibleLatestDate > latestDate) {
            latestDate = possibleLatestDate;
        }
        const possibleEarliestDate = new Date(row[row.length - 1][0]);
        if (possibleEarliestDate < earliestDate) {
            earliestDate = possibleEarliestDate;
        }
    }
    // Generate dates.
    const dates = generateDatesAsStrings(earliestDate, latestDate);

    let datesAndValues = dates.map(date => [date, 0]);

    for (let row of rowsOfValues) {
        let lastValue = row[row.length -1][1];
        let rowIndex = row.length - 1;
        for (let i = 0; i < datesAndValues.length; i++) {
            if (rowIndex < 0) {
                datesAndValues[i][1] += lastValue;
                continue;
            }
            if (row[rowIndex][0] == datesAndValues[i][0]) {
                datesAndValues[i][1] += row[rowIndex][1];
                lastValue = row[rowIndex][1];
                rowIndex -= 1;
            } else if (row[rowIndex][0] >  datesAndValues[i][0]){
                datesAndValues[i][1] += lastValue;
            } else {
                // Date is smaller can happen if there are duplicates.
                while(rowIndex > 0 && row[rowIndex][0] < datesAndValues[i][0]) {
                    lastValue = row[rowIndex][1];
                    rowIndex -= 1;
                }
                // Duplicates should be skipped now, let's see if the next value is good.
                if (rowIndex >= 0) {
                    if (row[rowIndex][0] == datesAndValues[i][0]) {
                        datesAndValues[i][1] += row[rowIndex][1];
                        lastValue = row[rowIndex][1];
                        rowIndex -= 1;
                    } else if (row[rowIndex][0] >  datesAndValues[i][0]){
                        datesAndValues[i][1] += lastValue;
                    }
                } else {
                    datesAndValues[i][1] += lastValue;
                }
            }
        }
    }

    return datesAndValues;
}
