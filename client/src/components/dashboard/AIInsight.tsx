import { TrendingUp, Bot } from "lucide-react";

export function AIInsight() {
  return (
    <div className="bg-vahani-gold-light border border-vahani-gold-border p-4 rounded-xl">
      <div className="flex gap-3">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-accent-foreground shrink-0">
          <TrendingUp size={16} />
        </div>
        <div>
          <p className="text-xs font-bold text-accent-foreground uppercase tracking-wider">AI Insight</p>
          <p className="text-sm text-foreground mt-1">
            Your Excel scores are in the top 5%. Consider applying for the Advanced Power BI track.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AIAssistantButton() {
  return (
    <button className="w-full flex items-center gap-3 bg-secondary hover:bg-secondary/80 p-4 rounded-xl border border-border transition-colors">
      <div className="w-8 h-8 bg-vahani-blue rounded-lg flex items-center justify-center text-primary-foreground shrink-0">
        <Bot size={16} />
      </div>
      <div className="text-left">
        <p className="text-sm font-bold text-foreground">AI Assistant</p>
        <p className="text-xs text-muted-foreground">Ask for help with your courses</p>
      </div>
    </button>
  );
}
