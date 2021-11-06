import React from 'react';
import PropTypes from 'prop-types';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogActions from '@material-ui/core/DialogActions';

export function DeleteDialog({ open, handleCancel, handleDelete, message, title, canDelete }) {

    return (
        <Dialog
            open={open}
            onClose={handleCancel}
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
        >
            <DialogTitle id="delete-dialog-title">{title}</DialogTitle>
            <DialogContent>
                <DialogContentText id="delete-dialog-description">
                    {message}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel} variant="outlined" autoFocus>
                    Cancel
                            </Button>
                <Button onClick={handleDelete}
                disabled={!canDelete}
                 color="secondary" variant="contained">
                    Delete
                            </Button>
            </DialogActions>
        </Dialog>
    );
}

DeleteDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    handleCancel: PropTypes.func.isRequired,
    handleDelete: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    canDelete: PropTypes.bool,
};