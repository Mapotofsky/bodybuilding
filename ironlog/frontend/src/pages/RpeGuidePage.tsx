import { useNavigate } from "react-router-dom";
import { ChevronLeft, Dumbbell, HeartPulse, type LucideIcon } from "lucide-react";

const STRENGTH_SCALE = [
  { score: "10", label: "0 RIR", description: "极限组，已经没有高质量余力。" },
  { score: "9", label: "1 RIR", description: "还能再做约 1 次，适合重组或测试附近。" },
  { score: "8", label: "2 RIR", description: "仍很吃力，但动作质量通常可控。" },
  { score: "7", label: "3 RIR", description: "有明显余力，常用于容量组或技术组。" },
  { score: "6-", label: "4+ RIR", description: "偏轻，更多用于热身、恢复或练习动作。" },
];

const CARDIO_SCALE = [
  { score: "2-3", label: "Zone 1", description: "约 HRmax 50-60%。非常轻松，可完整说话，适合热身、放松或恢复日。" },
  { score: "3-4", label: "Zone 2", description: "约 HRmax 60-70%。轻中等强度，能对话但略喘，适合基础耐力训练。" },
  { score: "5-6", label: "Zone 3", description: "约 HRmax 70-80%。中等偏重，只能说短句，常见于节奏稳定的有氧训练。" },
  { score: "7-8", label: "Zone 4", description: "约 HRmax 80-90%。高强度，难以完整说话，常用于间歇训练的工作段。" },
  { score: "9-10", label: "Zone 5", description: "约 HRmax 90-100%。极高强度，几乎无法说话，只适合短时间冲刺。" },
];

export function StrengthRpeGuidePage() {
  return (
    <RpeGuide
      title="力量训练 RPE"
      icon={Dumbbell}
      intro="自觉用力程度（Rating of Perceived Exertion，RPE）通过评估剩余次数（Reps in Reserve，RIR，即“还能做几次”）来量化训练强度。RPE 越高，离力竭越近。"
      guidanceTitle="怎么判断"
      guidance={[
        "一组结束后再评分，按当时真实感受估计剩余次数。",
        "只计算动作标准、节奏可控时还能完成的次数；借力、变形后的次数不要算进去。",
        "越接近力竭，RIR 判断通常越稳定；很轻松的组不用追求精确到 1 分。",
      ]}
      scaleTitle="常用换算"
      scale={STRENGTH_SCALE}
      notes={[
        "完成一组后立刻记录，按“如果继续保持动作标准，还能做几次”来估计。",
        "不要把疼痛忍耐、心理硬撑或动作变形后的次数算进余力。",
        "新动作和新手期判断误差会更大，可以先用“轻松、吃力、接近极限”建立感觉。",
        "复合动作长期堆叠 RPE 9-10 会带来很高疲劳成本，日常训练通常不需要每组都做到极限。",
      ]}
    />
  );
}

export function CardioRpeGuidePage() {
  return (
    <RpeGuide
      title="有氧训练 RPE"
      icon={HeartPulse}
      intro="自觉用力程度（Rating of Perceived Exertion，RPE）也可以用于有氧训练。这里主要观察呼吸、心跳、腿部沉重感和说话能力，并可结合心率分区判断整段训练的主观强度。"
      guidanceTitle="怎么判断"
      guidance={[
        "心率分区可先用最大心率（HRmax）粗估；没有专业测试时，可用“220 - 年龄”作为起点。",
        "稳定有氧建议看 3-5 分钟平均心率，不要用单个瞬时心率判断强度。",
        "间歇训练建议分段记录，短冲刺和恢复段不要混成一个平均感受。",
      ]}
      scaleTitle="RPE 与心率分区参考"
      scale={CARDIO_SCALE}
      notes={[
        "心率会受睡眠、压力、温度、咖啡因和设备误差影响；当心率和体感不一致时，优先按当天真实感受记录 RPE。",
        "恢复跑、低强度骑行和长距离基础训练通常不需要追求高 RPE。",
        "间歇训练可以短时间进入 RPE 8-10，但每一段之间应有足够恢复。",
        "如果出现胸痛、异常气短、眩晕或不寻常不适，应停止训练并按实际情况寻求医疗帮助。",
      ]}
    />
  );
}

function RpeGuide({
  title,
  icon: Icon,
  intro,
  guidanceTitle,
  guidance,
  scaleTitle,
  scale,
  notes,
}: {
  title: string;
  icon: LucideIcon;
  intro: string;
  guidanceTitle: string;
  guidance: readonly string[];
  scaleTitle: string;
  scale: readonly { score: string; label: string; description: string }[];
  notes: readonly string[];
}) {
  const navigate = useNavigate();

  return (
    <div className="app-screen min-h-screen pb-24">
      <div className="sticky top-0 z-10 app-surface border-b app-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate("/tools")} className="w-9 h-9 flex items-center justify-center rounded-full app-surface-muted" aria-label="返回">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-bold app-text">{title}</h1>
      </div>

      <div className="px-5 pt-5 space-y-4">
        <section className="app-surface rounded-2xl border shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="app-primary-soft w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
              <Icon size={18} />
            </span>
            <h2 className="text-sm font-bold app-text">{title}</h2>
          </div>
          <p className="text-sm app-text-muted leading-relaxed">{intro}</p>
        </section>

        <section className="app-surface rounded-2xl border shadow-sm p-4">
          <h2 className="text-sm font-bold app-text mb-3">{guidanceTitle}</h2>
          <div className="space-y-2">
            {guidance.map((item) => (
              <p key={item} className="app-surface-muted rounded-xl border app-border px-3 py-2 text-sm app-text-muted leading-relaxed">
                {item}
              </p>
            ))}
          </div>
        </section>

        <section className="app-surface rounded-2xl border shadow-sm p-4">
          <h2 className="text-sm font-bold app-text mb-3">{scaleTitle}</h2>
          <div>
            {scale.map((item, index) => (
              <div key={item.score} className={`grid grid-cols-[52px_minmax(0,1fr)] gap-3 py-3 ${index > 0 ? "border-t app-border" : ""}`}>
                <div className="app-primary-soft rounded-xl min-h-12 flex flex-col items-center justify-center">
                  <span className="text-sm font-bold">{item.score}</span>
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </div>
                <p className="text-sm app-text-muted leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="app-surface rounded-2xl border shadow-sm p-4">
          <h2 className="text-sm font-bold app-text mb-3">使用提醒</h2>
          <div className="space-y-2 text-sm app-text-muted leading-relaxed">
            {notes.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
