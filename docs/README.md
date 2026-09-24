# IronLog 文档入口

从正在做的任务进入对应文档。`reference/` 是当前有效的产品与工程契约；`guides/` 说明如何操作；`decisions/` 记录长期有效的取舍理由；`proposals/` 是未实现方案；`history/` 保存当时的需求、诊断和审计证据。历史记录中的“当前”只指记录形成时。

| 任务 | 先读 | 需要时再读 |
|---|---|---|
| 理解产品范围和架构边界 | [产品与架构](reference/产品与架构.md) | [本地优先架构决策](decisions/2026-06-本地优先架构.md) |
| 修改训练记录、历史解释或训练统计口径 | [核心训练](reference/核心训练.md) | [计划与动作库](reference/计划与动作库.md)；涉及持久化时读[本地存储与迁移](reference/本地存储与迁移.md) |
| 修改动作、计划、模板或默认动作目录 | [计划与动作库](reference/计划与动作库.md) | [动作目录实施方案](data_import/默认动作库引入实施方案.md)；涉及已有数据时读[本地存储与迁移](reference/本地存储与迁移.md) |
| 修改持久化字段、schema、分片或迁移 | [本地存储与迁移](reference/本地存储与迁移.md) | 远端格式或合并再读[WebDAV 同步](reference/WebDAV同步.md) |
| 修改同步、远端格式或合并 | [WebDAV 同步](reference/WebDAV同步.md) | [本地存储与迁移](reference/本地存储与迁移.md)；原生传输或秘密存储再读[Android 平台与凭据](reference/Android平台与凭据.md) |
| 修改 Android 原生能力、凭据或设备行为 | [Android 平台与凭据](reference/Android平台与凭据.md) | [开发与验证](guides/开发与验证.md)；签名和交付再读[发布与升级](guides/发布与升级.md) |
| 修改主题、导航、日历或统计页面 | [主题与导航](reference/主题与导航.md)、[日历与统计界面](reference/日历与统计界面.md) | 统计定义回到[核心训练](reference/核心训练.md) |
| 修改身体数据、备注、RM 或动作成绩 | [身体数据与备注](reference/身体数据与备注.md)、[RM 与动作成绩](reference/RM与动作成绩.md) | 持久化影响再读[本地存储与迁移](reference/本地存储与迁移.md) |
| 本地开发、测试与调试 | [开发与验证](guides/开发与验证.md) | 当前变更所属的参考文档 |
| 构建、签名、安装升级和发布 | [发布与升级](guides/发布与升级.md) | [Android 平台与凭据](reference/Android平台与凭据.md)、[本地存储与迁移](reference/本地存储与迁移.md) |
| 评估可选 AI 能力 | [未实现：可选 AI 能力](proposals/可选AI能力.md) | 产品边界见[产品与架构](reference/产品与架构.md) |

默认动作目录的[生成输入](data_import/candidates.md)、[实施方案](data_import/默认动作库引入实施方案.md)、[评价指南](data_import/训练动作评价指南.md)各自回答不同问题；专项资料保持原有组织。

当前规则只在负责该问题的参考文档中定义。操作命令以指南和仓库脚本为准，版本与依赖以代码、配置及版本元数据为准。跨文档只放读者需要的摘要和链接；已完成任务的实施过程留在任务和 Git 中，有长期决策价值的取舍进入决策记录。
