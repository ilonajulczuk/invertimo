import React from 'react';

import Button from '@mui/material/Button';
import PropTypes from 'prop-types';
import { Formik, Form } from 'formik';
import * as yup from 'yup';

import { toSymbol } from '../currencies.js';
import { FormikDateField, FormikTextField, FormikSelectField } from './muiformik.js';
import { Snackbar } from '../components/Snackbar.js';
import { useStyles } from './styles.js';


function formUpdateToAPIUpdate(formData) {
    let data = { ...formData };
    if (data.event_type == "WITHDRAWAL") {
        data.amount = -data.amount;
    }
    // Data needs to be in ISO format and include minutes.
    // Since we don't really care about the minutes, I cut them
    // and replace with 00:00 time.
    data["executed_at"] = new Date(data["executed_at"]).toISOString().slice(0, 10) + "T00:00";
    data["position"] = "";
    return data;
}

function apiToErrors(apiResponse) {
    let data = { ...apiResponse };
    return data;
}

export function RecordTransferForm(props) {

    const classes = useStyles();

    const [snackbarOpen, snackbarSetOpen] = React.useState(false);

    const snackbarHandleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        snackbarSetOpen(false);
    };

    const validationSchema = yup.object().shape({
        amount: yup
            .number().moreThan(0).required(),
        account: yup
            .number()
            .required(),
        event_type: yup
            .string()
            .oneOf(['DEPOSIT', 'WITHDRAWAL']),
        executed_at: yup
            .date()
            .typeError("Provide a date in YYYY/MM/DD format")
            .required('Date when transaction was executed is required'),
    });

    const initialValues = {
        executed_at: new Date(),
        account: props.accounts[0].id,
        event_type: "DEPOSIT",
        amount: '',
    };

    const accountsById = new Map(props.accounts.map(account => [account.id, account]));

    let accountOptions = props.accounts.map(account => ({ value: account.id, label: account.nickname }));
    const eventTypeOptions = [
        { value: "DEPOSIT", label: "Deposit" },
        { value: "WITHDRAWAL", label: "Withdrawal" },
    ];
    return (

        <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={async (values, actions) => {
                try {
                    const data = formUpdateToAPIUpdate(values);
                    let result = await props.handleSubmit(data);
                    result = apiToErrors(result);
                    actions.setSubmitting(false);
                    if (result.ok) {
                        snackbarSetOpen(true);
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
            {({ isSubmitting, values }) => (
                <Form autoComplete="off" className={classes.form}>
                    <div className={classes.inputs}>
                        <FormikSelectField
                            id="account"
                            label="Account"
                            name="account"
                            options={accountOptions}
                            className={classes.mediumInput}
                        />
                        <FormikSelectField
                            id="event_type"
                            label="Transfer type"
                            name="event_type"
                            options={eventTypeOptions}
                            className={classes.mediumInput}
                        />
                    </div>
                    <div className={classes.inputs}>
                        <FormikTextField
                            className={classes.wideInput}
                            id="amount"
                            label={`Amount (${toSymbol(accountsById.get(values["account"]).currency)})`}
                            name="amount"
                            type="number"
                        />

                        <FormikDateField
                            id="executed_at"
                            label="Executed At"
                            name="executed_at"
                        />
                    </div>

                    <div className={classes.bottomButtons}>
                        <Button
                            type="submit"
                            variant="contained"
                            color="secondary"
                            disabled={isSubmitting}
                            className={classes.submitButton}
                        >
                            Record
                        </Button>
                    </div>
                    <Snackbar
                        snackbarOpen={snackbarOpen}
                        snackbarHandleClose={snackbarHandleClose}
                        message="Transfer recorded successfully!"
                    />
                </Form>
            )}
        </Formik>
    );
}

RecordTransferForm.propTypes = {
    handleSubmit: PropTypes.func.isRequired,
    accounts: PropTypes.arrayOf(PropTypes.shape(
        { nickname: PropTypes.string.isRequired, id: PropTypes.number.isRequired })
    ).isRequired,
};