/* eslint-disable no-use-before-define */
import React from 'react';
import TextField from '@material-ui/core/TextField';
import Autocomplete, { createFilterOptions } from '@material-ui/lab/Autocomplete';

import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';


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

  const [openFill, toggleOpenFill] = React.useState(false);
  const [otherFieldsDisabled, toggleDisable] = React.useState(false);

  const handleFill = () => {
    const newValue = formik.values.symbol;
    formik.setFieldValue('currency', newValue.currency);
    // TODO: support more than one asset type.
    formik.setFieldValue('assetType', "stock");
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
              id="symbol"
              label="Symbol or Name"
              error={formik.touched.symbol && Boolean(formik.errors.symbol)}
              helperText={(formik.touched.symbol && formik.errors.symbol) || "Stock symbol like 'DIS' or ISIN"} />
          )}
        />

        <FormControl className={classes.formControl}>
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
          disabled={otherFieldsDisabled}
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
        </FormControl>
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
