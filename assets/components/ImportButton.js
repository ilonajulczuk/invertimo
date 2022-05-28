import React from 'react';
import IconWithText from './IconWithText';
import SplitButtonNav from './SplitButtonNav';


const importOptions = [
    { label: <IconWithText icon="sync" text="Import from degiro"/>, link: "/transactions/import/degiro" },
    { label: <IconWithText icon="sync" text="Import from binance"/>, link: "/transactions/import/binance" },
];


export default function ImportButton() {
    return <SplitButtonNav options={importOptions} color="secondary" />;
}