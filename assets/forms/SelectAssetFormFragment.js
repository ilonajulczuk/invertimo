/* eslint-disable no-use-before-define */
import React from 'react';
import TextField from '@material-ui/core/TextField';
import Autocomplete, { createFilterOptions } from '@material-ui/lab/Autocomplete';

import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import { makeStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';


const filter = createFilterOptions();


const useStyles = makeStyles((theme) => ({
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
  symbolOption: {
    display: "flex",
    flexDirection: "column",
  }
}
));


export function SelectAssetFormFragment(props) {

  const formik = props.formik;
  const classes = useStyles();

  return (
    <>
      <div className={classes.inputs}>

        <Autocomplete
          id="symbol"
          label="Stock symbol"
          name="symbol"
          value={formik.values.symbol}
          className={classes.symbolInput}
          onChange={(event, newValue) => {
            if (typeof newValue !== 'string') {
              if (newValue != null) {
                if (newValue.newOption) {
                  alert("We don't seem to have this asset supported right now, it won't be automatically synced.");
                  formik.setFieldValue('symbol', newValue.inputValue);
                  return;
                }
                const fillOtherValues = confirm('Autofill fields like currency and exchange?');
                formik.setFieldValue('symbol', newValue);
                if (fillOtherValues) {
                  formik.setFieldValue('currency', newValue.currency);
                  // TODO: support more than one asset type.
                  formik.setFieldValue('assetType', "stock");
                  formik.setFieldValue('exchange', newValue.exchange.name);
                }
              } else {
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
          options={assetOptions}
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
                <h5>{`${option.symbol}`}</h5>
                <p>{`${option.name} - ${option.isin}`}</p>
              </div>);
          }}
          style={{ width: 400, display: "flex" }}
          freeSolo
          renderInput={(params) => (
            <TextField {...params}
              label="Symbol or Name"
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={(formik.touched.name && formik.errors.name) || "Stock symbol like 'DIS' or ISIN"} />
          )}
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
    </>
  );
}

SelectAssetFormFragment.propTypes = {
  formik: PropTypes.any.isRequired,
};

const assetOptions = [
  {
    "id": 30,
    "isin": "US0846707026",
    "symbol": "BRK-B",
    "name": "Berkshire Hathaway Inc",
    "exchange": {
      "id": 132,
      "name": "USA Stocks"
    },
    "currency": "USD",
    "country": "USA"
  },
  {
    "id": 28,
    "isin": "US2561631068",
    "symbol": "DOCU",
    "name": "DocuSign, Inc",
    "exchange": {
      "id": 132,
      "name": "USA Stocks"
    },
    "currency": "USD",
    "country": "USA"
  },
  {
    "id": 26,
    "isin": "US30303M1027",
    "symbol": "FB",
    "name": "Facebook, Inc",
    "exchange": {
      "id": 132,
      "name": "USA Stocks"
    },
    "currency": "USD",
    "country": "USA"
  },
];
