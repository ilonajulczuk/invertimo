import React from 'react';
import PropTypes from 'prop-types';
import { ErrorBoundary } from './error_utils.js';
import { TableWithSort } from './components/TableWithSort.js';



const headCells = [
    { id: 'id', label: 'Transaction ID' },
    { id: 'quantity', label: 'Quantity' },
    { id: 'price', label: 'Price' },
    { id: 'local_value', label: 'Total value' },
    { id: 'executed_at', label: 'Executed At' },
    { id: 'transaction_costs', label: 'Fees' },
];


export class EmbeddedTransactionList extends React.Component {

    render() {
        const transactions = this.props.transactions.map(transaction => {
            let transactionCopy = {...transaction};
            let date = new Date(transactionCopy.executed_at);
            transactionCopy.executed_at = date.toLocaleString();
            return transactionCopy;
        });
        return (
            <ErrorBoundary>

                <TableWithSort rows={transactions} headCells={headCells} />

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
