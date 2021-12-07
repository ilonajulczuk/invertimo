/* eslint-disable no-use-before-define */
import React, { useEffect } from 'react';
import TextField from '@material-ui/core/TextField';
import Autocomplete, { createFilterOptions } from '@material-ui/lab/Autocomplete';

import { CircularProgress } from '@mui/material';

import { FormikSelectField } from './muiformik.js';

import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';

import { useStyles } from './styles.js';
import { getAssets } from '../api_utils.js';
import PropTypes from 'prop-types';


const filter = createFilterOptions();

export function SelectAssetFormFragment(props) {

  const formik = props.formik;
  const classes = useStyles();

  // TODO: move up, so that resetting the form (e.g. after submission)
  // also resets the disabled state.
  const [openFill, toggleOpenFill] = React.useState(false);
  const [otherFieldsDisabled, toggleDisable] = React.useState(props.fixedValue);

  const [loading, setLoading] = React.useState(true);
  const [options, setOptions] = React.useState(props.defaultAssetOptions);

  useEffect(() => {
    let mounted = true;
    getAssets().then(assets => {
      if (mounted) {
        setOptions(assets);
        setLoading(false);
      }
    });

    return () => mounted = false;
  }, [props.defaultAssetOptions]);

  const handleFill = () => {
    const newValue = formik.values.symbol;
    formik.setFieldValue('currency', newValue.currency);
    // TODO: support more than one asset type.
    formik.setFieldValue('assetType', newValue.asset_type);
    formik.setFieldValue('exchange', newValue.exchange.name);
    toggleDisable(true);
    toggleOpenFill(false);
  };

  const handleSkip = () => {
    // We are not using a preselected asset now so it's open for modification.
    // We will treat it as if it was custom.
    formik.setFieldValue('symbol', formik.values.symbol.symbol);
    toggleDisable(false);
    toggleOpenFill(false);
  };

  const [openNotTracked, toggleOpenNotTracked] = React.useState(false);

  const handleCloseNotTracked = () => {
    toggleDisable(false);
    toggleOpenNotTracked(false);
  };

  const assetTypeOptions = [
    {
      value: "Stock",
      label: "Stock",
    },
    {
      value: "Fund",
      label: "Fund",
    },
  ];

  const exchangeOptions = ["USA Stocks", "XETRA Exchange", "London Exchange", "Borsa Italiana", "Other / NA"].map(name => ({
    value: name, label: name,
  }));

  const currencyOptions = [
    {
      value: "USD",
      label: "$ USD",
    },
    {
      value: "EUR",
      label: "€ EUR",
    },
    {
      value: "GBP",
      label: "£ GBP",
    },
    {
      value: "GBX",
      label: "GBC",
    },
  ];

  return (
    <>
      <div className={classes.inputs}>

        <Autocomplete
          id="symbol"
          label="Stock symbol"
          name="symbol"
          value={props.fixedValue ? props.value : formik.values.symbol}
          className={classes.symbolInput}
          disabled={props.fixedValue}
          onChange={(event, newValue) => {
            if (props.fixedValue) {
              return;
            }
            if (typeof newValue !== 'string') {
              if (newValue != null) {
                if (newValue.newOption) {
                  formik.setFieldValue('symbol', newValue.inputValue);

                  toggleOpenNotTracked(true);
                  return;
                }
                formik.setFieldValue('symbol', newValue);
                toggleOpenFill(true);
              } else {
                toggleDisable(false);
                formik.setFieldValue('symbol', '');
              }
            }
          }}
          filterOptions={(options, params) => {
            const filtered = filter(options, params);
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
            if (option.inputValue) {
              return option.inputValue;
            }
            if (option.newOption) {
              return `${option.newOption}`;
            }
            return `${option.symbol} - ${option.name} - ${option.isin}`;
          }}
          selectOnFocus
          clearOnBlur
          handleHomeEndKeys
          renderOption={(option) => {
            if (option.newOption) {
              return <div className={classes.symbolOption}>{`${option.newOption}`}</div>;
            }
            return (
              <div className={classes.symbolOption}>
                <p>{`${option.symbol}`}: {`${option.name} - ${option.isin}`}</p>
              </div>);
          }}
          style={{ width: 400, display: "flex" }}
          freeSolo
          renderInput={(params) => (
            <TextField {...params}
              id="symbol"
              label="Symbol or Name"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <React.Fragment>
                    {loading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </React.Fragment>
                ),
              }}

              error={formik.touched.symbol && Boolean(formik.errors.symbol)}
              helperText={(formik.touched.symbol && formik.errors.symbol) || "Stock symbol like 'DIS' or ISIN"} />
          )}
        />

        {/* <FormControl className={classes.formControl}>
          <InputLabel id="asset-type-label">Asset type</InputLabel>
          <Select
            name="assetType"
            labelId="asset-type-label"
            id="asset-type"
            value={formik.values.assetType}
            onChange={formik.handleChange}
            error={formik.touched.assetType && Boolean(formik.errors.assetType)}
            className={classes.formControl}
            disabled={otherFieldsDisabled}
          >
            <MenuItem value={"Stock"}>Stock</MenuItem>
            <MenuItem value={"Fund"}>Fund</MenuItem>
            <MenuItem value={"Bond"}>Bond</MenuItem>
          </Select>
          <FormHelperText>{(formik.touched.assetType && formik.errors.assetType) ||
            `Different types of assets are supported`}</FormHelperText>
        </FormControl> */}

        <FormikSelectField
          id="assetType"
          label="Asset type"
          name="assetType"
          options={assetTypeOptions}
          className={classes.mediumInput}
          disabled={otherFieldsDisabled}
        />
      </div>

      <div className={classes.inputs}>
        <FormikSelectField
          id="exchange"
          label="Exchange"
          name="exchange"
          labelId="exchange-label"
          options={exchangeOptions}
          className={classes.mediumInput}
          disabled={otherFieldsDisabled}
        />

        {/* <FormControl className={classes.formControl}>
          <InputLabel id="exchange-label"
            error={formik.touched.exchange && Boolean(formik.errors.exchange)}>Exchange</InputLabel>
          <Select
            id="exchange"
            name="exchange"
            labelId="exchange-label"
            value={formik.values.exchange}
            onChange={formik.handleChange}
            error={formik.touched.exchange && Boolean(formik.errors.exchange)}
            className={classes.formControl}
            disabled={otherFieldsDisabled}
          >
            <MenuItem value={"USA Stocks"}>USA Stocks</MenuItem>
            <MenuItem value={"XETRA Exchange"}>XETRA Exchange</MenuItem>
            <MenuItem value={"London Exchange"}>London Exchange</MenuItem>
            <MenuItem value={"Borsa Italiana"}>Borsa Italiana</MenuItem>
            <MenuItem value={"Other / NA"}>Other / NA</MenuItem>
          </Select>
          <FormHelperText error={(formik.touched.exchange && Boolean(formik.errors.exchange))}>{(formik.touched.exchange && formik.errors.exchange) ||
            `Only selected exchanges are supported for now`}</FormHelperText>
        </FormControl> */}

        <FormikSelectField
          name="currency"
          labelId="currency-select-label"
          label="currency"
          id="currency"
          data-testid="currency"
          options={currencyOptions}
          className={classes.mediumInput}
          disabled={otherFieldsDisabled}
        />
        {/*
        <FormControl className={classes.narrowInput}>
          <InputLabel id="currency-select-label">Currency</InputLabel>
          <Select
            name="currency"
            labelId="currency-select-label"
            id="currency"
            data-testid="currency"
            value={formik.values.currency}
            onChange={formik.handleChange}
            error={formik.touched.currency && Boolean(formik.errors.currency)}
            className={classes.narrowInput}
            disabled={otherFieldsDisabled}
          >
            <MenuItem value={"USD"}>$ USD</MenuItem>
            <MenuItem value={"EUR"}>€ EUR</MenuItem>
            <MenuItem value={"GBP"}>£ GBP</MenuItem>
            <MenuItem value={"GBX"}>GBX</MenuItem>
          </Select>
          <FormHelperText>{(formik.touched.currency && formik.errors.currency)}</FormHelperText>
        </FormControl> */}
      </div>

      <Dialog
        open={openFill}
        onClose={handleSkip}
        aria-labelledby="asset-confirmation-dialog-title"
        aria-describedby="asset-confirmation-dialog-description"
      >
        <DialogTitle id="asset-confirmation-dialog-title">{"Fill in other asset fields?"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="asset-confirmation-dialog-description">
            The values might be overriden.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSkip} color="secondary">
            Skip
          </Button>
          <Button onClick={handleFill} color="primary" autoFocus>
            Fill the fields
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openNotTracked}
        onClose={handleCloseNotTracked}
        aria-labelledby="asset-confirmation-dialog-title"
        aria-describedby="asset-confirmation-dialog-description"
      >
        <DialogTitle id="asset-confirmation-dialog-title">{"This asset price won't be automatically updated"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="asset-confirmation-dialog-description">
            We don&apos;t have this asset in our database and we will not be able to fetch and update its price automatically.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNotTracked} color="primary" autoFocus>
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

SelectAssetFormFragment.propTypes = {
  formik: PropTypes.any.isRequired,
  defaultAssetOptions: PropTypes.array.isRequired,
  fixedValue: PropTypes.bool.isRequired,
  value: PropTypes.object,
};

