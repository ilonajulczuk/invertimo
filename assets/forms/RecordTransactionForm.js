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
import { currencyValues, toSymbol } from '../currencies.js';
import { useFormik } from 'formik';
import * as yup from 'yup';

import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';

import { green, red } from '@material-ui/core/colors';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { SelectAssetFormFragment } from './SelectAssetFormFragment.js';

import 'date-fns';
import DateFnsUtils from '@date-io/date-fns';
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
} from '@material-ui/pickers';


function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
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

const matchNumberUpToTwoDecimalPlaces = (value) => (value + "").match(/^\d*(\.{1}\d{0,2})?$/);

const validationSchema = yup.object({
    symbol: yup
        .lazy(value => typeof value === 'string' ? yup.string().required() : yup.object().required()),
    exchange: yup
        .string('Enter the exchange name like \'XET\'')
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
        .test('has-2-or-less-places', "Only up to two decimal places are allowed",
            matchNumberUpToTwoDecimalPlaces)
        .required('Price is required'),
    quantity: yup
        .number()
        .required('Quantity is required'),
    account: yup
        .object()
        .required('Account needs to be selected'),
    totalCostAccountCurrency: yup
        .number()
        .test('has-2-or-less-places', "Only up to two decimal places are allowed",
            matchNumberUpToTwoDecimalPlaces)
        .required('Total is required'),
    // This value is only required if currency of the asset and account don't match.
    totalValueAccountCurrency: yup
        .number().when(['currency', 'account'], {
            is: (currency, account) => currency !== account.currency,
            then: yup.number().test('has-2-or-less-places', "Only up to two decimal places are allowed",
            matchNumberUpToTwoDecimalPlaces).required(
                'Total value in account currency has to be provided if the' +
                ' asset currency is different than the account currency.'),
            otherwise: yup.number(),
        }),
    fees: yup
        .number()
        .test('has-2-or-less-places', "Only up to two decimal places are allowed",
            matchNumberUpToTwoDecimalPlaces)
        .required('Fees are required'),
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
        account: props.accounts[0],
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
            const result = await props.handleSubmit(values);
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

    let accountCurrency = toSymbol(formik.values.account.currency);

    const sameCurrency = formik.values.account.currency == formik.values.currency;
    if (!sameCurrency) {

        valueBlock = <>
            <h4>Value</h4>
            <div className={classes.inputs}>

                <TextField
                    id="value-account-currency"
                    label={`Total value in ${accountCurrency}`}
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
                <Button variant="outlined"
                >Use default exchange rate for that day</Button>
            </div>
        </>;

        totalCostBlock = (<><h4>Total cost</h4>
            <p>Total cost will be deducted from selected account balance and fees will be associated with assets.</p>
            <div className={classes.inputs}>
                <TextField
                    id="total-cost-account-currency"
                    label={`Total cost in ${accountCurrency}`}
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
                    label={`Fees in ${accountCurrency}`}
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

            </div>
        </>);
    } else {
        totalCostBlock = (<><h4>Total cost</h4>
            <p>Total cost will be deducted from selected account balance and fees will be associated with assets.</p>
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
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                open={snackbarOpen} autoHideDuration={6000} onClose={snackbarHandleClose}>
                <Alert onClose={snackbarHandleClose} severity="success">
                    Transaction recorded successfully!
                </Alert>
            </Snackbar>
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