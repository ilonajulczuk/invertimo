import React from 'react';

import PropTypes from 'prop-types';
import { ThemeProvider, createTheme } from '@material-ui/core/styles';


export const themeOptions = {
    palette: {
        type: 'light',
        primary: {
            light: "hsl(184deg 51% 48%)",
            main: '#1b98a1',
            dark: "hsl(184deg 61% 36%)"
        },
        secondary: {
            main: 'hsl(4deg 61% 51%)',
            dark: 'hsl(4deg 70% 42%)',
            light: 'hsl(4deg 71% 60% / 83%)'
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
        button: {
            textTransform: 'none',
            fontWeight: 'bold',
        }
    },
    shape: {
        borderRadius: 0,
    },
};

export function MyThemeProvider(props) {
    return (
        <ThemeProvider theme={createTheme(themeOptions)} {...props}>
            {props.children}
        </ThemeProvider>
    );
}

MyThemeProvider.propTypes = {
    children: PropTypes.any,
};