import React from 'react';
import './position_list.css';
import { APIClient } from './api_utils.js';

import { VictoryVoronoiContainer, VictoryLine, VictoryChart, VictoryTooltip, VictoryTheme, VictoryArea } from 'victory';


function filterPointsWithNoChange(points, pickEvery) {
    if (points.length <= 2) {
        return points;
    }
    let selectedPoints = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
        // TODO: Refactor this part to facilitate different types of comparisons.
        if ((points[i][1] != points[i + 1][1]) ||
            (points[i][1] != points[i - 1][1])) {
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


class ExpandedPositionContent extends React.Component {

    render() {
        const skipFactor = 14;
        let quantities = filterPointsWithNoChange(this.props.data.quantities, skipFactor);
        let dataQuantities = quantities.map((elem) => {
            return { date: new Date(elem[0]), value: elem[1] };
        });

        let prices = filterPoints(this.props.data.prices, skipFactor);
        let dataPrices = prices.map((elem) => {
            return { date: new Date(elem.date), value: Number(elem.value) };
        });
        return (
            <div className="position-card-expanded-content">
                <div className="position-card-chart">
                    <h3>Numbers of shares over time</h3>
                    <VictoryChart
                        height={400}
                        width={800}
                        containerComponent={<VictoryVoronoiContainer />}
                        scale={{ x: "time" }}
                        // domainPadding will add space to each side of VictoryBar to
                        // prevent it from overlapping the axis
                        domainPadding={20}
                    >
                        <VictoryArea
                            style={{ data: { fill: "#e96158" } }}
                            data={dataQuantities}
                            x="date"
                            y="value"
                            labels={({ datum }) => `At ${datum.date.toLocaleDateString()}\n${datum.value}`}
                            labelComponent={<VictoryTooltip />}
                        />
                    </VictoryChart>
                </div>

                <div className="position-card-chart">
                    <h3>Price over time</h3>
                    <VictoryChart
                        height={400}
                        width={800}
                        containerComponent={<VictoryVoronoiContainer />}
                        scale={{ x: "time" }}
                        // domainPadding will add space to each side of VictoryBar to
                        // prevent it from overlapping the axis
                        domainPadding={20}
                    >
                        <VictoryLine
                            style={{ data: { stroke: "#e96158" } }}
                            data={dataPrices}
                            x="date"
                            y="value"
                            labels={({ datum }) => `At ${datum.date.toLocaleDateString()}\n${datum.value}`}
                            labelComponent={<VictoryTooltip />}
                        />
                    </VictoryChart>
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