import React, { useState } from 'react';

import {
    useRouteMatch,
    useHistory,
} from "react-router-dom";

import {
    useQuery,
    useMutation,
    useQueryClient,
} from 'react-query';

import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';

import { TransactionImportResult } from './TransactionImportResult';
import { getTransactionImportResult, deleteTransactionImportResult } from './api_utils';

import { DeleteDialog } from './forms/DeleteDialog.js';


export function TransactionImportDetail() {
    let match = useRouteMatch("/transactions/imports/:importId");
    let importId = match.params.importId;

    let history = useHistory();

    const [deleteDialogOpen, toggleDeleteDialog] = useState(false);

    const queryClient = useQueryClient();
    // Queries
    const { status, data, error } = useQuery(['imports', importId],
        () => getTransactionImportResult(importId)
    );

    const mutation = useMutation(deleteTransactionImportResult, {
        onMutate: variables => {
            return variables;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries('imports');
            queryClient.invalidateQueries(['imports', variables]);
        },
    });

    const handleDelete = () => {
        mutation.mutate(importId);
        history.push("/transactions/imports/");
    };

    return (
        <div>
            <div className='header-with-buttons'>
                <h2>

                    <a href="../#transactions/">Transactions</a> / <a href="../#transactions/imports">imports</a> / {importId}
                </h2>
                <Button variant="contained"
                    color="secondary"
                    onClick={() => { toggleDeleteDialog(true); }}
                ><Icon>delete</Icon> Delete</Button>
            </div>
            {
                data ? <TransactionImportResult importResult={data} /> :
                    (status === "error" ? error.message : "Loading...")
            }

            <DeleteDialog handleCancel={() => toggleDeleteDialog(false)} open={deleteDialogOpen} canDelete={true}
                handleDelete={handleDelete} title="Delete this import?"
                message={"Are you sure you want to delete this import? All transactions " +
                    "and events associated with this import will also be deleted deleted."}
            />
        </div>

    );
}

TransactionImportDetail.propTypes = {
};
