import { Star } from "lucide-react";

export default function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={16}
          fill={i <= value ? "#f59e0b" : "none"}
          color={i <= value ? "#f59e0b" : "#ddd"}
          style={{ cursor: onChange ? "pointer" : "default" }}
          onClick={() => onChange && onChange(i)}
        />
      ))}
    </div>
  );
}
