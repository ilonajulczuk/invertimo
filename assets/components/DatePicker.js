import React from 'react';
import isValid from 'date-fns/isValid';
import TextField from '@mui/material/TextField';

import PropTypes from 'prop-types';

import MuiDatePicker from '@mui/lab/DatePicker';


export default function DatePicker(props) {

    return (<MuiDatePicker
        disableToolbar
        variant="inline"
        inputFormat="yyyy/MM/dd"
        mask="____/__/__"
        margin="normal"
        renderInput={(props) => <TextField {...props} />}
        value={props.value}
        autoOk={true}
        disabled={props.disabled}
        error={!isValid(new Date(props.value))}
        onChange={props.onChange}
        KeyboardButtonProps={{
            'aria-label': props.ariaLabel ?? "",
        }}

        {...props}
    />);
}


DatePicker.propTypes = {
    value: PropTypes.any.isRequired,
    disabled: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
    ariaLabel: PropTypes.string,
};