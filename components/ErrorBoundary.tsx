
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

// Making children optional to resolve "Property 'children' is missing" errors in JSX usage
interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary catches runtime errors in the React component tree.
 * Explicit state declaration ensures properties are recognized 
 * by the TypeScript compiler even if the base class definition is not immediately inferred.
 */
export class ErrorBoundary extends Component<Props, State> {
  // Explicitly defining props property to resolve "Property 'props' does not exist" errors
  // while maintaining the generic context from React.Component.
  props: Props;

  // Explicitly defining state property to resolve "Property 'state' does not exist" errors
  // This property initializer is the modern way to set up state in class components.
  state: State = {
    hasError: false,
    error: null,
  };

  // Constructor is needed to initialize the explicit props property in this environment
  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  render(): ReactNode {
    // Destructure state and props to resolve errors where 'state' and 'props' were not recognized as properties of ErrorBoundary
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-ui-bg dark:bg-ui-dark-0 p-4">
          <div className="max-w-md w-full bg-ui-panel dark:bg-ui-dark-1 rounded-2xl shadow-xl p-8 text-center border border-ui-border dark:border-ui-dark-3">
            <div className="w-16 h-16 bg-brand-error/10 text-brand-error rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-primary-87 mb-2">System Interruption</h1>
            <p className="text-secondary-60 mb-6 text-sm">
              We encountered an unexpected error. Please reload the application to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-brand-primary hover:opacity-90 text-white font-semibold rounded-xl transition-colors w-full shadow-lg shadow-brand-primary/20"
            >
              Reload Application
            </button>
            {error && (
               <div className="mt-6 p-4 bg-ui-bg dark:bg-ui-dark-2 rounded-lg text-left overflow-auto max-h-32 border border-ui-border dark:border-ui-dark-3">
                 <code className="text-xs text-tertiary-38 font-mono break-all">
                   {error.toString()}
                 </code>
               </div>
            )}
          </div>
        </div>
      );
    }

    /**
     * Return children from props.
     */
    return children;
  }
}
