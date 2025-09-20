import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Separator } from "./ui/separator";
import { cn } from "./ui/utils";

interface CascadeItem {
  label: string;
  description?: string;
  count?: number;
}

interface DeleteConfirmationDialogProps {
  open: boolean;
  title: string;
  description?: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  confirmLabel?: string;
  cancelLabel?: string;
  cascadeItems?: CascadeItem[];
  additionalNotes?: string;
}

export function DeleteConfirmationDialog({
  open,
  title,
  description,
  onConfirm,
  onOpenChange,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  cascadeItems = [],
  additionalNotes,
}: DeleteConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="space-y-4">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-destructive/10 p-2 text-destructive">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              {(description || cascadeItems.length > 0) && (
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    {description && <p>{description}</p>}
                    {cascadeItems.length > 0 && (
                      <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                        <p className="font-medium text-destructive">This action will also affect:</p>
                        <ul className="mt-2 space-y-1 text-destructive">
                          {cascadeItems.map((item, index) => (
                            <li key={`${item.label}-${index}`} className="flex items-start gap-2">
                              <span className={cn("font-semibold", item.count === 0 && "opacity-70")}>{typeof item.count === 'number' ? item.count : '•'}</span>
                              <span>
                                <span className="font-medium">{item.label}</span>
                                {item.description && <span className="ml-1 text-destructive/80">{item.description}</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {additionalNotes && <p className="text-muted-foreground">{additionalNotes}</p>}
                  </div>
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>
        <Separator className="bg-destructive/10" />
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
