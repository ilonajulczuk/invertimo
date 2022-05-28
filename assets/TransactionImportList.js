import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';

import { getTransactionImportResults } from './api_utils';
import { TableWithSort } from './components/TableWithSort.js';

export default function TransactionImportList() {

    const [imports, setImports] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        getTransactionImportResults().then(data => {
            if (mounted) {
                setImports(data);
            }
        }).catch(error => {
            setError(error);
            setImports(null);
        });

        return () => mounted = false;
    }, []);

    const headCells = [

        { id: 'integration', label: 'Import type' },
        { id: 'status', label: 'Status' },
        { id: 'executed_at', label: 'Executed at' },
        { id: 'interaction', label: '' },
    ];


    let list = <div>Loading import records...</div>;
    if (imports != null) {

        const rows = imports.map(importRecord => {

            let record = {...importRecord};
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
    } else if (error) {
        list = `{Failed to load import records: ${error}}`;
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
