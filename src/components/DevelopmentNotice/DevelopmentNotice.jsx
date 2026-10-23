import { useEffect, useState } from "react";
import "./DevelopmentNotice.css";

const TERMS_VERSION = "2026-10-23.1";
const TERMS_STORAGE_KEY = "retail-development-terms-version";

function hasAcceptedTerms() {
  try {
    if (window.localStorage.getItem(TERMS_STORAGE_KEY) === TERMS_VERSION) return true;
  } catch {
    // Fall back to per-tab storage if persistent browser storage is unavailable.
  }

  try {
    return window.sessionStorage.getItem(TERMS_STORAGE_KEY) === TERMS_VERSION;
  } catch {
    return false;
  }
}

function saveTermsAcceptance() {
  try {
    window.localStorage.setItem(TERMS_STORAGE_KEY, TERMS_VERSION);
    return;
  } catch {
    // Session storage still survives a page refresh in the current tab.
  }

  try {
    window.sessionStorage.setItem(TERMS_STORAGE_KEY, TERMS_VERSION);
  } catch {
    // Keep the current page usable if the browser blocks all storage.
  }
}

const terms = [
  {
    title: "Development preview only",
    text: "This application is still being built and is provided only for evaluation, demonstration, and development. It is not ready for production or for running a real business.",
  },
  {
    title: "Mock data and simulated actions",
    text: "Information shown here may be fictional, incomplete, inaccurate, or generated for testing. Sales, payments, stock changes, reports, receipts, staff records, and other actions may be simulated. A success message or receipt does not confirm that a real transaction, payment, delivery, or record exists.",
  },
  {
    title: "Do not enter real or sensitive information",
    text: "Use invented test details only. Do not enter real customer, employee, supplier, financial, payment-card, account, health, identity, or other confidential or sensitive information. Do not use this preview to collect or store information about real people.",
  },
  {
    title: "Data may change or disappear",
    text: "Test data may be reset, altered, duplicated, exposed to other testers, or removed at any time without notice. Do not rely on this application as a backup or as the authoritative record of any business activity.",
  },
  {
    title: "No operational or financial reliance",
    text: "Do not use this preview to make business, accounting, tax, inventory, staffing, or financial decisions. Do not use it to process real payments, fulfil real orders, or manage live operations.",
  },
  {
    title: "Availability and support",
    text: "Features may be unfinished, unavailable, or changed without notice. The preview is provided without a promise of uninterrupted access, support, accuracy, security, or fitness for a particular purpose.",
  },
  {
    title: "Responsible access",
    text: "Use the preview lawfully and only as intended for testing. Do not attempt to access another person’s account or data, disrupt the service, bypass access controls, or upload harmful code.",
  },
  {
    title: "Acceptance and updates",
    text: "By selecting “Accept and continue,” you confirm that you have read and agree to these development-preview terms. If you do not agree, do not proceed. These terms may be updated; a new version will ask you to accept again before continuing.",
  },
];

export default function DevelopmentNotice({ children }) {
  const [accepted, setAccepted] = useState(hasAcceptedTerms);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (accepted) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [accepted]);

  function acceptTerms() {
    if (!acknowledged) return;
    saveTermsAcceptance();
    setAccepted(true);
  }

  return (
    <>
      <div inert={!accepted}>{children}</div>
      {!accepted && (
        <div className="dev-notice-backdrop">
          <section
            className="dev-notice"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dev-notice-title"
            aria-describedby="dev-notice-intro"
          >
            <header className="dev-notice-header">
              <span className="dev-notice-badge">Development preview</span>
              <h1 id="dev-notice-title">Please read before continuing</h1>
              <p id="dev-notice-intro">
                This site is not ready for live use. Review these terms before
                accessing the application.
              </p>
            </header>

            <div className="dev-notice-terms">
              {terms.map((term, index) => (
                <section className="dev-notice-term" key={term.title}>
                  <span className="dev-notice-number">{index + 1}</span>
                  <div>
                    <h2>{term.title}</h2>
                    <p>{term.text}</p>
                  </div>
                </section>
              ))}
            </div>

            <footer className="dev-notice-footer">
              <label className="dev-notice-check">
                <input
                  type="checkbox"
                  autoFocus
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                />
                <span>
                  I have read and agree to these development-preview terms.
                </span>
              </label>
              <button
                className="dev-notice-accept"
                type="button"
                disabled={!acknowledged}
                onClick={acceptTerms}
              >
                Accept and continue
              </button>
              <p className="dev-notice-footnote">
                Your acceptance is saved on this device. You will only be asked
                again if these terms change or browser storage is cleared. If
                you do not agree, close this page without proceeding.
              </p>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
