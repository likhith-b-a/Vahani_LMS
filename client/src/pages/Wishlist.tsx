import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Heart, Lightbulb, Trash2 } from "lucide-react";

import {
  addToWishlist,
  getMyWishlist,
  removeFromWishlist,
  type WishlistEntry,
} from "@/api/wishlist";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopNavbar } from "@/components/dashboard/TopNavbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const MAX_WISHLIST_ITEMS = 5;

export default function Wishlist() {
  const { toast } = useToast();
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
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
          title: "Unable to load wishlist",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [toast]);

  const remainingSlots = Math.max(0, MAX_WISHLIST_ITEMS - wishlist.length);
  const filteredWishlist = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return wishlist;
    return wishlist.filter((entry) =>
      `${entry.requestedTitle} ${entry.note || ""}`.toLowerCase().includes(term),
    );
  }, [search, wishlist]);

  const handleAdd = async () => {
    if (!title.trim()) {
      toast({
        title: "Programme title required",
        description: "Enter the programme title you want admin to consider.",
        variant: "destructive",
      });
      return;
    }

    try {
      setBusyEntryId("new");
      const response = await addToWishlist(title.trim(), note.trim() || undefined);
      const createdEntry = response?.data as WishlistEntry;
      setWishlist((current) => [createdEntry, ...current].slice(0, MAX_WISHLIST_ITEMS));
      setTitle("");
      setNote("");
      toast({
        title: "Wishlist updated",
        description: "Your programme interest has been shared with admin.",
      });
    } catch (error) {
      toast({
        title: "Unable to add wishlist request",
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
        title: "Removed from wishlist",
        description: "The programme request has been removed.",
      });
    } catch (error) {
      toast({
        title: "Unable to remove wishlist request",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyEntryId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activePage="Wishlist" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
            <section>
              <h1 className="text-2xl font-bold tracking-tight">Wishlist</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Share up to 5 programme ideas you want admin to design next.
              </p>
            </section>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-xl bg-vahani-blue/10 p-2.5">
                    <Heart className="h-5 w-5 text-vahani-blue" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Wishlist size</p>
                    <p className="text-xl font-bold text-foreground">
                      {wishlist.length}/{MAX_WISHLIST_ITEMS}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-xl bg-accent/20 p-2.5">
                    <Lightbulb className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining slots</p>
                    <p className="text-xl font-bold text-foreground">{remainingSlots}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">How admin uses this</p>
                  <p className="mt-1 text-sm text-foreground">
                    These requests appear in admin reports so programmes can be planned from scholar interest.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Add a programme request</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-2">
                    <Label>Programme title</Label>
                    <Input
                      value={title}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setTitle(event.target.value)
                      }
                      placeholder="Example: Advanced Spoken English"
                      disabled={wishlist.length >= MAX_WISHLIST_ITEMS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Why do you want this? (optional)</Label>
                    <Textarea
                      rows={3}
                      value={note}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                        setNote(event.target.value)
                      }
                      placeholder="Example: To improve interview communication and client-facing confidence"
                      disabled={wishlist.length >= MAX_WISHLIST_ITEMS}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="w-full lg:w-auto"
                      disabled={wishlist.length >= MAX_WISHLIST_ITEMS || busyEntryId === "new"}
                      onClick={() => void handleAdd()}
                    >
                      Add request
                    </Button>
                  </div>
                </div>
                {wishlist.length >= MAX_WISHLIST_ITEMS && (
                  <p className="text-sm text-muted-foreground">
                    You have reached the 5-programme limit. Remove one to add another.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My requested programmes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={search}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search by requested title or note"
                />

                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading wishlist...</p>
                ) : filteredWishlist.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No wishlist requests found yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredWishlist.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{entry.requestedTitle}</p>
                          </div>
                          {entry.note ? (
                            <p className="mt-2 text-sm text-muted-foreground">{entry.note}</p>
                          ) : (
                            <p className="mt-2 text-sm text-muted-foreground">
                              No note added for this request.
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
                    ))}
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
