

export const currencyValues = [
    "EUR", "USD", "GBP", "GBX",
];


export const CURRENCY_TO_SYMBOL = new Map(
    [
        ["USD", "$"],
        ["EUR", "€"],
        ["GBP", "£"],
        ["GBX", "GBX"],
    ]
);


export function toSymbol(currency) {
    return CURRENCY_TO_SYMBOL.has(currency) ? CURRENCY_TO_SYMBOL.get(currency) : currency;
}