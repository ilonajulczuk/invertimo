import React from 'react';

import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';

import PropTypes from 'prop-types';
import { useFormik } from 'formik';
import * as yup from 'yup';


import { currencyValues } from '../currencies.js';
import { useStyles } from './styles.js';


const validationSchema = yup.object({
    name: yup
        .string('Enter the name for the account, like \'degiro\'')
        .required('Account name is required'),
    currency: yup
        .string('Enter the currency')
        .oneOf(currencyValues)
        .required('Currency is required'),
});


export function CreateAccountForm(props) {

    const classes = useStyles();

    const formik = useFormik({
        initialValues: {
            currency: "EUR",
            name: "",
        },
        validationSchema: validationSchema,
        onSubmit: async (values, { setErrors, resetForm }) => {
            try {
                const result = await props.handleSubmit(values);
                if (result.ok) {
                    resetForm();
                } else {
                    if (result.errors) {
                        setErrors(result.errors);
                    } else if (result.message) {
                        alert(result.message);
                    }
                }
            } catch (e) {
                alert(e);
            }
        }
    });

    const submitButtonText = props.hasAccounts ? "Create another account" : "Create account";

    return (
        <form className={classes.formWithMargins} onSubmit={formik.handleSubmit}>
            <div className={classes.inputs}>
                <TextField
                    id="account-name"
                    label="Name"
                    name="name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    error={formik.touched.name && Boolean(formik.errors.name)}
                    helperText={(formik.touched.name && formik.errors.name) || "Name like 'degiro'"}
                    className={classes.formControl}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />

                <FormControl className={classes.formControl}>
                    <InputLabel id="currency-select-label">Currency</InputLabel>
                    <Select
                        name="currency"
                        labelId="currency-select-label"
                        id="currency-select"
                        value={formik.values.currency}
                        onChange={formik.handleChange}
                        error={formik.touched.currency && Boolean(formik.errors.currency)}
                        className={classes.formControl}
                    >
                        <MenuItem value={"USD"}>$ USD</MenuItem>
                        <MenuItem value={"EUR"}>€ EUR</MenuItem>
                        <MenuItem value={"GBP"}>£ GBP</MenuItem>
                    </Select>
                    <FormHelperText>{(formik.touched.currency && formik.errors.currency) ||
                        `Main currency used by this account
                    (some positions, e.g. stocks might trade in different currencies)`}</FormHelperText>
                </FormControl>
            </div>

            <div>
                <Button
                    type="submit"
                    variant="outlined"
                    color="secondary"
                    disabled={formik.isSubmitting}
                >
                    {submitButtonText}
                </Button>
            </div>

        </form>
    );
}

CreateAccountForm.propTypes = {
    handleSubmit: PropTypes.func.isRequired,
    hasAccounts: PropTypes.bool.isRequired,
};