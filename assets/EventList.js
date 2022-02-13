import React from 'react';
import PropTypes from 'prop-types';
import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';

import './transaction_list.css';

import { ErrorBoundary } from './error_utils.js';
import { TableWithSort } from './components/TableWithSort.js';
import { toSymbol } from './currencies.js';
import { PositionLink } from './components/PositionLink.js';
import { EventTypeDisplay } from './components/EventTypeDisplay.js';
import { roundToTwoDecimalString } from './forms/utils.js';


export function EventList(props) {

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
        eventCopy.executed_at = {
            displayValue: date.toLocaleDateString(),
            comparisonKey: date,
        };
        let account = accountsById.get(event.account);
        eventCopy.account = {
            displayValue: (<a href={`#/accounts/${event.account}`}>{account.nickname}</a>),
            comparisonKey: event.account,
        };

        let currency = toSymbol(account.currency);
        let positionDisplay = "None";
        if (event.position) {
            let position = null;
            for (let pos of props.positions) {
                if (event.position === pos.id) {
                    position = pos;
                }
            }
            if (position) {
                if (event.event_type == "DIVIDEND") {
                    currency = toSymbol(position.asset.currency);
                }
                positionDisplay = <PositionLink position={position} account={account} />;
            }
        }
        const amount = roundToTwoDecimalString(event.amount);
        eventCopy.amount = {
            displayValue: (
                amount + currency
            ),
            comparisonKey: Number(event.amount)
        };

        eventCopy.position = {
            displayValue: positionDisplay,
            comparisonKey: event.position,
        };
        eventCopy.event_type = {
            displayValue: <EventTypeDisplay eventType={event.event_type} />,
            comparisonKey: event.event_type,
        };

        eventCopy.interaction = {
            displayValue: <div className="column-stack">
                <Button
                    href={"#/events/" + event.id}
                >Details</Button>

            </div>
        };

        return eventCopy;
    });

    return (
        <ErrorBoundary>
            <div className="header-with-buttons">
                <h2>Events</h2>
                <div className='header-button-group'>
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


export function EmbeddedDividendList(props) {
    const eventHeadCells = [
        { id: 'amount', label: 'Value' },
        { id: 'withheld_taxes', label: 'Withheld taxes' },
        { id: 'executed_at', label: 'Executed At' },
        { id: 'interaction', label: '' },
    ];

    const events = props.events.map(event => {

        let eventCopy = { ...event };
        let date = new Date(eventCopy.executed_at);
        eventCopy.executed_at = {
            displayValue: date.toLocaleDateString(),
            comparisonKey: date,
        };

        const currency = toSymbol(props.position.asset.currency);

        const amount = roundToTwoDecimalString(event.amount);
        eventCopy.amount = {
            displayValue: (
                amount + currency
            ),
            comparisonKey: Number(event.amount)
        };

        eventCopy.withheld_taxes = {
            displayValue: (
                Number(event.withheld_taxes) + currency
            ),
            comparisonKey: event.withheld_taxes
        };

        eventCopy.event_type = {
            displayValue: <EventTypeDisplay eventType={event.event_type} />,
            comparisonKey: event.event_type,
        };

        eventCopy.interaction = {
            displayValue: (
                <div className="column-stack">
                    <Button
                        href={"#/events/" + event.id}
                    >Details</Button>
                </div>)
        };

        return eventCopy;
    });
    return (
        <ErrorBoundary>
            <TableWithSort
                rows={events}
                headCells={eventHeadCells}
                defaultOrder="desc"
                defaultOrderBy="executed_at"
                additionalShrink={60}
            />
        </ErrorBoundary>
    );
}


EmbeddedDividendList.propTypes = {
    events: PropTypes.array.isRequired,
    position: PropTypes.object.isRequired,
};


export function EmbeddedIncomeEventList(props) {

    let eventHeadCells = [
        { id: 'event_type', label: 'Type' },
        { id: 'amount', label: 'Value' },
        { id: 'executed_at', label: 'Executed At' },
        { id: 'transaction', label: 'Transaction'},
        { id: 'interaction', label: '' },
    ];
    if (props.events.length > 0 && props.events[0].transaction_quantity) {
        eventHeadCells = [
            { id: 'event_type', label: 'Type' },
            { id: 'amount', label: 'Value' },
            { id: 'executed_at', label: 'Executed At' },
            { id: 'transaction_quantity', label: 'Received Tokens'},
            { id: 'transaction', label: 'Transaction'},
            { id: 'interaction', label: '' },
        ];
    }

    const events = props.events.map(event => {

        let eventCopy = { ...event };
        let date = new Date(eventCopy.executed_at);
        eventCopy.executed_at = {
            displayValue: date.toLocaleDateString(),
            comparisonKey: date,
        };

        const currency = toSymbol(props.account.currency);

        const amount = roundToTwoDecimalString(event.amount);
        eventCopy.amount = {
            displayValue: (
                amount + currency
            ),
            comparisonKey: Number(event.amount)
        };

        if (event.transaction_quantity) {
            eventCopy.transaction_quantity = Number(event.transaction_quantity);
        }

        eventCopy.transaction = {
            displayValue: (
                <a href={`#/transactions/${event.transaction}`}>Transaction</a>
            ),
            comparisonKey: event.transaction
        };

        eventCopy.event_type = {
            displayValue: <EventTypeDisplay eventType={event.event_type} />,
            comparisonKey: event.event_type,
        };

        eventCopy.interaction = {
            displayValue: (
                <div className="column-stack">
                    <Button
                        href={"#/events/" + event.id}
                    >Details</Button>
                </div>)
        };

        return eventCopy;
    });
    return (
        <ErrorBoundary>
            <TableWithSort
                rows={events}
                headCells={eventHeadCells}
                defaultOrder="desc"
                defaultOrderBy="executed_at"
                additionalShrink={60}
            />
        </ErrorBoundary>
    );

}

EmbeddedIncomeEventList.propTypes = {
    events: PropTypes.array.isRequired,
    position: PropTypes.object.isRequired,
    account: PropTypes.object.isRequired,
};