export const TEMPLATE_PRESET_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
] as const;

export default function TemplateColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap" aria-label="模板颜色">
      {TEMPLATE_PRESET_COLORS.map((color, index) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`w-8 h-8 rounded-full transition-transform ${value === color ? "scale-110 ring-2 ring-offset-2 ring-slate-400" : ""}`}
          style={{ backgroundColor: color }}
          aria-label={`颜色 ${index + 1}`}
          aria-pressed={value === color}
        />
      ))}
    </div>
  );
}
