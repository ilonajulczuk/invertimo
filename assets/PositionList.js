import React from 'react';
import './position_list.css';
import PropTypes from 'prop-types';
import { TableWithSort } from './components/TableWithSort.js';
import { toSymbol } from './currencies.js';
import { PositionDetail } from './PositionDetail.js';
import { PositionLink } from './components/PositionLink.js';
import { ErrorBoundary } from './error_utils.js';


import Button from '@material-ui/core/Button';
import {
    Switch,
    Route,
    useRouteMatch
} from "react-router-dom";


export function PositionList(props) {

    const positionHeadCells = [
        { id: 'product', label: 'Product' },
        { id: 'exchange', label: 'Exchange' },
        { id: 'quantity', label: 'Quantity' },
        { id: 'price', label: 'Price' },
        { id: 'value', label: 'Value' },
        { id: 'interaction', label: '' },
    ];

    let accountsById = new Map(props.accounts.map(account => [account.id, account]));

    let { path } = useRouteMatch();

    const positions = props.positions.map(position => {
        let positionRow = { "id": position.id };

        let account = accountsById.get(position.account);
        const data = position;
        const quantity = data.quantity;
        const price = data.latest_price;
        const value = Math.round(100 * quantity * price) / 100;

        let displayConvertedValue = (data.asset.currency != account.currency && data.latest_exchange_rate);

        positionRow.product = {
            displayValue: <PositionLink position={data}/>,
            comparisonKey: data.asset.symbol,
        };
        positionRow.exchange = data.asset.exchange.name;
        positionRow.quantity = quantity;
        positionRow.price = {
            displayValue: (<div className="column-stack">
                <span className="card-label">As of {data.latest_price_date}</span>
                {price}{toSymbol(data.asset.currency)}</div>),
            comparisonKey: Number(price),
        };

        let valueForComparison = value;
        if (displayConvertedValue) {
            valueForComparison = Math.round(100 * value * data.latest_exchange_rate);
        }
        positionRow.value = {
            displayValue: (<div className="column-stack">
                <span>
                    {value}{toSymbol(data.asset.currency)}
                </span>
                <span>
                    {displayConvertedValue ? Math.round(100 * value * data.latest_exchange_rate) / 100 : ""}
                    {displayConvertedValue ? "" + toSymbol(account.currency) : ""}
                </span>
            </div>),
            comparisonKey: valueForComparison,
        };
        positionRow.interaction = {
            displayValue: <div className="column-stack">
                <Button
                    href={"#/positions/" + position.id}
                >Details</Button>
            </div>
        };
        return positionRow;
    });

    return (
        <div>
            <Switch>
                <Route exact path={path}>
                    <h2>Positions</h2>
                    <ErrorBoundary>
                        <TableWithSort
                            rows={positions}
                            headCells={positionHeadCells}
                            defaultOrder="asc"
                            defaultOrderBy="product" />
                    </ErrorBoundary>
                </Route>

                <Route path={`${path}/:positionId`}>
                    <PositionDetail positions={props.positions} accounts={props.accounts} getPositionDetail={props.getPositionDetail} />

                </Route>
            </Switch>
        </div>

    );
}

PositionList.propTypes = {
    positions: PropTypes.array.isRequired,
    accounts: PropTypes.array.isRequired,
    getPositionDetail: PropTypes.func.isRequired,
};