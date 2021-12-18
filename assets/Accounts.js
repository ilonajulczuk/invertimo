import React from 'react';
import PropTypes from 'prop-types';

import {
    Switch,
    Route,
    useRouteMatch,
    useHistory,
} from "react-router-dom";

import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';

import makeStyles from '@mui/styles/makeStyles';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

import { toSymbol } from './currencies.js';
import { DeleteDialog } from './forms/DeleteDialog.js';
import { CreateAccountForm } from './forms/CreateAccountForm.js';


const useStyles = makeStyles({
    root: {
        minWidth: 275,
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
});


function AccountCard(props) {

    const classes = useStyles();
    const account = props.account;

    let totalCash = Number(account.balance);
    let currencySymbol = toSymbol(account.currency);

    return (
        <Card className={classes.root} variant="outlined">
            <CardContent>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div>
                        <Button
                            href={"#/accounts/" + account.id + "/delete"}
                            size="small"
                        >
                            <Icon>delete</Icon>

                        </Button>
                    </div>

                </div>
                <Typography variant="h5" component="h5">
                    {account.nickname}
                </Typography>
                <Typography variant="body1" component="p">
                    Cash balance: {totalCash} {currencySymbol}
                </Typography>
                <Typography variant="body1" component="p">
                    # <a href="#/transactions">transactions</a>: {account.transactions_count}
                </Typography>
                <Typography variant="body1" component="p">
                    # <a href="#/events">events</a>: {account.events_count}
                </Typography>
            </CardContent>

        </Card>);
}


AccountCard.propTypes = {
    account: PropTypes.shape({
        id: PropTypes.number.isRequired,
        nickname: PropTypes.string.isRequired,
        currency: PropTypes.oneOf(['EUR', 'GBP', 'USD']),
        positions_count: PropTypes.number.isRequired,
        transactions_count: PropTypes.number.isRequired,
        events_count: PropTypes.number.isRequired,
        balance: PropTypes.string.isRequired,
    }),
};


export function Accounts(props) {
    let match = useRouteMatch("/accounts/:accountId");
    let path = "/accounts";

    let history = useHistory();

    let accountsById = new Map(props.accounts.map(account => [account.id, account]));

    let accountId;
    let account;
    let canDelete = false;
    if (match) {
        path = match.path;
        accountId = match.params.accountId;
        account = accountsById.get(Number(accountId));
        if (account) {
            canDelete = account.transactions_count === 0 && account.events_count === 0;
        }
    }

    const handleDelete = () => {
        props.handleDeleteAccount(accountId);
        history.push("/accounts");
    };

    const handleCancel = () => {
        history.push("/accounts");
    };

    const handleAddAccount = async (data) => {
        const result = await props.handleAddAccount(data);
        if (result.ok) {
            result.callback = () => history.push("/accounts");
        }
        return result;
    };
    const classes = useStyles();

    const accountCards = props.accounts.map(account => <AccountCard key={account.id} account={account} />);

    const accountsBase = (
        <>
            <div className={classes.header}>
                <h2>Accounts</h2>

                <Button
                    href="#/accounts/add"
                    variant="contained"
                    color="secondary"
                >
                    <Icon>savings</Icon>
                        Add account
                    </Button>

            </div>

            <div style={{ display: "flex", direction: "row", flexWrap: "wrap", gap: "10px" }}>
                {accountCards}
            </div>
        </>
    );
    return (<div>


        <Switch>
            <Route path="/accounts/add">
                <h2><a href="#/accounts">Accounts</a> / add</h2>
                <CreateAccountForm
                    handleSubmit={handleAddAccount}
                    hasAccounts={props.accounts.length > 0} />
            </Route>
            <Route path={`${path}/delete`}>
                {accountsBase}

                <DeleteDialog handleCancel={handleCancel} open={true} canDelete={canDelete}
                    handleDelete={handleDelete} title="Delete account?"
                    message={"Are you sure you want to delete this account? All transactions " +
                        "and events associated with this account need to be deleted before the account can be deleted."}
                />
            </Route>
            <Route path="/accounts">
                {accountsBase}

            </Route>


        </Switch>
    </div >);
}


Accounts.propTypes = {
    accounts: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        nickname: PropTypes.string.isRequired,
        currency: PropTypes.oneOf(['EUR', 'GBP', 'USD']),
        positions_count: PropTypes.number.isRequired,
        transactions_count: PropTypes.number.isRequired,
        events_count: PropTypes.number.isRequired,
        balance: PropTypes.string.isRequired,
    })),
    handleDeleteAccount: PropTypes.func.isRequired,
    handleAddAccount: PropTypes.func.isRequired,
};

