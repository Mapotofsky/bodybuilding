# IronLog 默认动作映射表

> `exerciseCatalog.mjs` 的唯一动作目录生成源。表内完整保存生成 `defaultExercises.generated.ts` 所需的 IronLog 映射、器械、description 与固定上游引用；版本化内容候选文档只供人工审查和更新本表时参考，不参与生成。
> description 中的 `↵`/`↵↵` 在生成时分别转换为换行/空行；其他单元格不得依赖内容候选文档补值。

| IronLog ID | 上游 ID | 名称 | category | recordingMode | loadBasis | countBasis | loadDirection | rateMetric | contextKind | equipment | 主肌群 | 次肌群 | description |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ex-bench-press | 0025 | 杠铃卧推 | chest | weight_reps | total | whole_set | higher_better | none | none | barbell | chest | triceps,shoulders | 仰卧稳住肩胛和双脚，正握杠铃下放至胸部，再伸肘推回；全程控制下放。 |
| ex-incline-db-press | 0314 | 上斜哑铃卧推 | chest | weight_reps | per_hand | whole_set | higher_better | none | none | dumbbell | chest | shoulders,triceps | 将长凳调至上斜位，背部贴垫，哑铃从上胸两侧向上推起，再受控下放。 |
| ex-push-up | 0662 | 俯卧撑 | chest | reps | null | whole_set | null | none | none | body_weight | chest | triceps,shoulders,core | 双手略宽于肩，身体保持直线；屈肘下降至胸部接近地面，再推回起始位。 |
| ex-machine-chest-press | 0576 | 器械胸推 | chest | weight_reps | total | whole_set | higher_better | none | none | machine | chest | triceps,shoulders | 调好座椅，使把手与胸部大致同高；背部贴垫向前推至手臂接近伸直，再受控返回。 |
| ex-chest-dip | 0251 | 双杠臂屈伸（偏胸） | chest | reps | null | whole_set | null | none | none | body_weight | chest | triceps,shoulders | 双臂支撑双杠，躯干略前倾；屈肘受控下降至肩部可控深度，再推起。 |
| ex-seated-dumbbell-shoulder-press | 0405 | 坐姿哑铃推举 | shoulders | weight_reps | per_hand | whole_set | higher_better | none | none | dumbbell | shoulders | triceps,back | 坐姿背部稳定，哑铃由肩侧向上推至手臂接近伸直，再受控回到肩侧。 |
| ex-lateral-raise | 0334 | 哑铃侧平举 | shoulders | weight_reps | per_hand | whole_set | higher_better | none | none | dumbbell | shoulders | back | 保持躯干稳定，手臂微屈，将哑铃向两侧抬至肩高附近，再缓慢下放。 |
| ex-dumbbell-reverse-fly | 0383 | 哑铃反向飞鸟 | shoulders | weight_reps | per_hand | whole_set | higher_better | none | none | dumbbell | shoulders | back | 髋部折叠并保持背部中立，双臂微屈，将哑铃向两侧打开，再缓慢回落。 |
| ex-barbell-row | 0027 | 杠铃俯身划船 | back | weight_reps | total | whole_set | higher_better | none | none | barbell | back | biceps,forearms | 屈髋俯身并保持背部中立，将杠铃拉向下胸或上腹，再受控下放。 |
| ex-one-arm-dumbbell-row | 0292 | 单臂哑铃划船 | back | weight_reps | total | per_side | higher_better | none | none | dumbbell | back | biceps,forearms | 一手支撑并保持躯干稳定，另一手将哑铃拉向髋侧，再缓慢下放至手臂伸展；完成一侧后换侧，每侧填写次数。 |
| ex-seated-cable-row | 0861 | 坐姿绳索划船 | back | weight_reps | total | whole_set | higher_better | none | none | cable | back | biceps,forearms | 坐稳并保持躯干中立，将把手拉向腹部，肩胛向后收，再受控伸臂返回。 |
| ex-pull-up | 0652 | 正握引体向上 | back | reps | null | whole_set | null | none | none | body_weight | back | biceps,forearms | 正握悬垂，先稳定肩胛，再将身体拉至下巴接近横杠，随后受控下降。 |
| ex-lat-pulldown | 0198 | 高位下拉 | back | weight_reps | total | whole_set | higher_better | none | none | cable | back | biceps,forearms | 坐稳并固定大腿，将横杆下拉至上胸附近，保持躯干稳定，再缓慢回到手臂伸展位。 |
| ex-deadlift | 0032 | 杠铃硬拉 | legs | weight_reps | total | whole_set | higher_better | none | none | barbell | glutes | hamstrings,back | 杠铃位于足中上方，屈髋屈膝握杠，保持背部中立，伸膝伸髋站起，再受控回落。 |
| ex-romanian-deadlift | 0085 | 杠铃罗马尼亚硬拉 | legs | weight_reps | total | whole_set | higher_better | none | none | barbell | glutes | hamstrings,back | 膝盖微屈，保持背部中立并将髋部后移，让杠铃贴近腿部下放，再伸髋站起。 |
| ex-barbell-back-squat | 0043 | 杠铃深蹲 | legs | weight_reps | total | whole_set | higher_better | none | none | barbell | quadriceps,glutes | hamstrings,calves,core | 杠铃稳定置于上背，脚距自然；屈髋屈膝下蹲至可控深度，膝盖与脚尖方向一致，再站起。 |
| ex-dumbbell-goblet-squat | 1760 | 哑铃高脚杯深蹲 | legs | weight_reps | total | whole_set | higher_better | none | none | dumbbell | quadriceps,glutes | hamstrings,calves | 双手托住哑铃置于胸前，保持躯干稳定，屈髋屈膝下蹲至可控深度，再蹬地站起。 |
| ex-leg-press | 1463 | 45 度腿举 | legs | weight_reps | total | whole_set | higher_better | none | none | machine | quadriceps,glutes | hamstrings,calves | 背部贴稳靠垫，双脚置于踏板；屈膝受控下放，再推至双腿接近伸直，避免锁死膝盖。 |
| ex-machine-leg-extension | 0585 | 器械腿屈伸 | legs | weight_reps | total | whole_set | higher_better | none | none | machine | quadriceps |  | 调好座椅和滚垫，使膝关节对齐机器转轴；伸膝抬起负重，再缓慢回到起始位。 |
| ex-seated-leg-curl | 0599 | 坐姿腿弯举 | legs | weight_reps | total | whole_set | higher_better | none | none | machine | hamstrings | calves | 调好座椅和腿垫，固定大腿；屈膝拉动负重至可控范围，再缓慢伸膝返回。 |
| ex-dumbbell-lunge | 0336 | 哑铃前弓步 | legs | weight_reps | per_hand | per_side | higher_better | none | none | dumbbell | quadriceps,glutes | hamstrings,calves | 双手持哑铃站立，一脚向前迈出并屈膝下降，前膝与脚尖方向一致，再由前脚发力返回；完成一侧后换侧，每侧填写次数。 |
| ex-dumbbell-bulgarian-split-squat | 0410 | 哑铃保加利亚分腿蹲 | legs | weight_reps | per_hand | per_side | higher_better | none | none | dumbbell | quadriceps,glutes | hamstrings,calves | 后脚放在长凳或台阶上，前脚稳定；屈髋屈膝下降至可控深度，再由前脚发力站起；完成一侧后换侧，每侧填写次数。 |
| ex-dumbbell-step-up | 0431 | 哑铃登台阶 | legs | weight_reps | per_hand | per_side | higher_better | none | none | dumbbell | quadriceps,glutes | hamstrings,calves | 双手持哑铃，一脚踏稳台阶，主要由踏台腿发力站上平台，再受控下台并换侧；每侧填写次数。 |
| ex-bodyweight-split-squat | 2368 | 自重分腿蹲 | legs | reps | null | per_side | null | none | none | body_weight | quadriceps,glutes | hamstrings,calves | 前后分腿站立，保持躯干稳定；屈膝下降至后膝接近地面，再由前脚发力站起并换侧；每侧填写次数。 |
| ex-barbell-glute-bridge | 1409 | 杠铃臀桥 | legs | weight_reps | total | whole_set | higher_better | none | none | barbell | glutes | hamstrings,back | 仰卧屈膝，杠铃稳放在髋部；收紧核心并伸髋至躯干与大腿接近一线，再受控下放。 |
| ex-kettlebell-swing | 0549 | 壶铃摆动 | legs | weight_reps | total | whole_set | higher_better | none | none | kettlebell | glutes | hamstrings,core | 双手握壶铃，屈髋后摆，随后快速伸髋让壶铃摆至胸前附近；手臂保持放松并控制回摆。 |
| ex-machine-standing-calf-raise | 0605 | 器械站姿提踵 | legs | weight_reps | total | whole_set | higher_better | none | none | machine | calves |  | 前脚掌稳踩踏板，膝盖保持自然；抬高脚跟至小腿充分收缩，再缓慢下降。 |
| ex-bodyweight-standing-calf-raise | 1373 | 自重站姿提踵 | legs | reps | null | whole_set | null | none | none | body_weight | calves |  | 双脚自然站立，可扶住稳定物保持平衡；抬高脚跟至小腿收缩，再缓慢下降。 |
| ex-farmer-walk | 2133 | 农夫行走 | legs | weight_distance_duration | per_hand | whole_set | higher_better | load_distance_per_time | none | dumbbell | quadriceps | calves,forearms,core | 站直，双手各持一只哑铃，收紧核心并保持躯干稳定；以可控步幅完成计划距离或时间，避免身体左右倾斜，结束后受控放下哑铃。 |
| ex-barbell-curl | 0031 | 杠铃弯举 | arms | weight_reps | total | whole_set | higher_better | none | none | barbell | biceps | forearms | 站姿保持上臂相对固定，屈肘将杠铃举至可控高度，再缓慢下放。 |
| ex-dumbbell-hammer-curl | 0313 | 哑铃锤式弯举 | arms | weight_reps | per_hand | whole_set | higher_better | none | none | dumbbell | biceps | forearms | 双手掌心相对各握一只哑铃，保持上臂稳定，双臂同时屈肘举起哑铃，再受控下放；按整组次数记录。 |
| ex-triceps-pushdown | 0200 | 绳索三头下压 | arms | weight_reps | total | whole_set | higher_better | none | none | cable | triceps | forearms | 将绳索连接高位滑轮，肘部贴近身体，伸肘向下压并在底部展开绳端，再受控返回。 |
| ex-rope-overhead-triceps-extension | 0194 | 绳索过顶臂屈伸 | arms | weight_reps | total | whole_set | higher_better | none | none | cable | triceps | shoulders | 背对高位滑轮，双手握绳并保持上臂稳定；伸肘将绳索推向前上方，再受控屈肘返回。 |
| ex-dumbbell-seated-triceps-extension | 2188 | 坐姿哑铃过顶臂屈伸 | arms | weight_reps | total | whole_set | higher_better | none | none | dumbbell | triceps | shoulders | 坐稳后双手托住哑铃置于头后，保持上臂靠近耳侧，伸肘举起，再受控下放。 |
| ex-dead-bug | 0276 | 死虫式 | core | reps | null | per_side | null | none | none | body_weight | core | back | 仰卧抬起双腿和双臂，保持腰背稳定；交替伸展对侧手臂和腿，再回到起始位；每侧填写次数。 |
| ex-band-pallof-press | 0979 | 弹力带帕洛夫推举 | core | reps | null | per_side | null | none | none | band | core | glutes | 将弹力带固定在身体侧方，双手置于胸前；保持躯干不旋转，将双手向前推出再收回；完成一侧后换侧，每侧填写次数。 |
| ex-kneeling-cable-crunch | 0175 | 跪姿绳索卷腹 | core | weight_reps | total | whole_set | higher_better | none | none | cable | core |  | 跪在高位滑轮前，绳索置于头侧；保持髋部相对稳定，收腹使躯干向下卷曲，再受控还原。 |
| ex-ab-wheel-rollout | 0857 | 健腹轮滚动 | core | reps | null | whole_set | null | none | none | ab_wheel | core | back | 跪姿双手握轮，收紧核心并缓慢向前滚至可控范围，再用核心带动回到起始位。 |
| ex-side-plank | 0705 | 侧平板支撑 | core | duration | null | per_side | null | none | none | body_weight | core | glutes | 侧卧并以前臂支撑，抬起臀部使身体从头到脚接近一条直线，按计划时间保持后换侧；每侧填写保持时间。 |
| ex-running | 0685 | 跑步 | cardio | distance_duration | null | whole_set | null | distance_per_time | none | body_weight | full_body | quadriceps,hamstrings,calves | 选择安全路线或跑步区域。↵保持躯干放松和稳定，以自然步幅完成计划距离或时间。↵结束前逐步减速。 |
| ex-stationary-bike | 2138 | 固定自行车 | cardio | distance_duration | null | whole_set | null | none | resistance_level | stationary_bike | full_body | quadriceps,hamstrings,calves | 调好座椅并固定双脚，选择合适阻力，以稳定节奏踩踏；训练结束前逐步减速。 |
| ex-jump-rope | 2612 | 跳绳 | cardio | reps | null | whole_set | null | none | none | jump_rope | full_body | calves,quadriceps,hamstrings,glutes | 双手握绳，膝盖微屈，以脚掌轻柔落地并保持稳定节奏；按计划次数完成。 |
| ex-elliptical-trainer | 2141 | 椭圆机 | cardio | distance_duration | null | whole_set | null | none | resistance_level | elliptical | full_body | quadriceps,hamstrings,glutes,calves | 双脚稳踩踏板并配合推拉手柄，选择合适阻力，以稳定节奏完成计划时间。 |
| ex-cable-standing-fly | 0227 | 站姿绳索夹胸 | chest | weight_reps | total | whole_set | higher_better | none | none | cable | chest | shoulders,triceps | 双侧滑轮调至合适高度，躯干稳定，双臂保持微屈向胸前合拢，再缓慢打开。 |
| ex-assisted-pull-up | 0017 | 辅助引体向上 | back | weight_reps | total | whole_set | lower_better | none | none | machine | back | biceps,forearms | 在辅助器械上选定合适辅助量，稳定肩胛后向上拉至下巴接近横杠，再受控下降。 |
| ex-incline-barbell-bench-press | 0047 | 上斜杠铃卧推 | chest | weight_reps | total | whole_set | higher_better | none | none | barbell | chest | shoulders,triceps | 躺在上斜凳上，正握杠铃下放至上胸附近，再伸肘推回；保持双脚和上背稳定。 |
| ex-seated-barbell-overhead-press | 0091 | 坐姿杠铃推举 | shoulders | weight_reps | total | whole_set | higher_better | none | none | barbell | shoulders | triceps,back | 坐姿稳定躯干，将杠铃由肩前向上推至手臂接近伸直，再受控下放。 |
| ex-machine-shoulder-press | 0603 | 器械肩推 | shoulders | weight_reps | total | whole_set | higher_better | none | none | machine | shoulders | triceps,chest | 调好座椅，使把手位于肩侧；背部贴垫向上推至手臂接近伸直，再缓慢返回。 |
| ex-chin-up | 1326 | 反握引体向上 | back | reps | null | whole_set | null | none | none | body_weight | back | biceps,forearms | 反握悬垂，稳定肩胛后将身体向上拉至下巴接近横杠，再受控下降。 |
| ex-inverted-row | 0499 | 自重反向划船 | back | reps | null | whole_set | null | none | none | body_weight | back | biceps,forearms | 身体在低杠下保持直线，脚跟支撑；将胸部拉向横杠，再受控伸臂返回。 |
| ex-straight-arm-cable-pulldown | 0238 | 直臂绳索下拉 | back | weight_reps | total | whole_set | higher_better | none | none | cable | back | shoulders,biceps | 面对高位滑轮，手臂保持接近伸直，将把手沿弧线下压至大腿前，再受控回到上方。 |
| ex-barbell-front-squat | 0042 | 杠铃前蹲 | legs | weight_reps | total | whole_set | higher_better | none | none | barbell | quadriceps,glutes | hamstrings,calves,core | 杠铃稳定置于肩前，保持肘部抬起和躯干直立；下蹲至可控深度，再蹬地站起。 |
| ex-dumbbell-romanian-deadlift | 1459 | 哑铃罗马尼亚硬拉 | legs | weight_reps | per_hand | whole_set | higher_better | none | none | dumbbell | glutes | hamstrings,back | 双手持哑铃，膝盖微屈并将髋部后移，保持背部中立，下放至后侧链有拉伸感后伸髋站起。 |
| ex-lying-leg-curl | 0586 | 俯卧腿弯举 | legs | weight_reps | total | whole_set | higher_better | none | none | machine | hamstrings | calves | 俯卧固定髋部，小腿置于滚垫下；屈膝拉起负重至可控范围，再缓慢伸膝返回。 |
| ex-machine-seated-calf-raise | 0594 | 器械坐姿提踵 | legs | weight_reps | total | whole_set | higher_better | none | none | machine | calves |  | 坐稳并让前脚掌踩住踏板，膝上垫固定；抬高脚跟至小腿收缩，再缓慢下降。 |
| ex-machine-hip-abduction | 0597 | 器械髋外展 | legs | weight_reps | total | whole_set | higher_better | none | none | machine | abductors | glutes,hamstrings | 调好座椅和腿垫，坐稳并保持躯干稳定；向外打开双腿至可控范围，再缓慢合回。 |
| ex-machine-hip-adduction | 0598 | 器械髋内收 | legs | weight_reps | total | whole_set | higher_better | none | none | machine | adductors | hamstrings,glutes | 调好座椅和腿垫，坐稳并保持躯干稳定；将双腿向内合拢至可控范围，再缓慢打开。 |
| ex-barbell-wrist-curl | 0126 | 杠铃腕弯举 | arms | weight_reps | total | whole_set | higher_better | none | none | barbell | forearms | biceps | 坐姿让前臂稳定支撑在大腿上，掌心向上握杠，屈腕将杠铃卷起，再缓慢下放。 |
| ex-weighted-russian-twist | 0846 | 负重俄罗斯转体 | core | weight_reps | total | whole_set | higher_better | none | none | external_weight | core | back | 坐姿双手持重物，躯干略后倾并保持稳定，在可控范围内交替向两侧转动；左右各转一次算 1 次。 |
| ex-bench-hyperextension | 0488 | 罗马椅背伸 | back | reps | null | whole_set | null | none | none | body_weight | back | glutes,hamstrings | 在罗马椅上固定双脚，保持脊柱中立并从髋部俯身，再伸髋回到身体接近一线。 |
| ex-burpee | 1160 | 波比跳 | cardio | reps | null | whole_set | null | none | none | body_weight | full_body | quadriceps,hamstrings,calves,shoulders,chest | 由站姿下蹲撑地，双脚跳至俯卧撑位，完成俯卧撑后收腿并向上跳起；按次数记录。 |
| ex-mountain-climber | 0630 | 登山跑 | cardio | reps | null | whole_set | null | none | none | body_weight | full_body | core,shoulders,triceps | 从高位平板支撑开始，保持臀部稳定，快速交替将膝盖向胸部收回；左右各收膝一次算 1 次，按整组次数记录。 |
| ex-stepmill | 2311 | 爬楼机 | cardio | reps_duration | null | whole_set | null | reps_per_time | none | stepmill | full_body | quadriceps,hamstrings,glutes,calves | 踏上连续循环的阶梯，保持身体直立并稳定交替登阶；按计划记录训练时间，可同时记录步数。 |
