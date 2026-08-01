import { useEffect, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ResourceFormState {
  title: string;
  url: string;
  description: string;
  file: File | null;
}

const emptyResourceForm: ResourceFormState = { title: "", url: "", description: "", file: null };

interface ResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ResourceFormState) => void;
}

export function ResourceDialog({ open, onOpenChange, onSubmit }: ResourceDialogProps) {
  const { toast } = useToast();
  const [resourceForm, setResourceForm] = useState<ResourceFormState>(emptyResourceForm);

  useEffect(() => {
    if (open) setResourceForm(emptyResourceForm);
  }, [open]);

  const handleSubmit = () => {
    if (!resourceForm.title.trim() || (!resourceForm.url.trim() && !resourceForm.file)) {
      toast({
        title: "Resource details required",
        description: "Add a title and either a file or a link.",
        variant: "destructive",
      });
      return;
    }
    onSubmit(resourceForm);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add resource material</DialogTitle>
          <DialogDescription>Upload a file or share a link for scholars.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={resourceForm.title}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setResourceForm((current) => ({ ...current, title: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={resourceForm.description}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setResourceForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Resource URL</Label>
            <Input
              value={resourceForm.url}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setResourceForm((current) => ({ ...current, url: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Upload file</Label>
            <Input
              type="file"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setResourceForm((current) => ({ ...current, file: event.target.files?.[0] || null }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add resource</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
