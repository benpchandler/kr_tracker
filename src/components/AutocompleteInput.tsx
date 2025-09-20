import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { AlertCircle, Info, Lightbulb } from "lucide-react";

export interface AutocompleteSuggestion<T = unknown> {
  id: string;
  value: string;
  label: string;
  description?: string;
  badgeColor?: string;
  badgeText?: string;
  icon?: ReactNode;
  meta?: string[];
  group?: string;
  data?: T;
}

export interface AutocompleteValidationState<T = unknown> {
  isDuplicate: boolean;
  similarEntities: T[];
  message?: string;
  tone?: "error" | "warning" | "info";
  actionLabel?: string;
  onAction?: () => void;
}

interface AutocompleteInputProps<T> {
  value: string;
  suggestions: AutocompleteSuggestion<T>[];
  onChange: (value: string) => void;
  onSelect?: (suggestion: AutocompleteSuggestion<T>) => void;
  validationState?: AutocompleteValidationState<T>;
  placeholder?: string;
  disabled?: boolean;
  inputId?: string;
  ariaLabel?: string;
  inputType?: string;
  onSubmit?: (value: string) => void;
}

export function AutocompleteInput<T>({
  value,
  suggestions,
  onChange,
  onSelect,
  validationState,
  placeholder,
  disabled,
  inputId,
  ariaLabel,
  inputType,
  onSubmit,
}: AutocompleteInputProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hideTimeout = useRef<number>();

  const groupedSuggestions = useMemo(() => {
    const groups = new Map<string, AutocompleteSuggestion<T>[]>();

    suggestions.slice(0, 5).forEach((suggestion) => {
      const key = suggestion.group ?? "__default";
      const bucket = groups.get(key) ?? [];
      bucket.push(suggestion);
      groups.set(key, bucket);
    });

    return groups;
  }, [suggestions]);

  useEffect(() => {
    if (suggestions.length > 0) {
      setIsOpen(true);
      setHighlightedIndex(0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [suggestions]);

  useEffect(() => () => {
    if (hideTimeout.current) {
      window.clearTimeout(hideTimeout.current);
    }
  }, []);

  const handleSelect = (index: number, suggestion: AutocompleteSuggestion<T>) => {
    if (onSelect) {
      onSelect(suggestion);
    } else {
      onChange(suggestion.value);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const flattened = suggestions.slice(0, 5);
      if (!flattened.length) {
        return;
      }

      setHighlightedIndex((current) => {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = current + direction;

        if (nextIndex < 0) {
          return flattened.length - 1;
        }

        if (nextIndex >= flattened.length) {
          return 0;
        }

        return nextIndex;
      });
    }

    if (event.key === "Enter") {
      if (highlightedIndex >= 0) {
        event.preventDefault();
        const selected = suggestions[highlightedIndex];
        if (selected) {
          handleSelect(highlightedIndex, selected);
        }
        return;
      }

      if (onSubmit) {
        event.preventDefault();
        onSubmit(value);
        setIsOpen(false);
      }
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  const tone = validationState?.tone ?? (validationState?.isDuplicate ? "error" : validationState?.message ? "warning" : undefined);

  const toneStyles: Record<"error" | "warning" | "info", string> = {
    error: "text-destructive",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-primary",
  };

  const toneIcon: Record<"error" | "warning" | "info", ReactNode> = {
    error: <AlertCircle className="h-4 w-4" />, 
    warning: <Lightbulb className="h-4 w-4" />, 
    info: <Info className="h-4 w-4" />,
  };

  const renderSuggestion = (suggestion: AutocompleteSuggestion<T>, index: number) => {
    const isHighlighted = index === highlightedIndex;

    return (
      <li
        key={suggestion.id}
        className={cn(
          "flex cursor-pointer select-none items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          isHighlighted ? "bg-muted text-foreground" : "hover:bg-muted"
        )}
        onMouseDown={(event) => {
          event.preventDefault();
          handleSelect(index, suggestion);
        }}
        onMouseEnter={() => setHighlightedIndex(index)}
      >
        <div className="flex min-w-0 items-center gap-3">
          {suggestion.icon && <span className="text-muted-foreground">{suggestion.icon}</span>}
          <div className="min-w-0">
            <p className="truncate font-medium">{suggestion.label}</p>
            {suggestion.description && (
              <p className="truncate text-xs text-muted-foreground">{suggestion.description}</p>
            )}
            {suggestion.meta && suggestion.meta.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-2">
                {suggestion.meta.map((item, metaIndex) => (
                  <Badge key={`${suggestion.id}-meta-${metaIndex}`} variant="outline" className="bg-muted/50 text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        {suggestion.badgeText && (
          <Badge
            variant="secondary"
            className={cn("text-xs", suggestion.badgeColor ? "text-white" : undefined)}
            style={suggestion.badgeColor ? { backgroundColor: suggestion.badgeColor } : undefined}
          >
            {suggestion.badgeText}
          </Badge>
        )}
      </li>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onFocus={() => {
        if (hideTimeout.current) {
          window.clearTimeout(hideTimeout.current);
        }
      }}
      onBlur={() => {
        hideTimeout.current = window.setTimeout(() => {
          setIsOpen(false);
        }, 150);
      }}
    >
      <Input
        id={inputId}
        aria-label={ariaLabel}
        type={inputType ?? 'text'}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
      />

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-20 mt-2 w-full rounded-md border bg-popover p-2 shadow-lg">
          <ul className="space-y-1">
            {Array.from(groupedSuggestions.entries()).map(([group, items]) => {
              const displayGroup = group !== "__default";

              return (
                <li key={group} className="space-y-1">
                  {displayGroup && (
                    <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group}
                    </p>
                  )}
                  <ul className="space-y-1">
                    {items.map((suggestion) => {
                      const index = suggestions.findIndex((item) => item.id === suggestion.id);
                      return renderSuggestion(suggestion, index);
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tone && validationState?.message && (
        <div className={cn("mt-2 flex items-center gap-2 text-sm", toneStyles[tone])}>
          {toneIcon[tone]}
          <span className="truncate">{validationState.message}</span>
          {validationState.actionLabel && validationState.onAction && (
            <Button
              type="button"
              variant="link"
              className="text-inherit h-auto p-0"
              onClick={(event) => {
                event.preventDefault();
                validationState.onAction?.();
              }}
            >
              {validationState.actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
