import makeStyles from '@mui/styles/makeStyles';
import { green, red } from '@mui/material/colors';

export const useStyles = makeStyles((theme) => ({
    form: {
        display: "flex",
        flexWrap: "wrap",
        flexDirection: "column",
    },
    formWithMargins: {
        display: "flex",
        flexWrap: "wrap",
        flexDirection: "column",
        marginTop: "20px",
        marginBottom: "20px",
    },
    formControl: {
        minWidth: 120,
        maxWidth: 300,
    },
    narrowInput: {
        minWidth: 60,
        maxWidth: 100,
    },
    mediumInput: {
        minWidth: "200px",
    },
    wideInput: {
        minWidth: "300px",
    },
    inputs: {
        marginTop: theme.spacing(1),
        marginBottom: theme.spacing(1),
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        alignItems: "baseline",
    },
    green: {
        color: green[600],
        '& *': {
            color: green[600],
        },
    },
    red: {
        color: red[600],
        '& *': {
            color: red[600],
        },
    },
    submitButton: {
        marginTop: "2em",
        marginBottom: "2em",
    },
    bottomButtons: {
        marginTop: theme.spacing(4),
        justifyContent: "right",
    },
    symbolInput: {
        minWidth: 320,
        maxWidth: 500,
    },
    symbolOption: {
        display: "flex",
        flexDirection: "column",
    },
}));

