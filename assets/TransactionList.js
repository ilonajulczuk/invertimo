import React from 'react';
import PropTypes from 'prop-types';
import { ErrorBoundary } from './error_utils.js';
import { TableWithSort } from './components/TableWithSort.js';

import './transaction_list.css';

const embeddedTransactionHeadCells = [
    { id: 'quantity', label: 'Quantity' },
    { id: 'price', label: 'Price' },
    { id: 'local_value', label: 'Total value' },
    { id: 'executed_at', label: 'Executed At' },
    { id: 'transaction_costs', label: 'Fees' },
];


export class EmbeddedTransactionList extends React.Component {

    render() {
        const transactions = this.props.transactions.map(transaction => {
            let transactionCopy = { ...transaction };
            let date = new Date(transactionCopy.executed_at);
            transactionCopy.executed_at = date.toLocaleString();
            return transactionCopy;
        });
        return (
            <ErrorBoundary>

                <TableWithSort rows={transactions} headCells={embeddedTransactionHeadCells} />

            </ErrorBoundary>

        );
    }
}

EmbeddedTransactionList.propTypes = {
    transactions: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        quantity: PropTypes.string.isRequired,
        price: PropTypes.string.isRequired,
        local_value: PropTypes.string.isRequired,
        transaction_costs: PropTypes.string,
        executed_at: PropTypes.string.isRequired,
    })).isRequired,
};



export class TransactionList extends React.Component {

    render() {

        const transactionHeadCells = [
            { id: 'position', label: 'Position' },
            { id: 'quantity', label: 'Quantity' },
            { id: 'price', label: 'Price' },
            { id: 'local_value', label: 'Value' },
            { id: 'transaction_costs', label: 'Fees' },
            { id: 'executed_at', label: 'Executed At' },
            { id: 'order_id', label: 'Order Details' },
        ];


        const transactions = this.props.transactions.map(transaction => {
            let transactionCopy = { ...transaction };
            let date = new Date(transactionCopy.executed_at);
            transactionCopy.executed_at = {
                displayValue:  date.toLocaleDateString(),
                comparisonKey: date,
            };

            let position = transactionCopy.position;
            let positionField = (
                <div className="position-name">
                    <span className="card-label">{position.security.isin}</span>
                    <span className="position-symbol">{position.security.symbol}</span>
                    <span>{position.security.name}</span>
                </div>
            );
            transactionCopy.position = positionField;

            transactionCopy.price = Number(transactionCopy.price);
            transactionCopy.local_value = Number(transactionCopy.local_value);
            transactionCopy.transaction_costs = Number(transactionCopy.transaction_costs);

            // TODO: Also show Value and purchase price in multiple currencies.
            // { id: 'value_in_account_currency', label: 'Purchased value (y curr)' },
            // { id: 'total_in_account_currency', label: 'Total spent value (y curr)' },

            let lastModifiedDate = new Date(transactionCopy.last_modified);
            transactionCopy.last_modified = lastModifiedDate.toLocaleDateString();
            return transactionCopy;
        });
        return (
            <ErrorBoundary>

                <TableWithSort rows={transactions} headCells={transactionHeadCells} />

            </ErrorBoundary>

        );
    }
}

TransactionList.propTypes = {
    transactions: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        quantity: PropTypes.string.isRequired,
        price: PropTypes.string.isRequired,
        local_value: PropTypes.string.isRequired,
        transaction_costs: PropTypes.string,
        executed_at: PropTypes.string.isRequired,
    })).isRequired,
};