
import React from 'react';

import PropTypes from 'prop-types';

import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Icon from '@mui/material/Icon';
import Alert from '@mui/material/Alert';
import format from 'date-fns/format';
import { filter } from 'lodash';
import { TransactionImportRecordReferencingTransaction } from './TransactionImportRecord';


export function TransactionImportResult(props) {
    const status = props.importResult.status;
    const integration = props.importResult.integration;
    const severity = status === "Success" ? "success" : (
        status == "Partial success" ? "warning" : "error");

    const summary = status === "Success" ? `Import from ${integration} succeeded` : (
        status == "Partial success" ? `Import from ${integration} partially succeeded` : `Import from ${integration} failed`);

    const createdAt = format(new Date(props.importResult.created_at), "yyyy-MM-dd  k:m O");

    const successfulRawRecords = filter(props.importResult.records, "successful");
    const successfulRawRecordsDuplicates = filter(successfulRawRecords, o => !o.created_new);

    const failedRawRecords = filter(props.importResult.records,
        record => !record.successful
    );

    const successfulRecords = successfulRawRecords.map(record => <TransactionImportRecordReferencingTransaction key={record.id} record={record} />);
    const failedRecords = failedRawRecords.map(record => <TransactionImportRecordReferencingTransaction key={record.id} record={record} />);

    const successfulRawEventRecords = filter(props.importResult.event_records, "successful");
    const successfulRawEventRecordsDuplicates = filter(successfulRawEventRecords, o => !o.created_new);

    const failedRawEventRecords = filter(props.importResult.event_records,
        record => !record.successful
    );

    const successfulEventRecords = successfulRawEventRecords.map(record => <TransactionImportRecordReferencingTransaction key={record.id} record={record} />);
    const failedEventRecords = failedRawEventRecords.map(record => <TransactionImportRecordReferencingTransaction key={record.id} record={record} />);

    return (

        <Accordion elevation={2}>

            <Alert severity={severity} sx={{
                width: "100%", display: "flex", alignItems: "center", "& .MuiAccordionSummary-root": {
                    display: "flex", width: "100%"
                },
                "& .MuiAlert-message": {
                    display: "flex", width: "100%"
                }
            }}>
                <AccordionSummary
                    expandIcon={<Icon>expand_more</Icon>}
                    aria-controls="import-result-content"
                    id="import-result-header">
                    {summary}
                </AccordionSummary>
            </Alert>
            <AccordionDetails>
                <p>
                    Executed at: {createdAt}
                </p>
                <h3>Transactions</h3>
                <p>{successfulRawRecords.length} successful records, {successfulRawRecordsDuplicates.length} of which duplicates.</p>
                <p>{failedRawRecords.length} failed records.</p>

                {successfulRawRecords.length ? <h4>Successful records</h4> : null}
                {successfulRecords}
                {failedRawRecords.length ? <h4>Failed records</h4> : null}
                {failedRecords}
                <h3>Events</h3>
                <p>{successfulRawEventRecords.length} successful records, {successfulRawEventRecordsDuplicates.length} of which duplicates.</p>
                <p>{failedRawEventRecords.length} failed records.</p>

                {successfulRawEventRecords.length ? <h4>Successful records</h4> : null}
                {successfulEventRecords}
                {failedRawEventRecords.length ? <h4>Failed records</h4> : null}
                {failedEventRecords}
            </AccordionDetails>
        </Accordion >
    );
}

TransactionImportResult.propTypes = {
    importResult: PropTypes.shape({
        records: PropTypes.array.isRequired,
        event_records: PropTypes.array.isRequired,
        status: PropTypes.string.isRequired,
        integration: PropTypes.string.isRequired,
        created_at: PropTypes.string.isRequired,
    })
};