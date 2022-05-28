import React from 'react';

import PropTypes from 'prop-types';
import Icon from '@mui/material/Icon';

export default function IconWithText({icon, text}) {
    return <><Icon sx={{marginRight: "10px"}}>{icon}</Icon>{text}</>;
}

IconWithText.propTypes = {
    icon: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
};