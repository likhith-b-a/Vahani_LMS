import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  Lightbulb,
  MessageSquarePlus,
  Sparkles,
  ThumbsUp,
  Trash2,
} from "lucide-react";

import {
  addToWishlist,
  getMyWishlist,
  removeFromWishlist,
  type WishlistEntry,
} from "../../api/wishlist";
import { AppSidebar } from "../../components/dashboard/AppSidebar";
import { TopNavbar } from "../../components/dashboard/TopNavbar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useToast } from "../../hooks/use-toast";

const MAX_WISHLIST_ITEMS = 5;

const CATEGORIES = [
  {
    value: "Suggestion",
    icon: Lightbulb,
    badgeClass: "border-vahani-blue/20 bg-vahani-blue/10 text-vahani-blue",
  },
  {
    value: "Issue",
    icon: AlertTriangle,
    badgeClass: "border-red-500/20 bg-red-500/10 text-red-600",
  },
  {
    value: "New Feature",
    icon: Sparkles,
    badgeClass: "border-purple-500/20 bg-purple-500/10 text-purple-600",
  },
  {
    value: "Recommendation",
    icon: ThumbsUp,
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

const parseEntryTitle = (requestedTitle: string): { category: Category; subject: string } => {
  const match = requestedTitle.match(/^\[(.+?)\]\s*(.*)$/);
  const matchedCategory = CATEGORIES.find((category) => category.value === match?.[1]);
  return {
    category: matchedCategory ? matchedCategory.value : "Suggestion",
    subject: match ? match[2] : requestedTitle,
  };
};

export default function Wishlist() {
  const { toast } = useToast();
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("Suggestion");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await getMyWishlist();
        setWishlist(
          Array.isArray(response?.data?.wishlist)
            ? (response.data.wishlist as WishlistEntry[])
            : [],
        );
      } catch (error) {
        toast({
          title: "Unable to load suggestions",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [toast]);

  const filteredWishlist = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return wishlist;
    return wishlist.filter((entry) => {
      const { subject } = parseEntryTitle(entry.requestedTitle);
      return `${subject} ${entry.note || ""}`.toLowerCase().includes(term);
    });
  }, [search, wishlist]);

  const handleAdd = async () => {
    if (!title.trim()) {
      toast({
        title: "Subject required",
        description: "Tell us what your suggestion, issue, or idea is about.",
        variant: "destructive",
      });
      return;
    }

    try {
      setBusyEntryId("new");
      const response = await addToWishlist(
        `[${category}] ${title.trim()}`,
        note.trim() || undefined,
      );
      const createdEntry = response?.data as WishlistEntry;
      setWishlist((current) => [createdEntry, ...current]);
      setTitle("");
      setNote("");
      toast({
        title: "Thanks for the feedback",
        description: "Your submission has been shared with admin.",
      });
    } catch (error) {
      toast({
        title: "Unable to submit",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyEntryId(null);
    }
  };

  const handleRemove = async (wishlistId: string) => {
    try {
      setBusyEntryId(wishlistId);
      await removeFromWishlist(wishlistId);
      setWishlist((current) => current.filter((entry) => entry.id !== wishlistId));
      toast({
        title: "Removed",
        description: "The submission has been removed.",
      });
    } catch (error) {
      toast({
        title: "Unable to remove submission",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyEntryId(null);
    }
  };

  return (
    <div className="scholar-theme flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
            <section>
              <h1 className="text-2xl font-bold tracking-tight">Suggestions &amp; Feedback</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Share portal issues, new programme ideas, feature requests, or general
                recommendations with admin.
              </p>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-xl bg-vahani-blue/10 p-2.5">
                    <MessageSquarePlus className="h-5 w-5 text-vahani-blue" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-xl font-bold text-foreground">{wishlist.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">How admin uses this</p>
                  <p className="mt-1 text-sm text-foreground">
                    Every submission appears in admin reports so issues get fixed and good ideas
                    get planned.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Share a suggestion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((option) => {
                      const Icon = option.icon;
                      const selected = option.value === category;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setCategory(option.value)}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                            selected
                              ? option.badgeClass
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {option.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      value={title}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setTitle(event.target.value)
                      }
                      placeholder="Example: Add dark mode / Attendance page loads slowly"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Details (optional)</Label>
                    <Textarea
                      rows={3}
                      value={note}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                        setNote(event.target.value)
                      }
                      placeholder="Example: Describe the issue, why it matters, or what you'd like to see"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="w-full lg:w-auto"
                      disabled={busyEntryId === "new"}
                      onClick={() => void handleAdd()}
                    >
                      Submit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My submissions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={search}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search your submissions"
                />

                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading submissions...</p>
                ) : filteredWishlist.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No suggestions submitted yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredWishlist.map((entry) => {
                      const { category: entryCategory, subject } = parseEntryTitle(
                        entry.requestedTitle,
                      );
                      const categoryOption = CATEGORIES.find(
                        (option) => option.value === entryCategory,
                      );
                      const Icon = categoryOption?.icon ?? Lightbulb;

                      return (
                        <div
                          key={entry.id}
                          className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`gap-1 ${categoryOption?.badgeClass ?? ""}`}
                              >
                                <Icon className="h-3 w-3" />
                                {entryCategory}
                              </Badge>
                              <p className="font-medium text-foreground">{subject}</p>
                            </div>
                            {entry.note ? (
                              <p className="mt-2 text-sm text-muted-foreground">{entry.note}</p>
                            ) : (
                              <p className="mt-2 text-sm text-muted-foreground">
                                No details added for this submission.
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyEntryId === entry.id}
                            onClick={() => void handleRemove(entry.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
