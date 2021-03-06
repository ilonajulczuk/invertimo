import React from 'react';

import { useState, useEffect } from 'react';

import PropTypes from 'prop-types';
import makeStyles from '@mui/styles/makeStyles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Paper from '@mui/material/Paper';


function descendingComparator(a, b, orderBy) {
    let first = a[orderBy];
    let second = b[orderBy];
    if (first != null && second != null && first.comparisonKey != undefined && second.comparisonKey != undefined) {
        first = first.comparisonKey;
        second = second.comparisonKey;
    }
    if (second < first) {
        return -1;
    }
    if (second > first) {
        return 1;
    }
    return 0;
}

function getComparator(order, orderBy) {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
    const stabilizedThis = array.map((el, index) => [el, index]);

    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
}


function TableHeadWithSort(props) {
    const { classes, order, orderBy, onRequestSort } = props;
    const createSortHandler = (property) => (event) => {
        onRequestSort(event, property);
    };

    return (
        <TableHead>
            <TableRow className={classes.heading}>
                {props.headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        className={classes.additionalCellPadding}
                        align='left'
                        sortDirection={orderBy === headCell.id ? order : false}
                    >
                        <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            data-test-id={"sort-column-" + headCell.id}
                            onClick={createSortHandler(headCell.id)}
                        >
                            {headCell.label}
                            {orderBy === headCell.id ? (
                                <span className={classes.visuallyHidden}>
                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                </span>
                            ) : null}
                        </TableSortLabel>
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
}

TableHeadWithSort.propTypes = {
    classes: PropTypes.object.isRequired,
    onRequestSort: PropTypes.func.isRequired,
    order: PropTypes.oneOf(['asc', 'desc']).isRequired,
    orderBy: PropTypes.string.isRequired,
    rowCount: PropTypes.number.isRequired,
    headCells: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
    })).isRequired,
};


const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%',
    },
    heading: {
        color: "white!important",
        backgroundColor: theme.palette.primary.main,
        fontWeight: "bold",
        "& *": {
            color: "white",
            fontWeight: "bold",
        },

        "& *:hover": {
            color: "white",
            fontWeight: "bold",
        },
        "& .Mui-active": {
            color: "white",
            fontWeight: "bold",
        },
    },
    visuallyHidden: {
        border: 0,
        clip: 'rect(0 0 0 0)',
        height: 1,
        margin: -1,
        overflow: 'hidden',
        padding: 0,
        position: 'absolute',
        top: 20,
        width: 1,
    },
}));



function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height
  };
}

export default function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
}



export function TableWithSort(props) {
    const rows = props.rows;
    const classes = useStyles();
    const defaultOrderBy = props.defaultOrderBy ? props.defaultOrderBy : props.headCells[0] ? props.headCells[0].id : "";
    const defaultOrder = props.defaultOrder == 'desc' ? props.defaultOrder : 'asc';
    const [order, setOrder] = React.useState(defaultOrder);
    const [orderBy, setOrderBy] = React.useState(defaultOrderBy);
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(5);

    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };


    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const { width } = useWindowDimensions();
    const smallScreen  = width <= 800;

    const additionalShrink = props.additionalShrink ?? 0;

    const sizeBuffer = smallScreen ? 50 : 300;
    return (

        <div className={classes.root}>
            <Paper sx={{
                width: width - sizeBuffer - additionalShrink, maxWidth: "100%",
                overflowX: "auto",
                overflow: "hidden",
                marginBottom: "2em",
                boxShadow: '6px 8px 0px 2px #1b98a147',
                borderLeft: "1px solid #384a5052",
                borderBottom: "1px solid #384a5052",
                }} >
                <TableContainer sx={{width: width - sizeBuffer - 2 - additionalShrink, maxWidth: "100%"}}>
                    <Table
                        sx={{ width: width - sizeBuffer - 2 - additionalShrink, maxWidth: "100%" }}
                    >
                        <TableHeadWithSort
                            classes={classes}
                            order={order}
                            orderBy={orderBy}
                            onRequestSort={handleRequestSort}
                            rowCount={rows.length}
                            headCells={props.headCells}
                        />
                        <TableBody>
                            {stableSort(rows, getComparator(order, orderBy))
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((row) => {
                                    const cells = [
                                    ];

                                    for (let headCell of props.headCells) {
                                        let cellContents = row[headCell.id];

                                        if (cellContents && cellContents.displayValue != undefined) {
                                            cellContents = cellContents.displayValue;
                                        }
                                        cells.push(
                                            < TableCell className={classes.additionalCellPadding}
                                                key={headCell.id} align="left"
                                            > {cellContents}</TableCell>
                                        );
                                    }

                                    return (
                                        <TableRow

                                            hover
                                            key={row.id}
                                        >
                                            {cells}

                                        </TableRow>
                                    );
                                })}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={rows.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Paper>
        </div >
    );
}

TableWithSort.propTypes = {
    rows: PropTypes.array.isRequired,
    headCells: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
    })).isRequired,
    defaultOrder: PropTypes.string,
    defaultOrderBy: PropTypes.string,
    additionalShrink: PropTypes.number,
};