
import React from 'react';
import PropTypes from 'prop-types';

import {
    Switch,
    Route,
    useRouteMatch
} from "react-router-dom";


import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';

import RealizedGainsReport from './RealizedGainsReport.js';
import IncomeReport from './IncomeReport.js';

// TODO: extract out the header specific CSS.
import './transaction_list.css';


export default function Reports(props) {

    let { path } = useRouteMatch();

    return (
        <Switch>
            <Route exact path={path}>
                <h2>Reports</h2>
                <div style={{
                    display: "flex",
                    gap: "10px",
                }}>
                    <Button
                        href="#/reports/realized_gains"
                        variant="contained"
                        color="primary"
                    >
                        <Icon>description</Icon>
                        Realized gains report
                    </Button>
                    <Button
                        href="#/reports/crypto_income"
                        variant="contained"
                        color="primary"
                    >
                        <Icon>description</Icon>
                        Crypto income report
                    </Button>
                </div>

            </Route>
            <Route path={`${path}/realized_gains`}>
                <RealizedGainsReport positions={props.positions} accounts={props.accounts} />
            </Route>
            <Route path={`${path}/crypto_income`}>
                <IncomeReport positions={props.positions} events={props.events} accounts={props.accounts} />
            </Route>
        </Switch>
    );
}

Reports.propTypes = {
    positions: PropTypes.array.isRequired,
    events: PropTypes.array,
    accounts: PropTypes.array.isRequired,
};

