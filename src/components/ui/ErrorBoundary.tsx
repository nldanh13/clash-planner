import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Catch error internally to prevent unhandled error event from bubbling to parent window
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-slate-900/90 border border-red-500/30 rounded-xl m-4 text-slate-200">
          <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
          <h3 className="text-base font-bold text-amber-200 mb-1">
            {this.props.fallbackTitle || "Đã xảy ra lỗi khi hiển thị sa bàn"}
          </h3>
          <p className="text-xs text-slate-400 mb-4 max-w-md">
            {this.props.fallbackMessage || "Hệ thống đã cách ly lỗi để tránh gián đoạn trải nghiệm. Bạn có thể khôi phục lại góc nhìn."}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Khôi phục góc nhìn</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
