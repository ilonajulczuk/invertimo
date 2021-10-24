import React from 'react';

import Button from '@material-ui/core/Button';
import PropTypes from 'prop-types';
import { Formik, Form } from 'formik';
import * as yup from 'yup';

import { toSymbol } from '../currencies.js';
import { FormikDateField, FormikTextField, FormikSelectField } from './muiformik.js';
import { Snackbar } from '../components/Snackbar.js';
import { useStyles } from './styles.js';


function formUpdateToAPIUpdate(formData, positionsById) {
    let data = { ...formData };
    data["event_type"] = "DIVIDEND";
    data["executed_at"] = new Date(data["executed_at"]).toISOString().slice(0, 10) + "T00:00";
    data["account"] = positionsById.get(data.position).account;
    return data;
}

function apiToErrors(apiResponse) {
    let data = { ...apiResponse };
    return data;
}

export function RecordDividendForm(props) {

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
        withheld_taxes: yup
            .number()
            .required(),
        executed_at: yup
            .date()
            .typeError("Provide a date in YYYY/MM/DD format")
            .required('Date when transaction was executed is required'),
    });


    const initialValues = {
        executed_at: new Date(),
        position: props.positions[0] ? props.positions[0].id : "",
        amount: '',
        withheld_taxes: '',
    };

    const accountsById = new Map(props.accounts.map(account => [account.id, account]));
    const positionsById = new Map(props.positions.map(position => [position.id, position]));

    const positionOptions = props.positions.map(position => (
        {
            value: position.id,
            label: `${position.asset.symbol}  - in ${accountsById.get(position.account).nickname} account`
        }));
    return (

        <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={async (values, actions) => {
                try {
                    const data = formUpdateToAPIUpdate(values, positionsById);
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
                            id="position"
                            label="Position"
                            name="position"
                            options={positionOptions}
                            className={classes.mediumInput}
                        />
                    </div>
                    <div className={classes.inputs}>
                        <FormikTextField
                            className={classes.wideInput}
                            id="amount"
                            label={`Amount (${toSymbol(positionsById.get(values["position"]).asset.currency)})`}
                            name="amount"
                            type="number"
                        />

                        <FormikTextField
                            className={classes.wideInput}
                            id="withheld_taxes"
                            label={`Amount of taxes paid already (${toSymbol(positionsById.get(values["position"]).asset.currency)})`}
                            name="withheld_taxes"
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
                            variant="outlined"
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
                        message="Dividend recorded successfully!"
                    />
                </Form>
            )}
        </Formik>
    );
}

RecordDividendForm.propTypes = {
    handleSubmit: PropTypes.func.isRequired,
    accounts: PropTypes.arrayOf(PropTypes.shape(
        {
            nickname: PropTypes.string.isRequired,
            id: PropTypes.number.isRequired
        })
    ).isRequired,
    positions: PropTypes.arrayOf(PropTypes.shape(
        {
            id: PropTypes.number.isRequired,
            asset: PropTypes.object.isRequired
        })).isRequired,
};