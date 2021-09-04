import React from 'react';
import './portfolio.css';
import { PositionList } from './PositionList.js';
import { AccountValue } from './AccountValue.js';
import { Header } from './Header.js';
import { APIClient } from './api_utils.js';
import PropTypes from 'prop-types';
import {
    Switch,
    Route,
    NavLink,
    Redirect,
} from "react-router-dom";
import { toSymbol } from './currencies.js';


import { ErrorBoundary } from './error_utils.js';
import { Onboarding } from './Onboarding.js';
import { Transactions } from './Transactions';


class AccountStats extends React.Component {
    render() {
        const account = this.props.account;

        let totalCash = Number(account.balance);
        let currencySymbol = toSymbol(account.currency);

        const assetValues = this.props.positions.map(position => {
            // Exchange rate is null if account and position trading currency are the same.
            let latest_exchange_rate = position.latest_exchange_rate ? position.latest_exchange_rate : 1;
            return position.quantity * position.latest_price * latest_exchange_rate;
        });
        const totalAssetValue = Math.round(
            assetValues.reduce((sum, current) => sum + current, 0) * 100) / 100;

        return (
            <ul className="portfolio-stats-list">
                <li className="portfolio-stats-account-name">
                    In <a href="">{account.nickname}</a> account:
                </li>
                <li>
                    Total Cash: {totalCash} {currencySymbol}
                </li>
                <li>
                    Total Assets: {totalAssetValue} {currencySymbol}
                </li>
                <li>
                    Portfolio Value: {Math.round((totalCash + totalAssetValue) * 100) / 100} {currencySymbol}
                </li>
            </ul>);
    }
}


AccountStats.propTypes = {
    positions: PropTypes.array.isRequired,
    account: PropTypes.object.isRequired,
};


export function divideByAccount(accounts, positions) {
    const positionsByAccount = new Map();
    accounts.forEach(account => positionsByAccount.set(account.id, { account: account, positions: [] }));
    positions.forEach(position => {
        const accountEntry = positionsByAccount.get(position.account);
        if (accountEntry) {
            accountEntry.positions.push(position);
        }

    });
    return positionsByAccount;
}


export function PortfolioOverview(props) {

    let positionsCount = 0;
    let transactionsCount = 0;

    let accounts = props.accounts;

    const positionsByAccount = divideByAccount(accounts, props.positions);
    const accountStatsEntries = Array.from(positionsByAccount).map(([, entry]) => {
        return (
            <AccountStats
                key={entry.account.id}
                account={entry.account}
                positions={entry.positions}
            />
        );
    });
    for (let account of accounts) {
        positionsCount += account.positions_count;
        transactionsCount += account.transactions_count;
    }

    return (
        <div className="portfolio-overview">
            <div className="portfolio-overview-card card">
                <span className="card-label">At a glance</span>
                {accountStatsEntries}
            </div>
            <div className="card">
                <span className="card-label">Assets</span>
                <div>
                    {positionsCount} <a href="#/positions">Positions</a> in {accounts.length}  {accounts.length > 1 ? "Accounts" : "Account"}
                </div>
                <a className="button" href="/#positions">See all Positions</a>
            </div>
            <div className="card">
                <span className="card-label">Events</span>
                <div>{transactionsCount} <a href="#/transactions">Transactions</a></div>
                <a className="button" href="#/transactions">Manage transactions</a>
            </div>
        </div>
    );
}

PortfolioOverview.propTypes = {
    positions: PropTypes.array.isRequired,
    accounts: PropTypes.array.isRequired,
};


export default class Portfolio extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            "positions": [],
            "positionDetails": new Map(),
            "accounts": null,
            "transactions": null,
            "accountValues": new Map(),
        };
        this.apiClient = new APIClient('./api');
        this.getPositionDetail = this.getPositionDetail.bind(this);
        this.handleAddAccount = this.handleAddAccount.bind(this);
        this.handleAddTransaction = this.handleAddTransaction.bind(this);
    }

    async handleAddAccount(accountData) {
        const data = {
            nickname: accountData.name,
            currency: accountData.currency,
            description: "",
        };
        let result = await this.apiClient.createAccount(data);
        // Reload all the data, e.g. accounts, positions, etc.
        this.refreshFromServer();
        return result;
    }

    async handleAddTransaction(data) {
        let result;
        if (data.asset) {
            result = await this.apiClient.addTransaction(data);
        } else {
            result = await this.apiClient.addTransactionWithCustomAsset(data);
        }
        // Reload all the data, e.g. accounts, positions, etc.
        this.refreshFromServer();
        return result;

    }

    async getPositionDetail(positionId) {
        if (this.state.positionDetails.has(positionId)) {
            return this.state.positionDetails.get(positionId);
        }
        try {
            let positionData = await this.apiClient.getPositionDetail(positionId);
            let positionDetails = this.state.positionDetails;
            positionDetails.set(positionId, positionData);
            this.setState({
                "positionDetails": positionDetails,
            });
            return positionData;
        }
        catch (error) {
            alert(error);
            return null;
        }

    }

    async componentDidMount() {
        this.refreshFromServer();
    }

    refreshFromServer() {
        this.apiClient.getAccounts().then(accounts => {
            this.setState({ "accounts": accounts });
            accounts.forEach(account => {
                this.apiClient.getAccountDetail(account.id, 4 * 365).then(account => {
                    let accountValues = this.state.accountValues;
                    accountValues.set(account.id, account);
                    this.setState({
                        "accountValues": accountValues,
                    });
                });
            });
        }
        );
        this.apiClient.getPositions().then(
            positions => {
                this.setState({ "positions": positions });
            });
        this.apiClient.getTransactions().then(
            transactions => {
                this.setState({ "transactions": transactions });
            });
    }

    render() {
        const userEmail = JSON.parse(document.getElementById('userEmail').textContent);

        // If there are no accounts loaded yet, there isn't much to show.
        if (this.state.accounts === null || this.state.transactions === null) {
            return (<div className="main-grid">
                <Header email={userEmail} />
            </div>);
        }

        // If the accounts are loaded, but there is nothing there, start an onboarding wizard.
        const newUser = this.state.accounts.length == 0;

        const noTransactions = this.state.transactions.length == 0;

        let accountValues = this.state.accounts.filter(account =>
            this.state.accountValues.get(account.id)).map((account) => {

                let accountDetail = this.state.accountValues.get(account.id);
                let values = [];
                if (accountDetail) {
                    values = accountDetail.values;
                }
                return (
                    <AccountValue key={account.id} account={account}
                        positions={this.state.positions} values={values} />
                );
            });

        let redirectOrDisplay;
        if (newUser) {
            redirectOrDisplay = <Redirect to="/start/investment_accounts" />;
        } else if (noTransactions) {
            redirectOrDisplay = <Redirect to="/start/transactions_intro" />;
        } else {
            redirectOrDisplay = (
                <div>
                    <h2>Portfolio</h2>

                    <ErrorBoundary>
                        <PortfolioOverview positions={this.state.positions} accounts={this.state.accounts} />
                        {accountValues}
                    </ErrorBoundary>
                </div>);
        }
        return (
            <div className="main-grid">
                <Header email={userEmail} />
                <nav className="sidenav">
                    <ul>
                        <li>
                            <NavLink to="/" exact={true}>Home</NavLink>
                        </li>
                        <li>
                            <NavLink to="/positions">Positions</NavLink>
                        </li>
                        <li>
                            <NavLink to="/transactions">Transactions</NavLink>
                        </li>
                    </ul>
                </nav>

                <div className="main-content">
                    <Switch>
                        <Route path="/transactions">
                            <ErrorBoundary>
                                <Transactions transactions={this.state.transactions}
                                    handleAddTransaction={this.handleAddTransaction}
                                    accounts={this.state.accounts} />
                            </ErrorBoundary>
                        </Route>
                        <Route path="/positions">
                            <ErrorBoundary>
                                <PositionList positions={this.state.positions}
                                    accounts={this.state.accounts} getPositionDetail={this.getPositionDetail} />
                            </ErrorBoundary>
                        </Route>
                        <Route path="/start/:stepName">
                            <Onboarding accounts={this.state.accounts}
                                handleAddAccount={this.handleAddAccount}
                                handleAddTransaction={this.handleAddTransaction}
                                transactions={this.state.transactions}
                            />
                        </Route>
                        <Route path="/">

                            {redirectOrDisplay}
                        </Route>

                    </Switch>
                </div>
            </div>
        );

    }
}