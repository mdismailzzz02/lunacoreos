import React from "react";

export class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{padding: "20px", color: "red", background: "black", height: "100vh", width: "100vw", zIndex: 99999, position: "fixed", top: 0, left: 0}}>
                    <h1>FATAL ERROR</h1>
                    <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '1.2rem'}}>{this.state.error?.stack || this.state.error?.message}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}
