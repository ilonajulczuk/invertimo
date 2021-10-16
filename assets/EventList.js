import React from 'react';
import PropTypes from 'prop-types';

import { ErrorBoundary } from './error_utils.js';
import { TableWithSort } from './components/TableWithSort.js';
import { toSymbol } from './currencies.js';
import Icon from '@material-ui/core/Icon';

import './transaction_list.css';
import Button from '@material-ui/core/Button';

import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles({
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    }
});

export function EventList(props) {

    const classes = useStyles();
    const eventHeadCells = [
        { id: 'event_type', label: 'Type' },
        { id: 'account', label: 'Account' },
        { id: 'position', label: 'Position' },
        { id: 'amount', label: 'Value' },
        { id: 'executed_at', label: 'Executed At' },
        { id: 'interaction', label: '' },
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
        return eventCopy;
    });


    return (
        <ErrorBoundary>
            <div className={classes.header}>
                <h2>Events</h2>
                <Button
                    href="#/events/record"
                    variant="contained"
                    color="secondary"
                >
                    <Icon>create</Icon>
                    Record event
                </Button>
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
};