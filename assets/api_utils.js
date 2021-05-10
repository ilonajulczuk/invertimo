
// The import below is necessary for async/await to work.
import regeneratorRuntime from "regenerator-runtime";
let fetchFunc = fetch;

export async function fetchDetailResult(url) {
    let response = await fetchFunc(url);
    return await response.json();
}

export async function fetchAllResults(url) {
    let allResults = [];

    while (url) {
        let response = await fetchFunc(url);
        let data = await response.json();
        console.log(data);
        if ("results" in data) {
            allResults = allResults.concat(data["results"]);
        } else {
            console.log(data);
            throw new Error(`unexpected API format ${data}`);
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
        let url = this.base_url + '/accounts?limit=5';
        let accounts = await fetchAllResults(url);
        return accounts;
    }

    async getPositions() {
        let url = this.base_url + '/positions?limit=20';
        let positions = await fetchAllResults(url);
        return positions;
    }

    async getPositionDetail(positionId) {
        let url = this.base_url + `/positions/${positionId}/`;
        return fetchDetailResult(url);
    }
};