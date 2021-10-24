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
import { addAcrossDatesWithFill } from './timeseries_utils.js';

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

function trimDataUntilDate(timeSeries, date, reverse) {
    // Data is expected from newest to oldest, unless it's
    // in reverse order.
    let trimmedTimeSeries = [];
    for (let i = 0; i < timeSeries.length; i++) {
        const index = reverse ? timeSeries.length - i - 1: i;
        if (new Date(timeSeries[index][0]) > date) {
            trimmedTimeSeries.push(timeSeries[index]);
        } else {
            break;
        }
    }
    return trimmedTimeSeries;
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
    trimDataUntilDate(positionIdAndValues[1], startDay)
    ]));

    // Filter positions that don't have any price data.
    sortedValues = sortedValues.filter(positionIdAndValues => positionIdAndValues[1].length > 0);

    let valuesOfBiggestPositions = sortedValues.slice(0, 9);

    let valuesOfRemainingPositions = sortedValues.slice(9, sortedValues.length);
    valuesOfRemainingPositions = valuesOfRemainingPositions.map(positionIdAndValues => {
        return positionIdAndValues[1];
    });

    const COLORS = generateColors(10);

    let values = valuesOfBiggestPositions.map((positionValues, i) => {
        let position = positionsMap.get(positionValues[0]);
        let row = {
            id: position.asset.symbol,
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

    let remainingValuesCombined = addAcrossDatesWithFill(valuesOfRemainingPositions, (a, b) => new Date(b) - new Date(a));
    remainingValuesCombined = trimDataUntilDate(
        remainingValuesCombined,
        startDay,
        true);
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

    // It backfills the values from the last one for a given row.
    // It flips the order of dates from oldest to youngest.
    let allValuesCombined = addAcrossDatesWithFill(sortedValues.map(positionIdAndValues => positionIdAndValues[1]));
    allValuesCombined = trimDataUntilDate(
        allValuesCombined, startDay, true);

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
            if (allValuesCombined.length > 0) {
                return Math.round(
                    values[1][0][1] * 100 * 100 / allValuesCombined[0].y) / 100;
            } else {
                return "NaN";
            }
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