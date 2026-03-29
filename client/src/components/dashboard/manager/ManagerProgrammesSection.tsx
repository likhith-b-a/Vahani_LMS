import { type ChangeEvent } from "react";
import { type ManagedProgrammeSummary } from "@/api/programmeManager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ManagerProgrammesSectionProps {
  programmeSearch: string;
  onProgrammeSearchChange: (value: string) => void;
  programmeDateFrom: string;
  onProgrammeDateFromChange: (value: string) => void;
  programmeDateTo: string;
  onProgrammeDateToChange: (value: string) => void;
  filteredProgrammes: ManagedProgrammeSummary[];
  onOpenProgramme: (programmeId: string) => void;
  formatDate: (value?: string | null) => string;
}

export function ManagerProgrammesSection({
  programmeSearch,
  onProgrammeSearchChange,
  programmeDateFrom,
  onProgrammeDateFromChange,
  programmeDateTo,
  onProgrammeDateToChange,
  filteredProgrammes,
  onOpenProgramme,
  formatDate,
}: ManagerProgrammesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Programmes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <Input
            value={programmeSearch}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onProgrammeSearchChange(event.target.value)
            }
            placeholder="Search programmes by title or description"
          />
          <Input
            type="date"
            value={programmeDateFrom}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onProgrammeDateFromChange(event.target.value)
            }
          />
          <Input
            type="date"
            value={programmeDateTo}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onProgrammeDateToChange(event.target.value)
            }
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredProgrammes.map((programme) => (
            <button
              key={programme.id}
              type="button"
              onClick={() => onOpenProgramme(programme.id)}
              className="rounded-2xl border border-border p-5 text-left transition hover:border-vahani-blue/40 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{programme.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {programme.description || "No description added yet."}
                  </p>
                </div>
                <Badge variant="secondary">{programme.scholarsCount} scholars</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{programme.assignmentsCount} assignments</span>
                <span>{programme.resourcesCount || 0} resources</span>
                <span>{programme.meetingsCount || 0} meetings</span>
                <span>Created {formatDate(programme.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
