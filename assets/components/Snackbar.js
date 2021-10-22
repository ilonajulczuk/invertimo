import React from 'react';

import MuiSnackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import PropTypes from 'prop-types';


export function Snackbar({ snackbarOpen, snackbarHandleClose, message, ...props }) {

    return <MuiSnackbar
        anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
        }}
        open={snackbarOpen} autoHideDuration={6000} onClose={snackbarHandleClose}>
        <MuiAlert elevation={6} variant="filled" onClose={snackbarHandleClose} severity="success" {...props}>
            {message}
        </MuiAlert>
    </MuiSnackbar>;
}

Snackbar.propTypes = {
    snackbarOpen: PropTypes.bool.isRequired,
    snackbarHandleClose: PropTypes.func.isRequired,
    message: PropTypes.string.isRequired,
};