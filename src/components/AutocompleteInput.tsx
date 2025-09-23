import { createPortal } from "react-dom";
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  emptyStateMessage?: string;
  emptyStateAction?: {
    label: string;
    onAction: (value: string) => void;
    icon?: ReactNode;
  };
  minimalMode?: boolean; // Enable minimal tab-complete style
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
  emptyStateMessage,
  emptyStateAction,
  minimalMode = false,
}: AutocompleteInputProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hideTimeout = useRef<number>();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const MAX_SUGGESTIONS = 5;

  const groupedSuggestions = useMemo(() => {
    const groups = new Map<string, AutocompleteSuggestion<T>[]>();

    suggestions.slice(0, MAX_SUGGESTIONS).forEach((suggestion) => {
      const key = suggestion.group ?? "__default";
      const bucket = groups.get(key) ?? [];
      bucket.push(suggestion);
      groups.set(key, bucket);
    });

    return groups;
  }, [suggestions]);

  // Close dropdown on outside click (capture phase) to avoid overlays blocking other controls
  useEffect(() => {
    const handlePointerDownCapture = (event: PointerEvent) => {
      if (!isOpen) return;
      const container = containerRef.current;
      if (!container) return;
      const target = event.target as Node | null;
      if (target && !container.contains(target) && !(dropdownRef.current && dropdownRef.current.contains(target))) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDownCapture, true);
    return () => document.removeEventListener("pointerdown", handlePointerDownCapture, true);
  }, [isOpen]);

  const updateDropdownPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") {
      return;
    }

    const rect = container.getBoundingClientRect();
    const GAP_PX = 8; // Equivalent to Tailwind's mt-2 spacing

    setDropdownPosition({
      top: rect.bottom + GAP_PX,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }

    updateDropdownPosition();

    const handleWindowChange = () => updateDropdownPosition();
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      observer = new ResizeObserver(() => updateDropdownPosition());
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [isOpen, updateDropdownPosition, suggestions.length, value]);

  // Also close on window blur (e.g., switching tabs)
  useEffect(() => {
    const onWindowBlur = () => setIsOpen(false);
    window.addEventListener("blur", onWindowBlur);
    return () => window.removeEventListener("blur", onWindowBlur);
  }, []);

  useEffect(() => {
    if (minimalMode) {
      // In minimal mode, be more conservative about showing dropdown
      const hasQuery = value.trim().length > 0;
      const hasExactMatch = suggestions.some(s =>
        s.value.toLowerCase() === value.toLowerCase() ||
        s.label.toLowerCase() === value.toLowerCase()
      );

      // Only show if there's a query, no exact match, and either suggestions or an action
      if (hasQuery && !hasExactMatch && (suggestions.length > 0 || emptyStateAction)) {
        setIsOpen(true);
        setHighlightedIndex(suggestions.length > 0 ? 0 : -1);
      } else {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    } else {
      // Original behavior for non-minimal mode
      if (suggestions.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
        return;
      }

      const hasQuery = value.trim().length > 0;
      if (emptyStateMessage && hasQuery) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
      setHighlightedIndex(-1);
    }
  }, [emptyStateMessage, suggestions, value, minimalMode, emptyStateAction]);

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
    // In minimal mode, Tab accepts the first suggestion
    if (minimalMode && event.key === "Tab" && suggestions.length > 0 && value.trim()) {
      event.preventDefault();
      const firstSuggestion = suggestions[0];
      if (firstSuggestion) {
        handleSelect(0, firstSuggestion);
      }
      return;
    }

    if (!isOpen) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const flattened = suggestions.slice(0, MAX_SUGGESTIONS);
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
          "flex cursor-pointer select-none items-start justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          isHighlighted ? "bg-muted text-foreground" : "hover:bg-muted"
        )}
        onMouseDown={(event) => {
          event.preventDefault();
          handleSelect(index, suggestion);
        }}
        onMouseEnter={() => setHighlightedIndex(index)}
      >
        <div className="flex min-w-0 items-start gap-3">
          {suggestion.icon && <span className="mt-0.5 text-muted-foreground">{suggestion.icon}</span>}
          <div className="min-w-0 space-y-1">
            <p className="truncate font-medium leading-5">{suggestion.label}</p>
            {suggestion.description && (
              <p className="truncate text-xs text-muted-foreground leading-4">{suggestion.description}</p>
            )}
            {suggestion.meta && suggestion.meta.length > 0 && (
              <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                {suggestion.meta.map((item, metaIndex) => (
                  <span key={`${suggestion.id}-meta-${metaIndex}`} className="truncate">
                    {item}
                  </span>
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
        const BLUR_DELAY_MS = 150;
        hideTimeout.current = window.setTimeout(() => {
          setIsOpen(false);
        }, BLUR_DELAY_MS);
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
          if (!minimalMode && suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
      />

      {isOpen && (suggestions.length > 0 || (emptyStateMessage && value.trim().length > 0)) && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="z-[60] pointer-events-auto rounded-md border bg-popover shadow-lg"
            style={{
              position: "fixed",
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              visibility: dropdownPosition.width > 0 ? "visible" : "hidden",
            }}
          >
            {suggestions.length > 0 ? (
              <ul className="divide-y divide-border max-h-60 overflow-auto p-2">
                {Array.from(groupedSuggestions.entries()).map(([group, items]) => {
                  const displayGroup = group !== "__default";

                  return (
                    <li key={group}>
                      {displayGroup && (
                        <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {group}
                        </p>
                      )}
                      <ul className="divide-y divide-border">
                        {items.map((suggestion) => {
                          const index = suggestions.findIndex((item) => item.id === suggestion.id);
                          return renderSuggestion(suggestion, index);
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <>
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {emptyStateMessage}
                </div>
                {emptyStateAction && (
                  <div className="border-t px-2 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-primary hover:bg-muted"
                      onClick={(event) => {
                        event.preventDefault();
                        emptyStateAction.onAction(value.trim());
                        setIsOpen(false);
                      }}
                    >
                      {emptyStateAction.icon && <span className="text-primary">{emptyStateAction.icon}</span>}
                      <span>{emptyStateAction.label}</span>
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>,
          document.body
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
