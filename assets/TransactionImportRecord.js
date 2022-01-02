import React from 'react';
import PropTypes from 'prop-types';


import Icon from '@mui/material/Icon';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';

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
            <Typography>Transaction imported from {props.record.integration} at {createdAt} {maybeDuplicate}</Typography>
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
    }).isRequired,
};