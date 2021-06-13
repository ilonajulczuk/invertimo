import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";

import { TableWithSort } from "./TableWithSort.js";

let container = null;

describe('table with sort', () => {

    beforeEach(() => {
        // setup a DOM element as a render target.
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    afterEach(() => {
        // Cleanup on exiting.
        unmountComponentAtNode(container);
        container.remove();
        container = null;
    });


    it("shows paginated table", () => {
        expect.hasAssertions();

        const headCells = [
            { id: 'id', label: 'ID' },
            { id: 'foo', label: 'Foo' },
            { id: 'bar', label: 'Bar' },
        ];
        const rows = [
            {id: 1, foo: 'oh yeah', bar: 'oh no 884'},
            {id: 2, foo: 'oh yeah', bar: 'oh no 3'},
            {id: 3, foo: 'oh yeah', bar: 'oh no 883'},
            {id: 4, foo: 'oh yeah', bar: 'oh no 1'},
            {id: 5, foo: 'oh yeah', bar: 'oh no 0'},
            {id: 6, foo: 'oh yeah', bar: 'oh no 999'},
            {id: 7, foo: 'oh yeah', bar: 'oh no 12'},
        ];
        act(() => {
            render(
                <TableWithSort headCells={headCells} rows={rows} />,
                container
            );
        });
        expect(container.querySelectorAll('tr').length).toBe(6);
        // 1 for header and 5 for data, because it's paginated.
        expect(container.querySelectorAll('tbody > tr').length).toBe(5);
    });

    it("supports sorting", () => {
        expect.hasAssertions();

        const headCells = [
            { id: 'id', label: 'ID' },
            { id: 'foo', label: 'Foo' },
            { id: 'bar', label: 'Bar' },
        ];
        const rows = [
            {id: 1, foo: 'oh yeah', bar: 'oh no 884'},
            {id: 2, foo: 'oh yeah', bar: 'oh no 3'},
            {id: 3, foo: 'oh yeah', bar: 'oh no 883'},
            {id: 4, foo: 'oh yeah', bar: 'oh no 1'},
            {id: 5, foo: 'oh yeah', bar: 'oh no 0'},
            {id: 6, foo: 'oh yeah', bar: 'oh no 999'},
            {id: 7, foo: 'oh yeah', bar: 'oh no 12'},
        ];
        act(() => {
            render(
                <TableWithSort headCells={headCells} rows={rows} />,
                container
            );
        });
        expect(container.querySelectorAll('tr').length).toBe(6);

        // 1 for header and 5 for data, because it's paginated.
        expect(container.querySelectorAll('tbody > tr').length).toBe(5);

        // It should be sorted by the first column ascending by default, so the last item
        // is not visible.
        expect(container.innerHTML).not.toContain("oh no 12");

        // Clicking on the name of the column should change the order from asc to desc.
        const sortHeadCellId = document.querySelector("[data-test-id=sort-column-id]");
        act(() => {
            sortHeadCellId.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        });

        expect(container.innerHTML).toContain("oh no 12");

        // Clicking on a different column should change ordering (to that column and asc).
        const sortHeadCellBar = document.querySelector("[data-test-id=sort-column-bar]");
        act(() => {
            sortHeadCellBar.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        });
        expect(container.innerHTML).toContain("oh no 0");
        expect(container.innerHTML).not.toContain("oh no 884");
    });

    it("shows table with no elements", () => {
        expect.hasAssertions();

        const headCells = [
            { id: 'id', label: 'ID' },
            { id: 'foo', label: 'Foo' },
            { id: 'bar', label: 'Bar' },
        ];
        const rows = [
        ];
        act(() => {
            render(
                <TableWithSort headCells={headCells} rows={rows} />,
                container
            );
        });

        expect(container.querySelectorAll('tr').length).toBe(1);

    });
});