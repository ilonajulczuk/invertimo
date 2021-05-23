import React from 'react';
import './position_list.css';
import { APIClient } from './api_utils.js';
import TimeSelector from './TimeSelector.js';
import { VictoryLine, VictoryChart, VictoryArea, VictoryCursorContainer } from 'victory';


function filterPointsWithNoChange(points, pickEvery) {
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

function filterPoints(points, pickEvery) {
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

function Transaction(props) {
    return (
        <li>{props.data.quantity} for {props.data.price}</li>
    )
}

function findClosestValue(x, data) {
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

};

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
                        return `${datum.x.toLocaleDateString()}, ${y}`;
                    }}
                    stanadlone={true}
                    cursorDimension="x"
                />}
                scale={{ x: "time" }}
                domainPadding={20}
            >
                <VictoryArea
                    style={{ data: { fill: "#e96158" }, labels: { fontSize: 20 } }}
                    data={this.props.dataset}
                    x="date"
                    y="value"
                    domain={{
                        x: [new Date(2020, 1, 1), new Date()],
                    }}
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
                        return `${datum.x.toLocaleDateString()}, ${y}`;
                    }}
                    stanadlone={true}
                    cursorDimension="x"
                />}
                scale={{ x: "time" }}
                domainPadding={20}
            >
                <VictoryLine
                    style={{ data: { stroke: "#e96158" } }}
                    data={this.props.dataset}
                    x="date"
                    y="value"
                    domain={{
                        x: [new Date(2020, 1, 1), new Date()],
                    }}
                />
            </VictoryChart>
        );
    }


}

class ExpandedPositionContent extends React.Component {

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
        const skipFactor = 3;
        let quantities = this.props.data.quantities.map((elem) => {
            let exactDate = new Date(elem[0]);
            return { date: new Date(exactDate.toDateString()), value: elem[1] };
        })

        let prices = this.props.data.prices.map((elem) => {
            let exactDate = new Date(elem.date);
            return { date: new Date(exactDate.toDateString()), value: Number(elem.value) };
        });

        let values = this.computeValues(quantities, prices);

        quantities = filterPointsWithNoChange(quantities, skipFactor);
        prices = filterPoints(prices, skipFactor);
        values = filterPoints(values, skipFactor);

        // Value in local currency.

        // TODO: Value in account currency.

        let transactions = this.props.data.transactions.map(
            (transaction) => <Transaction key={transaction.id} data={transaction} />)

        return (
            <div className="position-card-expanded-content">
                <div className="position-card-charts-header">
                    <h3>Charts</h3>
                    <TimeSelector />
                </div>
                <div className="position-card-charts">
                    <div className="position-card-chart">
                        <h3>Price</h3>
                        <LineChartWithCursor dataset={prices} />
                    </div>

                    <div className="position-card-chart">
                        <h3>Quantity</h3>
                        <AreaChartWithCursor dataset={quantities} />
                    </div>
                    {/* TODO: Change this graph to actually show the value. */}
                    <div className="position-card-chart">
                        <h3>Value</h3>
                        <AreaChartWithCursor dataset={values} />
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