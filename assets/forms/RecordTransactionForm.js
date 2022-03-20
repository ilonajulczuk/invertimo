import React, { useEffect } from 'react';

import Button from '@mui/material/Button';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

import PropTypes from 'prop-types';
import { FormikDateField, FormikTextField, FormikSelectField, FormikRadioField } from './muiformik.js';

import { Formik, Form } from 'formik';
import * as yup from 'yup';

import { useStyles } from './styles.js';
import { currencyValues, toSymbol } from '../currencies.js';
import { SelectAssetFormFragment } from './SelectAssetFormFragment.js';
import { Snackbar } from '../components/Snackbar.js';
import { matchNumberUpToTenDecimalPlaces } from './utils.js';
import { getCurrencyExchangeRates } from '../api_utils.js';
import isValid from 'date-fns/isValid';
import Decimal from 'decimal.js';


function formTransactionToAPITransaction(formData) {
    let data = { ...formData };
    // Asset could be auto filled and unchanged -> asset set to id.
    // Auto filled and changed -> treated as custom asset.
    // Totally custom -> treated as custom asset.
    const assetId = data["symbol"].id;
    if (assetId) {
        if (data.symbol.currency === data.currency && data.symbol.exchange.name === data.exchange) {
            data["asset"] = assetId;
            delete data["symbol"];
        } else {
            data["symbol"] = formData.symbol.symbol;
            data["asset_type"] = formData["assetType"];
        }
    } else {
        data["asset_type"] = formData["assetType"];
    }
    delete data["assetType"];

    // When the asset is bought all the values are supposed to be negative.
    // Multiplier is applied to flip the sign if the transaction is a sell.
    let multiplier = 1;
    if (data["tradeType"] === "sell") {
        data["quantity"] = -data["quantity"];
        multiplier = -1;
    }
    delete data["tradeType"];

    data["transaction_costs"] = -data["fees"];
    delete data.fees;

    // This value is empty if the currencies match.
    let value = data["totalValueAccountCurrency"];
    const emptyAccountCurrencyValue = value === "";

    if (data["price"] === "" && !emptyAccountCurrencyValue) {
        delete data.price;
        delete data.local_value;
    } else {
        const price = new Decimal(-data["price"]);
        const quantity = new Decimal(data["quantity"]);
        data["local_value"] = price.mul(quantity).mul(10000).round().div(10000).toString();
    }

    data["value_in_account_currency"] = (
        emptyAccountCurrencyValue ? data["local_value"] : String(-value * multiplier));

    delete data["totalValueAccountCurrency"];

    // User can go with the default value that is precomputed, in that case fill it in.
    let totalInAccountCurrency = data["totalCostAccountCurrency"];
    if (totalInAccountCurrency === "") {
        data["total_in_account_currency"] = (new Decimal(data["value_in_account_currency"])).add(new Decimal(data["transaction_costs"])).toString();
    } else {
        data["total_in_account_currency"] = (new Decimal(totalInAccountCurrency)).mul(new Decimal(-multiplier)).toString();
    }

    delete data["totalCostAccountCurrency"];
    data["order_id"] = "";

    // Date from the datepicker will not have time and the time is actually required.
    let executedAt = data["executedAt"];
    if (typeof executedAt === "string") {
        executedAt = new Date(executedAt);
    } else if (executedAt instanceof Date) {
        executedAt = new Date(executedAt.toISOString().slice(0, 10));
    }
    data["executed_at"] = executedAt;
    delete data["executedAt"];

    return data;
}


function apiTransactionResponseToErrors(apiResponse) {
    let response = { ok: apiResponse.ok };

    if (apiResponse.errors) {
        response.errors = apiResponse.errors;
        response.errors["totalCostAccountCurrency"] = apiResponse.errors["total_in_account_currency"];
        response.errors["assetType"] = apiResponse.errors["asset_type"];
        response.errors["fees"] = apiResponse.errors["transaction_costs"];
        response.errors["totalValueAccountCurrency"] = apiResponse.errors["value_in_account_currency"];
        response.errors["executedAt"] = apiResponse.errors["executed_at"];
    }
    if (apiResponse.message) {
        response.message = apiResponse.message;
    }
    return response;
}


function ValueBlock(props) {
    const [rate, setRate] = React.useState(null);
    useEffect(() => {
        setRate(null);
        let mounted = true;
        if (isValid(new Date(props.date))) {
            const datestr = props.date.toISOString().slice(0, 10);
            getCurrencyExchangeRates(props.assetCurrency, props.accountCurrency, datestr, datestr).then(rates => {
                if (mounted) {
                    if (rates.length > 0) {
                        setRate(Number(rates[0].value));
                    }
                }
            });
        }

        return () => mounted = false;
    }, [props.accountCurrency, props.assetCurrency, props.date]);

    if (props.sameCurrency) {
        return null;
    }

    let exchangeRateBlock = null;
    if (props.price && props.quantity && rate) {
        if (rate) {
            const value = Math.round(props.price * props.quantity * rate * 100) / 100;
            exchangeRateBlock =
                <Alert severity="info" variant="outlined" style={{
                    marginBottom: "8px",
                }}>
                    <AlertTitle>Currency converted value</AlertTitle>
                    <p>Based on exchange rate equal to {rate} value would
                        be {value} {props.formattedAccountCurrency}
                    </p>
                    <p>
                        <Button variant="contained" onClick={() => {
                            props.setComputedValue(value);
                        }
                        }>Use</Button>
                    </p>
                    <p>Feel free to use the exact value instead if you have one.</p>

                </Alert>;
        }
    }
    return (
        <>
            <h4>Value</h4>
            <div className={props.classes.inputs} style={{ flexDirection: "column" }}>
                {exchangeRateBlock}
                <FormikTextField
                    id="totalValueAccountCurrency"
                    label={`Total value in ${props.formattedAccountCurrency}`}
                    name="totalValueAccountCurrency"
                    type="number"
                    className={props.classes.formControl}
                    formHelperText={"Price x quantity x currency exchange rate"}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />
            </div>
        </>
    );
}

ValueBlock.propTypes = {
    sameCurrency: PropTypes.bool.isRequired,
    classes: PropTypes.object.isRequired,
    formattedAccountCurrency: PropTypes.string.isRequired,
    date: PropTypes.instanceOf(Date).isRequired,
    quantity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    setComputedValue: PropTypes.func.isRequired,
    assetCurrency: PropTypes.string.isRequired,
    accountCurrency: PropTypes.string.isRequired,
};


function TotalCostBlock(props) {
    let totalCostBlock = null;

    if (!props.sameCurrency) {
        totalCostBlock = (<><h4>Total cost</h4>
            <p>Total cost will be deducted from selected account balance and fees will be associated with assets.</p>
            <div className={props.classes.inputs}>
                <FormikTextField
                    id="fees"
                    label={`Fees in ${props.formattedAccountCurrency}`}
                    name="fees"
                    type="number"
                    className={props.classes.formControl}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />

                <FormikTextField
                    id="totalCostAccountCurrency"
                    label={`Total cost in ${props.formattedAccountCurrency}`}
                    name="totalCostAccountCurrency"
                    type="number"
                    value={props.formikProps.values.totalCostAccountCurrency || props.formikProps.values.totalValueAccountCurrency + props.formikProps.values.fees}

                    className={props.classes.formControl}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />
            </div>
        </>);
    } else {
        totalCostBlock = (<><h4>Total cost</h4>
            <p>Total cost will be deducted from selected account balance and fees will be associated with assets.</p>
            <div className={props.classes.inputs}>
                <FormikTextField
                    id="fees"
                    label='Fees'
                    name="fees"
                    type="number"
                    className={props.classes.formControl}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />
                <FormikTextField
                    id="totalCostAccountCurrency"
                    label='Total cost'
                    value={props.formikProps.values.totalCostAccountCurrency || Math.round(100 * props.formikProps.values.price * props.formikProps.values.quantity) / 100 + props.formikProps.values.fees}
                    name="totalCostAccountCurrency"
                    type="number"
                    className={props.classes.formControl}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />
            </div></>);
    }
    return totalCostBlock;
}


export function RecordTransactionForm(props) {

    const classes = useStyles();
    const [snackbarOpen, snackbarSetOpen] = React.useState(false);
    const [lastTransactionId, setLastTransactionId] = React.useState(null);

    const snackbarHandleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        snackbarSetOpen(false);
    };

    const sameCurrency = (values, accountsById) => {
        return accountsById.get(values.account).currency == values.currency;
    };
    const formattedAccountCurrency = (values, accountsById) => {
        return values.account ? toSymbol(accountsById.get(values.account).currency) : "";
    };
    let accountsById = new Map(props.accounts.map(account => [account.id, account]));

    let initialSymbolValue = props.initialAsset ?? "";

    const validationSchema = yup.object({
        symbol: yup
            .lazy(value => typeof value === 'string' ? yup.string().required() : yup.object().required('Symbol is required')),
        exchange: yup
            .string()
            .required('Exchange is required'),
        currency: yup
            .string('Enter the currency')
            .oneOf(currencyValues)
            .required('Currency is required'),
        tradeType: yup
            .string('Bought or sold')
            .oneOf(["buy", "sell"])
            .required('Trade type is required'),
        price: yup
            .number('Price needs to be a number')
            .when(['currency', 'account'], {
                is: (currency, accountId) => accountId ? currency == accountsById.get(accountId).currency : false,
                then: yup.number().positive("Total value needs to be a positive number.").test('has-10-or-less-places', "Only up to ten decimal places are allowed",
                    matchNumberUpToTenDecimalPlaces).required('Price is required if it\'s in the same currency as account currency.'),
                otherwise: yup.number(),
            }),
        quantity: yup
            .number()
            .positive()
            .required('Quantity is required'),
        account: yup
            .number()
            .required('Account needs to be selected'),
        totalCostAccountCurrency: yup
            .number()
            .positive("Total cost needs to be a positive number.")
            .test('has-10-or-less-places', "Only up to ten decimal places are allowed",
                matchNumberUpToTenDecimalPlaces),
        // This value is only required if currency of the asset and account don't match.
        totalValueAccountCurrency: yup
            .number().when(['currency', 'account'], {
                is: (currency, accountId) => accountId ? currency !== accountsById.get(accountId).currency : false,
                then: yup.number().positive("Total value needs to be a positive number.").test('has-10-or-less-places', "Only up to ten decimal places are allowed",
                    matchNumberUpToTenDecimalPlaces).required(
                        'Total value in account currency has to be provided if the' +
                        ' asset currency is different than the account currency.'),
                otherwise: yup.number(),
            }),
        fees: yup
            .number()
            .min(0)
            .required('Fees are required')
            .test('has-2-or-less-places', "Only up to ten decimal places are allowed",
                matchNumberUpToTenDecimalPlaces),
        executedAt: yup
            .date()
            .typeError("Provide a date in YYYY/MM/DD format")
            .required('Date when transaction was executed is required'),
    });

    const initialValues = {
        currency: initialSymbolValue ? initialSymbolValue.currency : "EUR",
        symbol: initialSymbolValue,
        tradeType: "buy",
        executedAt: props.executedAtDate || new Date(),
        account: props.accounts[0].id,
        exchange: initialSymbolValue ? initialSymbolValue.exchange.name : "USA Stocks",
        assetType: initialSymbolValue ? initialSymbolValue.asset_type : "Stock",
        price: "",
        quantity: "",
        totalCostAccountCurrency: "",
        totalValueAccountCurrency: "",
        fees: 0,
    };

    const onSubmit = async (values, { setErrors, resetForm }) => {
        try {
            const cleanValues = formTransactionToAPITransaction(values);
            let result = await props.handleSubmit(cleanValues);
            let transformedResult = apiTransactionResponseToErrors(result);
            if (transformedResult.ok) {
                resetForm();
                snackbarSetOpen(true);
                setLastTransactionId(result.data.id);
            } else {
                if (transformedResult.errors) {
                    setErrors(transformedResult.errors);
                    if ("local_value" in transformedResult.errors) {
                        console.error(transformedResult.errors);
                        alert("Something went wrong computing price times quantity...");
                    }

                } else if (transformedResult.message) {
                    alert(transformedResult.message);
                }
            }
        } catch (e) {
            alert(e);
        }
    };

    let accountOptions = props.accounts.map(account => ({ value: account.id, label: account.nickname }));
    const submitButtonText = lastTransactionId ? "Record another transaction" : "Record transaction";
    const defaultAssetOptions = props.defaultAssetOptions;

    const tradeTypeOptions = [
        {
            value: "buy",
            label: "Bought"
        },
        {
            value: "sell",
            label: "Sold",
        }];

    return (

        <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={onSubmit}
        >
            {({ isSubmitting, ...formikProps }) => (
                <Form className={classes.form}>
                    <h4>Asset details</h4>
                    <SelectAssetFormFragment formik={formikProps}
                        defaultAssetOptions={defaultAssetOptions}
                        fixedValue={initialSymbolValue ? true : false} value={initialSymbolValue ? initialSymbolValue : null}
                    />
                    <h4>Trade details</h4>
                    <div className={classes.inputs}>

                        <FormikRadioField
                            name="tradeType"
                            options={tradeTypeOptions}
                        />

                    </div>
                    <div className={classes.inputs}>
                        <FormikDateField id="executedAt"
                            name="executedAt"
                            label="Executed at" />


                        <FormikSelectField
                            id="account"
                            label="Account"
                            name="account"
                            options={accountOptions}
                            className={classes.mediumInput}
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
                            label={sameCurrency(formikProps.values, accountsById) ? "Price" : `Price in ${toSymbol(formikProps.values.currency)}`}
                            name="price"
                            type="number"
                            formHelperText={sameCurrency(formikProps.values, accountsById) ? "" : `Price is optional as it's different than account currency (if not provided we will use currency conversion rate)`}
                            InputLabelProps={{
                                shrink: true,
                            }}
                        />
                    </div>

                    <ValueBlock classes={classes}
                        formattedAccountCurrency={formattedAccountCurrency(formikProps.values, accountsById)}
                        sameCurrency={sameCurrency(formikProps.values, accountsById)}
                        quantity={formikProps.values.quantity}
                        price={formikProps.values.price}
                        setComputedValue={(val) => formikProps.setFieldValue("totalValueAccountCurrency", val)}
                        date={formikProps.values.executedAt}
                        accountCurrency={accountsById.get(formikProps.values.account).currency}
                        assetCurrency={formikProps.values.currency}
                    />

                    <TotalCostBlock classes={classes}
                        formikProps={formikProps}
                        formattedAccountCurrency={formattedAccountCurrency(formikProps.values, accountsById)}
                        sameCurrency={sameCurrency(formikProps.values, accountsById)} />



                    <div>
                        {lastTransactionId ?

                            <Button href={`#/transactions/${lastTransactionId}`} sx={{ marginRight: "5px" }}>
                                Go to recorded transaction
                            </Button>
                            : null}

                        <Button
                            type="submit"
                            variant="contained"
                            color="secondary"
                            data-test-id="record-transaction-button"
                            disabled={isSubmitting}
                            className={classes.submitButton}
                        >
                            {submitButtonText}
                        </Button>
                    </div>

                    <Snackbar
                        snackbarOpen={snackbarOpen}
                        snackbarHandleClose={snackbarHandleClose}
                        message="Transaction recorded successfully!"
                    />
                </Form>
            )
            }
        </Formik >
    );
}

RecordTransactionForm.propTypes = {
    accounts: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        nickname: PropTypes.string.isRequired,
        currency: PropTypes.oneOf(['EUR', 'GBP', 'USD']),
    })),
    defaultAssetOptions: PropTypes.array.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    executedAtDate: PropTypes.instanceOf(Date),
    initialAsset: PropTypes.object,
};