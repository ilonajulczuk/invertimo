import React from 'react';

import PropTypes from 'prop-types';
import './position_link.css';


export function PositionLink({ position, account }) {
    return (<div className="position-name">
        <span className="card-label">{position.asset.isin}</span>
        <a href={`#positions/${position.id}`}><span className="position-symbol">{position.asset.symbol}</span></a>
        <span>{position.asset.name}</span>
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
                name: PropTypes.string.isRequired
            }).isRequired,

    }).isRequired,
    account: PropTypes.shape({
        id: PropTypes.number.isRequired,
        nickname: PropTypes.string.isRequired,
    }).isRequired,
};