import React from 'react';

import PropTypes from 'prop-types';
import { RecordTransactionForm } from './forms/RecordTransactionForm.js';

import {
    Switch,
    Route,
    useRouteMatch
} from "react-router-dom";
import { TransactionList } from './TransactionList';


export function RecordTransaction(props) {
    return (<div>
        <h2><a href="../#transactions/">Transactions</a> / record</h2>
        <RecordTransactionForm

        {...props}
        />

        </div>);
}

RecordTransaction.propTypes = {

    accounts: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        nickname: PropTypes.string.isRequired,
        currency: PropTypes.oneOf(['EUR', 'GBP', 'USD']),
    })),
    hasTransactions: PropTypes.bool.isRequired,
    handleSubmit: PropTypes.func.isRequired,
};


export function Transactions(props) {

    let { path } = useRouteMatch();

    return (
        <Switch>
            <Route exact path={path}>
                <TransactionList accounts={props.accounts} transactions={props.transactions} />
            </Route>
            <Route path={`${path}/record`}>
                <RecordTransaction accounts={props.accounts}
                 hasTransactions={props.transactions.length > 0}
                 handleSubmit={props.handleAddTransaction} />

            </Route>
        </Switch>

    );
}


Transactions.propTypes = {
    accounts: PropTypes.array.isRequired,
    transactions: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        quantity: PropTypes.string.isRequired,
        price: PropTypes.string.isRequired,
        local_value: PropTypes.string.isRequired,
        transaction_costs: PropTypes.string,
        executed_at: PropTypes.string.isRequired,
    })).isRequired,
    handleAddTransaction: PropTypes.func.isRequired,
};