import React from 'react';
import PropTypes from 'prop-types';
import Icon from '@mui/material/Icon';
import makeStyles from '@mui/styles/makeStyles';


const useStyles = makeStyles({
    eventType: {
        display: "flex",
        alignItems: "center",
        gap: "5px",
    }
});

export function EventTypeDisplay({ eventType }) {
    const classes = useStyles();

    if (eventType === "DEPOSIT") {
        return <span className={classes.eventType}><Icon>sync_alt</Icon>Deposit</span>;
    }
    else if (eventType === "WITHDRAWAL") {
        return <span className={classes.eventType}><Icon>sync_alt</Icon>Withdrawal</span>;
    } else if (eventType === "DIVIDEND") {
        return <span className={classes.eventType}><Icon>paid</Icon>Dividend</span>;
    } else if (eventType === "SAVINGS_INTEREST") {
        return <span className={classes.eventType}><Icon>savings</Icon>Savings Interest</span>;
    } else if (eventType === "STAKING_INTEREST") {
    return <span className={classes.eventType}><Icon>savings</Icon>Staking Interest</span>;
}
    else {
        return <span>{eventType}</span>;
    }
}


EventTypeDisplay.propTypes = {
    eventType: PropTypes.string.isRequired,
};