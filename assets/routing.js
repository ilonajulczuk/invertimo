import React from "react";
import {
    useLocation
} from "react-router-dom";

// A custom hook that builds on useLocation to parse
// the query string for you.
export function useQuery() {
    const { search } = useLocation();

    return React.useMemo(() => new URLSearchParams(search), [search]);
}