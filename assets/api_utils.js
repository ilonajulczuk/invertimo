
// The import below is necessary for async/await to work.
import regeneratorRuntime from "regenerator-runtime";


export class APIClientError extends Error {}


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
    constructor(base_url) {
        this.base_url = base_url;
    }

    async getAccounts() {
        let url = this.base_url + '/accounts/?limit=50';
        let accounts = await fetchAllResults(url);
        return accounts;
    }

    async getPositions() {
        let url = this.base_url + '/positions/?limit=50';
        let positions = await fetchAllResults(url);
        return positions;
    }

    async getPositionDetail(positionId) {
        let positionsUrl = this.base_url + `/positions/${positionId}/`;
        let positionDetails = await fetchDetailResult(positionsUrl);
        const securityId = positionDetails.security.id;
        let securityUrl = this.base_url + `/securities/${securityId}/prices/`;
        let securityPrices = await fetchDetailResult(securityUrl);
        positionDetails.prices = securityPrices;
        return positionDetails;
    }
};