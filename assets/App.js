import React from 'react';
import Portfolio from './Portfolio.js';
import {
    HashRouter as Router,
} from "react-router-dom";

export default class App extends React.Component {
    render() {
        return (
            <Router>
                <Portfolio/>
            </Router>
        );
    }
}