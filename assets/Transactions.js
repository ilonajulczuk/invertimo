import React from 'react';
import PropTypes from 'prop-types';
import {
    Switch,
    Route,
    useRouteMatch
} from "react-router-dom";

import { RecordTransactionForm } from './forms/RecordTransactionForm.js';
import { TransactionImportDetail } from './TransactionImportDetail.js';
import ImportTransactionsFromDegiroForm from './forms/ImportTransactionsFromDegiroForm.js';
import ImportTransactionsFromBinanceForm from './forms/ImportTransactionsFromBinanceForm.js';
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
    let assetsFromTransactions = [];
    if (props.transactions) {
        const assetsFromTransactionsMap = new Map(
            props.transactions.map(
                transaction => [transaction.position.asset.id, transaction.position.asset]));
        for (let asset of assetsFromTransactionsMap.values()) {
            assetsFromTransactions.push(asset);
        }
    }
    const loadingBlock = <h2>Loading transactions...</h2>;
    return (
        <Switch>
            <Route exact path={path}>
                {props.transactions ?
                    <TransactionList accounts={props.accounts} transactions={props.transactions} />
                    : loadingBlock
                }
            </Route>
            <Route path={`${path}/record`}>
                {props.transactions ?
                    <RecordTransaction accounts={props.accounts}
                        hasTransactions={props.transactions.length > 0}
                        handleSubmit={props.handleAddTransaction}
                        defaultAssetOptions={assetsFromTransactions}
                    /> :
                    loadingBlock}
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
            <Route path={`${path}/import/binance`}>
                <h2><a href="#/transactions/">Transactions</a> / import / binance</h2>
                <p>
                    Export your <a href="http://binance.com" target="blank()">Binance</a> transactions to a .csv file and upload
                    it easily here.
                    You can find instructions on how to export your history <a href="https://www.binance.com/en/support/faq/990afa0a0a9341f78e7a9298a9575163" target="blank()">here</a>.
                </p>
                <p>
                    Binance only supports generating history for 3 month intervals, so you might need to do multiple exports.
                </p>
                <ImportTransactionsFromBinanceForm
                    accounts={props.accounts}
                    handleSubmit={props.handleUploadBinanceTransactions}
                />
            </Route>
            <Route path={`${path}/imports/:importId`}>
                <TransactionImportDetail />
            </Route>
            <Route path={`${path}/realized_gains`}>
                <RealizedGainsReport positions={props.positions} accounts={props.accounts} />
            </Route>
            <Route path={`${path}/:transactionId`}>
                {props.transactions ?
                    <TransactionDetail
                        transactions={props.transactions}
                        accounts={props.accounts}
                        handleDeleteTransaction={props.handleDeleteTransaction}
                        handleCorrectTransaction={props.handleCorrectTransaction}
                    /> : loadingBlock}
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
    })),
    handleAddTransaction: PropTypes.func.isRequired,
    handleDeleteTransaction: PropTypes.func.isRequired,
    handleCorrectTransaction: PropTypes.func.isRequired,
    handleUploadDegiroTransactions: PropTypes.func.isRequired,
    handleUploadBinanceTransactions: PropTypes.func.isRequired,
};