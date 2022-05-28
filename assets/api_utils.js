
// The import below is necessary for async/await to work.
// eslint-disable-next-line no-unused-vars
import regeneratorRuntime from "regenerator-runtime";
import Cookies from 'js-cookie';


export class APIClientError extends Error { }
export class NotFoundError extends Error { }

// TODO: add cache control to get requests.
export async function fetchDetailResult(url) {
    let response = await fetch(url, { cache: 'no-cache', });
    if (!response.ok) {
        if (response.status == 404) {
            throw new NotFoundError("Not found :(");
        }
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
        response = await fetch(url, { cache: 'no-cache', });

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


async function submitData(url = '', data = {}, method = 'POST') {

    const csrftoken = Cookies.get('csrftoken');
    const response = await fetch(url, {
        method: method,
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


async function submitDataNonJSON(url = '', data = {}, method = 'POST') {

    const csrftoken = Cookies.get('csrftoken');
    const response = await fetch(url, {
        method: method,
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'X-CSRFToken': csrftoken,
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: data,
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

async function postData(url = '', data = {}) {
    return submitData(url, data, 'POST');
}

async function putData(url = '', data = {}) {
    return submitData(url, data, 'PUT');
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
        if (response.status == 400) {
            let data = await response.json();
            return { ok: false, errors: data };
        }
        return { ok: false, message: "Failed on the server side..." };
    }
}


export class APIClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async getAccounts() {
        let url = this.baseUrl + '/accounts/?limit=50';
        return fetchAllResults(url);
    }

    async getPositions() {
        let url = this.baseUrl + '/positions/?limit=200';
        return fetchAllResults(url);
    }

    async getTransactions() {
        let url = this.baseUrl + '/transactions/?limit=300';
        return fetchAllResults(url);
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

    async deleteAccount(accountId) {
        let url = this.baseUrl + '/accounts/' + accountId + "/";
        return deleteData(url);
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

    async correctTransaction(transactionId, update) {
        return await putData(this.baseUrl + '/transactions/' + transactionId + "/", update);
    }

    async getEvents() {
        let url = this.baseUrl + '/account-events/?limit=300';
        return fetchAllResults(url);
    }

    async addEvent(data) {
        let url = this.baseUrl + '/account-events/';
        return postData(url, data);
    }

    async addCryptoIncomeEvent(data) {
        let url = this.baseUrl + '/account-events/add_crypto_income/';
        return postData(url, data);
    }

    async deleteEvent(eventId) {
        let url = this.baseUrl + '/account-events/' + eventId + "/";
        return deleteData(url);
    }


    async uploadDegiroTransactions(data) {
        let url = this.baseUrl + '/integrations/degiro/transactions/';

        const formData = new FormData();

        formData.append('account', data.account);
        formData.append('import_all_assets', data.import_all_assets);
        formData.append('transaction_file', data.file);

        return submitDataNonJSON(url, formData, 'POST');
    }

    async uploadBinanceTransactions(data) {
        let url = this.baseUrl + '/integrations/binance/transactions/';

        const formData = new FormData();

        formData.append('account', data.account);
        formData.append('transaction_file', data.file);

        return submitDataNonJSON(url, formData, 'POST');
    }
}

const baseUrl = "./api";

export function getAssets() {
    return fetchAllResults(baseUrl + "/assets/?limit=50");
}

export function getLots() {
    let url = baseUrl + '/lots/?limit=50';
    return fetchAllResults(url);
}


export function getTransactionImportResult(importId) {
    let url = baseUrl + '/transaction-imports/' + importId + "/";
    return fetchDetailResult(url);
}

export function getTransactionImportResults() {
    return fetchAllResults(baseUrl + '/transaction-imports/?limit=50');
}

export function getCurrencyExchangeRates(fromCurrency, toCurrency, fromDate, toDate) {
    let url = baseUrl + `/currencies/?from_currency=${fromCurrency}&to_currency=${toCurrency}&limit=50`;
    if (fromDate) {
        url += `&from_date=${fromDate}`;
    }
    if (toDate) {
        url += `&to_date=${toDate}`;
    }
    return fetchAllResults(url);
}

export function searchAssets(identifier) {
    let url = baseUrl + `/assets/search/?identifier=${identifier}&limit=50`;
    return fetchAllResults(url);
}