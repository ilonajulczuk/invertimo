/* eslint-disable no-use-before-define */
import React, { useEffect } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

import { CircularProgress, LinearProgress } from '@mui/material';

import { FormikSelectField } from './muiformik.js';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';


import useMediaQuery from '@mui/material/useMediaQuery';

import { useStyles } from './styles.js';
import { getAssets, searchAssets } from '../api_utils.js';
import PropTypes from 'prop-types';
import { toSymbol } from '../currencies.js';


const filter = createFilterOptions();

function formatAssetOption(option) {
  let description = `${option.symbol} ${option.name != option.symbol && option.name ? " - " + option.name : ""}`;
  description += ` - ${option.isin || option.asset_type}`;

  if (option.asset_type !== "Crypto") {
    description += ` ${toSymbol(option.currency)}`;
  }

  if (option.exchange.name !== "Other / NA") {
    description += ` (${option.exchange.name})`;
  }

  description += ` (#${option.id})`;
  return description;
}


export function SelectAssetFormFragment(props) {

  const formik = props.formik;
  const classes = useStyles();

  const [openFill, toggleOpenFill] = React.useState(false);
  const [otherFieldsDisabled, toggleDisable] = React.useState(props.fixedValue);
  const [diff, setDiff] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [options, setOptions] = React.useState(props.defaultAssetOptions);
  const [newAssetOptions, setNewAssetOptions] = React.useState(null);

  const smallScreen = useMediaQuery('(max-width:500px)');
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

  const handleFill = ({ value }) => {
    let newValue;
    if (value) {
      newValue = value;
    } else {
      newValue = formik.values.symbol;
    }
    formik.setFieldValue('currency', newValue.currency);
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

  const handleSelectAsset = (asset) => {
    formik.setFieldValue("symbol", asset);
    formik.setFieldValue('currency', asset.currency);
    formik.setFieldValue('assetType', asset.asset_type);
    formik.setFieldValue('exchange', asset.exchange.name);
    toggleDisable(true);
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
    {
      value: "Crypto",
      label: "Crypto",
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
      label: "GBX",
    },
  ];

  const cryptoDisclaimer = <div style={{
    marginTop: "14px",
    marginBottom: "8px",
  }}>ℹ️ Crypto assets have a default USD currency and are not tied to any exchange.</div >;

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
                  setNewAssetOptions(null);
                  searchAssets(newValue.inputValue).then((assetSearchResult) => {
                    const newOptions = [...options];
                    for (const asset of assetSearchResult) {
                      if (!newOptions.includes(asset)) {
                        newOptions.push(asset);
                      }
                    }
                    setOptions(newOptions);
                    setNewAssetOptions(assetSearchResult);
                  }).catch((error) => {
                    console.error(error);
                    setNewAssetOptions([]);
                  });
                  toggleOpenNotTracked(true);
                  return;
                }
                formik.setFieldValue('symbol', newValue);
                const assetFieldsTouched = formik.touched["assetType"] || formik.touched["currency"] || formik.touched["exchange"];
                if (assetFieldsTouched) {
                  let newDiff = [];
                  if (formik.values["assetType"] !== newValue.asset_type) {
                    newDiff.push({
                      label: "Asset type",
                      current: formik.values["assetType"],
                      "new": newValue.asset_type,
                    });
                  }
                  if (formik.values["currency"] !== newValue.currency) {
                    newDiff.push({
                      label: "Currency",
                      current: formik.values["currency"],
                      "new": newValue.currency,
                    });
                  }
                  if (formik.values["exchange"] !== newValue.exchange.name) {
                    newDiff.push({
                      label: "Exchange",
                      current: formik.values["exchange"],
                      "new": newValue.exchange.name,
                    });
                  }
                  if (newDiff.length > 0) {
                    setDiff(newDiff);
                    toggleOpenFill(true);
                    return;
                  }
                }
                handleFill({ value: newValue });
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
            if (option.newOption) {
              return option.newOption;
            }
            return formatAssetOption(option);
          }}
          selectOnFocus
          clearOnBlur
          handleHomeEndKeys
          style={{ width: smallScreen ? "unset" : 400, display: "flex" }}
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

        <FormikSelectField
          id="assetType"
          label="Asset type"
          name="assetType"
          options={assetTypeOptions}
          className={classes.mediumInput}
          disabled={otherFieldsDisabled}
          onChange={(event) => {
            const newValue = event.target.value;
            formik.setFieldValue("assetType", newValue);
            if (newValue == "Crypto") {
              formik.setFieldValue("exchange", "Other / NA");
              formik.setFieldValue("currency", "USD");
            }
          }}
        />
      </div>
      {formik.values.assetType === "Crypto" ? cryptoDisclaimer : null}

      <div className={classes.inputs}>
        <FormikSelectField
          id="exchange"
          label="Exchange"
          name="exchange"
          labelId="exchange-label"
          options={exchangeOptions}
          className={classes.mediumInput}
          disabled={otherFieldsDisabled || formik.values.assetType == "Crypto"}
        />

        <FormikSelectField
          name="currency"
          labelId="currency-select-label"
          label="Currency"
          id="currency"
          data-testid="currency"
          options={currencyOptions}
          className={classes.mediumInput}
          disabled={otherFieldsDisabled || formik.values.assetType == "Crypto"}
        />
      </div>
      <OverrideFieldsDialog open={openFill} onClose={handleSkip} onAccept={handleFill} diff={diff} />
      <NewAssetDialog
        open={openNotTracked}
        onClose={handleCloseNotTracked}
        symbol={formik.values.symbol}
        newAssetOptions={newAssetOptions}
        handleSelectAsset={handleSelectAsset}
      />
    </>

  );
}

SelectAssetFormFragment.propTypes = {
  formik: PropTypes.any.isRequired,
  defaultAssetOptions: PropTypes.array.isRequired,
  fixedValue: PropTypes.bool.isRequired,
  value: PropTypes.object,
};


function OverrideFieldsDialog({ open, onClose, onAccept, diff }) {

  const differences = diff.map(entry => <li key={entry.label}>
    {entry.label}: {"\"" + entry.current + "\""} ➡️ {"\"" + entry.new + "\""}</li>);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="asset-confirmation-dialog-title"
      aria-describedby="asset-confirmation-dialog-description"
    >
      <DialogTitle id="asset-confirmation-dialog-title">{"Override asset fields?"}</DialogTitle>
      <DialogContent>
        <DialogContentText id="asset-confirmation-dialog-description">
          The following fields will be overridden:

        </DialogContentText>
        <ul style={{
          listStyle: "unset",
          marginLeft: "20px",
          marginTop: "10px",
          color: "rgba(0, 0, 0, 0.6)",
        }}>
          {differences}
        </ul>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Skip
        </Button>
        <Button onClick={onAccept} color="primary" autoFocus>
          Override
        </Button>
      </DialogActions>
    </Dialog>
  );
}

OverrideFieldsDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAccept: PropTypes.func.isRequired,
  diff: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    current: PropTypes.string.isRequired,
    new: PropTypes.string.isRequired,
  })).isRequired,
};


function NewAssetDialog(props) {
  const symbol = props.symbol.symbol ? props.symbol.symbol : "'" + props.symbol + "'";
  if (props.newAssetOptions === null || props.newAssetOptions === undefined) {
    // Still fetching.
    return (<Dialog
      open={props.open}
      onClose={props.onClose}
      aria-labelledby="asset-confirmation-dialog-title"
      aria-describedby="asset-confirmation-dialog-description"
    >
      <DialogTitle id="asset-confirmation-dialog-title">
        Looking up assets with {symbol} in their symbol, name or ISIN</DialogTitle>
      <DialogContent>
        <DialogContentText id="asset-confirmation-dialog-description">
          Hang in for a sec, we are looking up {symbol}.
        </DialogContentText>
        <div>
          <LinearProgress />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} color="primary" autoFocus disabled={true}>
          Ok
        </Button>
      </DialogActions>
    </Dialog>);
  } else if (props.newAssetOptions.length == 1) {
    // One asset simplified version.
    const asset = props.newAssetOptions[0];
    return (<Dialog
      open={props.open}
      onClose={props.onClose}
      aria-labelledby="asset-confirmation-dialog-title"
      aria-describedby="asset-confirmation-dialog-description"
    >
      <DialogTitle id="asset-confirmation-dialog-title">
        Single asset matching {symbol} available</DialogTitle>
      <DialogContent>
        <DialogContentText id="asset-confirmation-dialog-description">
          We found {props.newAssetOptions.length} assets matching {symbol}:
        </DialogContentText>
        <ul style={{
          listStyle: "unset",
          marginLeft: "20px",
          marginTop: "10px",
          color: "rgba(0, 0, 0, 0.6)",
        }}>
          <li>{formatAssetOption(asset)}<Button onClick={() => props.handleSelectAsset(asset)}>Use</Button></li>
        </ul>
        <DialogContentText id="asset-confirmation-dialog-description">
          If this is not the asset you were looking for, you can use `Just use symbol` option and set the rest of the fields manually.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} color="primary" autoFocus>
          Just use symbol
        </Button>
        <Button onClick={() => props.handleSelectAsset(asset)}>Use found asset</Button>
      </DialogActions>
    </Dialog>);
  } else if (props.newAssetOptions.length > 1) {
    // Multi option dialog.
    const assetOptions = props.newAssetOptions.map(
      asset => <li key={asset.id}>{formatAssetOption(asset)} <Button onClick={() => props.handleSelectAsset(asset)}>Use</Button></li>);
    return (<Dialog
      open={props.open}
      onClose={props.onClose}
      aria-labelledby="asset-confirmation-dialog-title"
      aria-describedby="asset-confirmation-dialog-description"
    >
      <DialogTitle id="asset-confirmation-dialog-title">
        Multiple assets matching {symbol} available</DialogTitle>
      <DialogContent>
        <DialogContentText id="asset-confirmation-dialog-description">
          We found {props.newAssetOptions.length} assets matching {symbol}:
        </DialogContentText>
        <ul style={{
          listStyle: "unset",
          marginLeft: "20px",
          marginTop: "10px",
          color: "rgba(0, 0, 0, 0.6)",
        }}>
          {assetOptions}
        </ul>
        <DialogContentText id="asset-confirmation-dialog-description">
          If none of the options matches your asset, you can use `Just use symbol` option and set the rest of the fields manually.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} color="primary" autoFocus>
          Just use symbol
        </Button>
      </DialogActions>
    </Dialog>);
  } else {
    // Didn't find anything or error.
    return (<Dialog
      open={props.open}
      onClose={props.onClose}
      aria-labelledby="asset-confirmation-dialog-title"
      aria-describedby="asset-confirmation-dialog-description"
    >
      <DialogTitle id="asset-confirmation-dialog-title">
        No assets matching {symbol} available</DialogTitle>
      <DialogContent>
        <DialogContentText id="asset-confirmation-dialog-description">
          We don&apos;t have an asset in our database matching {symbol}.
        </DialogContentText>
        <DialogContentText>
          You can still add transactions for it, but we will not be able to fetch and update its price automatically.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} color="primary" autoFocus>
          Ok
        </Button>
      </DialogActions>
    </Dialog>);
  }
}


NewAssetDialog.propTypes = {
  symbol: PropTypes.any.isRequired,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  newAssetOptions: PropTypes.array,
  handleSelectAsset: PropTypes.func.isRequired,
};