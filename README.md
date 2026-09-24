# IronLog

IronLog 是开源、Android-first、本地优先的单人训练日志应用。它支持离线训练记录、计划与模板、动作库、日历与统计；业务数据保存在本地 JSON 文档分片中。WebDAV 可用于手动同步和备份，应用不需要账号或业务服务器。

## 本地启动

在 `ironlog/frontend` 中执行：

```bash
npm install
npm run dev
```

开发测试、Android 调试和环境要求见[开发与验证](docs/guides/开发与验证.md)；APK 构建、签名及升级见[发布与升级](docs/guides/发布与升级.md)。

## 当前限制

- WebDAV 使用手动同步和按文档时间选择的 LWW 合并，不提供实时或无冲突协作；远端备份目前没有应用内恢复界面。
- AI 配置、问答、联网 agent 和候选计划导入尚未实现。
- 卸载 Android 应用或清除应用数据会删除设备上的本地副本；重要数据应先确认 WebDAV 同步成功。

按任务查找当前设计与操作说明，请从[文档入口](docs/README.md)开始。默认动作目录的生成输入位于[`candidates.md`](docs/data_import/candidates.md)。
