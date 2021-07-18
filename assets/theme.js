import React from 'react';

import PropTypes from 'prop-types';
import { ThemeProvider, createTheme } from '@material-ui/core/styles';


export const themeOptions = {
    palette: {
        type: 'light',
        primary: {
            main: '#1b98a1',
        },
        secondary: {
            main: 'hsl(4deg 61% 51%)',
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