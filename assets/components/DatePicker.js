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
        renderInput={(inputProps) => <TextField {...inputProps}
          error={props.toShowError ?? !isValid(new Date(props.value))}
          helperText={(props.toShowError ?? !isValid(new Date(props.value)))
             ? props.currentError ?? props.helperText : undefined}
          onBlur={props.onBlur}
        />}
        value={props.value}
        autoOk={true}
        disabled={props.disabled}
        onChange={props.onChange}
        KeyboardButtonProps={{
            'aria-label': props.ariaLabel ?? "",
        }}
        {...props}
    />);
}


DatePicker.propTypes = {
    value: PropTypes.any,
    disabled: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
    ariaLabel: PropTypes.string,
    toShowError: PropTypes.bool,
    currentError: PropTypes.string,
    helperText: PropTypes.string,
    onBlur: PropTypes.func,
};