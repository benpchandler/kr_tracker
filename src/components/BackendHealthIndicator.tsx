import { Server, Database, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export type HealthStatus = {
  backend: 'connected' | 'disconnected' | 'checking';
  data: 'loaded' | 'unavailable' | 'loading' | 'mock';
};

interface BackendHealthIndicatorProps {
  status: HealthStatus;
}

export function BackendHealthIndicator({ status }: BackendHealthIndicatorProps) {
  // Determine overall health
  const isHealthy = status.backend === 'connected' && status.data === 'loaded';
  const isMock = status.data === 'mock';
  const isChecking = status.backend === 'checking' || status.data === 'loading';

  // Select appropriate styling
  let bgColor = '#EA4335'; // Default to error
  let icon = <XCircle className="h-3 w-3" />;

  if (isHealthy) {
    bgColor = '#0F9D58';
    icon = <CheckCircle className="h-3 w-3" />;
  } else if (isMock) {
    bgColor = '#B00020';
    icon = <Database className="h-3 w-3" />;
  } else if (isChecking) {
    bgColor = '#F4B400';
    icon = <AlertCircle className="h-3 w-3" />;
  }

  // Build status text
  let backendText = 'Unreachable';
  if (status.backend === 'connected') {
    backendText = 'Connected';
  } else if (status.backend === 'checking') {
    backendText = 'Checking...';
  }

  let dataText = 'Unavailable';
  if (status.data === 'loaded') {
    dataText = 'Loaded';
  } else if (status.data === 'mock') {
    dataText = 'Mock';
  } else if (status.data === 'loading') {
    dataText = 'Loading...';
  }

  return (
    <div className="fixed top-2 right-2 z-50">
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg"
        style={{ background: bgColor, color: 'white' }}
        aria-live="polite"
        aria-label={`Backend: ${backendText}, Data: ${dataText}`}
      >
        {icon}
        <div className="flex items-center gap-1">
          <span className="flex items-center gap-1">
            <Server className="h-3 w-3" />
            {backendText}
          </span>
          <span className="opacity-60">|</span>
          <span className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            {dataText}
          </span>
        </div>
      </div>
    </div>
  );
}