import { Card } from "./ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Building2, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Team, Pod, Person } from "../types";

interface OrganizationManagerProps {
  teams: Team[];
  pods: Pod[];
  people: Person[];
  onTeamsChange: (teams: Team[]) => void;
  onPodsChange: (pods: Pod[]) => void;
  onPeopleChange: (people: Person[]) => void;
}

export function OrganizationManager({
  teams,
  pods,
  people,
  onTeamsChange,
  onPodsChange,
  onPeopleChange
}: OrganizationManagerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
            <div className="flex items-center gap-3">
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-base font-medium leading-none">Organization Structure</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isOpen
                      ? "Manage your teams, pods, and people"
                      : `${teams.length} teams, ${pods.length} pods, ${people.filter(p => p.active).length} people`
                    }
                  </p>
                </div>
              </div>
            </div>
            {!isOpen && (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="secondary">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Team
                </Button>
                <Button size="sm" variant="secondary">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Pod
                </Button>
                <Button size="sm" variant="secondary">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Person
                </Button>
              </div>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-4 pb-4">
          <div className="space-y-4 mt-4">
            {/* Organization management UI would go here */}
            <div className="text-muted-foreground text-sm">
              Organization structure management interface coming soon...
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

import React from "react";