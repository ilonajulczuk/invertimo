import React from 'react';
import './position_list.css';
import { APIClient } from './api_utils.js';
import { filterPointsWithNoChange, filterPoints} from './timeseries_utils.js';
import TimeSelector from './TimeSelector.js';
import { EmbeddedTransactionList } from './TransactionList.js';
import { ErrorBoundary } from './error_utils.js';
import PropTypes from 'prop-types';
import {AreaChartWithCursor, LineChartWithCursor} from './components/charts.js';


class ExpandedPositionContent extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            chartTimeSelectorOptionId: 3,
            chartTimePeriod: { months: 3 },
        };

        this.handleChartTimeSelectorChange = this.handleChartTimeSelectorChange.bind(this);
    }

    handleChartTimeSelectorChange(selectorOptionId, selectorData) {
        this.setState({
            chartTimeSelectorOptionId: selectorOptionId,
            chartTimePeriod: selectorData,
        });
    }

    daysFromDurationObject(duration) {
        if (duration == null) {
            return null;
        }
        let totalDays = 0;
        if (duration.days) {

            totalDays += duration.days;
        }
        if (duration.months) {
            totalDays += duration.months * 31;
        }
        if (duration.years) {
            totalDays += duration.years * 365;
        }
        return totalDays;
    }

    render() {

        let skipFactor = 1;
        const dataDays = this.daysFromDurationObject(this.state.chartTimePeriod) || 4 * 365;

        if (dataDays > 300) {
            skipFactor = 3;
        }
        const startDay = new Date();
        startDay.setDate(startDay.getDate() - dataDays);
        let quantities = this.props.data.quantities;
        if (dataDays) {
            quantities = this.props.data.quantities.slice(0, dataDays);
        }
        quantities = quantities.map((elem) => {
            let exactDate = new Date(elem[0]);
            return { date: new Date(exactDate.toDateString()), value: elem[1] };
        });

        let prices = this.props.data.prices.map((elem) => {
            let exactDate = new Date(elem.date);
            return { date: new Date(exactDate.toDateString()), value: Number(elem.value) };
        });

        let values = this.props.data.values.map((elem) => {
            let exactDate = new Date(elem[0]);
            return { date: new Date(exactDate.toDateString()), value: Number(elem[1]) };
        });

        let valuesAccountCurrency = this.props.data.values_account_currency.map((elem) => {
            let exactDate = new Date(elem[0]);
            return { date: new Date(exactDate.toDateString()), value: Number(elem[1]) };
        });
        quantities = filterPointsWithNoChange(quantities, skipFactor);
        prices = filterPoints(prices, skipFactor);
        values = filterPoints(values, skipFactor);
        valuesAccountCurrency = filterPoints(valuesAccountCurrency, skipFactor);

        let positionCurrency = this.props.data.security.currency;
        let accountCurrency = this.props.account.currency;
        return (
            <div className="position-card-expanded-content">
                <div className="position-card-charts-header">
                    <h3>Charts</h3>
                    <TimeSelector activeId={this.state.chartTimeSelectorOptionId} onClick={this.handleChartTimeSelectorChange} />
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
                    <EmbeddedTransactionList transactions={this.props.data.transactions}/>
                </div>

            </div>
        );
    }
}

ExpandedPositionContent.propTypes = {
    data: PropTypes.object.isRequired,
    account: PropTypes.object.isRequired,
};

class Position extends React.Component {

    render() {
        const data = this.props.data;
        const quantity = data.quantity;
        const price = data.latest_price;
        const value = Math.round(100 * quantity * price) / 100;

        let expandedContent = null;
        if (this.props.active) {
            expandedContent = (
                <ErrorBoundary>
                    <ExpandedPositionContent data={this.props.detailedData} account={this.props.account} />
                </ErrorBoundary>);
        }

        let displayConvertedValue = (data.security.currency != this.props.account.currency && data.latest_exchange_rate);
        return (
            <li >
                <div onClick={this.props.handleClick} className={"position-card " + (this.props.active ? "position-card-active" : "")}>
                    <div className="position-name">
                        <span className="card-label">{data.security.isin}</span>
                        <span className="position-symbol">{data.security.symbol}</span>
                        <span>{data.security.name}</span>
                    </div>

                    <div>
                        {data.security.exchange.name}
                    </div>
                    <div>
                        {quantity}
                    </div>
                    <div>
                        <span className="card-label">As of {data.latest_price_date}</span>
                        {price} {data.security.currency}
                    </div>
                    <div className="position-values">
                        <div className="position-values-spans">
                            <span>
                                {value} {data.security.currency}
                            </span>
                            <span>
                                {displayConvertedValue ? Math.round(100 * value * data.latest_exchange_rate) / 100 : ""}
                                {displayConvertedValue ? " " + this.props.account.currency : ""}
                            </span>
                        </div>

                        <svg className={"arrow-down-svg " + (this.props.active ? "up" : "")}
                            focusable="false" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"></path>
                        </svg>
                    </div>

                </div>

                {expandedContent}

            </li>
        );
    }
}


Position.propTypes = {
    active: PropTypes.bool.isRequired,
    data: PropTypes.object.isRequired,
    detailedData: PropTypes.object,
    handleClick: PropTypes.func.isRequired,
    account: PropTypes.object.isRequired,
};

export default class PositionList extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            positionDetails: {},
            activePosition: null,
        };
        this.apiClient = new APIClient('./api');
        this.handlePositionClick = positionId => () => {
            if (this.state.activePosition == positionId) {

                this.setState({ "activePosition": null });
                return;
            }

            // Don't fetch the info again if it's already available.
            if (positionId in this.state.positionDetails) {
                this.setState({ "activePosition": positionId });
                return;
            }
            this.apiClient.getPositionDetail(positionId).then(
                positionData => {
                    let positionDetails = this.state.positionDetails;
                    positionDetails[positionId] = positionData;
                    this.setState({
                        "positionDetails": positionDetails,
                        "activePosition": positionId
                    });
                }, error => alert(error)
            );
        };
    }

    render() {
        const positionList = this.props.positions.map((position) => {

            let account;
            for (let acc of this.props.accounts) {
                if (acc.id == position.account) {
                    account = acc;
                }
            }

            return (
                <Position key={position["id"]} data={position}
                    handleClick={this.handlePositionClick(position["id"])}
                    active={this.state.activePosition == position["id"]}
                    detailedData={this.state.positionDetails[position["id"]]}
                    account={account}
                />
            );
        }

        );
        return (
            <div>
                <h2>Positions</h2>
                <ul className="position-list">
                    <li className="position-list-header">
                        <ul className="position-list-fields">
                            <li className="position-list-fields-product">
                                Product
                        </li>
                            <li>
                                Exchange
                        </li>
                            <li>
                                Quantity
                        </li>
                            <li>
                                Price
                        </li>
                            <li>
                                Value
                        </li>
                        </ul>
                    </li>
                    {positionList}
                </ul>
            </div>

        );
    }
}

PositionList.propTypes = {
    positions: PropTypes.array.isRequired,
    accounts: PropTypes.array.isRequired,
};