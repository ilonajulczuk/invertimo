

export const assetTypeOptions = [
    {
        value: "Stock",
        label: "Stock",
    },
    {
        value: "Fund",
        label: "Fund",
    },
    {
        value: "Crypto",
        label: "Crypto",
    },
];

export const exchangeOptions = [
    "USA Stocks",
    "XETRA Exchange",
    "London Exchange",
    "Borsa Italiana",
    "Euronext Paris",
    "Euronext Amsterdam",
    "Madrid Exchange",
    "Frankfurt Exchange",
    "Warsaw Stock Exchange",
    "Singapore Exchange",
    "Hong Kong Exchange",
    "Canadian Securities Exchange",
    "Other / NA"].map(name => ({
        value: name, label: name,
    }));


export const currencyOptions = [
    {
        value: "USD",
        label: "$ USD",
    },
    {
        value: "EUR",
        label: "€ EUR",
    },
    {
        value: "GBP",
        label: "£ GBP",
    },
    {
        value: "GBX",
        label: "GBX",
    },
    {
        value: "HKD",
        label: "HK$ HKD",
    },
    {
        value: "SGD",
        label: "S$ SGD",
    },
    {
        value: "JPY",
        label: "¥ JPY",
    },
    {
        value: "CAD",
        label: "C$ CAD",
    },
    {
        value: "PLN",
        label: "zł PLN",
    },
];