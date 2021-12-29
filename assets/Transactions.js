import React from 'react';
import PropTypes from 'prop-types';
import {
    Switch,
    Route,
    useRouteMatch
} from "react-router-dom";

import { RecordTransactionForm } from './forms/RecordTransactionForm.js';

import ImportTransactionsFromDegiroForm from './forms/ImportTransactionsFromDegiroForm.js';
import { TransactionList } from './TransactionList';
import { TransactionDetail } from './TransactionDetail.js';
import { useQuery } from './routing.js';
import RealizedGainsReport from './RealizedGainsReport.js';


export function RecordTransaction(props) {

    const query = useQuery();
    let initialAsset = null;
    let invalidAssetId = true;
    const assetId = query.get("asset");
    if (assetId !== null) {
        for (const asset of props.defaultAssetOptions) {
            if (asset.id === Number(assetId)) {
                initialAsset = asset;
                invalidAssetId = false;
            }
        }
    }

    if (assetId && invalidAssetId) {
        return (
            <h4>Invalid asset selected :(. Check your URL?</h4>
        );
    }

    return (<div>
        <h2><a href="../#transactions/">Transactions</a> / record</h2>
        <RecordTransactionForm
            {...props} initialAsset={initialAsset}
        />

    </div>);
}


RecordTransaction.propTypes = {
    defaultAssetOptions: PropTypes.array.isRequired,
    accounts: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        nickname: PropTypes.string.isRequired,
        currency: PropTypes.oneOf(['EUR', 'GBP', 'USD']),
    })),
    hasTransactions: PropTypes.bool.isRequired,
    handleSubmit: PropTypes.func.isRequired,
};


export default function Transactions(props) {

    let { path } = useRouteMatch();

    // TODO: Should include all possible assets we could point to throughout the app.
    // E.g. could be from positions.
    const assetsFromTransactionsMap = new Map(
        props.transactions.map(
            transaction => [transaction.position.asset.id, transaction.position.asset]));
    let assetsFromTransactions = [];
    for (let asset of assetsFromTransactionsMap.values()) {
        assetsFromTransactions.push(asset);
    }
    return (
        <Switch>
            <Route exact path={path}>
                <TransactionList accounts={props.accounts} transactions={props.transactions} />
            </Route>
            <Route path={`${path}/record`}>
                <RecordTransaction accounts={props.accounts}
                    hasTransactions={props.transactions.length > 0}
                    handleSubmit={props.handleAddTransaction}
                    defaultAssetOptions={assetsFromTransactions}
                />

            </Route>

            <Route path={`${path}/import/degiro`}>
                <h2><a href="#/transactions/">Transactions</a> / import / degiro</h2>
                <p>
                    Export your <a href="http://degiro.com" target="blank()">Degiro</a> transactions to a .csv file and upload
                    it easily here.
                    See how to <a href="/static/degiro_export.png" target="blank()">export it</a>.
                </p>
                <ImportTransactionsFromDegiroForm
                    accounts={props.accounts}
                    handleSubmit={props.handleUploadDegiroTransactions}
                />
            </Route>
            <Route path={`${path}/realized_gains`}>
                <RealizedGainsReport positions={props.positions} accounts={props.accounts} />
            </Route>
            <Route path={`${path}/:transactionId`}>
                <TransactionDetail
                    transactions={props.transactions}
                    accounts={props.accounts}
                    handleDeleteTransaction={props.handleDeleteTransaction}
                    handleCorrectTransaction={props.handleCorrectTransaction}
                />
            </Route>
        </Switch>
    );
}


Transactions.propTypes = {
    accounts: PropTypes.array.isRequired,
    positions: PropTypes.array.isRequired,
    transactions: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        quantity: PropTypes.string.isRequired,
        price: PropTypes.string.isRequired,
        local_value: PropTypes.string.isRequired,
        transaction_costs: PropTypes.string,
        executed_at: PropTypes.string.isRequired,
        position: PropTypes.object.isRequired,
    })).isRequired,
    handleAddTransaction: PropTypes.func.isRequired,
    handleDeleteTransaction: PropTypes.func.isRequired,
    handleCorrectTransaction: PropTypes.func.isRequired,
    handleUploadDegiroTransactions: PropTypes.func.isRequired,
};