
import React from 'react';
import PropTypes from 'prop-types';
import { Field } from 'formik';
import TextField from '@material-ui/core/TextField';
import 'date-fns';
import DateFnsUtils from '@date-io/date-fns';
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
} from '@material-ui/pickers';


export const FormikTextField = ({ name, ...props }) => {

    return (
        <Field
            validateOnBlur
            validateOnChange
        >
            {({ form, field }) => (
                <TextField
                    error={
                        Boolean(form.errors[name] && form.touched[name])
                    }
                    {...field}
                    helperText={
                        form.errors[name] &&
                        form.touched[name] &&
                        String(form.errors[name])
                    }
                    value={form.values[name]}
                    {...props}
                />
            )}
        </Field>
    );
};

FormikTextField.propTypes = {
    name: PropTypes.string.isRequired,
};

export function FormikDateField({ name, ...props }) {

    return (
        <Field
            validateOnBlur
            validateOnChange
        >
            {({ form, field }) => (

                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <KeyboardDatePicker
                        disableToolbar
                        variant="inline"
                        format="yyyy/MM/dd"
                        margin="normal"
                        {...field}
                        {...props}
                        value={form.values[name]}
                        autoOk={true}
                        error={Boolean(form.errors[name])}
                        onChange={(_, value) => {
                            console.log("setting date", name, value);
                            form.setFieldValue(name, value);
                        }}
                        helperText={form.errors[name]}
                        KeyboardButtonProps={{
                            'aria-label': 'change date',
                        }}
                    />

                </MuiPickersUtilsProvider>
            )}
        </Field>
    );
}

FormikDateField.propTypes = {
    name: PropTypes.string.isRequired,
};