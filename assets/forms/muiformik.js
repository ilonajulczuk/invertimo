
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


import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';


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


function FormControlSelect({ field, form, label, children, ...props }) {
    const name = field.name;
    return (
        <FormControl
        >
            <InputLabel id={`${name}-label`}
                error={form.touched[name] && Boolean(form.errors[name])}>{label}</InputLabel>
            <Select

                {...field}
                {...props}
            >
                {children}
            </Select>
            <FormHelperText error={(form.touched[name] && Boolean(form.errors[name]))}>{(form.touched[name] && form.errors[name])
            }</FormHelperText>
        </FormControl>
    );
}


FormControlSelect.propTypes = {
    label: PropTypes.string.isRequired,
    children: PropTypes.array.isRequired,
    form: PropTypes.object.isRequired,
    field: PropTypes.object.isRequired,
};


export function FormikSelectField({ options, ...props }) {

    const selectOptions = options.map(
        option => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>));
    return (
        <Field
            {...props}
            component={FormControlSelect}
        >
            {selectOptions}
        </Field>
    );
}

FormikSelectField.propTypes = {
    name: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(
        PropTypes.shape(
            {
                value: PropTypes.any.isRequired,
                label: PropTypes.string.isRequired
            })).isRequired,
};