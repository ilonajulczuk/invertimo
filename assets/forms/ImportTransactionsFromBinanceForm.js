import React from 'react';

import Button from '@mui/material/Button';

import PropTypes from 'prop-types';
import { Formik, Form } from 'formik';
import * as yup from 'yup';

import { FormikSelectField } from './muiformik.js';
import { Snackbar } from '../components/Snackbar.js';
import { useStyles } from './styles.js';
import { TransactionImportResult } from '../TransactionImportResult.js';
import FormHelperText from '@mui/material/FormHelperText';
import FormControl from '@mui/material/FormControl';
import SubmitSpinnerButton from '../components/SubmitSpinnerButton.js';


function formUpdateToAPIUpdate(formData) {
    let data = { ...formData };
    return data;
}

function apiToErrors(apiResponse) {
    let data = { ...apiResponse };
    if (apiResponse.errors) {
        data.errors["file"] = data.errors["transaction_file"];
    }
    return data;
}


export default function ImportTransactionsFromBinanceForm(props) {

    const classes = useStyles();

    const [snackbarOpen, snackbarSetOpen] = React.useState(false);
    const [snackbarMessage, snackbarSetMessage] = React.useState("");
    const [snackbarSeverity, snackbarSetSeverity] = React.useState("success");
    const [importResult, setImportResult] = React.useState(null);


    const snackbarHandleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        snackbarSetOpen(false);
    };

    const FILE_SIZE = 160 * 1024;

    const validationSchema = yup.object().shape({
        account: yup
            .number()
            .required(),
        file: yup.mixed()
            .required('File is required')
            .test(
                "fileSize",
                "File too large",
                value => value && value.size <= FILE_SIZE
            ),
    });

    const initialValues = {
        account: props.accounts[0].id,
        import_all_assets: true,
    };

    let accountOptions = props.accounts.map(account => ({ value: account.id, label: account.nickname }));

    return (

        <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={async (values, actions) => {
                try {
                    setImportResult(null);
                    const data = formUpdateToAPIUpdate(values);
                    let result = await props.handleSubmit(data);
                    result = apiToErrors(result);
                    actions.setSubmitting(false);
                    if (result.ok) {
                        if (result.data.status == "Success") {
                            snackbarSetSeverity("success");
                            const numTransactions = result.data.records.length;
                            snackbarSetMessage(`Successfully uploaded ${numTransactions} transactions!`);
                        } else {
                            snackbarSetSeverity("warning");
                            snackbarSetMessage(`Partial import success, see Import Result for more details.`);
                        }
                        snackbarSetOpen(true);
                        actions.resetForm();
                    } else {
                        if (result.errors) {
                            console.log(result);
                            actions.setErrors(result.errors);
                            snackbarSetSeverity("error");
                            snackbarSetMessage(`Import failed!`);
                            snackbarSetOpen(true);
                        } else if (result.message) {
                            alert(result.message);
                        }
                    }
                    setImportResult(result);
                } catch (e) {
                    alert(e);
                }
            }}
        >
            {({ isSubmitting, values, setFieldValue, errors }) => (
                <Form autoComplete="off" className={classes.form}>
                    <div className={classes.inputs}>
                        <FormikSelectField
                            id="account"
                            label="Account"
                            name="account"
                            options={accountOptions}
                            className={classes.mediumInput}
                        />
                        <FormControl
                        >
                            <Button
                                variant="contained"
                                component="label"
                            >
                                Select File
                                <input
                                    type="file"
                                    id="file"
                                    name="file"
                                    hidden
                                    accept=".csv"
                                    onChange={e => {
                                        let files = Array.from(e.target.files);
                                        if (files.length == 1) {
                                            const uploadedFile = files[0];
                                            setFieldValue("file", uploadedFile, true);
                                            // So that if the form is cleared, the same value can be selected.
                                            e.target.value = "";
                                        }
                                    }}
                                />
                            </Button>
                            <FormHelperText sx={{
                                marginLeft: 0, marginRight: 0
                            }} error={Boolean(errors["file"])}>
                                {(errors["file"] ? errors["file"] + " - " : "") + (values["file"] ? values["file"].name : "No file selected yet")}
                            </FormHelperText>
                        </FormControl>

                    </div>
                    <SubmitSpinnerButton isSubmitting={isSubmitting} text="Import" />
                    <Snackbar
                        snackbarOpen={snackbarOpen}
                        snackbarHandleClose={snackbarHandleClose}
                        message={snackbarMessage}
                        severity={snackbarSeverity}
                    />
                    {

                        (importResult && importResult.ok) ?
                            <TransactionImportResult importResult={importResult.data} />
                            : null
                    }

                </Form>
            )}
        </Formik>
    );
}

ImportTransactionsFromBinanceForm.propTypes = {
    handleSubmit: PropTypes.func.isRequired,
    accounts: PropTypes.arrayOf(PropTypes.shape(
        { nickname: PropTypes.string.isRequired, id: PropTypes.number.isRequired })
    ).isRequired,
};