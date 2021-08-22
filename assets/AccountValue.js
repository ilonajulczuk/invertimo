import React from 'react';
import { AreaChart } from './components/AreaChart.js';
import { TimeSelector, daysFromDurationObject } from './TimeSelector.js';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { ErrorBoundary } from './error_utils.js';
import { SelectPositions } from './SelectPositions.js';
import './account_value.css';

import { toSymbol } from './currencies.js';
import { generateColors } from './colors.js';


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

    const dataDays = daysFromDurationObject(chartTimePeriod) || 4 * 365;
    const startDay = new Date();
    startDay.setDate(startDay.getDate() - dataDays);

    let positionsMap = new Map(props.positions.map(position => [position.id, position]));
    let sortedValues = sortByFirstValue(props.values.slice());

    sortedValues = sortedValues.map(positionIdAndValues => ([positionIdAndValues[0],
    trimDataUntilDate(positionIdAndValues[1], startDay)]));

    // Filter positions that don't have any price data.
    sortedValues = sortedValues.filter(positionIdAndValues => positionIdAndValues[1].length > 0);


    let valuesOfBiggestPositions = sortedValues.slice(0, 9);

    let valuesOfRemainingPositions = sortedValues.slice(9, sortedValues.length);
    valuesOfRemainingPositions = valuesOfRemainingPositions.map(positionIdAndValues => {
        return positionIdAndValues[1];
    });

    const COLORS = generateColors(10);
    let values = valuesOfBiggestPositions.map((positionValues, i) => {
        let row = {
            id: positionsMap.get(positionValues[0]).asset.symbol,
            color: COLORS[i],
            data: positionValues[1].map(elem => {
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
                color: COLORS[9],
                data: remainingValuesCombined,
            }
        );
    }

    let allValuesCombined = addAcrossDates(sortedValues.map(positionIdAndValues => positionIdAndValues[1]), (a, b) => new Date(b) - new Date(a));
    allValuesCombined = allValuesCombined.map(elem => {
        let exactDate = new Date(elem[0]);
        return {
            x: exactDate.toLocaleDateString('en-gb'),
            y: Number(elem[1])
        };
    });
    if (allValuesCombined.length > 0) {
        values.push(
            {
                id: "Total",
                color: "#111",
                data: allValuesCombined,
            }
        );
    }
    if (values.length > 0) {
        let selectedPositions = valuesOfBiggestPositions.map(
            positionIdAndValues => positionsMap.get(positionIdAndValues[0]));

        let positionPercentages = valuesOfBiggestPositions.map(values => {

            return Math.round(
                values[1][0][1] * 100 * 100 / allValuesCombined[0].y) / 100;
        });
        let accountCurrency = toSymbol(props.account.currency);
        return (<div className="account-value-charts">
            <h2>Account &gt; <a href="#">{props.account.nickname}</a></h2>
            <div className="position-card-charts-header">
                <h3>Portfolio value and top positions over time ({accountCurrency})</h3>
            </div>

            <div className="account-value-data-chart">
                <ErrorBoundary>
                    <AreaChart data={values} />
                </ErrorBoundary>
            </div>
            <div>
                <TimeSelector activeId={chartTimeSelectorOptionId} onClick={handleChartTimeSelectorChange} />
            </div>
            <SelectPositions positions={selectedPositions} colors={COLORS} positionPercentages={positionPercentages} />
        </div>);
    } else {

        return (
            <div className="account-value-charts">
                <h2>Account &gt; <a href="#">{props.account.nickname}</a></h2>
                <div>No positions yet, go add some transactions first!</div>
            </div>
        );

    }

}

AccountValue.propTypes = {
    account: PropTypes.object.isRequired,
    positions: PropTypes.array.isRequired,
    values: PropTypes.array.isRequired,
};