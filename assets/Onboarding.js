
import React from 'react';
import { Stepper } from './components/Stepper.js';
import { CreateAccountForm } from './CreateAccountForm.js';
import PropTypes from 'prop-types';


export function Onboarding(props) {

    let existingAccounts = props.accounts.map(account => <p key={account.id}>{account.nickname}</p>);

    const hasAccounts = props.accounts.length > 0;
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
                <>
                <h3>{ hasAccounts ?  "Your accounts:" : "You don't have any accounts" }
                </h3>
                {existingAccounts}
                <CreateAccountForm
                    handleSubmit={props.handleAddAccount}
                    hasAccounts={hasAccounts} />
                </>
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
    accounts: PropTypes.array.isRequired,
    handleAddAccount: PropTypes.func.isRequired,
};