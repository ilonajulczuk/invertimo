import React from 'react';
import PropTypes from 'prop-types';
import Icon from '@material-ui/core/Icon';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';

import './transaction_list.css';

import { ErrorBoundary } from './error_utils.js';
import { TableWithSort } from './components/TableWithSort.js';
import { toSymbol } from './currencies.js';
import { trimTrailingDecimalZeroes } from './display_utils.js';


const useStyles = makeStyles({
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    eventType: {
        display: "flex",
        alignItems: "center",
    }
});


function EventTypeDisplay({ eventType }) {
    const classes = useStyles();

    if (eventType === "DEPOSIT") {
        return <span className={classes.eventType}><Icon>sync_alt</Icon>Deposit</span>;
    }
    else if (eventType === "WITHDRAWAL") {
        return <span className={classes.eventType}><Icon>sync_alt</Icon>Withdrawal</span>;
    } else if (eventType === "DIVIDEND") {
        return <span className={classes.eventType}><Icon>paid</Icon>Dividend</span>;
    } else {
        <span>{eventType}</span>;
    }
}


EventTypeDisplay.propTypes = {
    eventType: PropTypes.string.isRequired,
};


export function EventList(props) {

    const classes = useStyles();
    const eventHeadCells = [
        { id: 'event_type', label: 'Type' },
        { id: 'account', label: 'Account' },
        { id: 'position', label: 'Position' },
        { id: 'amount', label: 'Value' },
        { id: 'executed_at', label: 'Executed At' },
    ];

    let accountsById = new Map(props.accounts.map(account => [account.id, account]));

    const events = props.events.map(event => {
        let eventCopy = { ...event };
        let date = new Date(eventCopy.executed_at);
        eventCopy.executed_at = date.toLocaleDateString();
        let account = accountsById.get(event.account);
        eventCopy.account = {
            displayValue: (<a href={`#/accounts/${event.account}`}>{account.nickname}</a>),
            comparisonKey: event.account,
        };
        eventCopy.amount = {
            displayValue: (
                trimTrailingDecimalZeroes(event.amount) + toSymbol(account.currency)
            ),
            comparisonKey: event.amount
        };
        let positionDisplay = "None";
        if (event.position) {
            let position = null;
            for (let pos of props.positions) {
                if (event.position === pos.id) {
                    position = pos;
                }
            }
            if (position) {
                positionDisplay = (
                    <div className="position-name">
                        <span className="card-label">{position.asset.isin}</span>
                        <a href={`#positions/${position.id}`}><span className="position-symbol">{position.asset.symbol}</span></a>
                        <span>{position.asset.name}</span>
                    </div>
                );
            }
        }
        eventCopy.position = {
            displayValue: positionDisplay,
            comparisonKey: event.position,
        };
        eventCopy.event_type = {
            displayValue: <EventTypeDisplay eventType={event.event_type} />
        };
        return eventCopy;
    });

    return (
        <ErrorBoundary>
            <div className={classes.header}>
                <h2>Events</h2>
                <div style={{display: "flex", gap: "5px"}}>
                    <Button
                        href="#/events/record_transfer"
                        variant="contained"
                        color="secondary"
                    >
                        <Icon>sync_alt</Icon>
                    Record transfer
                </Button>
                    <Button
                        href="#/events/record_dividend"
                        variant="contained"
                        color="secondary"
                    >
                        <Icon>paid</Icon>
                    Record dividend
                </Button>
                </div>

            </div>
            <TableWithSort
                rows={events}
                headCells={eventHeadCells}
                defaultOrder="desc"
                defaultOrderBy="executed_at" />
        </ErrorBoundary>
    );
}

EventList.propTypes = {
    accounts: PropTypes.array.isRequired,
    events: PropTypes.array.isRequired,
    positions: PropTypes.array.isRequired,
};