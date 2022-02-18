


import * as React from 'react';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Icon from '@mui/material/Icon';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';

import {
    useHistory,
} from "react-router-dom";

import PropTypes from 'prop-types';

export default function SplitButtonNav({ options, color }) {

    let history = useHistory();
    const [open, setOpen] = React.useState(false);
    const anchorRef = React.useRef(null);
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    const handleClick = () => {
        history.push(options[selectedIndex].link);
    };

    const handleMenuItemClick = (event, index) => {
        setSelectedIndex(index);
        setOpen(false);
        history.push(options[index].link);
    };

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen);
    };

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return;
        }
        setOpen(false);
    };

    return (
        <React.Fragment>
            <ButtonGroup variant="contained" color={color} ref={anchorRef}>
                <Button onClick={handleClick}>{options[selectedIndex].label}</Button>
                <Button
                    size="small"
                    aria-controls={open ? 'split-button-menu' : undefined}
                    aria-expanded={open ? 'true' : undefined}
                    aria-haspopup="menu"
                    onClick={handleToggle}
                >
                    <Icon>expand_more</Icon>
                </Button>
            </ButtonGroup>
            <Popper
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                transition
                disablePortal
                placement="bottom-start"
            >
                {({ TransitionProps, placement }) => (
                    <Grow
                        {...TransitionProps}
                        style={{
                            transformOrigin:
                                placement === 'bottom' ? 'left top' : 'left bottom',
                        }}
                    >
                        <Paper sx={{
                            marginTop: "2px",
                        }}>
                            <ClickAwayListener onClickAway={handleClose}>
                                <MenuList id="split-button-menu"
                                >
                                    {options.map((option, index) => (
                                        <MenuItem
                                            sx={{
                                                "&.Mui-selected,&.Mui-selected:hover": {
                                                    bgcolor: `${color}.veryLight`,
                                                },
                                            }}
                                            key={option.link}
                                            selected={index === selectedIndex}
                                            onClick={(event) => handleMenuItemClick(event, index)}
                                        >
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </MenuList>
                            </ClickAwayListener>
                        </Paper>
                    </Grow>
                )}
            </Popper>
        </React.Fragment>
    );
}

SplitButtonNav.propTypes = {
    options: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.any.isRequired,
            link: PropTypes.string.isRequired
        })).isRequired,
    color: PropTypes.string,
};