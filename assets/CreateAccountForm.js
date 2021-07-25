import React from 'react';

import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import { makeStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';

import { useFormik } from 'formik';
import * as yup from 'yup';


const currencyValues = [
    "EUR", "USD", "GBP"
];

const validationSchema = yup.object({
    name: yup
        .string('Enter the name for the account, like \'degiro\'')
        .required('Account name is required'),
    currency: yup
        .string('Enter the currency')
        .oneOf(currencyValues)
        .required('Currency is required'),
});


const useStyles = makeStyles((theme) => ({
    form: {
        display: "flex",
        flexWrap: "wrap",
        flexDirection: "column",
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
        maxWidth: 300,
    },
    formControlLeft: {
        margin: theme.spacing(1),
        marginLeft: 0,
        minWidth: 120,
        maxWidth: 300,
    },
}));


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
                const errors = await props.handleSubmit(values);
                setErrors(errors);
                if (Object.keys(errors).length == 0) {

                    resetForm();
                }
            } catch (e) {
                alert(e);
            }
        }
    });

    const submitButtonText = props.hasAccounts ? "Create another account" : "Create account";

    return (
        <form className={classes.form} onSubmit={formik.handleSubmit}>
            <div>
                <TextField
                    id="account-name"
                    label="Name"
                    name="name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    error={formik.touched.name && Boolean(formik.errors.name)}
                    helperText={(formik.touched.name && formik.errors.name) || "Name like 'degiro'"}
                    className={classes.formControlLeft}
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