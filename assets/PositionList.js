import React from 'react';
import './position_list.css';
import { APIClient } from './api_utils.js';


class Position extends React.Component {

    render() {
        const data = this.props.data;
        const quantity = data.quantity;
        const price = 124.33;
        const value = quantity * price;

        return (
            <li className="position-card" onClick={this.props.handleClick}>
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
                    {price}
                </div>
                <div>
                    {value}
                </div>
            </li>
        )
    }
}


export default class PositionList extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            positionDetails: {}
        };
        this.apiClient = new APIClient('./api');
        this.handlePositionClick = positionId => {
            return event => {
                if (positionId in this.state.positionDetails) {
                    // Don't fetch the info again if it's already available.
                    return;
                }
                this.apiClient.getPositionDetail(positionId).then(
                    positionData => {
                        let positionDetails = this.state.positionDetails;
                        positionDetails[positionId] = positionData;
                        console.log(positionData);
                        this.setState({ "positionDetails": positionDetails });
                    }, error => alert(error)
                )
            }
        };
    }

    render() {
        const positionList = this.props.positions.map((position) => (
            <Position key={position["id"]} data={position} handleClick={this.handlePositionClick(position["id"])} />
        ))
        return (
            <div>
                <h2>Positions ({Object.keys(this.state.positionDetails).length})</h2>
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