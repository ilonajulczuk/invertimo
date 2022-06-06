import React from 'react';
import Portfolio from './Portfolio.js';

import {
    QueryClient,
    QueryClientProvider,
} from 'react-query';

import { MyThemeProvider } from './theme.js';
import {
    HashRouter as Router,
} from "react-router-dom";


import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}

const queryClient = new QueryClient();


export default class App extends React.Component {
    render() {
        return (
            <Router>
                <ScrollToTop />

                <MyThemeProvider>
                    <QueryClientProvider client={queryClient}>
                        <Portfolio />
                    </QueryClientProvider>
                </MyThemeProvider>
            </Router>
        );
    }
}