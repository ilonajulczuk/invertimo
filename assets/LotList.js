import React from 'react';
import PropTypes from 'prop-types';

import { toSymbol } from './currencies.js';
import { TableWithSort } from './components/TableWithSort.js';
import { ErrorBoundary } from './error_utils.js';


export function LotList(props) {

    const positionCurrency = toSymbol(props.position.asset.currency);
    const accountCurrency = toSymbol(props.account.currency);
    const headCells = [
        { id: 'quantity', label: 'Quantity' },
        { id: 'buy_price', label: `Buy Price (${positionCurrency})` },
        { id: 'sell_price', label: `Sell Price (${positionCurrency})` },
        { id: 'cost_basis_account_currency', label: `Cost Basis (${accountCurrency})` },
        { id: 'sell_basis_account_currency', label: `Sell Basis (${accountCurrency})` },
        { id: 'realized_gain_account_currency', label: `Realized Gain (${accountCurrency})`},
        { id: 'buy_date', label: 'Buy Date' },
        { id: 'sell_date', label: 'Sell Date' },
        { id: 'transactions', label: 'Transactions' },
    ];

    const lots = props.lots.map(lot => {
        let row = { ...lot };
        let buyDate = new Date(row.buy_date);
        row.buy_date = {
            displayValue: buyDate.toLocaleDateString(),
            comparisonKey: buyDate,
        };
        let sellDate = new Date(row.sell_date);
        row.sell_date = {
            displayValue: sellDate.toLocaleDateString(),
            comparisonKey: sellDate,
        };
        row.quantity = Number(row.quantity);
        row.buy_price = Number(row.buy_price);
        row.sell_price = Number(row.sell_price);
        row.cost_basis_account_currency = Number(row.cost_basis_account_currency);
        row.sell_basis_account_currency = Number(row.sell_basis_account_currency);
        row.realized_gain_account_currency = Number(row.realized_gain_account_currency);

        row.transactions = {
            displayValue: <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
                <a href={`#/transactions/${row.sell_transaction}`}>Sell transaction</a>
                <a href={`#/transactions/${row.buy_transaction}`}>Buy transaction</a>
            </div>,
            comparisonKey: row.buy_transaction,
        };
        return row;
    });


    return (
        <ErrorBoundary>
            <TableWithSort
                rows={lots}
                headCells={headCells}
                defaultOrder="desc"
                defaultOrderBy="sell_date" />
        </ErrorBoundary>
    );
}

LotList.propTypes = {
    lots: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        quantity: PropTypes.string.isRequired,
        buy_date: PropTypes.string.isRequired,
        buy_price: PropTypes.string.isRequired,
        cost_basis_account_currency: PropTypes.string.isRequired,
        sell_date: PropTypes.string.isRequired,
        sell_price: PropTypes.string.isRequired,
        sell_basis_account_currency: PropTypes.string.isRequired,
        realized_gain_account_currency: PropTypes.string.isRequired,
        position: PropTypes.number.isRequired,
        buy_transaction: PropTypes.number.isRequired,
        sell_transaction: PropTypes.number.isRequired,
    })).isRequired,
    position: PropTypes.shape({asset: PropTypes.object.isRequired}).isRequired,
    account: PropTypes.shape({currency: PropTypes.string.isRequired}),
};