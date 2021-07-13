import React from 'react';
import PropTypes from 'prop-types';
import Icon from '@material-ui/core/Icon';


export function SelectPositions(props) {

    // TODO: extract styling out to a css file.
    let positionItems = props.positions.map((position, i) => {
        return (
            <li style={{ display: "flex", padding: "10px", marginRight: "5px", marginBottom: "5px", borderRadius: "5px", border: "1px solid #ccc" }} key={position.id}>


                <span style={{
                    color: props.colors[i]
                }}>#</span>
                {position.security.symbol} (<a style={{ display: "flex" }}
                    href={"#/positions/" + position.id}>details <Icon>north_east</Icon></a>)

            </li>);

    });

    return (
        <div>
            <h3>Top Positions (<a href="#/positions/">see all</a>)</h3>
            <ul style={{ display: "flex", flexWrap: "wrap" }}>
                {positionItems}
            </ul>
        </div>
    );
}


SelectPositions.propTypes = {
    positions: PropTypes.array.isRequired,
    colors: PropTypes.array.isRequired,
};