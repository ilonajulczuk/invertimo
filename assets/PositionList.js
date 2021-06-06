import React from 'react';
import './position_list.css';
import { APIClient } from './api_utils.js';
import { filterPointsWithNoChange, filterPoints, findClosestValue } from './timeseries_utils.js'
import TimeSelector from './TimeSelector.js';
import { ErrorBoundary } from './error_utils.js';
import { VictoryLine, VictoryChart, VictoryArea, VictoryCursorContainer, VictoryAxis } from 'victory';


function Transaction(props) {
    return (
        <li>{props.data.quantity} for {props.data.price}</li>
    )
}


class AreaChartWithCursor extends React.Component {

    render() {
        return (
            <VictoryChart
                height={300}
                width={500}
                padding={{ left: 70, top: 10, right: 140, bottom: 50 }}
                containerComponent={<VictoryCursorContainer
                    cursorLabel={({ datum }) => {
                        let y = findClosestValue(datum.x, this.props.dataset);
                        let labelSuffix = this.props.labelSuffix ? this.props.labelSuffix : '';
                        return `${datum.x.toLocaleDateString()}, ${Math.round(y)}${labelSuffix}`;
                    }}
                    stanadlone={true}
                    cursorDimension="x"
                />}
                scale={{ x: "time" }}
                domain={{
                    x: [this.props.startDay, new Date()],
                }}
                minDomain={{ y: 0 }}
            >
                <VictoryAxis dependentAxis />
                <VictoryAxis style={{
                    tickLabels: { angle: -45, padding: 20 },
                }} />
                <VictoryArea
                    style={{ data: { fill: "#e96158" }, labels: { fontSize: 20 } }}
                    data={this.props.dataset}
                    x="date"
                    y="value"
                />
            </VictoryChart>
        );
    }
}

class LineChartWithCursor extends React.Component {

    render() {
        return (
            <VictoryChart
                height={300}
                width={500}
                padding={{ left: 70, top: 10, right: 140, bottom: 70 }}
                containerComponent={<VictoryCursorContainer
                    cursorLabel={({ datum }) => {
                        let y = findClosestValue(datum.x, this.props.dataset);
                        let labelSuffix = this.props.labelSuffix ? this.props.labelSuffix : '';
                        return `${datum.x.toLocaleDateString()}, ${Math.round(y)}${labelSuffix}`;
                    }}
                    stanadlone={true}
                    cursorDimension="x"
                />}
                scale={{ x: "time" }}
                domain={{
                    x: [this.props.startDay, new Date()],
                }}
                minDomain={{ y: 0 }}
            >
                <VictoryAxis dependentAxis />
                <VictoryAxis style={{
                    tickLabels: { angle: -45, padding: 20 },
                }} />
                <VictoryLine
                    style={{ data: { stroke: "#e96158" } }}
                    data={this.props.dataset}
                    x="date"
                    y="value"

                />
            </VictoryChart>
        );
    }
}

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
        const today = new Date();
        let startDay = today.setDate(today.getDate() - dataDays);
        let quantities = this.props.data.quantities;
        if (dataDays) {
            quantities = this.props.data.quantities.slice(0, dataDays);
        }
        quantities = quantities.map((elem) => {
            let exactDate = new Date(elem[0]);
            return { date: new Date(exactDate.toDateString()), value: elem[1] };
        })

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


        let transactions = this.props.data.transactions.map(
            (transaction) => <Transaction key={transaction.id} data={transaction} />)

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
                    <ul>{transactions}</ul>
                </div>

            </div>
        );
    }
}


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
                    <div>
                        <span>
                            {value} {data.security.currency}
                        </span>
                        <span>
                            {displayConvertedValue ? Math.round(100 * value * data.latest_exchange_rate) / 100 : ""}
                            {displayConvertedValue ? " " + this.props.account.currency : ""}
                        </span>

                    </div>
                </div>

                {expandedContent}

            </li>
        )
    }
}


export default class PositionList extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            positionDetails: {},
            activePosition: null,
        };
        this.apiClient = new APIClient('./api');
        this.handlePositionClick = positionId => _ => {
            console.log(this.state.activePosition, positionId);
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

        )
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

        )
    }
}