
import React from 'react';
import { Stepper } from './components/Stepper.js';
import TextField from '@material-ui/core/TextField';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';


const useStyles = makeStyles((theme) => ({
    form: {
        display: "flex",
        flexWrap: "wrap",
        flexDirection: "column",
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
        maxWidth: 300,
    },
}));


export function CreateAccountForm() {

    const classes = useStyles();

  const [currency, setCurrency] = React.useState('EUR');

  const handleChange = (event) => {
    setCurrency(event.target.value);
  };


    return (<div>
        <form className={classes.form}>
            <div>
                <TextField
                    id="account-name"
                    label="Account Name"
                    helperText="account name like 'degiro'"

                    className={classes.formControl}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />

                <FormControl className={classes.formControl}>
                    <InputLabel id="currency-select-label">Currency</InputLabel>
                    <Select
                        labelId="currency-select-label"
                        id="currency-select"
                        value={currency}
                        onChange={handleChange}
                    >
                        <MenuItem value={"USD"}>$ USD</MenuItem>
                        <MenuItem value={"EUR"}>€ EUR</MenuItem>
                        <MenuItem value={"GBP"}>£ GBP</MenuItem>
                    </Select>
                    <FormHelperText>Main currency used by this account (some positions, e.g. stocks might trade in different currencies)</FormHelperText>
                </FormControl>
            </div>

            <div>
                <Button
                    type="submit"
                    variant="outlined"
                    color="secondary"
                >
                    Create account
            </Button>
            </div>



        </form>
    </div>);
}

export function Onboarding() {

    const steps = [
        {
            label: 'Investment accounts',
            content: (<div>
                <h3>What are investment accounts?</h3>
                <p>Invertimo helps you track and understand your
                investments across your various investment accounts,
                      such as brokerages or exchanges.</p>
                <p>To start you need to add at least one investment account
                and then you will be able to import transactions and associate them with
                that account.
                </p>
                <p>You can later edit or add more investment accounts in the future.</p>
            </div>),
        },
        {
            label: 'Create an account',
            content: (
                <CreateAccountForm />
            ),
        },
        {
            label: 'Transactions, positions, dividends and so on',
            content: 'Stuff',

        },
        {
            label: 'Add a transaction',
            content: 'Stuff',

        }
    ];

    return (<div>
        <h2>Welcome to invertimo, let&apos;s get started!</h2>
        <Stepper steps={steps} />
    </div>);
}

Onboarding.propTypes = {
};