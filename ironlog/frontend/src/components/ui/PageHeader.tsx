import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  transparent?: boolean;
}

export default function PageHeader({
  title,
  onBack,
  right,
  transparent = false,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = onBack ?? (() => navigate(-1));

  return (
    <div
      className={`sticky top-0 z-10 flex items-center justify-between px-4 h-14 ${
        transparent
          ? "bg-transparent"
          : "bg-white/95 backdrop-blur-sm border-b border-slate-100"
      }`}
    >
      <button
        onClick={handleBack}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors -ml-1"
      >
        <ArrowLeft size={20} className="text-slate-700" />
      </button>

      <h1 className="font-semibold text-base text-slate-900 absolute left-1/2 -translate-x-1/2">
        {title}
      </h1>

      <div className="w-9 flex justify-end">{right}</div>
    </div>
  );
}
