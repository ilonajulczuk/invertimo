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

import './event_list.css';
import { toSymbol } from './currencies.js';
import { DeleteDialog } from './forms/DeleteDialog.js';

import { trimTrailingDecimalZeroes } from './display_utils.js';
import { PositionLink } from './components/PositionLink.js';
import { EventTypeDisplay } from './components/EventTypeDisplay.js';
import { EventImportRecord } from './TransactionImportRecord.js';
import { roundToTwoDecimalString } from './forms/utils.js';


const useStyles = makeStyles({
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    eventDetails: {
        padding: "10px",
        background: "#8282820d",
        border: "1px solid #384a5052",
        borderLeft: "5px solid #1b98a1",
        borderBottom: "5px solid #384a5052",
        marginBottom: "2em",
        display: "flex",
        flexDirection: "column",
    },
});


export function EventDetail(props) {
    const classes = useStyles();

    let match = useRouteMatch("/events/:eventId");
    let path = match.path;
    let eventId = match.params.eventId;
    let history = useHistory();

    let event = null;
    for (let t of props.events) {
        if (t.id == eventId) {
            event = t;
        }
    }

    if (event === null) {
        return (
            <div>
                <div className={classes.header}>
                    <h2><a href="../#events/">Events</a> / {eventId}</h2>
                </div>
                <div>404 Not found :(</div>
            </div>);
    }

    let accountsById = new Map(props.accounts.map(account => [account.id, account]));
    let account = accountsById.get(event.account);
    let positionsById = new Map(props.positions.map(position => [position.id, position]));
    let currency = toSymbol(account.currency);

    let positionDetail;
    if (event.position) {
        const position = positionsById.get(event.position);
        if (position) {
            positionDetail = <PositionLink position={position} account={account} />;
            if (event.event_type === "DIVIDEND") {
                currency = toSymbol(position.asset.currency);
            }
        }
    }

    const amount = roundToTwoDecimalString(event.amount);
    let topInfo = (
        <div className="position-card">
            <div><EventTypeDisplay eventType={event.event_type} /></div>
            <div><span className="card-label">Amount</span> {amount + currency}</div>
            {(event.event_type) === "DIVIDEND" ? <div>
                <span className="card-label">Withheld taxes</span> {
                    trimTrailingDecimalZeroes(event.withheld_taxes) + currency}</div>
                : null}
            {positionDetail}
            <div>
                <span className="card-label">Executed at</span> {event.executed_at.slice(0, 10)}
            </div>

        </div>
    );

    const eventImportRecords = event.event_records.map(
        record => <EventImportRecord record={record} key={record.id} />);

    const handleDelete = () => {
        props.handleDeleteEvent(event.id);
        history.push("/events");
    };

    const handleCancel = () => {
        history.push("/events/" + event.id);
    };

    return (
        <div>
            <div className={classes.header}>
                <h2><a href="../#events/">Events</a> / {eventId}</h2>
                <div>
                    <Button
                        href={"#/events/" + event.id + "/delete/"}
                        size="small"
                    ><Icon>delete</Icon>Delete</Button>
                </div>
            </div>

            {topInfo}
            <div className={classes.eventDetails}>
                <p>In account <a href={`#accounts/${account.id}`}>{account.nickname}</a></p>
                {event.event_records.length ? <h3>Import records</h3> : ""}
                {eventImportRecords}


            </div>
            <Switch>
                <Route path={`${path}/delete`}>
                    <DeleteDialog handleCancel={handleCancel}
                        open={true}
                        canDelete={true}
                        handleDelete={handleDelete} message="It will be as if this event has never happened.
                        This might cause you to miss historical data."
                        title="Are you sure you want to delete this event?"
                    />

                </Route>
            </Switch>
        </div>
    );
}

EventDetail.propTypes = {
    accounts: PropTypes.array.isRequired,
    events: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        amount: PropTypes.string.isRequired,
        withheld_taxes: PropTypes.string,
        account: PropTypes.number.isRequired,
        position: PropTypes.number,
    })).isRequired,
    positions: PropTypes.array.isRequired,
    handleDeleteEvent: PropTypes.func.isRequired,
};