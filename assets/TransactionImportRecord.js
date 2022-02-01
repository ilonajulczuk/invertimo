import React from 'react';
import PropTypes from 'prop-types';


import Icon from '@mui/material/Icon';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';

import CardContent from '@mui/material/CardContent';

import format from 'date-fns/format';


export function TransactionImportRecord(props) {
    const createdAt = format(new Date(props.record.created_at), "yyyy-MM-dd  k:m O");
    const maybeDuplicate = props.record.created_new ? "" : "(duplicate)";
    return <Accordion elevation={2}>
        <AccordionSummary
            expandIcon={<Icon>expand_more</Icon>}
            aria-controls="import-result-content"
            id="import-result-header"
        >
            <Typography>Transaction <a href={`#/transactions/imports/${props.record.transaction_import}`}> imported </a> from {props.record.integration} at {createdAt} {maybeDuplicate}</Typography>
        </AccordionSummary>
        <AccordionDetails>
            <h4>Raw data</h4>
            <Typography>
                {props.record.raw_record}
            </Typography>
        </AccordionDetails>
    </Accordion>;
}

TransactionImportRecord.propTypes = {
    record: PropTypes.shape({
        created_at: PropTypes.string.isRequired,
        raw_record: PropTypes.string.isRequired,
        integration: PropTypes.string.isRequired,
        created_new: PropTypes.bool.isRequired,
        transaction_import: PropTypes.number.isRequired,
        event: PropTypes.number,
        event_type: PropTypes.string,
    }).isRequired,
};


export function TransactionImportRecordReferencingTransaction(props) {
    const maybeDuplicate = props.record.successful ? (props.record.created_new ? "(new)" : "(duplicate)") : "";

    const maybeTransaction = props.record.transaction ? <a href={`#/transactions/${props.record.transaction}`} >
        transaction</a> : null;
    const maybeEvent = props.record.event ? <a href={`#/events/${props.record.event}`}>{props.record.event_type}</a> : null;
    const maybeIssue = props.record.issue_type ? "Issue type: " + props.record.issue_type : null;
    return <div>
        <Card variant="outlined" sx={{ marginTop: "1em", marginBottom: "1em" }}>

            <CardContent>
                <h4>
                    {maybeEvent} {maybeTransaction} {maybeDuplicate}
                    {maybeIssue}

                </h4>
                {props.record.raw_issue ?
                    <Typography sx={{marginBottom: "1em"}}>
                        {props.record.raw_issue}
                    </Typography> : null}
                <Typography>
                    {props.record.raw_record}
                </Typography>


            </CardContent>
        </Card>
    </div>;
}

TransactionImportRecordReferencingTransaction.propTypes = {
    record: PropTypes.shape({
        raw_record: PropTypes.string.isRequired,
        created_new: PropTypes.bool.isRequired,
        transaction: PropTypes.number,
        issue_type: PropTypes.string,
        raw_issue: PropTypes.string,
        successful: PropTypes.bool.isRequired,
        event: PropTypes.number,
        event_type: PropTypes.string,
    }).isRequired,
};