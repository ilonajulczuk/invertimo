import React, { useEffect } from 'react';

import Button from '@mui/material/Button';
import PropTypes from 'prop-types';
import { Formik, Form } from 'formik';
import * as yup from 'yup';

import { filter, uniqBy } from 'lodash';

import TextField from '@mui/material/TextField';
import { CircularProgress } from '@mui/material';

import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

import { toSymbol } from '../currencies.js';
import { FormikDateField, FormikTextField, FormikSelectField } from './muiformik.js';
import { Snackbar } from '../components/Snackbar.js';
import { useStyles } from './styles.js';

import { getAssets } from '../api_utils.js';

import useMediaQuery from '@mui/material/useMediaQuery';
import { matchNumberUpToTenDecimalPlaces } from './utils.js';


function formUpdateToAPIUpdate(formData) {
    let data = { ...formData };
    data["executed_at"] = new Date(data["executed_at"]).toISOString().slice(0, 10) + "T00:00";
    return data;
}

function apiToErrors(apiResponse) {
    let data = { ...apiResponse };
    return data;
}


const optionFilter = createFilterOptions();

export function RecordCryptoIncomeForm(props) {

    const classes = useStyles();

    const [snackbarOpen, snackbarSetOpen] = React.useState(false);

    const [loading, setLoading] = React.useState(true);
    const [options, setOptions] = React.useState(props.defaultAssetOptions);


    const smallScreen = useMediaQuery('(max-width:500px)');
    useEffect(() => {
        let mounted = true;
        getAssets().then(assets => {
            if (mounted) {
                const filteredAssets = filter(assets, (asset) => asset.asset_type === "Crypto");
                console.log(filteredAssets);
                const uniqueAssets = uniqBy(filteredAssets, "symbol");
                setOptions(uniqueAssets.map(asset => asset.symbol));
                setLoading(false);
            }
        });

        return () => mounted = false;
    }, [props.defaultAssetOptions]);

    const snackbarHandleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        snackbarSetOpen(false);
    };

    const validationSchema = yup.object().shape({
        quantity: yup
            .number()
            .positive()
            .required('Quantity is required'),
        local_value: yup
            .number()
            .positive()
            .required('Local value is required'),
        value_account_currency: yup
            .number()
            .positive()
            .required('Value in account currency is required'),
        price: yup
            .number('Price needs to be a number')
            .required('Price is required')
            .positive()
            .test('has-10-or-less-places', "Only up to ten decimal places are allowed",
                matchNumberUpToTenDecimalPlaces),
        account: yup
            .number()
            .required('Account needs to be selected'),
        executed_at: yup
            .date()
            .typeError("Provide a date in YYYY/MM/DD format")
            .required('Date when transaction was executed is required'),
    });

    const initialValues = {
        executed_at: new Date(),
        account: props.accounts[0].id,
        price: "",
        quantity: "",
        local_value: "",
        value_account_currency: "",
        event_type: "STAKING_INTEREST",
        symbol: "",
    };

    const accountsById = new Map(props.accounts.map(account => [account.id, account]));
    let accountOptions = props.accounts.map(account => ({ value: account.id, label: account.nickname }));

    const eventTypeOptions = ["SAVINGS_INTEREST", "STAKING_INTEREST"].map(name => ({
        value: name, label: name,
    }));


    const formattedAccountCurrency = (values, accountsById) => {
        return values.account ? toSymbol(accountsById.get(values.account).currency) : "";
    };

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
            {({ isSubmitting, values, setFieldValue, ...formikProps }) => (
                <Form autoComplete="off" className={classes.form}>

                    <div className={classes.inputs}>

                        <Autocomplete
                            id="symbol"
                            label="Stock symbol"
                            name="symbol"
                            value={values.symbol}
                            className={classes.symbolInput}
                            onChange={(event, newValue) => {
                                if (newValue != null) {
                                    if (newValue.newOption) {
                                        setFieldValue('symbol', newValue.inputValue);
                                        return;
                                    }
                                    setFieldValue('symbol', newValue);
                                } else {
                                    setFieldValue('symbol', '');
                                }
                            }}
                            filterOptions={(options, params) => {
                                const filtered = optionFilter(options, params);
                                if (params.inputValue !== '') {
                                    filtered.push({
                                        inputValue: params.inputValue,
                                        newOption: `Add "${params.inputValue}"`,
                                    });
                                }

                                return filtered;
                            }}
                            options={options}
                            getOptionLabel={(option) => {
                                // e.g value selected with enter, right from the input.
                                if (typeof option === 'string') {
                                    return option;
                                }
                                if (option.newOption) {
                                    return option.newOption;
                                }
                                return `${option.symbol} (#${option.id})`;
                            }}
                            selectOnFocus
                            clearOnBlur
                            handleHomeEndKeys
                            style={{ width: smallScreen ? "unset" : 400, display: "flex" }}
                            freeSolo
                            renderInput={(params) => (
                                <TextField {...params}
                                    id="symbol"
                                    label="Token symbol"
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <React.Fragment>
                                                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                                {params.InputProps.endAdornment}
                                            </React.Fragment>
                                        ),
                                    }}

                                    error={formikProps.touched.symbol && Boolean(formikProps.errors.symbol)}
                                    helperText={(formikProps.touched.symbol && formikProps.errors.symbol) || "Crypto symbol like 'BTC'"} />
                            )}
                        />

                        <FormikSelectField
                            id="event_type"
                            label="Income type"
                            name="event_type"
                            labelId="event_type-label"
                            options={eventTypeOptions}
                            className={classes.mediumInput}
                        />
                    </div>

                    <div className={classes.inputs}>

                        <FormikSelectField
                            id="account"
                            label="Account"
                            name="account"
                            options={accountOptions}
                            className={classes.mediumInput}
                        />

                        <FormikDateField
                            id="executed_at"
                            label="Executed At"
                            name="executed_at"
                        />
                    </div>

                    <div className={classes.inputs}>
                        <FormikTextField
                            className={classes.narrowInput}
                            id="quantity"
                            label="Quantity"
                            name="quantity"
                            type="number"
                            InputLabelProps={{
                                shrink: true,
                            }}
                        />
                        <FormikTextField
                            className={classes.formControl}
                            id="price"
                            label={`Price in ${toSymbol('USD')}`}
                            name="price"
                            type="number"
                            InputLabelProps={{
                                shrink: true,
                            }}
                        />
                    </div>

                    <div className={classes.inputs}>
                        <FormikTextField
                            className={classes.narrowInput}
                            id="local_value"
                            label={`Value in ${toSymbol('USD')}`}
                            name="local_value"
                            type="number"
                            InputLabelProps={{
                                shrink: true,
                            }}
                        />
                        <FormikTextField
                            className={classes.formControl}
                            id="value_account_currency"
                            label={`Value in ${formattedAccountCurrency(values, accountsById)} (account currency)`}
                            name="value_account_currency"
                            type="number"
                            InputLabelProps={{
                                shrink: true,
                            }}
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
                        message="Income recorded successfully!"
                    />
                </Form>
            )}
        </Formik>
    );
}

RecordCryptoIncomeForm.propTypes = {
    handleSubmit: PropTypes.func.isRequired,
    accounts: PropTypes.arrayOf(PropTypes.shape(
        {
            nickname: PropTypes.string.isRequired,
            id: PropTypes.number.isRequired
        })
    ).isRequired,
    defaultAssetOptions: PropTypes.array.isRequired,
};