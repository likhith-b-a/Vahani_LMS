import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CalendarDays } from "lucide-react";
import { upcomingCourses } from "@/data/courses";
import { useToast } from "@/hooks/use-toast";

export function UpcomingCourses() {
  const { toast } = useToast();

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Upcoming Courses</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {upcomingCourses.map((c) => (
          <Card key={c.id} className="border-dashed border-2">
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-sm text-foreground">{c.title}</h4>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays size={13} />
                {c.startDate}
              </div>
              <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5"
                onClick={() => toast({ title: "🔔 Notification Set", description: `We'll notify you when ${c.title} opens.` })}
              >
                <Bell size={13} /> Notify Me
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
