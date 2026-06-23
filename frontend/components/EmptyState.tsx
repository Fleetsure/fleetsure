import Link from "next/link";
import { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: { label: string; href: string };
};

export default function EmptyState({ icon: Icon, title, subtitle, action }: Props) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "56px 24px", textAlign: "center",
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: "#f0f2ff", display: "flex", alignItems: "center",
        justifyContent: "center", marginBottom: 16,
      }}>
        <Icon size={32} color="#1E2D8E" strokeWidth={1.5} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: "#999", maxWidth: 320, lineHeight: 1.6, marginBottom: action ? 20 : 0 }}>
        {subtitle}
      </div>
      {action && (
        <Link href={action.href}>
          <button className="btn-primary">{action.label}</button>
        </Link>
      )}
    </div>
  );
}
