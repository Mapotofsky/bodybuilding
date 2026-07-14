# P5 详细设计文档：AI 智能体、联网资料与安全

> 对应概要设计：M6 可选 AI 与安全
> 状态：规划中；当前没有 provider、API key、AI UI、agent、联网检索或计划导入实现
> 依赖：P0 训练数据边界，P1 计划/模板/动作引用，P2 设置/secret/批量提交，P3 同步与 Android

---

## 1. 分阶段范围

### 1.1 现有实现

当前应用没有 AI 配置字段、API key 引用、provider SDK/API、AI service、搜索、来源记录、候选 JSON、importApprovedPlan()、AI 路由或 agent gateway。WebDAV 不是 AI 后端，且不得用于承载 key、请求、工具调用或检索缓存。

### 1.2 第一阶段可交付能力

第一阶段仅在用户主动配置并同意后启用：

- 非敏感 provider/model 配置与本地 apiKeyRef；明文 key 只进入 DocumentStore secret。
- 对动作要领、器械使用、训练记录分析和计划建议的明确用户请求。
- 计划建议输出为候选 JSON；严格校验、未知动作逐项决议、预览确认后才允许导入。
- provider/network 失败、未配置、未同意、限流或预算用尽时的无 AI 降级。
- 不宣称联网权威检索或医学专业资质；不直接写入 DocumentStore、WebDAV 或既有计划。

具体 provider、模型、endpoint、费用限额和 UI 仍待产品决策，文档不得用未选择的供应商或 SDK 填空。

### 1.3 未来联网 agent 能力

未来可采用“本地 AI service -> 用户选择 provider 或可选 agent gateway -> 检索/来源整理/缓存 -> 本地回答或候选”的路径。gateway 如存在，是用户自建或第三方外部依赖，不是 IronLog 当前服务端。

联网资料不预设固定白名单，但每个采用来源必须可识别为一手或权威来源，例如官方卫生机构、专业医学学会、同行评议研究或权威运动医学机构。回答必须展示 URL、可得时的发布日期、访问时间与不确定性；无法核验来源时不得把结论包装为循证事实。

---

## 2. 安全、隐私与医疗边界

1. API key、密码、完整原始训练数据、个人资料和提示内容属于敏感数据；仅发送完成用户请求所必需的最小字段。
2. 首次启用及每次扩大数据范围时，展示 provider、发送数据类别、联网检索、潜在费用和本地/第三方处理说明；用户拒绝则不请求。
3. 日志、Toast、同步文件、候选 JSON、来源元数据和远端 backups 不得包含 API key。
4. 资料页面、工具输出和模型回复均是不可信输入：agent 不能让网页文本改变系统规则、越权读取本地文件或自动导入计划。
5. AI 不得诊断疾病、替代医生、给出处方或把一般训练建议表述为个体医疗结论。涉及受伤、胸痛、晕厥、妊娠、高风险慢病或紧急症状时，停止个体化建议并提示寻求合格医疗专业人士帮助。
6. AI 生成内容没有“运动医学资质”或准确性保证。来源与不确定性提高可追溯性，但不替代专业诊疗。

---

## 3. 计划候选 JSON 契约

候选格式是规划中的独立输入格式，不等同 TrainingPlanDoc 或 TemplateDoc，初始版本为 candidateSchemaVersion=1。严格解析：未列出的字段、错误类型、超长字符串、非法枚举、重复 clientKey 或非法 scheduleRule 都是验证错误。

允许字段：

| 层级 | 允许字段 |
|---|---|
| 根 | candidateSchemaVersion、kind、plan、templates、sources、warnings。kind 固定 training-plan。 |
| plan | name、description、color、mode、cycleLength。不得提供 id、isActive、createdAt、updatedAt、deletedAt、schemaVersion。 |
| template | clientKey、name、sortOrder、color、scheduleRule、exercises。不得提供 planId、持久化 ID 或元字段。 |
| template exercise | clientKey、exerciseRef、note、sortOrder。不得提供持久化 ID。 |
| exerciseRef | kind=existing 时仅 exerciseId；kind=unknown 时仅 name、category、type、description。 |
| source | url、title、publishedAt（可空）、accessedAt、sourceType、claimSummary。不得保存网页全文、API key 或用户未同意的个人数据。 |
| warnings | code、message、path；仅提示用途，不绕过验证。 |

mode 仅为 weekly、cyclic、flexible。cyclic 的 day_in_cycle 必须符合现有 TrainingPlanDoc.cycleLength 规则；weekly 的 day_of_week 必须由实现时按现有日历语义校验。颜色、最大长度、模板上限、动作上限和来源上限目前没有现有代码证据，属于待决策；实现前必须固定上限并测试。

验证错误返回统一结构：

    { code: string, path: string, message: string, severity: "error" | "warning" }

error 阻止预览确认与导入；warning 必须在预览中可见并经用户确认。原始模型文本不能直接作为导入对象。

---

## 4. 引用解析、未知动作与预览

1. existing exerciseRef 的 exerciseId 必须解析为当前有效动作，或依据 P1 的有向替代链解析为有效目标；循环、tombstone 无替代、缺失目标均为 error。
2. unknown exerciseRef 逐项由用户选择：映射现有动作、创建候选自定义动作、或拒绝导入。拒绝后如模板没有动作或不再满足产品规则，必须重新校验。
3. 创建候选自定义动作时，名称、分类、type、description 复用现有 exercise service 的校验；真实 custom-ex ID 只在批准导入时由 repository 分配。
4. 预览必须显示计划/模板/动作、每个映射决定、待创建动作、排程、warnings、来源、数据将写入本地的范围及“不覆盖现有计划”的默认策略。
5. 用户取消、关闭页面、网络中断或来源不可核验时，候选只作为临时 state；不得留下部分持久化文档。

---

## 5. 页面、服务、仓储调用链

规划调用链：

    AI 配置页 / AI 工作区 / 计划候选预览页
    -> services/ai（同意、最小化数据、provider 或 gateway 调用）
    -> services/planImport（严格校验、未知动作决议、预览状态）
    -> P2 的 LocalJsonRepository 批量提交原语（待实现）

页面不得持有 API key、直接调用 provider、直接写 DocumentStore 或调用 WebDAV。AI service 只能返回回答或候选；planImport service 只能在用户确认后调用 repository。provider/gateway、搜索和来源解析不得进入 core。

## 6. importApprovedPlan() 原子导入与回滚

批准路径固定为：

    AI 候选 JSON
    -> 严格校验与未知动作处理
    -> 用户预览确认
    -> importApprovedPlan()
    -> repository 批量写入一次
    -> 成功则提交；失败则不改变正式快照

importApprovedPlan() 是 P5 定义的 service 工作流：重验候选与用户决议，形成“新建计划、模板和批准自定义动作”的变更集，并调用 P2 的 repository 批量提交原语。P5 不定义 snapshot 复制、ID 分配、manifest 更新或 DocumentStore 保存细节；页面不得依次调用 createExercise/createPlan/createTemplate 伪造原子性。

默认冲突策略：只创建新计划、模板和批准的自定义动作；不覆盖任何既有计划、模板、动作或 Workout。名称重复只产生预览 warning，不得自动合并。

回滚策略：

- 校验或 save 失败：正式 snapshot 不变，候选可留在内存供修正，不写正式文档。
- 成功后用户立即撤销：仅在导入对象未被后续修改、且候选自定义动作未被 Workout/其他模板引用时，可通过记录的导入对象 ID 整体 tombstone。
- 若已有训练引用或后续编辑，禁止自动删除动作或改写历史；显示需人工处理的依赖。
- 当前不存在导入操作记录或回滚 API。推荐新增本地 AiPlanImportAuditDoc 与独立逻辑文件，但其精确持久化、是否同步和保留期限为待决策；未实现前不得承诺“可一键撤销”。

---

## 7. 来源、缓存、审计、费用与失败降级

- 检索/缓存必须区分来源元数据与网页全文；默认不保存网页全文，不把来源缓存写进 WorkoutDoc。
- 来源记录至少保留 URL、标题、可得时的发布日期、访问时间、sourceType、claimSummary 和不确定性说明。具体保存位置、同步性与保留期限待决策；推荐用户可见的本地导入审计优先于默认上传 WebDAV。
- 缓存必须有过期与失效策略；过期、不可访问或无法识别来源时，回答说明限制，不伪造引用。
- provider/gateway 调用必须设用户可见的费用与速率限制。额度数值、超额行为和 gateway 责任归属待产品负责人决定。
- 联网、provider、搜索、解析、校验、保存任一步失败，都保留本地正式数据，提供可解释错误，并回退到无 AI 的完整离线应用。

---

## 8. 后置决策（不阻塞 P5 外开发）

下列事项保留为 P5 后续决策，不阻塞 P0–P4 的开发，也不阻塞 P2 的通用批量提交原语或 P3 的同步/脱敏改进：

- AI provider 与是否使用外部 agent gateway。
- 联网资料的来源判断治理、缓存与审计保留期限。
- 用户同意文案、费用上限、限流与超额行为。
- AI endpoint、预算和审计偏好是否跨设备同步。
- AI 导入后撤销的操作记录与保留策略。

这些事项在启用对应 AI 外部能力或对外承诺相关保证前必须决策；在此之前，P5 保持“规划中”，应用继续以无 AI 的离线能力运行。

## 9. 测试与验收

实现前后至少覆盖：

- 未配置/未同意/离线/限流/预算用尽时，训练、模板、动作库、WebDAV 正常可用。
- apiKeyRef 仅在平台 secret 可解析，远端 settings、备份、日志和候选中均无明文或引用。
- schema 的允许字段、未知字段、枚举、长度、scheduleRule、重复 clientKey、错误路径与 warning 展示。
- existing/unknown/替代链/循环/缺失动作的解析与用户决议。
- 预览取消不写数据；批量导入成功后计划、模板、候选自定义动作、manifest 与同步分片一致；校验或 save 失败时正式 snapshot 不变。
- 来源 URL、发布时间、访问时间、不确定性和医疗安全提示在联网回答中可见。
- 提示注入、来源不可核验、医疗高风险措辞不会触发自动导入或越权数据访问。

当前没有上述实现或测试；在代码交付前必须保持“规划中/待实现”的产品表述。
