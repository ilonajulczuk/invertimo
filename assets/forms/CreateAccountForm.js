import React from 'react';

import Button from '@mui/material/Button';

import PropTypes from 'prop-types';

import { Formik, Form } from 'formik';
import * as yup from 'yup';

import { FormikTextField, FormikSelectField } from './muiformik.js';
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

    const initialValues = {
        currency: "EUR",
        name: "",
    };
    const onSubmit = async (values, { setErrors, resetForm }) => {
        try {
            const result = await props.handleSubmit(values);
            if (result.ok) {
                resetForm();
                if (result.callback) {
                    result.callback();
                }
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
    };

    const submitButtonText = props.hasAccounts ? "Create another account" : "Create account";

    const currencyOptions = [
        {
            value: "USD",
            label: "$ USD",
        },
        {
            value: "EUR",
            label: "€ EUR",
        },
        {
            value: "GBP",
            label: "£ GBP",
        },
    ];

    const currencyHelperText = `Main currency used by this account (some positions, e.g. stocks might trade in different currencies)`;
    return (

        <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={onSubmit}
        >
            {({ isSubmitting }) => (
                <Form className={classes.formWithMargins}>
                    <div className={classes.inputs}>
                        <FormikTextField
                            className={classes.formControl}
                            id="name"
                            label="Name"
                            name="name"
                            InputLabelProps={{
                                shrink: true,
                            }}
                            formHelperText="Name like 'degiro'"
                        />

                        <FormikSelectField
                            name="currency"
                            labelId="currency-select-label"
                            label="Currency"
                            id="currency"
                            data-testid="currency"
                            options={currencyOptions}
                            className={classes.formControl}
                            formHelperText={currencyHelperText}
                        />
                    </div>

                    <div>
                        <Button
                            type="submit"
                            variant="contained"
                            color="secondary"
                            disabled={isSubmitting}
                        >
                            {submitButtonText}
                        </Button>
                    </div>


                </Form>
            )}
        </Formik>
    );
}

CreateAccountForm.propTypes = {
    handleSubmit: PropTypes.func.isRequired,
    hasAccounts: PropTypes.bool.isRequired,
};