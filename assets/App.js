import React from 'react';
import Portfolio from './Portfolio.js';

import { MyThemeProvider } from './theme.js';
import {
    HashRouter as Router,
} from "react-router-dom";

export default class App extends React.Component {
    render() {
        return (
            <Router>
                <MyThemeProvider>
                    <Portfolio />
                </MyThemeProvider>
            </Router>
        );
    }
}