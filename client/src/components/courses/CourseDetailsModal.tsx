import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CalendarDays, Clock, Monitor, MapPin, User, Users, CheckCircle2 } from "lucide-react";
import type { Course } from "@/data/courses";

interface Props {
  course: Course | null;
  open: boolean;
  onClose: () => void;
  enrolled: boolean;
  onEnroll: (id: string) => void;
}

export function CourseDetailsModal({ course, open, onClose, enrolled, onEnroll }: Props) {
  if (!course) return null;

  const handleEnroll = () => {
    onEnroll(course.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle className="text-xl">{course.title}</DialogTitle>
            {course.popular && <Badge className="bg-accent text-accent-foreground text-xs">🔥 Popular</Badge>}
            {enrolled && <Badge variant="secondary" className="text-xs">✓ Enrolled</Badge>}
          </div>
          <DialogDescription>{course.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><User size={15} /><span><strong>Trainer:</strong> {course.trainer}</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><Clock size={15} /><span><strong>Duration:</strong> {course.duration}</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><CalendarDays size={15} /><span><strong>Starts:</strong> {course.startDate}</span></div>
            <div className="flex items-center gap-2 text-muted-foreground">
              {course.mode === "Online" ? <Monitor size={15} /> : <MapPin size={15} />}
              <span><strong>Mode:</strong> {course.mode}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground col-span-2">
              <Users size={15} /><span><strong>{course.seatsLeft}</strong> of {course.totalSeats} seats available</span>
            </div>
          </div>

          {/* Full description */}
          <div>
            <h4 className="font-semibold text-sm mb-2">About This Course</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{course.fullDescription}</p>
          </div>

          {/* Syllabus */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Course Syllabus</h4>
            <ol className="space-y-1.5">
              {course.syllabus.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                  {item}
                </li>
              ))}
            </ol>
          </div>

          {/* Benefits */}
          <div>
            <h4 className="font-semibold text-sm mb-2">What You'll Gain</h4>
            <ul className="space-y-1.5">
              {course.benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 size={14} className="text-accent shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {course.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>

          {/* Enroll */}
          {!enrolled ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                  Enroll Now
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Enrollment</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to enroll in <strong>{course.title}</strong>? This will be added to your My Courses.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleEnroll}>
                    Yes, Enroll Me
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button disabled className="w-full">Already Enrolled ✓</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
