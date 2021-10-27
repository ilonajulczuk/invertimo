import React from 'react';
import PropTypes from 'prop-types';

import {
    Switch,
    Route,
    useRouteMatch,
    useHistory,
} from "react-router-dom";

import Icon from '@material-ui/core/Icon';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogActions from '@material-ui/core/DialogActions';

import { makeStyles } from '@material-ui/core/styles';


import './transaction_list.css';
import { toSymbol } from './currencies.js';
import { CorrectTransactionForm } from './forms/CorrectTransactionForm.js';
import { PositionLink } from './components/PositionLink.js';


const useStyles = makeStyles({
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    transactionDetails: {
        padding: "10px",
        background: "#8282820d",
        border: "1px solid #384a5052",
        borderLeft: "5px solid #1b98a1",
        borderBottom: "5px solid #384a5052",
        marginBottom: "2em",
        display: "flex",
        flexDirection: "column",
    },
});


export function TransactionDetail(props) {
    const classes = useStyles();

    let match = useRouteMatch("/transactions/:transactionId");
    let path = match.path;
    let transactionId = match.params.transactionId;
    let history = useHistory();

    let transaction = null;
    for (let t of props.transactions) {
        if (t.id == transactionId) {
            transaction = t;
        }
    }

    if (transaction === null) {
        return (
            <div>
                <div className={classes.header}>
                    <h2><a href="../#transactions/">Transactions</a> / {transactionId}</h2>
                </div>
                <div>404 Not found :(</div>
            </div>);
    }
    let accountsById = new Map(props.accounts.map(account => [account.id, account]));
    let account = accountsById.get(transaction.position.account);

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

    const accountCurrencySymbol = toSymbol(account.currency);
    const positionCurrencySymbol = toSymbol(transaction.position.asset.currency);

    let topInfo = (
        <div className="position-card">
            {transactionTypeDisplay}
            <PositionLink position={transaction.position} />
            <div>
                <span className="card-label">Asset type</span>
                {transaction.position.asset.asset_type}
            </div>
            <div>
                <span className="card-label">Exchange</span>
                {transaction.position.asset.exchange.name}
            </div>
            <div>
                <span className="card-label">Quantity</span>
                {transaction.quantity}
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

    const handleDelete = () => {
        props.handleDeleteTransaction(transaction.id);
        history.push("/transactions");
    };

    const handleCancel = () => {
        history.push("/transactions/" + transaction.id);
    };

    const handleCorrectDetails = async (transactionId, update) => {
        let result = await props.handleCorrectTransaction(transactionId, update);
        if (!result.ok) {
            return result;
        }
        // Will redirect to the detail page and hide the correct detail page.
        history.push("/transactions/" + transaction.id);
        return result;
    };

    return (
        <div>
            <div className={classes.header}>
                <h2><a href="../#transactions/">Transactions</a> / {transactionId}</h2>
                <div>
                    <Button
                        href={"#/transactions/" + transaction.id + "/correct/"}
                        color="primary"
                        size="small"
                    ><Icon>create</Icon> Correct</Button>
                    <Button
                        href={"#/transactions/" + transaction.id + "/delete/"}
                        size="small"
                    ><Icon>delete</Icon>Delete</Button>
                </div>
            </div>

            {topInfo}
            <div className={classes.transactionDetails}>
                <p>Executed in account
                    <a href={`#accounts/${account.id}`}> {account.nickname}</a>
                    {transaction.order_id ? `with order id: #${transaction.order_id}` : ""}
                </p>
                {transaction.order_id}
            </div>

            <Switch>
                <Route path={`${path}/correct`}>
                    <Dialog
                        open={true}
                        onClose={handleCancel}
                        aria-labelledby="correct-transaction-dialog-title"
                        aria-describedby="correct-transaction-dialog-description"
                    >
                        <DialogTitle id="correct-transaction-dialog-title">{"Correct details of the transaction"}</DialogTitle>
                        <DialogContent>
                            <DialogContentText id="correct-transaction-dialog-description">
                                If you want to change the details not available here, consider deleting this transaction and recording a new one.
                            </DialogContentText>
                            <CorrectTransactionForm
                                account={account}
                                transaction={transaction}
                                handleSubmit={handleCorrectDetails}
                                handleCancel={handleCancel} />

                        </DialogContent>

                    </Dialog>

                </Route>
                <Route path={`${path}/delete`}>
                    <Dialog
                        open={true}
                        onClose={handleCancel}
                        aria-labelledby="delete-transaction-dialog-title"
                        aria-describedby="delete-transaction-dialog-description"
                    >
                        <DialogTitle id="delete-transaction-dialog-title">{"Are you sure you want to delete this transaction?"}</DialogTitle>
                        <DialogContent>
                            <DialogContentText id="delete-transaction-dialog-description">
                                It will be as if this transaction has never happened. This might cause you to miss historical data.
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCancel} variant="outlined" autoFocus>
                                Cancel
                            </Button>
                            <Button onClick={handleDelete} color="secondary" variant="contained">
                                Delete
                            </Button>
                        </DialogActions>
                    </Dialog>

                </Route>
            </Switch>
        </div>
    );
}

TransactionDetail.propTypes = {
    accounts: PropTypes.array.isRequired,
    transactions: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        quantity: PropTypes.string.isRequired,
        price: PropTypes.string.isRequired,
        local_value: PropTypes.string.isRequired,
        transaction_costs: PropTypes.string,
        executed_at: PropTypes.string.isRequired,
        position: PropTypes.object.isRequired,
    })).isRequired,
    handleDeleteTransaction: PropTypes.func.isRequired,
    handleCorrectTransaction: PropTypes.func.isRequired,
};