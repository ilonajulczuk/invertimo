import React from 'react';
import { AreaChart } from './components/AreaChart.js';
import { TimeSelector, daysFromDurationObject } from './TimeSelector.js';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { ErrorBoundary } from './error_utils.js';

// TODO: add test for this.
function sortByFirstValue(positions) {

    let values = positions.sort(function (pos1, pos2) {
        let values1 = pos1[1];
        let values2 = pos2[1];
        if (values1.length == 0 || values2.length == 0) {
            return 0;
        }

        return values2[0][1] - values1[0][1];
    }
    );
    return values;

}

function trimDataUntilDate(timeSeries, date) {
    // Data is expected from newest to oldest.
    let trimmedTimeSeries = [];
    for (let i = 0; i < timeSeries.length; i++) {
        if (new Date(timeSeries[i][0]) > date) {
            trimmedTimeSeries.push(timeSeries[i]);
        } else {
            break;
        }
    }
    // In case there aren't any values left, leave the first one.
    if (trimmedTimeSeries.length < 1) {
        return timeSeries.slice(0, 1);
    }
    return trimmedTimeSeries;
}


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



export function AccountValue(props) {

    const [chartTimeSelectorOptionId, setChartTimeSelectorOptionId] = useState(2);
    const [chartTimePeriod, setChartTimePeriod] = useState({ months: 1 });

    let handleChartTimeSelectorChange = (selectorOptionId, selectorData) => {
        setChartTimeSelectorOptionId(selectorOptionId);
        setChartTimePeriod(selectorData);
    };

    let positionsMap = new Map(props.positions.map(position => [position.id, position]));
    let sortedValues = sortByFirstValue(props.values.slice());
    const dataDays = daysFromDurationObject(chartTimePeriod) || 4 * 365;
    const startDay = new Date();
    startDay.setDate(startDay.getDate() - dataDays);

    let valuesOfBiggestPositions = sortedValues.slice(0, 9);
    let valuesOfRemainingPositions = sortedValues.slice(9, sortedValues.length);
    valuesOfRemainingPositions = valuesOfRemainingPositions.map(positionIdAndValues => {
        return trimDataUntilDate(positionIdAndValues[1], startDay);

    });

    let values = valuesOfBiggestPositions.map(positionValues => {
        let row = {
            id: positionsMap.get(positionValues[0]).security.symbol,
            data: trimDataUntilDate(positionValues[1], startDay).map(elem => {
                let exactDate = new Date(elem[0]);
                return {
                    x: exactDate.toLocaleDateString('en-gb'),
                    y: Number(elem[1])
                };
            }

            )
        };
        return row;
    });

    let remainingValuesCombined = addAcrossDates(valuesOfRemainingPositions, (a, b) => new Date(b) - new Date(a));

    remainingValuesCombined = remainingValuesCombined.map(elem => {
        let exactDate = new Date(elem[0]);
        return {
            x: exactDate.toLocaleDateString('en-gb'),
            y: Number(elem[1])
        };
    });

    if (remainingValuesCombined.length > 0) {
        values.unshift(
            {
                id: "Other positions combined",
                data: remainingValuesCombined,
            }
        );
    }

    if (values.length > 0) {
        return (<div>

            <div className="position-card-charts-header">
                <h3>Charts</h3>
                <TimeSelector activeId={chartTimeSelectorOptionId} onClick={handleChartTimeSelectorChange} />
            </div>

            <div style={{ height: 600 }}>
                <ErrorBoundary>

                    <AreaChart data={values}/>
                </ErrorBoundary>
            </div>
        </div>);
    } else {
        return <div>Loading...</div>;
    }

}

AccountValue.propTypes = {
    account: PropTypes.object.isRequired,
    positions: PropTypes.array.isRequired,
    values: PropTypes.array.isRequired,
};