import React from 'react';
import PropTypes from 'prop-types';

import Icon from '@material-ui/core/Icon';

import './transaction_list.css';
import Button from '@material-ui/core/Button';

import {
    useParams,
} from "react-router-dom";


export function TransactionDetail(props) {

    let { transactionId } = useParams();

    let transaction = null;
    for (let t of props.transactions) {
        if (t.id == transactionId) {
            transaction = t;
        }
    }
    return (
        <div>
            <h2><a href="../#transactions/">Transactions</a> / {transactionId}</h2>

            <Button
                href={"#/transactions/" + transaction.id + "/edit/"}
                color="primary"
                size="small"
            ><Icon>create</Icon> Correct</Button>
            <Button
                href={"#/transactions/" + transaction.id + "/delete/"}
                size="small"
            ><Icon>delete</Icon>Delete</Button>
        </div>
    );
}

TransactionDetail.propTypes = {
    transactions: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        quantity: PropTypes.string.isRequired,
        price: PropTypes.string.isRequired,
        local_value: PropTypes.string.isRequired,
        transaction_costs: PropTypes.string,
        executed_at: PropTypes.string.isRequired,
    })).isRequired,
};