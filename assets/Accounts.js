import React from 'react';
import PropTypes from 'prop-types';

import {
    Switch,
    Route,
    NavLink,
    Redirect,
} from "react-router-dom";

import Icon from '@material-ui/core/Icon';
import Button from '@material-ui/core/Button';

import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';

import { toSymbol } from './currencies.js';


const useStyles = makeStyles({
    root: {
        minWidth: 275,
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
                <div style={{display: "flex", justifyContent: "flex-end"}}>
                    <div>
                        <Button
                            href={"#/accounts/" + account.id + "/edit"}
                            size="small"
                        >
                            <Icon>edit</Icon>
                        </Button>
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
    const accountCards = props.accounts.map(account => <AccountCard key={account.id} account={account} />);
    return (<div>
        <h2>Accounts</h2>
        <div style={{ display: "flex", direction: "row", flexWrap: "wrap", gap: "10px" }}>

            {accountCards}
        </div>
    </div>);
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
};

