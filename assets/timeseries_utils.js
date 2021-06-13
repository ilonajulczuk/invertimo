
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
