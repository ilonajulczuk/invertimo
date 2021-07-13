import React from 'react';
import Portfolio from './Portfolio.js';

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

export default class App extends React.Component {
    render() {
        return (
            <Router>
                <ScrollToTop />

                <MyThemeProvider>
                    <Portfolio />
                </MyThemeProvider>
            </Router>
        );
    }
}