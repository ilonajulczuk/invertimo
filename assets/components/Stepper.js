import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import MuiStepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';

import PropTypes from 'prop-types';


const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%',
        '& .MuiStepper-root': {
            paddingLeft: "0px",
        },
        '& .MuiStep-root:first-child': {
            paddingLeft: "0px",
        },
    },
    button: {
        marginRight: theme.spacing(1),
    },
    instructions: {
        marginTop: theme.spacing(2),
        marginBottom: theme.spacing(2),
    },
}));


export function Stepper(props) {
    const classes = useStyles();
    const steps = props.steps;

    let activeStep = props.activeStep;

    const getStepContent = stepNumber => {
        return steps[stepNumber].content;
    };

    const lastStep = activeStep === steps.length - 1;

    return (
        <div className={classes.root}>
            <MuiStepper activeStep={activeStep}>
                {steps.map(step => {
                    const stepProps = {};
                    const labelProps = {};
                    return (
                        <Step key={step.label} {...stepProps}>
                            <StepLabel {...labelProps}>{step.label}</StepLabel>
                        </Step>
                    );
                })}
            </MuiStepper>
            <div>
                {activeStep === steps.length ? (
                    <div>
                        <Typography className={classes.instructions}>
                            All steps completed - you&apos;re finished
              </Typography>
                    </div>
                ) : (
                    <div>
                        <div className={classes.instructions}>
                            {getStepContent(activeStep)}
                        </div>
                        <div>
                            <Button disabled={activeStep === 0} className={classes.button} variant="outlined"
                                href={props.baseUrl + props.steps[activeStep].previous}
                            >
                                Back
                            </Button>

                            <Button
                                variant="contained"
                                color="primary"
                                className={classes.button}
                                disabled={props.steps[activeStep].nextDisabled}
                                href={lastStep ? props.finishUrl : props.baseUrl + props.steps[activeStep].next}
                            >
                                {lastStep ? 'Finish' : 'Next'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

Stepper.propTypes = {
    steps: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        content: PropTypes.any.isRequired,
        nextDisabled: PropTypes.bool,
        next: PropTypes.string,
        previous: PropTypes.string,
    })),
    baseUrl: PropTypes.string.isRequired,
    finishUrl: PropTypes.string.isRequired,
    activeStep: PropTypes.number.isRequired,
};