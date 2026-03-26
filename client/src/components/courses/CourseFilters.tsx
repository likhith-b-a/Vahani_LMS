import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  mode: string;
  onModeChange: (v: string) => void;
}

const categories = [
  { value: "all", label: "All Categories" },
  { value: "Excel", label: "Excel" },
  { value: "English", label: "English" },
  { value: "Power BI", label: "Power BI" },
  { value: "Career", label: "Career" },
  { value: "Programming", label: "Programming" },
  { value: "Soft Skills", label: "Soft Skills" },
];

export function CourseFilters({ search, onSearchChange, category, onCategoryChange, mode, onModeChange }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          placeholder="Search courses by name or skill..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={mode} onValueChange={onModeChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Modes</SelectItem>
          <SelectItem value="online">Online</SelectItem>
          <SelectItem value="offline">Offline</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
