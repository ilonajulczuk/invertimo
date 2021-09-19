
// The import below is necessary for async/await to work.
// eslint-disable-next-line no-unused-vars
import regeneratorRuntime from "regenerator-runtime";
import Cookies from 'js-cookie';


export class APIClientError extends Error { }

// TODO: add cache control to get requests.
export async function fetchDetailResult(url) {
    let response = await fetch(url);
    if (!response.ok) {
        if (!response.ok) {
            throw new APIClientError(
                "failed at fetching data, non successful response");
        }
    }
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
        // TODO: move this translation to a better place.
        // Translate between api and the form.
        if (data.nickname) {
            data.name = data.nickname;
        }
        return { ok: false, errors: data };
    } else {
        return { ok: false, message: "Failed on the server side..." };
    }

}


async function deleteData(url = '', data = {}) {

    const csrftoken = Cookies.get('csrftoken');
    const response = await fetch(url, {
        method: 'DELETE',
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
        return {
            ok: true
        };
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

    async addTransaction(data) {
        return await postData(this.baseUrl + '/transactions/', data);
    }

    async addTransactionWithCustomAsset(data) {
        return await postData(this.baseUrl + '/transactions/add_with_custom_asset/', data);
    }

    async deleteTransaction(transactionId) {
        return await deleteData(this.baseUrl + '/transactions/' + transactionId + "/");
    }
}