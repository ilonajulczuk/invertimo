import React, { Suspense } from 'react';

import PropTypes from 'prop-types';
import {
    Switch,
    Route,
    NavLink,
    Redirect,
} from "react-router-dom";

import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';

import makeStyles from '@mui/styles/makeStyles';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

import './portfolio.css';
import { Events } from './Events.js';

import { Header } from './Header.js';
import { APIClient } from './api_utils.js';
import { toSymbol } from './currencies.js';
import { ErrorBoundary } from './error_utils.js';
import { Accounts } from './Accounts.js';


const PositionList = React.lazy(() => import('./PositionList'));
const Onboarding = React.lazy(() => import('./Onboarding'));
const Transactions = React.lazy(() => import('./Transactions'));
const AccountValue = React.lazy(() => import('./AccountValue'));


const useStyles = makeStyles({
    root: {
        minWidth: 275,
    },
    title: {
        fontSize: 18,
    },
});


function AccountStats(props) {

    const classes = useStyles();
    const account = props.account;

    let totalCash = Number(account.balance);
    let currencySymbol = toSymbol(account.currency);

    const assetValues = props.positions.map(position => {
        // Exchange rate is null if account and position trading currency are the same.
        let latest_exchange_rate = position.latest_exchange_rate ? position.latest_exchange_rate : 1;
        return position.quantity * position.latest_price * latest_exchange_rate;
    });
    const totalAssetValue = Math.round(
        assetValues.reduce((sum, current) => sum + current, 0) * 100) / 100;

    return (
        <Card className={classes.root} variant="outlined">
            <CardContent>
                <Typography
                    className={classes.title}
                    variant="h5" component="h5" gutterBottom>
                    Account <a href="#/accounts">{account.nickname}</a>
                </Typography>
                <Typography variant="body1" component="p">
                    Total Cash: {totalCash} {currencySymbol}
                </Typography>
                <Typography variant="body1" component="p">
                    Total Assets: {totalAssetValue} {currencySymbol}
                </Typography>
                <Typography variant="body1" component="p">
                    Portfolio Value: {Math.round((totalCash + totalAssetValue) * 100) / 100} {currencySymbol}
                </Typography>
            </CardContent>

        </Card>);
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
    return (
        <div className="portfolio-overview">
            <div className="quick-actions">
                <span className="card-label">Quick actions</span>
                <div>
                    <Button
                        href="#/transactions/record"
                        variant="contained"
                        color="secondary"
                    >
                        <Icon>create</Icon>
                    Record transaction
                    </Button>
                    <Button
                        href="#/events/record_dividend"
                        variant="contained"
                        color="secondary"
                    >
                        <Icon>paid</Icon>
                    Record dividend
                    </Button>
                    <Button
                        href="#/events/record_transfer"
                        variant="contained"
                        color="secondary"
                    >
                        <Icon>sync_alt</Icon>
                    Record transfer
                    </Button>
                    <Button
                        href="#/accounts"
                        variant="contained"
                        color="primary"
                    >
                        Manage accounts
                    </Button>
                    <Button
                        href="#/start/investment_accounts"
                        variant="contained"
                        color="primary"
                    >
                        Quickstart
                    </Button>
                </div>

            </div>
            <div>
                <h2>Account stats</h2>
            </div>

            <div className="account-stats-list" >
                {accountStatsEntries}

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
            "positions": null,
            "positionDetails": new Map(),
            "accounts": null,
            "transactions": null,
            "events": null,
            "accountValues": new Map(),
        };
        this.apiClient = new APIClient('./api');
        this.getPositionDetail = this.getPositionDetail.bind(this);
        this.handleAddAccount = this.handleAddAccount.bind(this);
        this.handleAddTransaction = this.handleAddTransaction.bind(this);
        this.handleDeleteTransaction = this.handleDeleteTransaction.bind(this);
        this.handleCorrectTransaction = this.handleCorrectTransaction.bind(this);
        this.handleAddEvent = this.handleAddEvent.bind(this);
        this.handleDeleteEvent = this.handleDeleteEvent.bind(this);
        this.handleDeleteAccount = this.handleDeleteAccount.bind(this);
    }

    async handleAddAccount(accountData) {
        const data = {
            nickname: accountData.name,
            currency: accountData.currency,
            description: "",
        };
        let result = await this.apiClient.createAccount(data);
        // Reload all the data, e.g. accounts, positions, etc.
        if (result.ok) {
            this.refreshFromServer();
        }
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
        if (result.ok) {
            this.refreshFromServer();
        }
        return result;
    }

    async handleDeleteTransaction(transactionId) {
        let result = await this.apiClient.deleteTransaction(transactionId);
        // Reload all the data, e.g. accounts, positions, etc.
        if (result.ok) {
            this.refreshFromServer();
        }
        return result;
    }

    async handleCorrectTransaction(transactionId, update) {
        let result = await this.apiClient.correctTransaction(transactionId, update);
        if (result.ok) {
            this.refreshFromServer();
        }
        return result;
    }

    async getPositionDetail(positionId) {
        if (this.state.positionDetails.has(positionId)) {
            return this.state.positionDetails.get(positionId);
        }
        return this.fetchAndSetPositionDetail(positionId);

    }

    async fetchAndSetPositionDetail(positionId) {
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

    async handleAddEvent(data) {
        let result = await this.apiClient.addEvent(data);
        if (result.ok) {
            this.refreshFromServer();
        }
        return result;
    }

    async handleDeleteEvent(eventId) {
        let result = await this.apiClient.deleteEvent(eventId);
        // Reload all the data, e.g. accounts, positions, etc.
        this.refreshFromServer();
        return result;
    }

    async handleDeleteAccount(accountId) {
        let result = await this.apiClient.deleteAccount(accountId);
        // Reload all the data, e.g. accounts, positions, etc.
        this.refreshFromServer({deleteAccount: Number(accountId)});

        return result;
    }

    async componentDidMount() {
        this.refreshFromServer();
    }

    refreshFromServer({deleteAccount = null} = {}) {
        this.apiClient.getAccounts().then(accounts => {
            this.setState({ "accounts": accounts });
            if (deleteAccount) {
                let accountValues = this.state.accountValues;
                accountValues.delete(deleteAccount);
                this.setState({
                    "accountValues": accountValues,
                });
            }
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
                this.setState(
                    {
                        "positions": positions,
                        "positionDetails": new Map(),
                    });
                this.apiClient.getTransactions().then(
                    transactions => {
                        this.setState({ "transactions": transactions });
                    });
            });
        this.apiClient.getEvents().then(
            events => {
                this.setState({ "events": events });
            }
        );
    }

    render() {
        const userEmail = JSON.parse(document.getElementById('userEmail').textContent);


        const navBar = <nav className="sidenav">
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
                <li>
                    <NavLink to="/events">Events</NavLink>
                </li>
                <li>
                    <NavLink to="/accounts">Accounts</NavLink>
                </li>
            </ul>
        </nav>;

        // If there are no accounts loaded yet, there isn't much to show.
        // TODO: start displaying sth useful even if the big part is still loading.
        if (this.state.accounts === null) {
            return (<div className="main-grid">
                <Header email={userEmail} />
                {navBar}
                <div className="main-content">
                    <div>
                        <h2>Loading...</h2>
                        <p>Loading basic info...</p>
                    </div>
                </div>
            </div>);
        }
        if (this.state.positions === null || this.state.accountValues.size !== this.state.accounts.length) {
            return (<div className="main-grid">
                <Header email={userEmail} />
                {navBar}
                <div className="main-content">
                    <h2>Loading...</h2>
                    <div>
                        <p>Loading graphs and counting your investments...</p>
                    </div>
                </div>
            </div>);
        }

        // If the accounts are loaded, but there is nothing there, start an onboarding wizard.
        const newUser = this.state.accounts.length == 0;

        let numTransactions = 0;
        if (!newUser) {
            for (let account of this.state.accounts) {
                numTransactions += account.transactions_count;
            }
        }
        const noTransactions = numTransactions == 0;

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
                    <ErrorBoundary>
                        <PortfolioOverview positions={this.state.positions} accounts={this.state.accounts} />
                        <Suspense fallback={<div>Loading graphs...</div>}>
                            {accountValues}
                        </Suspense>
                    </ErrorBoundary>
                </div>);
        }
        let maybeTransactions = <h2>Loading transactions...</h2>;
        if (this.state.transactions !== null) {
            maybeTransactions = <Transactions transactions={this.state.transactions}
                handleAddTransaction={this.handleAddTransaction}
                handleDeleteTransaction={this.handleDeleteTransaction}
                handleCorrectTransaction={this.handleCorrectTransaction}
                positions={this.state.positions}
                accounts={this.state.accounts} />;
        }
        let maybeEvents = <h2>Loading events...</h2>;
        if (this.state.events !== null) {
            maybeEvents = (<Events
                accounts={this.state.accounts}
                events={this.state.events} positions={this.state.positions}
                handleAddEvent={this.handleAddEvent}
                handleDeleteEvent={this.handleDeleteEvent}
            />
            );
        }
        return (
            <div className="main-grid">
                <Header email={userEmail} />

                {navBar}
                <div className="main-content">
                    <Suspense fallback={<div><h2>Loading...</h2>
                        <p>Checking how the market is doing...</p></div>}>
                        <Switch>
                            <Route path="/transactions">
                                <ErrorBoundary>
                                    {maybeTransactions}
                                </ErrorBoundary>
                            </Route>
                            <Route path="/positions">
                                <ErrorBoundary>

                                    <PositionList positions={this.state.positions}
                                        accounts={this.state.accounts} getPositionDetail={this.getPositionDetail} />

                                </ErrorBoundary>
                            </Route>
                            <Route path="/events">
                                <ErrorBoundary>
                                    {maybeEvents}
                                </ErrorBoundary>
                            </Route>
                            <Route path="/accounts">
                                <ErrorBoundary>
                                    <Accounts
                                        accounts={this.state.accounts}
                                        handleAddAccount={this.handleAddAccount}
                                        handleDeleteAccount={this.handleDeleteAccount} />
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
                    </Suspense>
                </div>
            </div>
        );

    }
}