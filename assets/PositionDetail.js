import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    useParams,
} from "react-router-dom";

import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';

import { filterPointsWithNoChange, filterPoints } from './timeseries_utils.js';
import { TimeSelector, daysFromDurationObject } from './TimeSelector.js';
import { EmbeddedTransactionList } from './TransactionList.js';
import { EmbeddedDividendList, EmbeddedIncomeEventList } from './EventList.js';
import { AreaChartWithCursor, LineChartWithCursor } from './components/charts.js';
import { toSymbol } from './currencies';

import _ from 'lodash';

import './position_list.css';
import { APIClientError } from './api_utils.js';
import { PositionLink } from './components/PositionLink.js';

import { roundToTwoDecimalString } from './forms/utils.js';


function PositionHeader({ position, positionCurrency, accountCurrency, account }) {
    const value = position.quantity * position.latest_price;
    const valueDisplay = roundToTwoDecimalString(value);
    const displayConvertedValue = (
        positionCurrency != accountCurrency
        && position.latest_exchange_rate);

    const valueAccountCurrency = displayConvertedValue ? (value * position.latest_exchange_rate) : value;
    const valueAccountCurrencyDisplay = roundToTwoDecimalString(valueAccountCurrency);

    const unrealizedGain = roundToTwoDecimalString(Number(position.cost_basis) + Number(valueAccountCurrency));

    return (
        <div className="position-card">
            <PositionLink position={position} account={account} />

            <div>
                <span className="card-label">Asset type</span>
                {position.asset.asset_type}
            </div>
            <div>
                <span className="card-label">Exchange</span>
                <span>{position.asset.exchange.name}</span>
            </div>
            <div>
                <span className="card-label">Quantity</span>{Number(position.quantity)}
            </div>
            <div>
                <span className="card-label">Price as of {position.latest_price_date}</span>
                {Number(position.latest_price)} {positionCurrency}
            </div>
            <div className="position-values">
                <div className="column-stack">
                    <span className="card-label">Value as of {position.latest_price_date}</span>
                    <span>
                        {valueDisplay} {positionCurrency}
                    </span>
                    <span>
                        {displayConvertedValue ? valueAccountCurrencyDisplay + " " + accountCurrency : ""}
                    </span>

                </div>
            </div>
            <div className="position-values">
                <div className="column-stack">
                    <span className="card-label">Unrealized gain</span>
                    <span>
                        {unrealizedGain + " " + accountCurrency}

                    </span>

                    <span className="card-label">Realized gain</span>
                    <span>
                        {Number(position.realized_gain) + " " + accountCurrency}
                    </span>
                </div>
            </div>
        </div>
    );

}

PositionHeader.propTypes = {
    position: PropTypes.shape({
        latest_price_date: PropTypes.string.isRequired,
        quantity: PropTypes.string.isRequired,
        latest_exchange_rate: PropTypes.string,
        latest_price: PropTypes.string.isRequired,
        asset: PropTypes.object.isRequired,
        realized_gain: PropTypes.string.isRequired,
        cost_basis: PropTypes.string.isRequired,
    }),
    account: PropTypes.object.isRequired,
    positionCurrency: PropTypes.string.isRequired,
    accountCurrency: PropTypes.string.isRequired,
};


export function PositionDetail(props) {
    const [chartTimeSelectorOptionId, setChartTimeSelectorOptionId] = useState(3);
    const [chartTimePeriod, setChartTimePeriod] = useState({ months: 3 });
    const [data, setData] = useState(null);
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
    let basicHeader = <PositionHeader position={basicData} account={account}
        accountCurrency={accountCurrency}
        positionCurrency={positionCurrency} />;

    if (data === null) {
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

    const dividendEvents = _.filter(data.events, event => event.event_type == "DIVIDEND");
    const incomeEvents = _.filter(data.events,
        event => event.event_type == "STAKING_INTEREST" || event.event_type == "SAVINGS_INTEREST");

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
                    <div className="header-with-buttons">
                        <h3>Transactions</h3>
                        <Button
                            href={`#/transactions/record?asset=${data.asset.id}`}
                            variant="contained"
                            color="secondary"
                        >
                            <Icon>create</Icon>
                            Record transaction
                        </Button>
                    </div>
                    <EmbeddedTransactionList transactions={data.transactions} />
                </div>
                <div>
                    {dividendEvents.length > 0 ?
                        <><div className="header-with-buttons">
                            <h3>Dividends</h3>
                            <Button
                                href="#/events/record_dividend"
                                variant="contained"
                                color="secondary"
                            >
                                <Icon>paid</Icon>
                                Record dividend
                            </Button>
                        </div>
                            <EmbeddedDividendList
                                events={dividendEvents}
                                position={basicData}
                            />
                        </>
                        : null
                    }
                    {incomeEvents.length > 0 ? <>
                        <div className="header-with-buttons">
                            <h3>Income</h3>
                        </div>
                        <EmbeddedIncomeEventList
                            events={incomeEvents}
                            position={basicData}
                            account={account}
                        />

                    </> : null}


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