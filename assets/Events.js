import React from 'react';
import PropTypes from 'prop-types';
import {
    Switch,
    Route,
    useRouteMatch
} from "react-router-dom";

import { EventList } from './EventList.js';

export function Events(props) {

    let { path } = useRouteMatch();

    return (
        <Switch>
            <Route exact path={path}>
                <EventList accounts={props.accounts} events={props.events} positions={props.positions}/>
            </Route>
            <Route path={`${path}/record_dividend`}>
                <h2>Record dividend</h2>

            </Route>
            <Route path={`${path}/record_transfer`}>
                <h2>Record transfer</h2>

            </Route>
            <Route path={`${path}/:eventId`}>
                <h2>Event detail {path}</h2>
            </Route>
        </Switch>
    );
}

Events.propTypes = {
    accounts: PropTypes.array.isRequired,
    events: PropTypes.array,
    positions: PropTypes.array.isRequired,
};