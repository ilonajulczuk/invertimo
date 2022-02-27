import React from 'react';
import ReactDOM from "react-dom";
import App from './App';
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

const SENTRY_DSN = "https://f1329c993cec4d80b89e4698b7c8c715@o432350.ingest.sentry.io/6234379";

if (process.env.PRODUCTION) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [new BrowserTracing()],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
  });
}


ReactDOM.render(
  <App />,
  document.getElementById('root')
);