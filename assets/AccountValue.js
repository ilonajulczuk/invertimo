import React from 'react';
import { AreaChart } from './components/AreaChart.js';
import { TimeSelector, daysFromDurationObject } from './TimeSelector.js';
import PropTypes from 'prop-types';
import { useState } from 'react';

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

export function addAcrossDates(rowsOfValues, compareFunc) {
    const NumRows = rowsOfValues.length;
    let indices = new Array(NumRows);
    indices.fill(0);

    if (rowsOfValues.length == 0) {
        return [];
    }
    let combinedValues = [];
    let currentDate = rowsOfValues[0][0][0];
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

    // TODO: instead of slicing, cut the data at the startDay or otherwise
    // there is too much data.

    let biggestValues = sortedValues.slice(0, 9);
    let restOfValues = sortedValues.slice(9, sortedValues.length);
    restOfValues = restOfValues.map(positionIdAndValues => {
        return positionIdAndValues[1].slice(0, dataDays);

    });

    let valuesNivo = biggestValues.map(positionValues => {
        let row = {
            id: positionsMap.get(positionValues[0]).security.symbol,
            data: positionValues[1].slice(0, dataDays).map(elem => {
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

    let restValues = addAcrossDates(restOfValues, (a, b) => new Date(b) - new Date(a));

    restValues = restValues.map(elem => {
        let exactDate = new Date(elem[0]);
        return {
            x: exactDate.toLocaleDateString('en-gb'),
            y: Number(elem[1])
        };
    });

    if (restValues.length > 0) {
        valuesNivo.unshift(
            {
                id: "Other positions combined",
                data: restValues,
            }
        );
    }


    if (valuesNivo.length > 0) {
        return (<div>
            <h2>Hello!</h2>

            <div className="position-card-charts-header">
                <h3>Charts</h3>
                <TimeSelector activeId={chartTimeSelectorOptionId} onClick={handleChartTimeSelectorChange} />
            </div>

            <div style={{ height: 600 }}>
                <AreaChart data={valuesNivo} startDay={startDay} />
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