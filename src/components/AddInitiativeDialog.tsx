import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { X } from "lucide-react";
import { Team } from "../types";

interface AddInitiativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddInitiative: (initiative: any) => void;
  teams: Team[];
}

const createInitialFormState = () => ({
  title: '',
  description: '',
  priority: 'medium' as const,
  expectedImpact: 'medium' as string,
  status: 'planning' as const,
  team: '',
  owner: '',
  deadline: '',
  sizingUrl: '',
  contributors: [] as string[],
  tags: [] as string[]
});

export function AddInitiativeDialog({ open, onOpenChange, onAddInitiative, teams }: AddInitiativeDialogProps) {
  const [formData, setFormData] = useState(createInitialFormState);
  const [newContributor, setNewContributor] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (!open) {
      setFormData(createInitialFormState());
      setNewContributor('');
      setNewTag('');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newInitiative = {
      id: Date.now().toString(),
      ...formData
    };
    
    onAddInitiative(newInitiative);
    onOpenChange(false);
  };

  const addContributor = () => {
    if (newContributor.trim() && !formData.contributors.includes(newContributor.trim())) {
      setFormData(prev => ({
        ...prev,
        contributors: [...prev.contributors, newContributor.trim()]
      }));
      setNewContributor('');
    }
  };

  const removeContributor = (contributor: string) => {
    setFormData(prev => ({
      ...prev,
      contributors: prev.contributors.filter(c => c !== contributor)
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Initiative</DialogTitle>
          <DialogDescription>
            Create a new strategic initiative to drive your team's objectives forward.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter initiative title"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the initiative"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expectedImpact">Expected Impact (%)</Label>
              <div className="relative">
                <Input
                  id="expectedImpact"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.expectedImpact}
                  onChange={(e) => setFormData(prev => ({ ...prev, expectedImpact: e.target.value }))}
                  placeholder="e.g. 15.5"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
              <p className="text-xs text-muted-foreground">Enter the expected impact as a percentage (0-100)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="sizingUrl">Sizing Model URL</Label>
            <Input
              id="sizingUrl"
              type="url"
              value={formData.sizingUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, sizingUrl: e.target.value }))}
              placeholder="https://docs.google.com/spreadsheets/... (optional)"
            />
            <p className="text-xs text-muted-foreground">
              Link to your impact model, business case, or sizing spreadsheet
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Input
                id="owner"
                value={formData.owner}
                onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                placeholder="Initiative owner"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team">Team</Label>
              <Select value={formData.team} onValueChange={(value) => setFormData(prev => ({ ...prev, team: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.name}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Contributors</Label>
            <div className="flex gap-2">
              <Input
                value={newContributor}
                onChange={(e) => setNewContributor(e.target.value)}
                placeholder="Add contributor"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addContributor())}
              />
              <Button type="button" onClick={addContributor} size="sm">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.contributors.map((contributor) => (
                <Badge key={contributor} variant="secondary" className="flex items-center gap-1">
                  {contributor}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeContributor(contributor)} />
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} size="sm">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="flex items-center gap-1">
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Initiative
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
