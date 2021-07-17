import React from 'react';
import Avatar from '@material-ui/core/Avatar';
import Popover from '@material-ui/core/Popover';
import { makeStyles } from '@material-ui/core/styles';
import Icon from '@material-ui/core/Icon';
import Chip from '@material-ui/core/Chip';
import PropTypes from 'prop-types';


const useStyles = makeStyles((theme) => ({
    popoverMenu: {
        padding: theme.spacing(2),
        paddingBottom: "20px",
        display: "flex",
        flexDirection: "column",
    },
    buttonLogout: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    logoutText: {
        marginRight: '5px',
    },
    accountText: {
        fontWeight: 'bold',
    },
    whiteBackground: {
        background: "white",
    }
}));


export function Header(props) {

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const [anchorEl, setAnchorEl] = React.useState(null);

    const open = Boolean(anchorEl);
    const id = open ? 'simple-popover' : undefined;


    const classes = useStyles();

    return (
        <header className="main-header">

            <a href="/#" className="logo">invertimo</a>
            <div className="header-account">
                <Chip avatar={<Avatar className={classes.whiteBackground}><Icon>account_circle</Icon></Avatar>}
                    onClick={handleClick}
                    variant="outlined"
                    label={props.email} >
                </Chip>
                <Popover
                    id={id}
                    open={open}
                    anchorEl={anchorEl}
                    onClose={handleClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'center',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'center',
                    }}

                >
                    <div className={classes.popoverMenu}>
                        <span>Logged in as</span>
                        <span className={classes.accountText}>{props.email}</span>
                        <a href="/logout" className={"button " + classes.buttonLogout}><span className={classes.logoutText}>Log out </span><Icon>logout</Icon></a>
                    </div>


                </Popover>

            </div>
        </header>);

}

Header.propTypes = {
    email: PropTypes.string.isRequired,
};
