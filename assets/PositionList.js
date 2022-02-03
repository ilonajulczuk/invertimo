import React from 'react';
import './position_list.css';
import PropTypes from 'prop-types';
import { TableWithSort } from './components/TableWithSort.js';
import { toSymbol } from './currencies.js';
import { PositionDetail } from './PositionDetail.js';
import { PositionLink } from './components/PositionLink.js';
import { ErrorBoundary } from './error_utils.js';


import Button from '@mui/material/Button';
import {
    Switch,
    Route,
    useRouteMatch
} from "react-router-dom";


export default function PositionList(props) {

    const positionHeadCells = [
        { id: 'product', label: 'Product' },
        { id: 'assetType', label: 'Asset type'},
        { id: 'exchange', label: 'Exchange' },
        { id: 'quantity', label: 'Quantity' },
        { id: 'price', label: 'Price' },
        { id: 'value', label: 'Value' },
        { id: 'gain', label: 'Gain'},
        { id: 'interaction', label: '' },
    ];

    let accountsById = new Map(props.accounts.map(account => [account.id, account]));

    let { path } = useRouteMatch();

    const positions = props.positions.map(position => {
        let positionRow = { "id": position.id };

        let account = accountsById.get(position.account);
        const accountCurrency = toSymbol(account.currency);
        const data = position;
        const quantity = Number(data.quantity);
        const price = Number(data.latest_price);
        const value = Math.round(100 * quantity * price) / 100;

        let displayConvertedValue = (data.asset.currency != account.currency && data.latest_exchange_rate);

        positionRow.product = {
            displayValue: <PositionLink position={data} account={account}/>,
            comparisonKey: data.asset.symbol,
        };
        positionRow.assetType = data.asset.asset_type;
        positionRow.exchange = data.asset.exchange.name;
        positionRow.quantity = quantity;
        positionRow.price = {
            displayValue: (<div className="column-stack">
                <span className="card-label">As of {data.latest_price_date}</span>
                {price}{toSymbol(data.asset.currency)}</div>),
            comparisonKey: Number(price),
        };

        let valueAccountCurrency = value;
        if (displayConvertedValue) {
            valueAccountCurrency = Math.round(100 * value * data.latest_exchange_rate) / 100;
        }
        positionRow.value = {
            displayValue: (<div className="column-stack">
                <span>
                    {value}{toSymbol(data.asset.currency)}
                </span>
                <span>
                    {displayConvertedValue ? Math.round(100 * value * data.latest_exchange_rate) / 100 : ""}
                    {displayConvertedValue ? "" + accountCurrency : ""}
                </span>
            </div>),
            comparisonKey: valueAccountCurrency,
        };

        const unrealizedGain = Math.round(100 * (Number(position.cost_basis) + Number(valueAccountCurrency))) / 100;
        positionRow.gain = {
            displayValue: (<div className="column-stack">
                <span className="card-label">Unrealized gain</span>
                <span> {unrealizedGain} {accountCurrency}</span>
                <span className="card-label">Realized gain</span>
                <span> {Number(position.realized_gain)} {accountCurrency}</span>
                </div>),
            comparisonKey: unrealizedGain,
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