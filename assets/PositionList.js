import React from 'react';
import './position_list.css';
import { APIClient } from './api_utils.js';
import { filterPointsWithNoChange, filterPoints, findClosestValue } from './timeseries_utils.js'
import TimeSelector from './TimeSelector.js';
import { VictoryLine, VictoryChart, VictoryArea, VictoryCursorContainer } from 'victory';


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
                    x: [new Date(2020, 1, 1), new Date()],
                }}
                minDomain={{ y: 0}}
            >
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
                    x: [new Date(2020, 1, 1), new Date()],
                }}
                minDomain={{ y: 0}}
            >
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
        const skipFactor = 3;
        this.quantities = this.props.data.quantities.map((elem) => {
            let exactDate = new Date(elem[0]);
            return { date: new Date(exactDate.toDateString()), value: elem[1] };
        })

        this.prices = this.props.data.prices.map((elem) => {
            let exactDate = new Date(elem.date);
            return { date: new Date(exactDate.toDateString()), value: Number(elem.value) };
        });

        this.values = this.computeValues(this.quantities, this.prices);

        this.quantities = filterPointsWithNoChange(this.quantities, skipFactor);
        this.prices = filterPoints(this.prices, skipFactor);
        this.values = filterPoints(this.values, skipFactor);
    }

    computeValues(quantities, prices) {

        let values = [];
        const maxQ = quantities.length;
        const maxP = prices.length;
        let i = 0;
        let j = 0;

        while (i < maxQ && j < maxP) {
            if (quantities[i].date > prices[j].date) {
                i += 1;
            } else if (quantities[i].date < prices[j].date) {
                j += 1;
            } else {
                values.push(
                    {
                        date: quantities[i].date,
                        value: quantities[i].value * prices[j].value
                    });
                j += 1;
                i += 1;
            }
        }
        return values;
    }

    render() {
        // TODO: Value in account currency.

        let transactions = this.props.data.transactions.map(
            (transaction) => <Transaction key={transaction.id} data={transaction} />)

        let positionCurrency = this.props.data.security.currency;
        let accountCurrency = this.props.accountCurrency;
        return (
            <div className="position-card-expanded-content">
                <div className="position-card-charts-header">
                    <h3>Charts</h3>
                    <TimeSelector />
                </div>
                <div className="position-card-charts">
                    <div className="position-card-chart">
                        <h3>Price ({positionCurrency})</h3>
                        <LineChartWithCursor dataset={this.prices} labelSuffix={" " + positionCurrency}/>
                    </div>

                    <div className="position-card-chart">
                        <h3>Quantity</h3>
                        <AreaChartWithCursor dataset={this.quantities} />
                    </div>
                    <div className="position-card-chart">
                        <h3>Value ({positionCurrency})</h3>
                        <LineChartWithCursor dataset={this.values} labelSuffix={" " + positionCurrency} />
                    </div>

                    <div className="position-card-chart">
                        <h3>Value ({accountCurrency})</h3>
                        <LineChartWithCursor dataset={this.values} labelSuffix={" " + positionCurrency} />
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
            expandedContent = <ExpandedPositionContent data={this.props.detailedData} />;
        }

        return (
            <li onClick={this.props.handleClick}>
                <div className={"position-card " + (this.props.active ? "position-card-active" : "")}>
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
                        {value} {data.security.currency}
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
        const positionList = this.props.positions.map((position) => (
            <Position key={position["id"]} data={position}
                handleClick={this.handlePositionClick(position["id"])}
                active={this.state.activePosition == position["id"]}
                detailedData={this.state.positionDetails[position["id"]]} />
        ))
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