import React from 'react';
import PropTypes from 'prop-types';

import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';

import { toSymbol } from './currencies.js';
import { TableWithSort } from './components/TableWithSort.js';
import { ErrorBoundary } from './error_utils.js';
import { PositionLink } from './components/PositionLink.js';
import './transaction_list.css';


export function EmbeddedTransactionList(props) {

    const embeddedTransactionHeadCells = [
        { id: 'type', label: 'Type' },
        { id: 'quantity', label: 'Quantity' },
        { id: 'price', label: 'Price' },
        { id: 'local_value', label: 'Total value' },
        { id: 'executed_at', label: 'Executed At' },
        { id: 'transaction_costs', label: 'Fees' },
        { id: 'interaction', label: '' },
    ];

    const transactions = props.transactions.map(transaction => {
        // TODO: display currencies.
        let transactionCopy = { ...transaction };
        let date = new Date(transactionCopy.executed_at);
        transactionCopy.executed_at = {
            displayValue: date.toLocaleDateString(),
            comparisonKey: date,
        };
        let transactionTypeDisplay = null;
        if (transaction.value_in_account_currency < 0) {
            transactionTypeDisplay = (
                <div className="trade-type trade-type-buy">Buy</div>
            );
        } else {
            transactionTypeDisplay = (
                <div className="trade-type trade-type-sell">Sell</div>
            );
        }
        transactionCopy.transaction_costs = Number(transactionCopy.transaction_costs);
        transactionCopy.price = Number(transactionCopy.price);
        transactionCopy.quantity = Number(transactionCopy.quantity);
        transactionCopy.local_value = Number(transactionCopy.local_value);
        transactionCopy.type = {
            displayValue: transactionTypeDisplay,
            comparisonKey: transaction.value_in_account_currency,
        };
        transactionCopy.interaction = {
            displayValue: <div className="column-stack">
                <Button
                    href={"#/transactions/" + transaction.id}
                >Details</Button>

            </div>
        };

        return transactionCopy;
    });
    return (
        <ErrorBoundary>
            <TableWithSort
                rows={transactions}
                headCells={embeddedTransactionHeadCells}
                defaultOrder="desc"
                defaultOrderBy="executed_at"
                additionalShrink={60} />
        </ErrorBoundary>
    );
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

export function TransactionList(props) {

    const transactionHeadCells = [
        { id: 'type', label: 'Type' },
        { id: 'position', label: 'Position' },
        { id: 'assetType', label: 'Asset type' },
        { id: 'quantity', label: 'Quantity' },
        { id: 'price', label: 'Price' },
        { id: 'value', label: 'Value' },
        { id: 'transaction_costs', label: 'Fees' },
        { id: 'executed_at', label: 'Executed At' },
        { id: 'interaction', label: '' },
    ];

    const accountsById = new Map(props.accounts.map(account => [account.id, account]));

    const transactions = props.transactions.map(transaction => {
        let transactionCopy = { ...transaction };
        let date = new Date(transactionCopy.executed_at);
        transactionCopy.executed_at = {
            displayValue: date.toLocaleDateString(),
            comparisonKey: date,
        };
        let account = accountsById.get(transaction.position.account);

        let position = transactionCopy.position;
        let positionField = <PositionLink position={position} account={account} />;
        transactionCopy.position = {
            displayValue: positionField,
            comparisonKey: position.asset.symbol,
        };

        transactionCopy.assetType = position.asset.asset_type;
        let transactionTypeDisplay = null;
        if (transaction.value_in_account_currency < 0) {
            transactionTypeDisplay = (
                <div className="trade-type trade-type-buy">BUY</div>
            );
        } else {
            transactionTypeDisplay = (
                <div className="trade-type trade-type-sell">SELL</div>
            );
        }
        transactionCopy.transaction_costs = Number(transactionCopy.transaction_costs);
        transactionCopy.price = Number(transactionCopy.price);

        transactionCopy.type = {
            displayValue: transactionTypeDisplay,
            comparisonKey: transaction.value_in_account_currency,
        };
        const accountCurrencySymbol = toSymbol(account.currency);
        const positionCurrencySymbol = toSymbol(transaction.position.asset.currency);

        transactionCopy.quantity = Number(transactionCopy.quantity);
        transactionCopy.price = {
            displayValue: transactionCopy.price + positionCurrencySymbol,
            comparisonKey: Number(transactionCopy.price),
        };
        transactionCopy.value = {
            displayValue: (<div className="position-name">
                <span>{Number(transactionCopy.value_in_account_currency) + accountCurrencySymbol}</span>
                <span>{Number(transactionCopy.local_value) + positionCurrencySymbol}</span>
            </div>),
            comparisonKey: Number(transactionCopy.value_in_account_currency)
        };
        transactionCopy.transaction_costs = {
            displayValue: transactionCopy.transaction_costs + accountCurrencySymbol,
            comparisonKey: Number(transactionCopy.transaction_costs)
        };

        transactionCopy.interaction = {
            displayValue: <div className="column-stack">
                <Button
                    href={"#/transactions/" + transaction.id}
                >Details</Button>

            </div>
        };
        let lastModifiedDate = new Date(transactionCopy.last_modified);
        transactionCopy.last_modified = lastModifiedDate.toLocaleDateString();
        return transactionCopy;
    });



    return (
        <ErrorBoundary>
            <div className='header-with-buttons'>
                <h2>Transactions</h2>
                <div className='header-button-group'>
                    <Button
                        href="#/transactions/realized_gains"
                        variant="contained"
                        color="primary"
                    >
                        <Icon>description</Icon>
                        Realized gains report
                    </Button>
                    <Button
                        href="#/transactions/record"
                        variant="contained"
                        color="secondary"
                    >
                        <Icon>create</Icon>
                        Record transaction
                    </Button>
                    <Button
                        href="#/transactions/import/degiro"
                        variant="contained"
                        color="secondary"
                    >
                        <Icon>create</Icon>
                        Import from degiro
                    </Button>
                    <Button
                        href="#/transactions/import/binance"
                        variant="contained"
                        color="secondary"
                    >
                        <Icon>create</Icon>
                        Import from binance
                    </Button>
                </div>

            </div>
            <TableWithSort
                rows={transactions}
                headCells={transactionHeadCells}
                defaultOrder="desc"
                defaultOrderBy="executed_at" />
        </ErrorBoundary>
    );
}

TransactionList.propTypes = {
    accounts: PropTypes.array.isRequired,
    transactions: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        quantity: PropTypes.string.isRequired,
        price: PropTypes.string.isRequired,
        local_value: PropTypes.string.isRequired,
        transaction_costs: PropTypes.string,
        executed_at: PropTypes.string.isRequired,
    })).isRequired,
};