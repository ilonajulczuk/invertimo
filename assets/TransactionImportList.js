import React from 'react';
import Button from '@mui/material/Button';

import {
    useQuery,
} from 'react-query';


import { getTransactionImportResults } from './api_utils';
import { TableWithSort } from './components/TableWithSort.js';

export default function TransactionImportList() {

    const { status, data, error } = useQuery('imports', getTransactionImportResults);

    const headCells = [
        { id: 'integration', label: 'Import type' },
        { id: 'status', label: 'Status' },
        { id: 'executed_at', label: 'Executed at' },
        { id: 'interaction', label: '' },
    ];


    let list = <div>Loading import records...</div>;


    if (status === 'error') {
        list = <span>Error: {error.message}</span>;
    } else if (status !== 'loading') {

        const rows = data.map(importRecord => {

            let record = { ...importRecord };
            let date = new Date(record.created_at);
            record.executed_at = {
                displayValue: date.toLocaleDateString(),
                comparisonKey: date,
            };

            record.interaction = {
                displayValue: <div className="column-stack">
                    <Button
                        href={"#/transactions/imports/" + record.id}
                    >Details</Button>

                </div>
            };

            return record;
        });

        list = <TableWithSort
            rows={rows}
            headCells={headCells}
            defaultOrder="desc"
            defaultOrderBy="executed_at" />;
    }

    return (
        <div>
            <div className='header-with-buttons'>
                <h2>
                    <a href="../#transactions/">Transactions</a> / imports
                </h2>
            </div>
            {list}
        </div>

    );
}

TransactionImportList.propTypes = {
};
