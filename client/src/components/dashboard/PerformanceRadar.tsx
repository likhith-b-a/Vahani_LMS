import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Download } from "lucide-react";

const data = [
  { subject: "Excel", score: 88 },
  { subject: "Communication", score: 72 },
  { subject: "Power BI", score: 65 },
  { subject: "Attendance", score: 94 },
  { subject: "Voluntarism", score: 80 },
  { subject: "CV Skills", score: 60 },
];

export function PerformanceRadar() {
  return (
    <section className="bg-card p-6 rounded-xl border border-border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg">Holistic Growth Radar</h3>
        <button className="flex items-center gap-1.5 text-xs font-semibold text-vahani-blue hover:underline">
          <Download size={14} />
          Download Report
        </button>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="hsl(214 32% 91%)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 12, fill: "hsl(215 16% 47%)", fontWeight: 500 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="hsl(216 55% 23%)"
              fill="hsl(216 55% 23%)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
