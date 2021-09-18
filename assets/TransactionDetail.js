import React from 'react';
import PropTypes from 'prop-types';

import Icon from '@material-ui/core/Icon';

import './transaction_list.css';
import Button from '@material-ui/core/Button';
import { toSymbol } from './currencies.js';

import {
    useParams,
} from "react-router-dom";

import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles({
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    }
});

export function TransactionDetail(props) {

    const classes = useStyles();

    let { transactionId } = useParams();

    let transaction = null;
    for (let t of props.transactions) {
        if (t.id == transactionId) {
            transaction = t;
        }
    }

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

    const accountCurrencySymbol = toSymbol("EUR"); //(account.currency);
    const positionCurrencySymbol = toSymbol(transaction.position.asset.currency);

    let basicHeader = (
        <div className="position-card">
            {transactionTypeDisplay}
            <div className="asset-name">
                {transaction.position.asset.isin ? <span className="card-label">{transaction.position.asset.isin}</span> : null}
                <a href={`#positions/${transaction.position.id}`}>
                    <span className="position-symbol">
                        {transaction.position.asset.symbol}</span>
                </a>
                <span>{transaction.position.asset.name}</span>
            </div>

            <div>
                {transaction.position.asset.exchange.name}
            </div>
            <div>
                <span className="card-label">Quantity</span> {transaction.quantity}
            </div>
            <div>
                <span className="card-label">Price</span>
                {transaction.price} {positionCurrencySymbol}
            </div>
            <div className="column-stack">
                <span className="card-label">Value</span>

                <span>{Number(transaction.value_in_account_currency) + accountCurrencySymbol}</span>
                <span>{Number(transaction.local_value) + positionCurrencySymbol}</span>

            </div>
            <div>
                <span className="card-label">Fees</span> {transaction.transaction_costs}
            </div>
            <div>
                <span className="card-label">Executed at</span> {transaction.executed_at.slice(0, 10)}
            </div>

        </div>
    );

    return (
        <div>
            <div className={classes.header}>
                <h2><a href="../#transactions/">Transactions</a> / {transactionId}</h2>

                <div>
                    <Button
                        href={"#/transactions/" + transaction.id + "/edit/"}
                        color="primary"
                        size="small"
                    ><Icon>create</Icon> Correct</Button>
                    <Button
                        href={"#/transactions/" + transaction.id + "/delete/"}
                        size="small"
                    ><Icon>delete</Icon>Delete</Button>
                </div>
            </div>

            {basicHeader}
        </div>

    );
}

TransactionDetail.propTypes = {
    transactions: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        quantity: PropTypes.string.isRequired,
        price: PropTypes.string.isRequired,
        local_value: PropTypes.string.isRequired,
        transaction_costs: PropTypes.string,
        executed_at: PropTypes.string.isRequired,
    })).isRequired,
};