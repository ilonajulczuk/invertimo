
// The import below is necessary for async/await to work.
// eslint-disable-next-line no-unused-vars
import regeneratorRuntime from "regenerator-runtime";
import Cookies from 'js-cookie';


export class APIClientError extends Error { }


export async function fetchDetailResult(url) {
    let response = await fetch(url);
    return await response.json();
}

export async function fetchAllResults(url) {
    let allResults = [];

    while (url) {
        let response;
        response = await fetch(url);

        if (!response.ok) {
            throw new APIClientError(
                "failed at fetching data, non successful response");
        }

        let data = await response.json();
        if ("results" in data) {
            allResults = allResults.concat(data["results"]);
        } else {
            throw new APIClientError(`unexpected API format ${data}`);
        }
        url = data["next"];
    }
    return allResults;
}


async function postData(url = '', data = {}) {

    const csrftoken = Cookies.get('csrftoken');
    const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(data),
    });
    if (response.ok) {
        let data = await response.json();
        return {
            ok: true, data: data
        };
    }
    if (response.status == 400) {
        let data = await response.json();
        // Translate between api and the form.
        if (data.nickname) {
            data.name = data.nickname;
        }
        return { ok: false, errors: data };
    } else {
        return { ok: false, message: "Failed on the server side..." };
    }

}


export class APIClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async getAccounts() {
        let url = this.baseUrl + '/accounts/?limit=50';
        let accounts = await fetchAllResults(url);
        return accounts;
    }

    async getPositions() {
        let url = this.baseUrl + '/positions/?limit=50';
        let positions = await fetchAllResults(url);
        return positions;
    }

    async getTransactions() {
        let url = this.baseUrl + '/transactions/?limit=50';
        let transactions = await fetchAllResults(url);
        return transactions;
    }

    async getPositionDetail(positionId) {
        let positionsUrl = this.baseUrl + `/positions/${positionId}/`;
        let positionDetail = await fetchDetailResult(positionsUrl);
        const assetId = positionDetail.asset.id;
        let assetUrl = this.baseUrl + `/assets/${assetId}/prices/`;
        let assetPrices = await fetchDetailResult(assetUrl);
        positionDetail.prices = assetPrices;
        return positionDetail;
    }

    async getAccountDetail(accountId, historyDays) {
        const startDay = new Date();
        startDay.setDate(startDay.getDate() - historyDays);

        let url = this.baseUrl + `/accounts/${accountId}/?from_date=${startDay.toISOString().substring(0, 10)}`;
        let accountDetail = await fetchDetailResult(url);

        return accountDetail;
    }

    async createAccount(accountData) {
        return await postData(this.baseUrl + '/accounts/', accountData);
    }

    async addTransaction(transactionData) {
        // TODO: extract an adapter with tests.
        let data = { ...transactionData };
        data["account"] = data["account"].id;
        data["asset"] = data["symbol"].id;

        let multiplier = 1;
        if (data["tradeType"] === "sold") {
            data["quantity"] = - data["quantity"];
            multiplier = -1;
        }

        data["transaction_costs"] = -data["fees"];
        data["local_value"] = -data["price"] * data["quantity"];
        let value = data["totalValueAccountCurrency"];
        const emptyAccountCurrencyValue = value === "";
        data["value_in_account_currency"] = (
            value === "" ? -data["local_value"] * multiplier : -value * multiplier);

        let totalInAccountCurrency = data["totalCostAccountCurrency"];
        // User can go with the default value.
        if (totalInAccountCurrency === "") {
            if (emptyAccountCurrencyValue) {
                totalInAccountCurrency = data["local_value"] + data["fees"];
            } else {
                totalInAccountCurrency = value + data["fees"];
            }
        }
        data["total_in_account_currency"] = -totalInAccountCurrency * multiplier;
        data["order_id"] = "";
        let executedAt = data["executedAt"];

        // Date from the datepicker will not have time and the time is actually required.
        if (typeof executedAt === "string") {
            executedAt = new Date(executedAt);
        } else {
            // Align to 00 UTC.
            executedAt = new Date(executedAt.toISOString().slice(0, 10));
        }
        data["executed_at"] = executedAt;

        const response = await postData(this.baseUrl + '/transactions/', data);
        if (response.errors) {
            response.errors["totalCostAccountCurrency"] = response.errors["total_in_account_currency"];
            response.errors["fees"] = response.errors["transaction_costs"];
            response.errors["totalValueAccountCurrency"] = response.errors["value_in_account_currency"];
            response.errors["executedAt"] = response.errors["executed_at"];
        }
        return response;
    }

    async addTransactionWithCustomAsset(transactionData) {

        let data = { ...transactionData };
        data["account"] = data["account"].id;
        data["asset_type"] = data["assetType"];

        let multiplier = 1;
        if (data["tradeType"] === "sold") {
            data["quantity"] = - data["quantity"];
            multiplier = -1;
        }

        data["transaction_costs"] = -data["fees"];
        data["local_value"] = -data["price"] * data["quantity"];
        let value = data["totalValueAccountCurrency"];
        const emptyAccountCurrencyValue = value === "";
        data["value_in_account_currency"] = (
            value === "" ? -data["local_value"] * multiplier : -value * multiplier);

        let totalInAccountCurrency = data["totalCostAccountCurrency"];
        // User can go with the default value.
        if (totalInAccountCurrency === "") {
            if (emptyAccountCurrencyValue) {
                totalInAccountCurrency = data["local_value"] + data["fees"];
            } else {
                totalInAccountCurrency = value + data["fees"];
            }
        }
        data["total_in_account_currency"] = -totalInAccountCurrency * multiplier;
        data["order_id"] = "";
        let executedAt = data["executedAt"];

        // Date from the datepicker will not have time and the time is actually required.
        if (typeof executedAt === "string") {
            executedAt = new Date(executedAt);
        }
        data["executed_at"] = executedAt;
        const response = await postData(this.baseUrl + '/transactions/add_with_custom_asset/', data);
        if (response.errors) {
            response.errors["totalCostAccountCurrency"] = response.errors["total_in_account_currency"];
            response.errors["assetType"] = response.errors["asset_type"];
            response.errors["fees"] = response.errors["transaction_costs"];
            response.errors["totalValueAccountCurrency"] = response.errors["value_in_account_currency"];
            response.errors["executedAt"] = response.errors["executed_at"];
        }
        return response;
    }
}