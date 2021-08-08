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
import { currencyValues } from '../currencies.js';
import { useFormik } from 'formik';
import * as yup from 'yup';

import { green, red } from '@material-ui/core/colors';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';


import 'date-fns';
import DateFnsUtils from '@date-io/date-fns';
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
} from '@material-ui/pickers';


const useStyles = makeStyles((theme) => ({
    form: {
        display: "flex",
        flexWrap: "wrap",
        flexDirection: "column",
        marginTop: "20px",
        marginBottom: "20px",
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
    name: yup
        .string('Enter the name for the account, like \'degiro\'')
        .required('Account name is required'),
    exchange: yup
        .string('Enter the exchange name like \'XET\'')
        .required('Exchange is required'),
    currency: yup
        .string('Enter the currency')
        .oneOf(currencyValues)
        .required('Currency is required'),
    feesCurrency: yup
        .string('Enter the currency used for fees')
        .oneOf(currencyValues),
    tradeType: yup
        .string('Bought or sold')
        .oneOf(["buy", "sell"])
        .required('Trade type is required'),
    price: yup
        .number('Price needs to be a number')
        .required('Price is required'),
    quantity: yup
        .number()
        .required('Quantity is required'),
    totalCostAccountCurrency: yup
        .number()
        .required('Total is required'),
    fees: yup
        .number()
        .required('Fees are required'),
        executedAt: yup
        .date()
        .required('Date when transaction was executed is required'),
});

export function RecordTransactionForm(props) {

    const classes = useStyles();

    const initialValues = {
        currency: "EUR",
        name: "",
        feesCurrency: "EUR",
        tradeType: "buy",
        executedAt: new Date(),
        account: props.accounts[0],
        exchange: "",
        assetType: "stock",
        price: "",
        quantity: "",
        totalCostAccountCurrency: "",
        fees: "",
    };

    const onSubmit = async (values, { setErrors, resetForm }) => {
        try {
            const result = await props.handleSubmit(values);
            if (result.ok) {
                resetForm();
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

    const submitButtonText = props.hasTransactions ? "Record another account" : "Record transaction";


    let valueBlock = null;

    if (formik.values.account.currency != formik.values.currency) {

        valueBlock = <>
            <h4>Value</h4>
            <div className={classes.inputs}>

                <TextField
                    id="value-account-currency"
                    label="Total value in account currency"
                    name="totalValueAccountCurrency"
                    value={formik.values.totalValueAccountCurrency}
                    onChange={formik.handleChange}
                    error={formik.touched.totalValueAccountCurrency && Boolean(formik.errors.totalValueAccountCurrency)}
                    helperText={(formik.touched.totalValueAccountCurrency && formik.errors.totalValueAccountCurrency)}
                    className={classes.narrowInput}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />
                <Button variant="outlined"
                >Use default exchange rate for that day</Button>
            </div>
        </>;
    }
    let totalCostBlock = null;

    if (formik.values.account.currency != formik.values.currency) {
        totalCostBlock = (<><h4>Total cost</h4>
            <div className={classes.inputs}>
                <TextField
                    id="total-cost-account-currency"
                    label="Total cost in account currency"
                    name="totalCostAccountCurrency"
                    value={formik.values.totalCostAccountCurrency}
                    type="number"
                    onChange={formik.handleChange}
                    error={formik.touched.totalCostAccountCurrency && Boolean(formik.errors.totalCostAccountCurrency)}
                    helperText={(formik.touched.totalCostAccountCurrency && formik.errors.totalCostAccountCurrency)}
                    className={classes.formControl}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />

                <TextField
                    id="fees"
                    label="Fees / Commissions"
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

                <FormControl className={classes.formControl}>
                    <InputLabel id="fees-currency-select-label">Fees Currency</InputLabel>
                    <Select
                        name="feesCurrency"
                        labelId="fees-currency-select-label"
                        id="feesCurrency"
                        value={formik.values.feesCurrency}
                        onChange={formik.handleChange}
                        error={formik.touched.feesCurrency && Boolean(formik.errors.feesCurrency)}
                        className={classes.formControl}
                    >
                        <MenuItem value={"USD"}>$ USD</MenuItem>
                        <MenuItem value={"EUR"}>€ EUR</MenuItem>
                        <MenuItem value={"GBP"}>£ GBP</MenuItem>
                    </Select>
                    <FormHelperText>{(formik.touched.feesCurrency && formik.errors.feesCurrency)}</FormHelperText>
                </FormControl>
            </div>
        </>);
    } else {
        totalCostBlock = (<><h4>Total cost</h4>
            <div className={classes.inputs}>
                <TextField
                    id="total-cost-account-currency"
                    label="Total cost"
                    name="totalCostAccountCurrency"
                    value={formik.values.totalCostAccountCurrency}
                    type="number"
                    onChange={formik.handleChange}
                    error={formik.touched.totalCostAccountCurrency && Boolean(formik.errors.totalCostAccountCurrency)}
                    helperText={(formik.touched.totalCostAccountCurrency && formik.errors.totalCostAccountCurrency)}
                    className={classes.formControl}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />

                <TextField
                    id="fees"
                    label="Fees / Commissions"
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
            </div></>);

    }

    return (
        <form className={classes.form} onSubmit={formik.handleSubmit}>
            <h4>What did you trade?</h4>
            <div className={classes.inputs}>
                <TextField
                    id="account-name"
                    label="Name"
                    name="name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    error={formik.touched.name && Boolean(formik.errors.name)}
                    helperText={(formik.touched.name && formik.errors.name) || "Stock symbol like 'DIS' or ISIN"}
                    className={classes.symbolInput}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />

                <FormControl className={classes.formControl}>
                    <InputLabel id="asset-type-label">Asset type</InputLabel>
                    <Select
                        name="asset-type"
                        labelId="asset-type-label"
                        id="asset-type"
                        value={formik.values.assetType}
                        onChange={formik.handleChange}
                        error={formik.touched.assetType && Boolean(formik.errors.assetType)}
                        className={classes.formControl}
                    >
                        <MenuItem value={"stock"}>Stock</MenuItem>
                        <MenuItem value={"fund"}>Fund</MenuItem>
                        <MenuItem value={"bond"}>Bond</MenuItem>
                    </Select>
                    <FormHelperText>{(formik.touched.assetType && formik.errors.assetType) ||
                        `Different types of assets are supported`}</FormHelperText>
                </FormControl>
            </div>

            <div className={classes.inputs}>
                <TextField
                    id="exchange"
                    label="Exchange"
                    name="exchange"
                    value={formik.values.exchange}
                    onChange={formik.handleChange}
                    error={formik.touched.exchange && Boolean(formik.errors.exchange)}
                    helperText={(formik.touched.exchange && formik.errors.exchange) || "Exchange name like 'XETRA'"}
                    className={classes.formControl}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />

                <FormControl className={classes.narrowInput}>
                    <InputLabel id="currency-select-label">Currency</InputLabel>
                    <Select
                        name="currency"
                        labelId="currency-select-label"
                        id="currency"
                        value={formik.values.currency}
                        onChange={formik.handleChange}
                        error={formik.touched.currency && Boolean(formik.errors.currency)}
                        className={classes.narrowInput}
                    >
                        <MenuItem value={"USD"}>$ USD</MenuItem>
                        <MenuItem value={"EUR"}>€ EUR</MenuItem>
                        <MenuItem value={"GBP"}>£ GBP</MenuItem>
                    </Select>
                    <FormHelperText>{(formik.touched.currency && formik.errors.currency)}</FormHelperText>
                </FormControl>
            </div>

            <p>Looking for it...</p>


            <h4>Tell us more about that trade</h4>
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
                        label="When"
                        value={formik.values.executedAt}
                        autoOk={true}
                        onChange={(name, value) => {
                            formik.setFieldValue('executedAt', value);
                        }}
                        KeyboardButtonProps={{
                            'aria-label': 'change date',
                        }}
                    />
                </MuiPickersUtilsProvider>

                <FormControl className={classes.formControl}>
                    <InputLabel id="account-label">In account</InputLabel>
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
                    <FormHelperText>{(formik.touched.account && formik.errors.account) ||
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
                    label="Price in asset currency"
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
                    disabled={formik.isSubmitting}
                    className={classes.submitButton}
                >
                    {submitButtonText}
                </Button>
            </div>

        </form>
    );
}

RecordTransactionForm.propTypes = {
    accounts: PropTypes.array.isRequired,
    hasTransactions: PropTypes.bool.isRequired,
    handleSubmit: PropTypes.func.isRequired,
};