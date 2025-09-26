import { Button } from "./ui/button";
import { Database, Server } from "lucide-react";

interface DevModeToggleProps {
  isUsingMock: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function DevModeToggle({ isUsingMock, onToggle, disabled = false }: DevModeToggleProps) {
  // Only show in development mode when mock fallback is allowed
  if (!import.meta.env.DEV || import.meta.env.VITE_ALLOW_MOCK_FALLBACK !== 'true') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Button
        onClick={onToggle}
        disabled={disabled}
        variant="outline"
        size="sm"
        className={`flex items-center gap-2 shadow-lg ${
          isUsingMock
            ? 'bg-red-50 border-red-300 hover:bg-red-100'
            : 'bg-green-50 border-green-300 hover:bg-green-100'
        }`}
      >
        {isUsingMock ? (
          <>
            <Database className="h-4 w-4 text-red-600" />
            <span className="text-red-700">Mock Data</span>
          </>
        ) : (
          <>
            <Server className="h-4 w-4 text-green-600" />
            <span className="text-green-700">Live Backend</span>
          </>
        )}
      </Button>
    </div>
  );
}