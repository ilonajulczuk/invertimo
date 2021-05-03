import React from 'react';
import './position_list.css';

class Position extends React.Component {

    render() {
        const data = this.props.data;
        const quantity = data.quantity;
        const price = 124.33;
        const value = quantity * price;

        return (
            <li className="position-card">
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
    render() {
        const positionList = this.props.positions.map((position) => (
            <Position key={position["id"]} data={position} />
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