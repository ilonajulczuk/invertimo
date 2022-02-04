
import React from 'react';
import PropTypes from 'prop-types';

const AccountValue = React.lazy(() => import('./AccountValue'));

export default function AccountValues(props) {

    if (!props.accountValues) {
        return <div>Still crunching the numbers...</div>;
    }
    let accountValues = props.accounts.filter(account =>
        props.accountValues.get(account.id)).map((account) => {

            let accountDetail = props.accountValues.get(account.id);
            let values = [];
            if (accountDetail) {
                values = accountDetail.values;
            }
            return (
                <AccountValue key={account.id} account={account}
                    positions={props.positions} values={values} />
            );
        });
    let maybeLoadingMore = null;
    if (props.accountValues.size !== props.accounts.length) {
        maybeLoadingMore = <p>Still fetching data for remaining accounts...</p>;
    }
    return <div>{accountValues} {maybeLoadingMore}</div>;
}

AccountValues.propTypes = {
    accountValues: PropTypes.object,
    accounts: PropTypes.array.isRequired,
    positions: PropTypes.array.isRequired,
};