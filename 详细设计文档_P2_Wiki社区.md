# 详细设计文档 P2：社区/Wiki 已砍功能归档

> 当前版本：社区/Wiki 不进入单人版路线  
> 最后更新：2026-06-11  
> 文档用途：明确哪些功能已从当前分支移除，避免后续开发重新引入服务器、账号和内容运营负担。

---

## 1. 决策结论

P2 原规划包含：

- 在线 Wiki。
- 动作百科内容运营。
- 社区动态。
- 用户发布训练内容。
- 点赞、评论、关注。
- 多用户互动。

当前全部不进入单人版路线。

当前分支只服务：

```text
个人训练记录 -> 本地保存 -> 可备份 -> 可迁移
```

---

## 2. 为什么砍掉

### 2.1 与“不租服务器”冲突

社区/Wiki 需要：

- 用户账号。
- 权限。
- 内容数据库。
- 审核。
- 反垃圾。
- 管理后台。
- 服务端存储。

这些都会重新引入服务器成本。

### 2.2 与“本地优先”冲突

社区内容天然是在线共享数据。当前应用核心价值是离线可用的个人训练日志。

### 2.3 与“开发阶段重点”冲突

当前更重要的是：

- Android APK。
- 本地 JSON 数据可靠性。
- 训练流程稳定。
- WebDAV 同步安全。
- migration 可持续。

社区会分散注意力。

---

## 3. 明确不做清单

当前分支禁止新增：

- Login/Register 页面。
- auth store。
- JWT。
- user profile API。
- follow/follower。
- post/feed。
- comment。
- like。
- public workout page。
- online wiki API。
- moderation/admin。
- remote content CMS。

如果出现这些需求，必须先开新设计讨论，不得直接编码。

---

## 4. 本地替代能力

为了覆盖个人训练需要，保留以下本地能力：

### 4.1 动作说明

`ExerciseDoc.description` 保存动作说明。

用途：

- 用户自定义动作备注。
- 本地静态动作解释。

### 4.2 模板备注

`TemplateExerciseDoc.note` 保存模板内动作提示。

用途：

- 组数建议。
- 次数范围。
- 休息建议。
- 技术提示。

### 4.3 训练 note

`WorkoutDoc.note` 保存训练感受。

### 4.4 本地分享文本

`shareWorkout()` 生成本地分享文本，不上传服务器。

---

## 5. 未来可能恢复的条件

只有同时满足以下条件，才重新评估社区/Wiki：

- P0 核心训练链路稳定。
- P1 计划/模板/日历稳定。
- 本地 JSON schema migration 稳定。
- WebDAV 同步可靠。
- Android 构建发布稳定。
- 用户明确提出在线内容协作需求。
- 有可接受的低成本后端策略。

---

## 6. 未来可选路线

### 6.1 静态动作百科

形式：

```text
bundled JSON / markdown
```

优点：

- 不需要服务器。
- 可随版本发布。
- 可离线查看。

适用：

- 动作说明。
- 常见训练术语。

### 6.2 用户导入内容包

形式：

```text
exercise-pack.json
template-pack.json
```

优点：

- 仍然本地优先。
- 社区可通过 GitHub 分享文件。

### 6.3 微信小程序 CloudBase

仅在未来小程序路线成熟后评估。

可能能力：

- 云端备份。
- 内容分发。
- 简单分享。

但不能影响当前 Android 本地版。

---

## 7. 对代码结构的约束

当前代码不应出现：

```text
src/pages/LoginPage.tsx
src/pages/RegisterPage.tsx
src/store/auth.ts
src/services/api.ts
src/services/community.ts
src/services/wiki.ts
src/services/feed.ts
```

当前数据模型不应新增：

```text
UserAccountDoc
PostDoc
CommentDoc
LikeDoc
FollowDoc
WikiPageDoc
```

可接受：

```text
ExerciseDoc.description
TemplateExerciseDoc.note
WorkoutDoc.note
```

---

## 8. 验收检查

执行：

```bash
rg -n "LoginPage|RegisterPage|useAuthStore|access_token|refresh_token|JWT|community|wiki|feed|follow|comment|like" ironlog/frontend/src
```

期望：

- 当前运行路径无结果。
- 如文档中出现，只能是“已砍/不得做/未来评估”上下文。

---

## 9. 决策记录

当前分支把 P2 从“功能开发阶段”改为“砍掉功能归档阶段”。

这不是永久否定社区/Wiki，而是为当前单人版收缩范围，避免重复引入后端和账号系统。
