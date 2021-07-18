
import React from 'react';

import { Stepper } from './components/Stepper.js';


function getSteps() {
    return [
        {
            label: 'Investment accounts',
            content: 'Something',
        },
        {
            label: 'Create an account',
            content: 'Content',
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
}

export function Onboarding(props) {
    return (<div>
        <h2>Welcome to invertimo, let&apos;s get started!</h2>
        <Stepper steps={getSteps()} />
    </div>);
}