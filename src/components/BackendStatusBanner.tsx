import { AlertCircle, RefreshCw, AlertTriangle, Database } from "lucide-react";
import { Button } from "./ui/button";

export type BackendStatus =
  | { type: 'connected'; dataLoaded: true }
  | { type: 'connected'; dataLoaded: false; error?: string }
  | { type: 'disconnected'; error?: string }
  | { type: 'mock'; reason: 'explicit' | 'fallback' };

interface BackendStatusBannerProps {
  status: BackendStatus;
  onRetry?: () => void;
  onToggleMock?: () => void;
  isDevMode?: boolean;
  allowMockFallback?: boolean;
}

export function BackendStatusBanner({
  status,
  onRetry,
  onToggleMock,
  isDevMode = false,
  allowMockFallback = false
}: BackendStatusBannerProps) {
  // Mock mode banner - always visible when using mock data
  if (status.type === 'mock') {
    return (
      <div
        className="w-full sticky top-0 z-50 py-2 px-4"
        style={{ background: '#B00020', color: 'white' }}
        role="alert"
        aria-live="polite"
      >
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="font-semibold">
              Mock Data Mode {status.reason === 'fallback' ? '(Fallback)' : '(Active)'}
            </span>
            <span className="text-sm opacity-90">
              — Not connected to live backend
            </span>
          </div>
          {isDevMode && allowMockFallback && onToggleMock && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onToggleMock}
              className="bg-white/20 hover:bg-white/30 text-white border-white/40"
            >
              Switch to Backend
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Backend disconnected error
  if (status.type === 'disconnected') {
    return (
      <div
        className="w-full sticky top-0 z-50 py-3 px-4"
        style={{ background: '#F4B400', color: '#1F2937' }}
        role="alert"
        aria-live="assertive"
      >
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Backend Unreachable</div>
                <div className="text-sm opacity-90">
                  {status.error || 'Failed to connect to API server. Check if the server is running on port 3001.'}
                </div>
              </div>
            </div>
            {onRetry && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Backend connected but data failed to load
  if (status.type === 'connected' && !status.dataLoaded) {
    return (
      <div
        className="w-full sticky top-0 z-50 py-3 px-4"
        style={{ background: '#EA4335', color: 'white' }}
        role="alert"
        aria-live="assertive"
      >
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Backend Data Failed to Load</div>
                <div className="text-sm opacity-90">
                  {status.error || 'The API server is running but data could not be retrieved. Check server logs.'}
                </div>
              </div>
            </div>
            {onRetry && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onRetry}
                className="bg-white/20 hover:bg-white/30 text-white border-white/40 flex items-center gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No banner when everything is working
  return null;
}