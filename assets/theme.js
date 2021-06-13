import React from 'react';

import PropTypes from 'prop-types';
import { ThemeProvider, createMuiTheme } from '@material-ui/core/styles';


export const themeOptions = {
    palette: {
        type: 'light',
        primary: {
            main: '#1b98a1',
        },
        secondary: {
            main: '#e96158',
        },
    },
    typography: {
        fontFamily: 'Open Sans',
        h1: {
            fontFamily: 'comfortaa',
        },
        h2: {
            fontFamily: 'comfortaa',
        },
        h3: {
            fontFamily: 'comfortaa',
        },
        h4: {
            fontFamily: 'comfortaa',
        },
        h5: {
            fontFamily: 'comfortaa',
        },
    },
    shape: {
        borderRadius: 0,
    },
};

export function MyThemeProvider(props) {
    return (
        <ThemeProvider theme={createMuiTheme(themeOptions)} {...props}>
            {props.children}
        </ThemeProvider>
    );
}

MyThemeProvider.propTypes = {
    children: PropTypes.any,
};