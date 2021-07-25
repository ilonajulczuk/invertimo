import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";

import { Stepper } from "./Stepper.js";

let container = null;

describe('stepper with a custom steps', () => {
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

    it("steppers using various options", () => {
        expect.hasAssertions();

        const baseUrl = "/base/";
        const finishUrl = "/done/";

        const steps = [
            {
                label: 'Step 1',
                path: 'step1',
                next: 'step2',
                content: (
                    <div>
                        <h3>Content of step 1</h3>
                    </div>
                ),
            },
            {
                label: 'Step 2',
                path: 'step2',
                previous: 'step1',
                next: 'step3',
                content: (
                    <div>
                        <h3>Content of step 2</h3>
                    </div>
                ),
            },
            {
                label: 'Step 3',
                path: 'step3',
                previous: 'step2',
                next: 'step3',
                nextDisabled: true,
                content: (
                    <div>
                        <h3>Content of step 3</h3>
                    </div>
                ),
            },
        ];
        act(() => {
            render(
                <Stepper steps={steps} baseUrl={baseUrl} finishUrl={finishUrl}
                    activeStep={0} />,
                container
            );
        });
        let buttons = container.querySelectorAll('a');
        expect(buttons.length).toBe(2);
        expect(buttons[0].classList).toContain("Mui-disabled");
        expect(buttons[1].href).toBe("http://localhost/base/step2");
        expect(buttons[1].classList).not.toContain("Mui-disabled");

        let header = container.querySelector('h3');
        expect(header.innerHTML).toContain("step 1");

        act(() => {
            render(
                <Stepper steps={steps} baseUrl={baseUrl} finishUrl={finishUrl}
                    activeStep={1} />,
                container
            );
        });

        buttons = container.querySelectorAll('a');
        expect(buttons.length).toBe(2);
        expect(buttons[0].classList).not.toContain("Mui-disabled");
        expect(buttons[0].href).toBe("http://localhost/base/step1");
        expect(buttons[1].href).toBe("http://localhost/base/step3");
        expect(buttons[1].classList).not.toContain("Mui-disabled");

        header = container.querySelector('h3');
        expect(header.innerHTML).toContain("step 2");
        act(() => {
            render(
                <Stepper steps={steps} baseUrl={baseUrl} finishUrl={finishUrl}
                    activeStep={2} />,
                container
            );
        });

        buttons = container.querySelectorAll('a');
        expect(buttons.length).toBe(2);

        expect(buttons[0].href).toBe("http://localhost/base/step2");
        expect(buttons[0].classList).not.toContain("Mui-disabled");
        expect(buttons[1].href).toBe("http://localhost/done/");
        expect(buttons[1].classList).toContain("Mui-disabled");

        header = container.querySelector('h3');
        expect(header.innerHTML).toContain("step 3");
    });

});