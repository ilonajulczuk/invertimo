
import React from 'react';
import PropTypes from 'prop-types';
import { Field } from 'formik';

import TextField from '@mui/material/TextField';
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';

import FormHelperText from '@mui/material/FormHelperText';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';

import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import DatePicker from '../components/DatePicker';


export const FormikTextField = ({ name, formHelperText, ...props }) => {

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
                        (form.errors[name] &&
                        form.touched[name] &&
                        String(form.errors[name] || formHelperText) || formHelperText)
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
    formHelperText: PropTypes.string,
};

export function FormikDateField({
    name,
    maxDate = new Date("2099-12-31"),
    minDate = new Date("1900-01-01"),
    ...props }) {

    return (
        <Field
            validateOnBlur
            validateOnChange
        >
            {({ form, field }) => {
                const currentError = form.errors[name];
                const toShowError = Boolean(currentError);
                return (
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                            disabled={false}
                            clearable
                            minDate={minDate}
                            maxDate={maxDate}
                            {...field}
                            {...props}
                            value={form.values[name]}
                            onBlur={() => form.setFieldTouched(name, true, true)}
                            error={true || Boolean(form.errors[name])}
                            toShowError={toShowError}
                            currentError={currentError}
                            onChange={(value) => {
                                form.setFieldValue(name, value, true);
                            }}

                            ariaLabel="change date"
                        />
                    </LocalizationProvider>);
            }
            }
        </Field>
    );
}

FormikDateField.propTypes = {
    name: PropTypes.string.isRequired,
    minDate: PropTypes.instanceOf(Date),
    maxDate: PropTypes.instanceOf(Date),
};


function FormControlSelect({ field, form, label, children, formHelperText, className, ...props }) {
    const name = field.name;
    return (
        <FormControl
            className={className}
        >
            <InputLabel id={`${name}-label`}
                error={form.touched[name] && Boolean(form.errors[name])}>{label}</InputLabel>
            <Select
                {...field}
                {...props}
                labelId={`${name}-label`}
                label={label}
            >
                {children}
            </Select>
            <FormHelperText error={(form.touched[name] && Boolean(form.errors[name]))}>{(form.touched[name] && form.errors[name]) || formHelperText
            }</FormHelperText>
        </FormControl>
    );
}


FormControlSelect.propTypes = {
    label: PropTypes.string.isRequired,
    children: PropTypes.array.isRequired,
    form: PropTypes.object.isRequired,
    field: PropTypes.object.isRequired,
    formHelperText: PropTypes.string,
    className: PropTypes.string,
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


export function FormikRadioField({ name, options, ...props }) {
    const radioOptions = options.map(
        option => (
            <FormControlLabel
                value={option.value}
                control={<Radio />}
                label={option.label}
                key={option.label} />
        )
    );
    return (
        <Field>
            {({ form, field }) => {
                return <FormControl>
                    <RadioGroup
                        {...field}
                        {...props}
                        name={name}
                        value={form.values[name]}
                        row>
                        {radioOptions}
                    </RadioGroup>
                </FormControl>;
            }}
        </Field>
    );
}

FormikRadioField.propTypes = {
    name: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(
        PropTypes.shape(
            {
                value: PropTypes.any.isRequired,
                label: PropTypes.string.isRequired
            })).isRequired,
};


export function FormikCheckboxField({ name, label, formHelperText, ...props }) {

    return (
        <Field>
            {({ form, field }) => {
                return <FormControl>
                    <FormControlLabel control={
                        <Checkbox defaultChecked {...field}
                            {...props}
                            name={name}
                            value={form.values[name]} />} label={label} />
                    <FormHelperText sx={{
                        marginLeft: 0, marginRight: 0
                    }} error={(form.touched[name] && Boolean(form.errors[name]))}>{(form.touched[name] && form.errors[name]) || formHelperText
                        }</FormHelperText>
                </FormControl>;
            }}
        </Field>
    );
}

FormikCheckboxField.propTypes = {
    name: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    formHelperText: PropTypes.string,
};