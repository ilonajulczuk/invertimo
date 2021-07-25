
import React from 'react';
import { Stepper } from './components/Stepper.js';
import { CreateAccountForm } from './CreateAccountForm.js';
import PropTypes from 'prop-types';
import {
    useParams,
} from "react-router-dom";



export function Onboarding(props) {
    let { stepName } = useParams();

    let existingAccounts = props.accounts.map(account => (
    <p key={account.id}>{account.nickname} - {account.currency}</p>)
    );


    const hasAccounts = props.accounts.length > 0;
    const steps = [
        {
            label: 'Investment accounts',
            path: 'investment_accounts',
            next: 'create_account',
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
            path: 'create_account',
            previous: 'investment_accounts',
            next: 'transactions_intro',
            content: (
                <>
                <h3>{ hasAccounts ?  "Your accounts:" : "You don't have any accounts" }
                </h3>
                {existingAccounts}
                <CreateAccountForm
                    handleSubmit={props.handleAddAccount}
                    hasAccounts={hasAccounts} />
                </>
            ),
            nextDisabled: !hasAccounts,
        },
        {
            label: 'Transactions and positions',
            content: (
                <div>
                    <h3>Transactions</h3>
                    <p>When you buy or sell any asset you are making transactions. The same
                        goes to transferring money to or from your investment account.
                        To correctly reflect the state of your account you need to
                        record all the transactions.
                    </p>
                    <h3>Positions</h3>
                    <p>A position is the amount of a security, asset, or property that is owned. The app will automatically create a position if you record a transaction for it.</p>
                    <p>Once you have a position you can track how much of it you own of it over time, your transactions associated with it, gains and dividends.
                         If the position is an asset on a supported exchange, invertimo will automatically pull in a closing price for the last day, so you can track the performance of the position in your portfolio automatically. </p>
                    <p>A position is closed when you sell all of it and there is nothing left.
                         We will still show it in invertimo, because there might be a tax implication.</p>
                </div>

            ),
            path: 'transactions_intro',
            previous: 'create_account',
            next: 'add_transaction',

        },
        {
            label: 'Add a transaction',
            content: 'Stuff',
            path: 'add_transaction',
            previous: 'transactions_intro',
        }
    ];

    let activeStep = 0;
    for (let i = 0; i < steps.length; i++) {
        if (steps[i].path == stepName) {
            activeStep = i;
        }
    }


    return (<div>
        <h2>Welcome to invertimo, let&apos;s get started!</h2>
        <Stepper steps={steps} activeStep={activeStep} baseUrl="#/start/" finishUrl="#" />
    </div>);
}

Onboarding.propTypes = {
    accounts: PropTypes.array.isRequired,
    handleAddAccount: PropTypes.func.isRequired,
};