

export const currencyValues = [
    "EUR", "USD", "GBP", "GBX", "HKD", "SGD", "JPY", "CAD", "PLN"
];

export const accountCurrencyValues = [
    "EUR", "USD", "GBP", "HKD", "SGD", "JPY", "CAD", "PLN"
];

export const CURRENCY_TO_SYMBOL = new Map(
    [
        ["USD", "$"],
        ["EUR", "€"],
        ["GBP", "£"],
        ["GBX", "GBX"],
        ["HKD", "HK$"],
        ["SGD", "S$"],
        ["JPY", "¥"],
        ["CAD", "C$"],
        ["PLN", "zł"],
    ]
);


export function toSymbol(currency) {
    return CURRENCY_TO_SYMBOL.has(currency) ? CURRENCY_TO_SYMBOL.get(currency) : currency;
}