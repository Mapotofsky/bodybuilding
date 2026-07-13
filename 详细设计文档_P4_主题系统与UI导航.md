# P4 详细设计文档：主题系统与 UI 导航

> 对应概要设计：M5 主题与 UI 导航，以及 M2 动作库 Tab
> 状态：已实现；动作库路由、五项底部导航、主题选择、完整 token 与 Tailwind 兼容语义映射已落地；当前候选已完成自动布局与 API 36 AVD 视觉验收
> 依赖：P2 Settings/migration，P1 动作库，P3 Android，P0 训练页面回归

---

## 1. 范围与依赖

本模块定义完整主题、主题选择持久化、UI 语义 token、底部导航和动作库 Tab。它不改变训练、计划、模板、动作或 WebDAV 的业务语义；不新增账号、云端主题库或服务端配置。

当前事实：`index.css` 已定义 5 套完整语义 token，并通过 Tailwind 兼容变量将页面保留的 emerald/slate 工具类映射到当前主题角色；这些类名不再代表固定颜色。Layout 的底部导航已包含首页、动作库、计划、日历、我的五项，`/exercises` 与 `/exercises/:id` 路由已实现。主题数据链路与语义映射已完成；当前候选已通过 360px、412px 与横屏自动布局测试，以及 Android 16（API 36）AVD 的 411px WebView 五主题视觉核对。

---

## 2. 主题数据与完整主题定义

P4 在 SettingsDoc 保存 themeId。稳定 ID、名称和完整角色如下；5 套主题均以语义 CSS token 实现，SettingsPage 可选择主题，应用根节点、底部导航和页面 Tailwind 兼容色彩均消费当前主题 token。

| ID | 名称 | 背景/表面 | 主色/焦点 | 正文/次要文字 | 边框 | 成功/警告/危险 |
|---|---|---|---|---|---|---|
| emerald-slate | 翠绿石板（默认） | #F1F5F9 / #FFFFFF | #10B981 / #059669 | #0F172A / #64748B | #E2E8F0 | #10B981 / #F59E0B / #EF4444 |
| forest-parchment | 森林羊皮纸 | #F6F5EE / #FFFEF8 | #2F6B4F / #24543E | #1F2D25 / #66736A | #D8DDD3 | #2F6B4F / #B7791F / #B84A4A |
| sunset-coral | 夕照珊瑚 | #FFF7F3 / #FFFFFF | #D95D39 / #B94728 | #34201A / #7A625A | #F0D7CD | #2E8B6B / #B7791F / #C43D3D |
| violet-ink | 紫墨纸 | #F8F6FC / #FFFFFF | #6D4AA2 / #553783 | #241B31 / #756B82 | #E3DCEC | #2E8B6B / #A86D16 / #B33D57 |
| graphite-lime | 石墨青柠 | #161A1B / #202627 | #A3D94C / #C1F06A | #F2F5EF / #B7C0B8 | #394142 | #77C66E / #E0B34B / #F07171 |

“完整主题”至少覆盖页面背景、surface、二级 surface、正文、次要文字、边框、primary、focus ring、success、warning、danger、禁用与图表/状态色。不能只替换按钮主色。

未知 themeId 的规则：持久化层保留原字符串；主题解析层渲染 emerald-slate，并可显示“此设备不支持所选主题”的非阻塞提示。不得把未知值自动写回默认值。

---

## 3. 页面、服务、仓储调用链

    SettingsPage 主题选择
      -> services/settings
      -> LocalJsonRepository.updateSettings()
      -> DocumentStore.save()
      -> settings.json
      -> SyncService 的非秘密 settings 同步

    应用根节点
      -> resolveTheme(themeId)
      -> 在根元素设置 data-theme
      -> 语义 CSS variables / 语义组件 class
      -> 页面和共享组件

当前已存在 services/settings；实现时不得让页面直接访问 localRepository。P4 补齐 themeId 的模型、migration、仓储和序列化，P3 负责远端 settings 秘密清空规则。

---

## 4. UI 与导航规则

1. 页面视觉角色由语义 token、共享组件或 `index.css` 中的 Tailwind 兼容变量统一解析；不得以 emerald/slate 类名搜索结果单独判断迁移状态。
2. @layer base 内的全局 margin/padding reset 必须保留；不得以未分层全局样式覆盖 Tailwind 的间距工具类。
3. 默认主题继续是 emerald/slate，并作为未知值和迁移失败的视觉回退。
4. 动作库已新增 /exercises 路由与底部“动作库”Tab。列表使用 P1 的 getExercises，进入现有 /exercises/:id。
5. 根布局必须是唯一滚动容器：`html`、`body`、`#root` 不参与页面滚动；`app-shell` 使用 `100dvh`（`100vh` 回退）并裁切溢出，`app-main` 使用 `flex: 1`、`min-block-size: 0` 和 `overflow-y: auto`。每个路由页面根使用 `app-page` 的 `min-block-size: 100%`，短内容铺满主区，长内容只由 `app-main` 滚动。路由页中的内联选择器、列表和表单不得另建 `overflow-y` 滚动区；仅模态层可依第 10 条独立滚动。
6. 五项底部导航是 `app-shell` 的流内非滚动 sibling，不使用 fixed 覆盖内容；其高度统一由 `--app-tabbar-height` 表示，包含底部 safe area。页面不得再用 `pb-24`、`bottom-20` 或 `bottom-24` 猜测 Tab 高度；FAB 和训练固定操作通过同一 token 定位，且为自身覆盖范围保留明确内容末端空间。
7. 五项底部导航必须重新评估最小触控区域、活动状态、文字截断、safe area 与 360px/412px 宽度。固定按钮与可增长内容使用 Grid 的固定列加 minmax(0, 1fr)，或同时限制 min-w-0/shrink-0。
8. 主题色不得降低文本、边框、错误、禁用、焦点状态与图标的可辨识性。Android-first 不要求系统深色模式跟随；是否跟随系统主题是待决策项。
9. 全局确认继续使用 ConfirmDialog，通知使用 Toast。主题改造不得引入 window.confirm、window.alert 或 window.prompt。
10. bottom sheet、确认框、Toast 和其他模态层可以使用 fixed 并高于流内底部导航；sheet 消费底部 safe area，独立滚动内容使用 `dvh`，不能让导航遮住最后一项。组间休息页不再是 fixed 特例，而是填满 `app-main` 的不可滚动页面。

---

## 5. 迁移、同步与异常

P2 权威定义 themeId 的模型、migration、未知值持久化与本地提交；P3 权威定义 settings 同步、远端秘密清空和失败语义。P4 仅要求这些依赖使主题选择可恢复，且未知/损坏/缺失 themeId 或可选主题资源失败时，UI 使用默认 token 而不阻塞启动、同步或训练。

---

## 6. 测试与验收

自动测试：主题解析、默认/未知值视觉回退和主题 token 基本完整性；`npm run test:layout` 用 Chrome 在 360px、412px 和横屏验证短页的根视口尺寸、长页仅主区滚动及底部导航位置；同时从 WorkoutCreatePage 具体动作按钮发出模拟触摸上滑，验证只有 `app-main` 位移且 Tab 位置不变。migration、设置 LWW 与远端秘密清空测试由 P2/P3 权威维护。

人工验收：5 套主题逐一检查首页、训练创建/详情、计划、日历、动作库、资料和同步页；360px、412px 和横屏 Android WebView 无溢出/裁切，短页没有 document 滚动，长页只滚动主内容区，Tab 不遮挡最后内容；聚焦底部输入框后软键盘不遮挡焦点、Tab 或提交操作；文字、边框、焦点、危险按钮、禁用状态均可辨识；切换主题后刷新、重启、WebDAV 同步到另一设备仍符合 unknown fallback 语义。

当前主题选择、完整 token、Tailwind 兼容语义映射与解析测试已实现。`0.1.0-internal.2` 候选的自动测试覆盖 360px、412px 与横屏；Android 16（API 36）AVD 在 411px WebView 下逐套核对 5 套主题，未发现严重不可读、Tab 遮挡或横向溢出。软键盘、手势安全区和厂商 WebView 差异仍需按目标设备人工步骤确认，不得由 AVD 结果外推。
