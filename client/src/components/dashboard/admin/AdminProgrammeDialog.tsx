import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { type AdminProgramme, type AdminProgrammePayload, type AdminUser } from "@/api/admin";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { matchesSelfEnrollmentScholarRules } from "@/lib/selfEnrollmentEligibility";

interface AdminProgrammeFormState {
  title: string;
  description: string;
  credits: string;
  programmeManagerId: string;
  selfEnrollmentEnabled: boolean;
  selfEnrollmentSeatLimit: string;
  selfEnrollmentOpensAt: string;
  selfEnrollmentClosesAt: string;
  selfEnrollmentAllowedBatches: string[];
  selfEnrollmentAllowedGenders: string[];
  spotlightTitle: string;
  spotlightMessage: string;
}

const emptyProgrammeForm: AdminProgrammeFormState = {
  title: "",
  description: "",
  credits: "",
  programmeManagerId: "",
  selfEnrollmentEnabled: false,
  selfEnrollmentSeatLimit: "",
  selfEnrollmentOpensAt: "",
  selfEnrollmentClosesAt: "",
  selfEnrollmentAllowedBatches: [],
  selfEnrollmentAllowedGenders: [],
  spotlightTitle: "",
  spotlightMessage: "",
};

const programmeToFormState = (programme: AdminProgramme): AdminProgrammeFormState => ({
  title: programme.title,
  description: programme.description || "",
  credits:
    programme.credits !== null && programme.credits !== undefined ? String(programme.credits) : "",
  programmeManagerId: programme.programmeManagerId || "",
  selfEnrollmentEnabled: programme.selfEnrollmentEnabled,
  selfEnrollmentSeatLimit:
    programme.selfEnrollmentSeatLimit !== null && programme.selfEnrollmentSeatLimit !== undefined
      ? String(programme.selfEnrollmentSeatLimit)
      : "",
  selfEnrollmentOpensAt: programme.selfEnrollmentOpensAt
    ? String(programme.selfEnrollmentOpensAt).slice(0, 16)
    : "",
  selfEnrollmentClosesAt: programme.selfEnrollmentClosesAt
    ? String(programme.selfEnrollmentClosesAt).slice(0, 16)
    : "",
  selfEnrollmentAllowedBatches: programme.selfEnrollmentAllowedBatches || [],
  selfEnrollmentAllowedGenders: programme.selfEnrollmentAllowedGenders || [],
  spotlightTitle: programme.spotlightTitle || "",
  spotlightMessage: programme.spotlightMessage || "",
});

interface AdminProgrammeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProgramme: AdminProgramme | null;
  programmeManagers: AdminUser[];
  scholars: AdminUser[];
  scholarBatches: string[];
  scholarGenders: string[];
  onSubmit: (
    payload: AdminProgrammePayload,
    scholarIds: string[],
    editingProgrammeId: string | null,
  ) => void;
}

export function AdminProgrammeDialog({
  open,
  onOpenChange,
  editingProgramme,
  programmeManagers,
  scholars,
  scholarBatches,
  scholarGenders,
  onSubmit,
}: AdminProgrammeDialogProps) {
  const { toast } = useToast();
  const [programmeForm, setProgrammeForm] = useState<AdminProgrammeFormState>(emptyProgrammeForm);
  const [programmeDialogBatchFilter, setProgrammeDialogBatchFilter] = useState("all");
  const [programmeDialogScholarIds, setProgrammeDialogScholarIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setProgrammeForm(editingProgramme ? programmeToFormState(editingProgramme) : emptyProgrammeForm);
      setProgrammeDialogBatchFilter("all");
      setProgrammeDialogScholarIds([]);
    }
  }, [open, editingProgramme]);

  const filteredProgrammeDialogScholars = useMemo(
    () =>
      scholars.filter((scholar) => {
        const matchesBatchFilter =
          programmeDialogBatchFilter === "all" || scholar.batch === programmeDialogBatchFilter;

        const matchesEligibility = matchesSelfEnrollmentScholarRules(scholar, {
          enabled: programmeForm.selfEnrollmentEnabled,
          allowedBatches: programmeForm.selfEnrollmentAllowedBatches,
          allowedGenders: programmeForm.selfEnrollmentAllowedGenders,
        });

        return matchesBatchFilter && matchesEligibility;
      }),
    [
      programmeDialogBatchFilter,
      programmeForm.selfEnrollmentAllowedBatches,
      programmeForm.selfEnrollmentAllowedGenders,
      programmeForm.selfEnrollmentEnabled,
      scholars,
    ],
  );

  const handleSubmit = () => {
    if (!programmeForm.title.trim()) {
      toast({
        title: "Programme title required",
        description: "Add a title before saving the programme.",
        variant: "destructive",
      });
      return;
    }

    const payload: AdminProgrammePayload = {
      title: programmeForm.title.trim(),
      description: programmeForm.description.trim(),
      credits: programmeForm.credits !== "" ? Number(programmeForm.credits) : null,
      programmeManagerId: programmeForm.programmeManagerId,
      selfEnrollmentEnabled: programmeForm.selfEnrollmentEnabled,
      selfEnrollmentSeatLimit:
        programmeForm.selfEnrollmentSeatLimit !== ""
          ? Number(programmeForm.selfEnrollmentSeatLimit)
          : null,
      selfEnrollmentOpensAt: programmeForm.selfEnrollmentOpensAt || null,
      selfEnrollmentClosesAt: programmeForm.selfEnrollmentClosesAt || null,
      selfEnrollmentAllowedBatches: programmeForm.selfEnrollmentAllowedBatches,
      selfEnrollmentAllowedGenders: programmeForm.selfEnrollmentAllowedGenders
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
      spotlightTitle: programmeForm.spotlightTitle.trim(),
      spotlightMessage: programmeForm.spotlightMessage.trim(),
    };

    onSubmit(payload, programmeDialogScholarIds, editingProgramme?.id || null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingProgramme ? "Edit programme" : "Create programme"}</DialogTitle>
          <DialogDescription>Add programme details and assign a manager.</DialogDescription>
        </DialogHeader>
        <Accordion type="single" collapsible defaultValue="basic-details" className="space-y-4">
          <AccordionItem value="basic-details" className="rounded-2xl border border-border px-4">
            <AccordionTrigger className="py-4 text-left font-semibold text-foreground">
              Basic details
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Title</Label>
                  <Input
                    value={programmeForm.title}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setProgrammeForm((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={programmeForm.description}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      setProgrammeForm((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Credits</Label>
                  <Input
                    type="number"
                    min="0"
                    value={programmeForm.credits}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setProgrammeForm((current) => ({ ...current, credits: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Programme manager</Label>
                  <Select
                    value={programmeForm.programmeManagerId || "unassigned"}
                    onValueChange={(value: string) =>
                      setProgrammeForm((current) => ({
                        ...current,
                        programmeManagerId: value === "unassigned" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {programmeManagers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="self-enroll" className="rounded-2xl border border-border px-4">
            <AccordionTrigger className="py-4 text-left font-semibold text-foreground">
              Self-enroll section
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4 sm:col-span-2">
                <div>
                  <p className="font-medium text-foreground">Scholar self-enrollment</p>
                  <p className="text-xs text-muted-foreground">
                    Enable FCFS enrollment requests and define seats, request window,
                    eligible batches, and eligible genders right here.
                  </p>
                </div>
                <Switch
                  checked={programmeForm.selfEnrollmentEnabled}
                  onCheckedChange={(value) =>
                    setProgrammeForm((current) => ({ ...current, selfEnrollmentEnabled: value }))
                  }
                />
              </div>
              {programmeForm.selfEnrollmentEnabled && (
                <div className="space-y-4 rounded-xl border border-border p-4 sm:col-span-2">
                  <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                    Scholars will submit enrollment requests first. When requests are
                    processed, seats are allotted on a first-come, first-served basis.
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Seat limit</Label>
                      <Input
                        type="number"
                        min="1"
                        value={programmeForm.selfEnrollmentSeatLimit}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setProgrammeForm((current) => ({
                            ...current,
                            selfEnrollmentSeatLimit: event.target.value,
                          }))
                        }
                        placeholder="Leave blank for no limit"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Enrollment opens at</Label>
                      <Input
                        type="datetime-local"
                        value={programmeForm.selfEnrollmentOpensAt}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setProgrammeForm((current) => ({
                            ...current,
                            selfEnrollmentOpensAt: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Enrollment closes at</Label>
                      <Input
                        type="datetime-local"
                        value={programmeForm.selfEnrollmentClosesAt}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setProgrammeForm((current) => ({
                            ...current,
                            selfEnrollmentClosesAt: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Eligible batches</Label>
                    <div className="rounded-xl border border-border p-3">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setProgrammeForm((current) => ({
                              ...current,
                              selfEnrollmentAllowedBatches: [],
                            }))
                          }
                        >
                          All batches
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Leave unselected to keep this open to every batch.
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {scholarBatches.map((batch) => (
                          <label key={batch} className="flex items-center gap-3 rounded-lg border border-border p-3">
                            <Checkbox
                              checked={programmeForm.selfEnrollmentAllowedBatches.includes(batch)}
                              onCheckedChange={() =>
                                setProgrammeForm((current) => ({
                                  ...current,
                                  selfEnrollmentAllowedBatches:
                                    current.selfEnrollmentAllowedBatches.includes(batch)
                                      ? current.selfEnrollmentAllowedBatches.filter((entry) => entry !== batch)
                                      : [...current.selfEnrollmentAllowedBatches, batch],
                                }))
                              }
                            />
                            <span className="text-sm text-foreground">{batch}</span>
                          </label>
                        ))}
                      </div>
                      {scholarBatches.length === 0 && (
                        <p className="text-sm text-muted-foreground">No scholar batches available yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Eligible genders</Label>
                    <div className="rounded-xl border border-border p-3">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setProgrammeForm((current) => ({
                              ...current,
                              selfEnrollmentAllowedGenders: [],
                            }))
                          }
                        >
                          All genders
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Leave unselected to keep this open to every gender.
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {scholarGenders.map((gender) => (
                          <label key={gender} className="flex items-center gap-3 rounded-lg border border-border p-3">
                            <Checkbox
                              checked={programmeForm.selfEnrollmentAllowedGenders.includes(gender)}
                              onCheckedChange={() =>
                                setProgrammeForm((current) => ({
                                  ...current,
                                  selfEnrollmentAllowedGenders:
                                    current.selfEnrollmentAllowedGenders.includes(gender)
                                      ? current.selfEnrollmentAllowedGenders.filter((entry) => entry !== gender)
                                      : [...current.selfEnrollmentAllowedGenders, gender],
                                }))
                              }
                            />
                            <span className="text-sm text-foreground">{gender}</span>
                          </label>
                        ))}
                      </div>
                      {scholarGenders.length === 0 && (
                        <p className="text-sm text-muted-foreground">No scholar genders available yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {!editingProgramme && (
            <AccordionItem value="add-scholars" className="rounded-2xl border border-border px-4">
              <AccordionTrigger className="py-4 text-left font-semibold text-foreground">
                Add scholars section
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">Add scholars while creating</h3>
                    <p className="text-xs text-muted-foreground">
                      If self-enrollment rules are enabled, only eligible scholars are suggested here.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Select value={programmeDialogBatchFilter} onValueChange={setProgrammeDialogBatchFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All batches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All batches</SelectItem>
                        {scholarBatches.map((batch) => (
                          <SelectItem key={batch} value={batch}>
                            {batch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setProgrammeDialogScholarIds(
                          filteredProgrammeDialogScholars.map((scholar) => scholar.id),
                        )
                      }
                      disabled={filteredProgrammeDialogScholars.length === 0}
                    >
                      Select matched
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                  Suggested scholars: {filteredProgrammeDialogScholars.length}
                  {programmeForm.selfEnrollmentEnabled
                    ? " eligible by the current rules."
                    : " available for direct enrollment."}
                </div>

                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {filteredProgrammeDialogScholars.map((scholar) => (
                    <label key={scholar.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <Checkbox
                        checked={programmeDialogScholarIds.includes(scholar.id)}
                        onCheckedChange={() =>
                          setProgrammeDialogScholarIds((current) =>
                            current.includes(scholar.id)
                              ? current.filter((id) => id !== scholar.id)
                              : [...current, scholar.id],
                          )
                        }
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{scholar.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {scholar.email}
                          {scholar.gender ? ` • ${scholar.gender}` : ""}
                          {scholar.batch ? ` • ${scholar.batch}` : ""}
                        </p>
                      </div>
                    </label>
                  ))}
                  {filteredProgrammeDialogScholars.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No scholars match the current batch filter and eligibility rules.
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {editingProgramme ? "Update programme" : "Create programme"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
