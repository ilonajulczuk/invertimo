import React from 'react';

import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

import PropTypes from 'prop-types';


export default function SubmitSpinnerButton({isSubmitting, text}) {

    return (
        <div style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "start",
            alignItems: "center",
            gap: "10px",
        }}>
            {isSubmitting ? <CircularProgress /> : null}
            <Button
                type="submit"
                variant="contained"
                color="secondary"
                disabled={isSubmitting}
                sx={{
                    marginTop: "2em",
                    marginBottom: "2em",
                }}
            >
                {text}
            </Button>
        </div>
    );
}

SubmitSpinnerButton.propTypes = {
    isSubmitting: PropTypes.bool.isRequired,
    text: PropTypes.string.isRequired,
};