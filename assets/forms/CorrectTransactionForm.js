import React from 'react';

import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import { Formik, Form } from 'formik';
import * as yup from 'yup';

import { matchNumberUpToTwoDecimalPlaces } from './utils.js';
import { toSymbol } from '../currencies.js';
import { FormikDateField, FormikTextField } from './muiformik.js';


const useStyles = makeStyles((theme) => ({
    inputs: {
        marginTop: theme.spacing(1),
        marginBottom: theme.spacing(1),
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        alignItems: "baseline",
    },
    wideInput: {
        minWidth: "300px",
    },
    bottomButtons: {
        marginTop: theme.spacing(4),
        justifyContent: "right",
    }
}));

const mapping = new Map(Object.entries({
    'executed_at': 'executedAt',
    'quantity': 'quantity',
    'transaction_costs': 'fees',
    'price': 'price',
    'total_in_account_currency': 'totalCostAccountCurrency',
    'value_in_account_currency': 'totalValueAccountCurrency',
    'local_value': 'totalValue',
}));

function formUpdateToAPIUpdate(formData) {
    let data = {};

    for (let entry of mapping) {
        data[entry[0]] = formData[entry[1]];
    }
    return data;
}

function apiToErrors(apiResponse) {
    let data = { ...apiResponse };
    data.errors = {};
    if (apiResponse.errors) {
        for (let error of apiResponse.errors) {
            data.errors[mapping[error]] = apiResponse.errors[error];
        }
    }

    return data;

}

export function CorrectTransactionForm(props) {

    const classes = useStyles();

    // General strategy, derive initial values from the account
    // and transaction (and position if necessary).
    // Exchange and currencies stay the same.

    // Fields that can change:
    // executed_at, price, values, fees.

    const validationSchema = yup.object().shape({
        quantity: yup
            .number()
            .required('Quantity is required'),
        price: yup
            .number('Price needs to be a number')
            .required('Price is required')
            .test('has-2-or-less-places', "Only up to two decimal places are allowed",
                matchNumberUpToTwoDecimalPlaces),
        totalCostAccountCurrency: yup
            .number()
            .test('has-2-or-less-places', "Only up to two decimal places are allowed",
                matchNumberUpToTwoDecimalPlaces)
            .required('Total is required'),
        totalValue: yup
            .number().test('has-2-or-less-places', "Only up to two decimal places are allowed",
                matchNumberUpToTwoDecimalPlaces)
            .required(
                'Total value in position currency has to be provided.'),

        totalValueAccountCurrency: yup
            .number().test('has-2-or-less-places', "Only up to two decimal places are allowed",
                matchNumberUpToTwoDecimalPlaces)
            .required(
                'Total value in account currency has to be provided.'),
        fees: yup
            .number()
            .required('Fees are required')
            .test('has-2-or-less-places', "Only up to two decimal places are allowed",
                matchNumberUpToTwoDecimalPlaces),
        executedAt: yup
            .date()
            .typeError("Provide a date in YYYY/MM/DD format")
            .required('Date when transaction was executed is required'),
    });

    const initialValues = {
        quantity: props.transaction.quantity,
        fees: props.transaction.transaction_costs,
        price: props.transaction.price,
        executedAt: new Date(props.transaction.executed_at),
        totalValue: props.transaction.local_value,
        totalCostAccountCurrency: props.transaction.total_in_account_currency,
        totalValueAccountCurrency: props.transaction.value_in_account_currency,
    };

    const positionCurrency = toSymbol(props.transaction.position.asset.currency);
    const accountCurrency = toSymbol(props.account.currency);

    return (

        <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}

            onSubmit={async (values, actions) => {
                try {
                    const update = formUpdateToAPIUpdate(values);
                    let result = await props.handleSubmit(props.transaction.id, update);
                    result = apiToErrors(result);
                    actions.setSubmitting(false);
                    if (result.ok) {
                        actions.resetForm();
                    } else {
                        if (result.errors) {
                            actions.setErrors(result.errors);
                        } else if (result.message) {
                            alert(result.message);
                        }
                    }
                } catch (e) {
                    alert(e);
                }
            }}
        >
            {({ isSubmitting }) => (
                <Form autoComplete="off">
                    <div className={classes.inputs}>
                        <FormikTextField
                            id="quantity"
                            label="Quantity"
                            name="quantity"
                            type="number"
                        />
                        <FormikTextField
                            id="price"
                            label={`Price ${positionCurrency}`}
                            name="price"
                            type="number"
                        />
                    </div>
                    <div>
                        <FormikTextField
                            className={classes.wideInput}
                            id="totalValue"
                            label={`Total Value ${positionCurrency} (position currency)`}
                            name="totalValue"
                            type="number"
                        />
                    </div>
                    <div className={classes.inputs}>
                        <FormikTextField
                            className={classes.wideInput}
                            id="totalValueAccountCurrency"
                            label={`Total Value ${accountCurrency} (account currency)`}
                            name="totalValueAccountCurrency"
                            type="number"
                        />

                    </div>

                    <div className={classes.inputs}>
                        <FormikDateField
                            id="executedAt"
                            label="Executed At"
                            name="executedAt"
                        />
                    </div>

                    <div className={classes.inputs}>
                        <FormikTextField
                            id="fees"
                            label={`Fees ${accountCurrency}`}
                            name="fees"
                            type="number"
                        />
                        <FormikTextField
                            id="totalCostAccountCurrency"
                            label={`Total Cost ${accountCurrency}`}
                            name="totalCostAccountCurrency"
                            type="number"
                        />
                    </div>
                    <div className={classes.bottomButtons + " " + classes.inputs}>
                        <Button
                            variant="outlined"
                            disabled={isSubmitting}
                            onClick={props.handleCancel}
                            className={classes.submitButton}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            autoFocus
                            color="secondary"
                            data-test-id="correct-transaction-button"
                            disabled={isSubmitting}
                            className={classes.submitButton}
                        >
                            Correct transaction
                        </Button>
                    </div>
                </Form>
            )}
        </Formik>
    );
}

CorrectTransactionForm.propTypes = {
    account: PropTypes.shape({
        id: PropTypes.number.isRequired,
        nickname: PropTypes.string.isRequired,
        currency: PropTypes.oneOf(['EUR', 'GBP', 'USD']),
    }),
    transaction: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    handleCancel: PropTypes.func.isRequired,
};