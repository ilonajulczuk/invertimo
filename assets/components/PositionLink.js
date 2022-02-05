import React from 'react';

import Badge from '@mui/material/Badge';
import PropTypes from 'prop-types';
import './position_link.css';


export function PositionLink({ position, account }) {
    return (<div className="position-name">

        <span className="card-label">{position.asset.isin}</span>

        <Badge anchorOrigin={{
            vertical: 'top',
            horizontal: 'left',

        }}
        color="primary"
        variant="dot"
        invisible={!position.asset.tracked}>
            <a href={`#positions/${position.id}`}><span className="position-symbol">{position.asset.symbol}</span></a>
        </Badge>
        <span>{position.asset.symbol !== position.asset.name ? position.asset.name : null}</span>

        <span>(<a href={`#accounts/${account.id}`}>{account.nickname}</a>)</span>
    </div>);
}


PositionLink.propTypes = {
    position: PropTypes.shape({
        id: PropTypes.number.isRequired,
        asset: PropTypes.shape(
            {
                isin: PropTypes.string.isRequired,
                symbol: PropTypes.string.isRequired,
                name: PropTypes.string.isRequired,
                tracked: PropTypes.bool.isRequired,
                asset_type: PropTypes.string.isRequired,
            }).isRequired,

    }).isRequired,
    account: PropTypes.shape({
        id: PropTypes.number.isRequired,
        nickname: PropTypes.string.isRequired,
    }).isRequired,
};