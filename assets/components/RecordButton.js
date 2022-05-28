import React from 'react';
import IconWithText from './IconWithText';
import SplitButtonNav from './SplitButtonNav';


const recordOptions = [
    { label: <IconWithText icon="create" text="Record transaction"/>, link: "/transactions/record" },
    { label: <IconWithText icon="paid" text="Record dividend"/>, link: "/events/record_dividend" },
    { label: <IconWithText icon="sync_alt" text="Record transfer"/>, link: "/events/record_transfer" },
    { label: <IconWithText icon="savings" text="Record crypto income"/>, link: "/events/record_crypto_income" },

];


export default function RecordButton() {
    return <SplitButtonNav options={recordOptions} color="secondary" />;
}