import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { filter, map } from 'lodash';

import makeStyles from '@mui/styles/makeStyles';

import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

import { ErrorBoundary } from './error_utils.js';
import { getLots } from './api_utils.js';
import { LotList } from './LotList.js';
import { PositionLink } from './components/PositionLink.js';
import { roundDecimal, sumAsDecimals } from './forms/utils.js';
import StartEndSelector, {DEFAULT_DATES} from './components/StartEndSelector.js';


const useStyles = makeStyles({
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "10px",
        flexWrap: "wrap",
    },
});

export default function RealizedGainsReport(props) {

    const classes = useStyles();

    const [dates, setDates] = useState(DEFAULT_DATES);

    const [showAssetHoldTime, setShowAssetHoldTime] = useState(false);
    const handleSetShowAssetHoldAge = (event) => {
        setShowAssetHoldTime(event.target.checked);
    };

    const [lots, setLots] = useState(null);


    useEffect(() => {
        let mounted = true;
        getLots().then(lots => {
            if (mounted) {
                setLots(lots);
            }
        });

        return () => mounted = false;
    },
        [props.positions]
    );

    const lotsDisplay = lots ? <GainsDisplay
        lots={lots}
        positions={props.positions}
        accounts={props.accounts}
        startDate={dates.from}
        endDate={dates.to}
        holdTime={showAssetHoldTime}
    /> : <div>Loading...</div>;
    return (<ErrorBoundary>

        <div className={classes.header}>
            <h2><a href="#reports">Reports</a> / realized gains</h2>
        </div>
        <StartEndSelector dates={dates} setDates={setDates} />
        <div className={classes.header}>
            <FormGroup>
                <FormControlLabel control={<Checkbox checked={showAssetHoldTime} onChange={handleSetShowAssetHoldAge} />} label="Show how long assets were held" />
            </FormGroup>

        </div>
        {lotsDisplay}

    </ErrorBoundary>);
}

RealizedGainsReport.propTypes = {
    accounts: PropTypes.array.isRequired,
    positions: PropTypes.array.isRequired,
};

function GainsDisplay(props) {
    // Divide lots per position.
    // Then render position + total gains
    // And then lots with links to transactions as a table with sort but no pagination.
    // Or should I still have pagination?

    const lotsFilteredByDates = filter(props.lots, (lot) => {
        return (new Date(lot.sell_date) < props.endDate || props.endDate === null) && (new Date(lot.sell_date) >= props.startDate);
    });

    let lotsByPositionId = new Map(lotsFilteredByDates.map(lot => [lot.position, []]));
    lotsFilteredByDates.forEach(lot => {
        const lots = lotsByPositionId.get(lot.position);
        lots.push(lot);
    });
    let positionsAndLots = [];
    const positionsById = new Map(props.positions.map(position => [position.id, position]));
    const accountsById = new Map(props.accounts.map(account => [account.id, account]));

    for (let [positionId, lots] of lotsByPositionId) {
        const position = positionsById.get(positionId);
        const account = accountsById.get(position.account);

        const gains = map(lots, lot => lot.realized_gain_account_currency);
        const totalGain = sumAsDecimals(gains);
        const totalGainRounded = roundDecimal(totalGain).toString();
        positionsAndLots.push(
            <div key={positionId}>
                <div style={{ display: "flex", gap: "10px", alignItems: "baseline", marginBottom: "1rem", marginTop: "3rem" }}>
                    <h4><PositionLink position={position} account={account} /></h4>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span className="card-label">Total gain / loss</span>
                        {totalGainRounded}
                    </div>
                </div>
                <ul>
                    <LotList lots={lots} position={position} account={account} holdTime={props.holdTime} />
                </ul>
            </div>
        );
    }

    return <div>
        {lotsFilteredByDates.length > 0 ? positionsAndLots : <p>Nothing during this period :(.</p>}
    </div>;
}


GainsDisplay.propTypes = {
    lots: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        quantity: PropTypes.string.isRequired,
        buy_date: PropTypes.string.isRequired,
        buy_price: PropTypes.string.isRequired,
        cost_basis_account_currency: PropTypes.string.isRequired,
        sell_date: PropTypes.string.isRequired,
        sell_price: PropTypes.string.isRequired,
        sell_basis_account_currency: PropTypes.string.isRequired,
        realized_gain_account_currency: PropTypes.string.isRequired,
        position: PropTypes.number.isRequired,
        buy_transaction: PropTypes.number.isRequired,
        sell_transaction: PropTypes.number.isRequired,
    })).isRequired,
    accounts: PropTypes.array.isRequired,
    positions: PropTypes.array.isRequired,
    startDate: PropTypes.instanceOf(Date).isRequired,
    endDate: PropTypes.instanceOf(Date),
    holdTime: PropTypes.bool.isRequired,
};
