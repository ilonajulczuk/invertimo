
// The import below is necessary for async/await to work.
// eslint-disable-next-line no-unused-vars
import regeneratorRuntime from "regenerator-runtime";


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
        const securityId = positionDetail.security.id;
        let securityUrl = this.baseUrl + `/securities/${securityId}/prices/`;
        let securityPrices = await fetchDetailResult(securityUrl);
        positionDetail.prices = securityPrices;
        return positionDetail;
    }

    async getAccountDetail(accountId, historyDays) {
        const startDay = new Date();
        startDay.setDate(startDay.getDate() - historyDays);

        let url = this.baseUrl + `/accounts/${accountId}/?from_date=${startDay.toISOString().substring(0, 10)}`;
        let accountDetail = await fetchDetailResult(url);

        return accountDetail;
    }
}