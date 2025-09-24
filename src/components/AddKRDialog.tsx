import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Team, Pod } from "../types";

interface AddKRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddKR: (kr: any) => void;
  teams: Team[];
  pods: Pod[];
}

type FormState = {
  title: string;
  description: string;
  target: string;
  current: string;
  deadline: string;
  owner: string;
  pod: string;
  status: "not-started" | "on-track" | "at-risk" | "off-track" | "completed";
};

const createInitialFormState = (): FormState => ({
  title: "",
  description: "",
  target: "",
  current: "",
  deadline: "",
  owner: "",
  pod: "",
  status: "on-track",
});

export function AddKRDialog({ open, onOpenChange, onAddKR, teams: _teams, pods }: AddKRDialogProps) {
  const [formData, setFormData] = useState<FormState>(() => createInitialFormState());
  const formRef = useRef<HTMLFormElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open && titleInputRef.current) {
      titleInputRef.current.focus({ preventScroll: true });
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setFormData(createInitialFormState());
      formRef.current?.reset();
    }
  }, [open]);

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handlePodChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, pod: value }));
  }, []);

  const handleDeadlineChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, deadline: value }));
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, status: value as FormState["status"] }));
  }, []);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const currentValue = parseFloat(formData.current);
    const targetValue = parseFloat(formData.target);
    const newKR = {
      id: Date.now().toString(),
      ...formData,
      progress:
        Number.isFinite(currentValue) && Number.isFinite(targetValue) && targetValue !== 0
          ? Math.round((currentValue / targetValue) * 100)
          : 0,
    };

    onAddKR(newKR);
    onOpenChange(false);
  }, [formData, onAddKR, onOpenChange]);

  return (
    <Dialog modal open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleInputRef.current?.focus({ preventScroll: true });
        }}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Add New Key Result</DialogTitle>
          <DialogDescription>
            Create a new key result to track progress towards your objectives.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter KR title"
              autoFocus
              ref={titleInputRef}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the key result"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current">Starting Value</Label>
              <Input
                id="current"
                name="current"
                value={formData.current}
                onChange={handleInputChange}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Target Value</Label>
              <Input
                id="target"
                name="target"
                value={formData.target}
                onChange={handleInputChange}
                placeholder="100"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Input
                id="owner"
                name="owner"
                value={formData.owner}
                onChange={handleInputChange}
                placeholder="Team member name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pod">Pod</Label>
              <Select value={formData.pod} onValueChange={handlePodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pod" />
                </SelectTrigger>
                <SelectContent>
                  {pods.map((pod) => (
                    <SelectItem key={pod.id} value={pod.name}>
                      {pod.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline (Quarter/Year)</Label>
              <Select value={formData.deadline} onValueChange={handleDeadlineChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1 2024">Q1 2024</SelectItem>
                  <SelectItem value="Q2 2024">Q2 2024</SelectItem>
                  <SelectItem value="Q3 2024">Q3 2024</SelectItem>
                  <SelectItem value="Q4 2024">Q4 2024</SelectItem>
                  <SelectItem value="Q1 2025">Q1 2025</SelectItem>
                  <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                  <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                  <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Starting Status</Label>
              <Select value={formData.status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-started">Not Started</SelectItem>
                  <SelectItem value="on-track">On Track</SelectItem>
                  <SelectItem value="at-risk">At Risk</SelectItem>
                  <SelectItem value="off-track">Off Track</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add KR
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
