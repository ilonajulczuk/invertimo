import React from 'react';

import Button from '@mui/material/Button';
import PropTypes from 'prop-types';
import { Formik, Form } from 'formik';
import * as yup from 'yup';

import { FormikSelectField } from './muiformik.js';
import { Snackbar } from '../components/Snackbar.js';
import { useStyles } from './styles.js';

import FormHelperText from '@mui/material/FormHelperText';
import FormControl from '@mui/material/FormControl';


function formUpdateToAPIUpdate(formData) {
    let data = { ...formData };
    return data;
}

function apiToErrors(apiResponse) {
    let data = { ...apiResponse };
    data.ok = true;
    return data;
}

export default function ImportTransactionsFromDegiroForm(props) {

    const classes = useStyles();

    const [snackbarOpen, snackbarSetOpen] = React.useState(false);

    const snackbarHandleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        snackbarSetOpen(false);
    };

    const FILE_SIZE = 160 * 1024;
    const SUPPORTED_FORMATS = [
      "text/csv",
    ];

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
              )
              .test(
                "fileFormat",
                "Unsupported Format, please provide 'text/csv' file",
                value => value && SUPPORTED_FORMATS.includes(value.type)
              )
            ,
    });

    const initialValues = {
        account: props.accounts[0].id,
    };

    let accountOptions = props.accounts.map(account => ({ value: account.id, label: account.nickname }));

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
                                    onChange={e => {
                                        let files = Array.from(e.target.files);
                                        if (files.length == 1) {
                                            const uploadedFile = files[0];
                                            setFieldValue("file", uploadedFile, true);
                                        }
                                    }}
                                />
                            </Button>
                            <FormHelperText error={Boolean(errors["file"])}>
                                {(errors["file"] ? errors["file"] + " - " : "")  + (values["file"] ? values["file"].name : "No file selected yet")}
                            </FormHelperText>
                        </FormControl>



                    </div>
                    <div className={classes.bottomButtons}>
                        <Button
                            type="submit"
                            variant="contained"
                            color="secondary"
                            disabled={isSubmitting}
                            className={classes.submitButton}
                        >
                            Import
                        </Button>
                    </div>
                    <Snackbar
                        snackbarOpen={snackbarOpen}
                        snackbarHandleClose={snackbarHandleClose}
                        message="Would be imported successfully if connected to API ;) !"
                    />
                </Form>
            )}
        </Formik>
    );
}

ImportTransactionsFromDegiroForm.propTypes = {
    handleSubmit: PropTypes.func.isRequired,
    accounts: PropTypes.arrayOf(PropTypes.shape(
        { nickname: PropTypes.string.isRequired, id: PropTypes.number.isRequired })
    ).isRequired,
};