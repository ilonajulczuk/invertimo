import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import {
    useRouteMatch,
} from "react-router-dom";
import { TransactionImportResult } from './TransactionImportResult';
import { getTransactionImportResult } from './api_utils';


export function TransactionImportDetail(props) {
    let match = useRouteMatch("/transactions/imports/:importId");
    let importId = match.params.importId;

    const [importResult, setImportResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        getTransactionImportResult(importId).then(data => {
            if (mounted) {
                setImportResult(data);
            }
        }).catch(error => {
            setError(error);
            setImportResult(null);
        });

        return () => mounted = false;
    }, [props.transactions, importId]);

    return (
        <div>
            <div className='header-with-buttons'>
                <h2>

                <a href="../#transactions/">Transactions</a> / imports / {importId}
                </h2>
            </div>
            {
                importResult ? <TransactionImportResult importResult={importResult} /> :
                 (error ? error.message : "Loading...")
            }


        </div>

    );
        }

TransactionImportDetail.propTypes = {
    transactions: PropTypes.array.isRequired,
};
