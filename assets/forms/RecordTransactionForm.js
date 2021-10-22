import React from 'react';

import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import { makeStyles } from '@material-ui/core/styles';

import { green, red } from '@material-ui/core/colors';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
} from '@material-ui/pickers';

import PropTypes from 'prop-types';
import { useFormik } from 'formik';
import * as yup from 'yup';
import 'date-fns';
import DateFnsUtils from '@date-io/date-fns';

import { currencyValues, toSymbol } from '../currencies.js';
import { SelectAssetFormFragment } from './SelectAssetFormFragment.js';
import { Snackbar } from '../components/Snackbar.js';
import { matchNumberUpToTwoDecimalPlaces } from './utils.js';


function formTransactionToAPITransaction(formData) {
    let data = { ...formData };
    data["account"] = data["account"].id;
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
    data["local_value"] = -data["price"] * data["quantity"];

    // This value is empty if the currencies match.
    let value = data["totalValueAccountCurrency"];
    const emptyAccountCurrencyValue = value === "";
    data["value_in_account_currency"] = (
        emptyAccountCurrencyValue ? data["local_value"] : -value * multiplier);

    delete data["totalValueAccountCurrency"];

    // User can go with the default value that is precomputed, in that case fill it in.
    let totalInAccountCurrency = data["totalCostAccountCurrency"];
    if (totalInAccountCurrency === "") {
        data["total_in_account_currency"] = data["value_in_account_currency"] + data["transaction_costs"];
    } else {
        data["total_in_account_currency"] = -totalInAccountCurrency * multiplier;
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


const useStyles = makeStyles((theme) => ({
    form: {
        display: "flex",
        flexWrap: "wrap",
        flexDirection: "column",
    },
    formControl: {
        minWidth: 120,
        maxWidth: 300,
    },
    symbolInput: {
        minWidth: 320,
        maxWidth: 500,
    },
    narrowInput: {
        minWidth: 60,
        maxWidth: 100,
    },
    inputs: {
        marginTop: theme.spacing(1),
        marginBottom: theme.spacing(1),
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        alignItems: "baseline",
    },
    green: {
        color: green[600],
        '& *': {
            color: green[600],
        },
    },
    red: {
        color: red[600],
        '& *': {
            color: red[600],
        },
    },
    tradeTypes: {
        display: "flex",
        flexDirection: "row",
    },
    submitButton: {
        marginTop: "2em",
        marginBottom: "2em",
    },
}));

const validationSchema = yup.object({
    symbol: yup
        .lazy(value => typeof value === 'string' ? yup.string().required() : yup.object().required()),
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
        .required('Price is required')
        .test('has-2-or-less-places', "Only up to two decimal places are allowed",
            matchNumberUpToTwoDecimalPlaces),
    quantity: yup
        .number()
        .required('Quantity is required'),
    account: yup
        .object()
        .required('Account needs to be selected'),
    totalCostAccountCurrency: yup
        .number()
        // .required('Total is required')
        .test('has-2-or-less-places', "Only up to two decimal places are allowed",
            matchNumberUpToTwoDecimalPlaces),
    // This value is only required if currency of the asset and account don't match.
    totalValueAccountCurrency: yup
        .number().when(['currency', 'account'], {
            is: (currency, account) => account ? currency !== account.currency : false,
            then: yup.number().test('has-2-or-less-places', "Only up to two decimal places are allowed",
                matchNumberUpToTwoDecimalPlaces).required(
                    'Total value in account currency has to be provided if the' +
                    ' asset currency is different than the account currency.'),
            otherwise: yup.number(),
        }),
    fees: yup
        .number()
        .required('Fees are required')
        .test('has-2-or-less-places', "Only up to two decimal places are allowed",
            matchNumberUpToTwoDecimalPlaces)
    ,
    executedAt: yup
        .date()
        .typeError("Provide a date in YYYY/MM/DD format")
        .required('Date when transaction was executed is required'),
});

export function RecordTransactionForm(props) {

    const classes = useStyles();

    const [snackbarOpen, snackbarSetOpen] = React.useState(false);

    const snackbarHandleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        snackbarSetOpen(false);
    };

    const initialValues = {
        currency: "EUR",
        symbol: "",
        tradeType: "buy",
        executedAt: props.executedAtDate || new Date(),
        account: "",
        exchange: "",
        assetType: "stock",
        price: "",
        quantity: "",
        totalCostAccountCurrency: "",
        totalValueAccountCurrency: "",
        fees: "",
    };

    const onSubmit = async (values, { setErrors, resetForm }) => {
        try {

            const cleanValues = formTransactionToAPITransaction(values);
            let result = await props.handleSubmit(cleanValues);
            result = apiTransactionResponseToErrors(result);
            if (result.ok) {
                resetForm();
                snackbarSetOpen(true);
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

    const formik = useFormik({
        initialValues: initialValues,
        validationSchema: validationSchema,
        onSubmit: onSubmit,
    });

    let accountOptions = props.accounts.map(account => {
        return (
            <MenuItem key={account.id} value={account}>{account.nickname}</MenuItem>
        );
    });

    const submitButtonText = props.hasTransactions ? "Record another transaction" : "Record transaction";

    let valueBlock = null;
    let totalCostBlock = null;

    let formattedAccountCurrency = "";
    if (formik.values.account) {
        formattedAccountCurrency = toSymbol(formik.values.account.currency);
    }

    const sameCurrency = formik.values.account ? formik.values.account.currency == formik.values.currency : false;
    if (!sameCurrency) {

        valueBlock = <>
            <h4>Value</h4>
            <div className={classes.inputs}>

                <TextField
                    id="value-account-currency"
                    label={`Total value in ${formattedAccountCurrency}`}
                    name="totalValueAccountCurrency"
                    type="number"
                    value={formik.values.totalValueAccountCurrency}
                    onChange={formik.handleChange}
                    error={formik.touched.totalValueAccountCurrency && Boolean(formik.errors.totalValueAccountCurrency)}
                    helperText={(formik.touched.totalValueAccountCurrency && formik.errors.totalValueAccountCurrency)}
                    className={classes.formControl}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />
            </div>
        </>;

        totalCostBlock = (<><h4>Total cost</h4>
            <p>Total cost will be deducted from selected account balance and fees will be associated with assets.</p>
            <div className={classes.inputs}>


                <TextField
                    id="fees"
                    label={`Fees in ${formattedAccountCurrency}`}
                    name="fees"
                    type="number"
                    value={formik.values.fees}
                    onChange={formik.handleChange}
                    error={formik.touched.fees && Boolean(formik.errors.fees)}
                    helperText={(formik.touched.fees && formik.errors.fees)}
                    className={classes.formControl}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />
                <TextField
                    id="total-cost-account-currency"
                    label={`Total cost in ${formattedAccountCurrency}`}
                    name="totalCostAccountCurrency"
                    value={formik.values.totalCostAccountCurrency || formik.values.totalValueAccountCurrency + formik.values.fees}
                    type="number"
                    onChange={formik.handleChange}
                    error={formik.touched.totalCostAccountCurrency && Boolean(formik.errors.totalCostAccountCurrency)}
                    helperText={(formik.touched.totalCostAccountCurrency && formik.errors.totalCostAccountCurrency)}
                    className={classes.formControl}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />
            </div>
        </>);
    } else {
        totalCostBlock = (<><h4>Total cost</h4>
            <p>Total cost will be deducted from selected account balance and fees will be associated with assets.</p>
            <div className={classes.inputs}>

                <TextField
                    id="fees"
                    label="Fees"
                    name="fees"
                    type="number"
                    value={formik.values.fees}
                    onChange={formik.handleChange}
                    error={formik.touched.fees && Boolean(formik.errors.fees)}
                    helperText={(formik.touched.fees && formik.errors.fees)}
                    className={classes.narrowInput}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />

                <TextField
                    id="total-cost-account-currency"
                    label="Total cost"
                    name="totalCostAccountCurrency"
                    value={formik.values.totalCostAccountCurrency || Math.round(100 * formik.values.price * formik.values.quantity) / 100 + formik.values.fees}
                    type="number"
                    onChange={formik.handleChange}
                    error={formik.touched.totalCostAccountCurrency && Boolean(formik.errors.totalCostAccountCurrency)}
                    helperText={(formik.touched.totalCostAccountCurrency && formik.errors.totalCostAccountCurrency)}
                    className={classes.formControl}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />
            </div></>);
    }

    const selectAssetBlock = <SelectAssetFormFragment formik={formik} />;

    return (
        <form className={classes.form} onSubmit={formik.handleSubmit}>
            <h4>Asset details</h4>
            {selectAssetBlock}

            <h4>Trade details</h4>
            <div className={classes.inputs}>

                <FormControl className={classes.formControl}>
                    <RadioGroup aria-label="trade type" name="tradeType" value={formik.values.tradeType} onChange={formik.handleChange} className={classes.tradeTypes}>
                        <FormControlLabel value="buy" control={<Radio className={classes.green} />} label="Bought" />
                        <FormControlLabel value="sell" control={<Radio className={classes.red} />} label="Sold" />

                    </RadioGroup>
                </FormControl>
            </div>
            <div className={classes.inputs}>
                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <KeyboardDatePicker
                        disableToolbar
                        variant="inline"
                        format="yyyy/MM/dd"
                        margin="normal"
                        id="executedAt"
                        name="executedAt"
                        label="Executed at"
                        value={formik.values.executedAt}
                        autoOk={true}
                        error={Boolean(formik.errors.executedAt)}
                        onChange={(name, value) => {
                            formik.setFieldValue('executedAt', value);
                        }}
                        helperText={formik.errors.executedAt}
                        KeyboardButtonProps={{
                            'aria-label': 'change date',
                        }}
                    />

                </MuiPickersUtilsProvider>

                <FormControl className={classes.formControl}>
                    <InputLabel id="account-label" error={formik.touched.account && Boolean(formik.errors.account)}>In account</InputLabel>
                    <Select
                        name="account"
                        labelId="account-label"
                        id="account"
                        value={formik.values.account}
                        onChange={formik.handleChange}
                        error={formik.touched.account && Boolean(formik.errors.account)}
                        className={classes.formControl}
                    >
                        {accountOptions}
                    </Select>
                    <FormHelperText error={formik.touched.account && Boolean(formik.errors.account)}>{(formik.touched.account && formik.errors.account) ||
                        `Trade needs to be associated with one of your accounts`}</FormHelperText>
                </FormControl>
            </div>

            <div className={classes.inputs}>
                <TextField
                    id="quantity"
                    label="Quantity"
                    name="quantity"
                    type="number"
                    value={formik.values.quantity}
                    onChange={formik.handleChange}
                    error={formik.touched.quantity && Boolean(formik.errors.quantity)}
                    helperText={(formik.touched.quantity && formik.errors.quantity)}
                    className={classes.narrowInput}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />

                <TextField
                    id="price"
                    label={sameCurrency ? "Price" : `Price in ${toSymbol(formik.values.currency)}`}
                    name="price"
                    type="number"
                    value={formik.values.price}
                    onChange={formik.handleChange}
                    error={formik.touched.price && Boolean(formik.errors.price)}
                    helperText={(formik.touched.price && formik.errors.price)}
                    className={classes.formControl}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />
            </div>

            {valueBlock}
            {totalCostBlock}
            <div>
                <Button
                    type="submit"
                    variant="outlined"
                    color="secondary"
                    data-test-id="record-transaction-button"
                    disabled={formik.isSubmitting}
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
        </form>
    );
}

RecordTransactionForm.propTypes = {
    accounts: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        nickname: PropTypes.string.isRequired,
        currency: PropTypes.oneOf(['EUR', 'GBP', 'USD']),
    })),
    hasTransactions: PropTypes.bool.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    executedAtDate: PropTypes.instanceOf(Date),
};