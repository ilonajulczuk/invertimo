import React from 'react';
import './position_list.css';
import { APIClient } from './api_utils.js';


class Position extends React.Component {

    render() {
        const data = this.props.data;
        const quantity = data.quantity;
        const price = data.latest_price;
        const value = Math.round(100 * quantity * price) / 100;

        let expandedContent = null;
        if (this.props.active) {
            expandedContent = (
                <div className="position-card-expanded-content">Expanded content. Super awesome and interesting.
                </div>
            );
            console.log(this.props.detailedData);
        }

        return (
            <li  onClick={this.props.handleClick}>
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
        this.handlePositionClick = positionId => {
            return event => {
                if (positionId in this.state.positionDetails) {
                    // Don't fetch the info again if it's already available.
                    if (this.state.activePosition == positionId) {
                        // Clicking again on an active position will make it inactive.
                        this.setState({"activePosition": null});
                    }
                    else {
                        this.setState({"activePosition": positionId });
                    }
                    return;
                }
                this.apiClient.getPositionDetail(positionId).then(
                    positionData => {
                        let positionDetails = this.state.positionDetails;
                        positionDetails[positionId] = positionData;
                        console.log(positionData);
                        this.setState({
                            "positionDetails": positionDetails,
                            "activePosition": positionId });
                    }, error => alert(error)
                )
            }
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