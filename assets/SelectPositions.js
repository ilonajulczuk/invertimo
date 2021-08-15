import React from 'react';
import PropTypes from 'prop-types';
import Icon from '@material-ui/core/Icon';
import './select_positions.css';


export function SelectPositions(props) {

    let positionItems = props.positions.map((position, i) => {
        return (
            <li className="select-positions-li" key={position.id}>
                <span style={{
                    color: props.colors[i]
                }}>#</span>
                {position.asset.symbol} - {props.positionPercentages[i]}% (<a className="display-flex"
                    href={"#/positions/" + position.id}>details <Icon>north_east</Icon></a>)

            </li>);

    });

    return (
        <div>
            <h3>Top Positions (<a href="#/positions/">see all</a>)</h3>
            <ul className="display-flex">
                {positionItems}
            </ul>
        </div>
    );
}


SelectPositions.propTypes = {
    positions: PropTypes.array.isRequired,
    colors: PropTypes.array.isRequired,
    positionPercentages: PropTypes.array.isRequired,
};