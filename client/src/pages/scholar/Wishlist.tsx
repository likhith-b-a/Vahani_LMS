import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { BookPlus, Sparkles, Trash2 } from "lucide-react";

import {
  addToWishlist,
  getMyWishlist,
  removeFromWishlist,
  type WishlistEntry,
} from "../../api/wishlist";
import { AppSidebar } from "../../components/dashboard/AppSidebar";
import { TopNavbar } from "../../components/dashboard/TopNavbar";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useToast } from "../../hooks/use-toast";

const MAX_WISHLIST_ENTRIES = 5;

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
        title: "Programme name required",
        description: "Tell us the name of the programme you'd like to see offered.",
        variant: "destructive",
      });
      return;
    }

    if (wishlist.length >= MAX_WISHLIST_ENTRIES) {
      toast({
        title: "Wishlist full",
        description: `You can only keep up to ${MAX_WISHLIST_ENTRIES} programmes in your wishlist.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setBusyEntryId("new");
      const response = await addToWishlist(title.trim(), note.trim() || undefined);
      const createdEntry = response?.data as WishlistEntry;
      setWishlist((current) => [createdEntry, ...current]);
      setTitle("");
      setNote("");
      toast({
        title: "Added to wishlist",
        description: "Admin can see which programmes scholars want offered.",
      });
    } catch (error) {
      toast({
        title: "Unable to add",
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
        description: "The programme has been removed from your wishlist.",
      });
    } catch (error) {
      toast({
        title: "Unable to remove",
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
              <h1 className="text-2xl font-bold tracking-tight">Wishlist</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Tell admin which programmes you wish were offered. Keep up to{" "}
                {MAX_WISHLIST_ENTRIES} programmes in your wishlist.
              </p>
            </section>

            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-xl bg-vahani-blue/10 p-2.5">
                  <BookPlus className="h-5 w-5 text-vahani-blue" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">In your wishlist</p>
                  <p className="text-xl font-bold text-foreground">
                    {wishlist.length} / {MAX_WISHLIST_ENTRIES}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add a programme</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-2">
                    <Label>Programme name</Label>
                    <Input
                      value={title}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setTitle(event.target.value)
                      }
                      placeholder="Example: Advanced Excel for Data Analysis"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Why you want it (optional)</Label>
                    <Textarea
                      rows={3}
                      value={note}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                        setNote(event.target.value)
                      }
                      placeholder="Example: Would help with my current role / interests"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="w-full lg:w-auto"
                      disabled={busyEntryId === "new" || wishlist.length >= MAX_WISHLIST_ENTRIES}
                      onClick={() => void handleAdd()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My wishlist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={search}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search your wishlist"
                />

                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading wishlist...</p>
                ) : filteredWishlist.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No programmes added to your wishlist yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredWishlist.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Sparkles className="h-4 w-4 text-vahani-gold" />
                            <p className="font-medium text-foreground">
                              {entry.requestedTitle}
                            </p>
                          </div>
                          {entry.note ? (
                            <p className="mt-2 text-sm text-muted-foreground">{entry.note}</p>
                          ) : null}
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
