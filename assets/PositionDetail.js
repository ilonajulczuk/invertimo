import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    useParams,
} from "react-router-dom";


import { filterPointsWithNoChange, filterPoints } from './timeseries_utils.js';
import { TimeSelector, daysFromDurationObject } from './TimeSelector.js';
import { EmbeddedTransactionList } from './TransactionList.js';
import { AreaChartWithCursor, LineChartWithCursor } from './components/charts.js';
import { toSymbol } from './currencies';

import './position_list.css';
import {APIClientError} from './api_utils.js';

export function PositionDetail(props) {

    const [chartTimeSelectorOptionId, setChartTimeSelectorOptionId] = useState(3);
    const [chartTimePeriod, setChartTimePeriod] = useState({ months: 3 });
    const [data, setData] = useState(0);
    const [failedLoading, setFailedLoading] = useState(false);

    let handleChartTimeSelectorChange = (selectorOptionId, selectorData) => {
        setChartTimeSelectorOptionId(selectorOptionId);
        setChartTimePeriod(selectorData);
    };

    let { positionId } = useParams();


    let basicData = null;
    for (let position of props.positions) {
        if (position.id == positionId) {
            basicData = position;
        }
    }


    useEffect(() => {
        // This looks like 404 case, no need to fetch additional data.
        if (basicData === null) {
            return;
        }
        try {
            props.getPositionDetail(positionId).then(
                positionDetail => {
                    setData(positionDetail);
                }
            );
        } catch (err) {
            if (err instanceof APIClientError) {
                setFailedLoading(true);
                console.log(err);
            } else {
                throw err;
            }
        }

    });

    if (basicData == null) {
        return (
            <div>
                <h2><a href="../#positions/">Positions</a> / ID: {positionId}</h2>
                <div>Not found :(</div>
            </div>
        );
    }
    let account = props.accounts[0];
    for (let acc of props.accounts) {
        if (acc.id == basicData.account) {
            account = acc;
        }
    }

    const accountCurrency = toSymbol(account.currency);
    const positionCurrency = toSymbol(basicData.asset.currency);
    const value = Math.round(100 * basicData.quantity * basicData.latest_price) / 100;
    let displayConvertedValue = (basicData.asset.currency != account.currency && basicData.latest_exchange_rate);
    let basicHeader = (
        <div className="position-card">
            <div className="position-name">
                <span className="card-label">{basicData.asset.isin}</span>
                <span className="position-symbol">{basicData.asset.symbol}</span>
                <span>{basicData.asset.name}</span>
            </div>

            <div>
                {basicData.asset.exchange.name}
            </div>
            <div>
                <span className="card-label"> Quantity</span>{basicData.quantity}
            </div>
            <div>
                <span className="card-label">Price as of {basicData.latest_price_date}</span>
                {basicData.latest_price} {positionCurrency}
            </div>
            <div className="position-values">
                <div className="column-stack">
                    <span className="card-label">Value as of {basicData.latest_price_date}</span>
                    <span>
                        {value} {positionCurrency}
                    </span>
                    <span>
                        {displayConvertedValue ? Math.round(100 * value * basicData.latest_exchange_rate) / 100 : ""}
                        {displayConvertedValue ? " " + accountCurrency : ""}
                    </span>
                </div>

            </div>

        </div>
    );
    if (data === 0) {
        return <div> <h2><a href="../#positions/">Positions</a> / {basicData.asset.symbol}</h2>
            {basicHeader}
            <div>Loading...</div></div>;
    } else if (failedLoading) {
        return <div>Failed at loading the data...</div>;
    }
    let skipFactor = 1;
    const dataDays = daysFromDurationObject(chartTimePeriod) || 4 * 365;

    if (dataDays > 300) {
        skipFactor = 3;
    }
    const startDay = new Date();
    startDay.setDate(startDay.getDate() - dataDays);
    let quantities = data.quantities;
    if (dataDays) {
        quantities = data.quantities.slice(0, dataDays);
    }
    quantities = quantities.map((elem) => {
        let exactDate = new Date(elem[0]);
        return { date: new Date(exactDate.toDateString()), value: elem[1] };
    });

    let prices = data.prices.map((elem) => {
        let exactDate = new Date(elem.date);
        return { date: new Date(exactDate.toDateString()), value: Number(elem.value) };
    });

    let values = data.values.map((elem) => {
        let exactDate = new Date(elem[0]);
        return { date: new Date(exactDate.toDateString()), value: Number(elem[1]) };
    });

    let valuesAccountCurrency = data.values_account_currency.map((elem) => {
        let exactDate = new Date(elem[0]);
        return { date: new Date(exactDate.toDateString()), value: Number(elem[1]) };
    });
    quantities = filterPointsWithNoChange(quantities, skipFactor);
    prices = filterPoints(prices, skipFactor);
    values = filterPoints(values, skipFactor);
    valuesAccountCurrency = filterPoints(valuesAccountCurrency, skipFactor);

    return (
        <div>

            <h2><a href="../#positions/">Positions</a> / {data.asset.symbol}</h2>
            {basicHeader}
            <div className="position-card-expanded-content">
                <div className="position-card-charts-header">
                    <h3>Charts</h3>
                    <TimeSelector activeId={chartTimeSelectorOptionId} onClick={handleChartTimeSelectorChange} />
                </div>
                <div className="position-card-charts">
                    <div className="position-card-chart">
                        <h3>Price ({positionCurrency})</h3>
                        <LineChartWithCursor dataset={prices} labelSuffix={" " + positionCurrency} startDay={startDay} />
                    </div>

                    <div className="position-card-chart">
                        <h3>Quantity</h3>
                        <AreaChartWithCursor dataset={quantities} startDay={startDay} />
                    </div>
                    <div className="position-card-chart">
                        <h3>Value in trading currency ({positionCurrency})</h3>
                        <LineChartWithCursor dataset={values} labelSuffix={" " + positionCurrency} startDay={startDay} />
                    </div>

                    <div className="position-card-chart">
                        <h3>Value in account currency ({accountCurrency})</h3>
                        <LineChartWithCursor dataset={valuesAccountCurrency} labelSuffix={" " + accountCurrency} startDay={startDay} />
                    </div>

                </div>
                <div>
                    <h3>Transactions & Events</h3>
                    <EmbeddedTransactionList transactions={data.transactions} />
                </div>

            </div>
        </div>

    );
}

PositionDetail.propTypes = {
    accounts: PropTypes.array.isRequired,
    positions: PropTypes.array.isRequired,
    getPositionDetail: PropTypes.func.isRequired,
};