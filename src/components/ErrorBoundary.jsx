import { Component } from "react";
import "./ErrorBoundary.css";

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("A page failed to render.", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-page" role="alert">
          <section className="app-error-card">
            <span className="app-error-icon" aria-hidden="true">!</span>
            <h1>This page ran into a problem</h1>
            <p>Your data is still safe. Try loading the page again, or reload the app if the problem continues.</p>
            <div className="app-error-actions">
              <button type="button" onClick={() => this.setState({ hasError: false })}>
                Try again
              </button>
              <button type="button" className="app-error-secondary" onClick={() => window.location.reload()}>
                Reload app
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
