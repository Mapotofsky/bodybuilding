# IronLog 本地运行指南

## 环境要求

| 依赖 | 版本要求 |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| PostgreSQL | 16（或 14+） |
| npm | 9+ |

---

## 一、PostgreSQL 数据库准备

### 1. 启动 PostgreSQL 服务

确保 PostgreSQL 已安装并正在运行。Windows 下可在"服务"中查看 `postgresql-x64-16` 是否已启动。

### 2. 创建数据库

打开终端，用 `psql` 连接 PostgreSQL 并创建数据库：

```powershell
psql -U postgres
```

在 psql 交互界面中执行：

```sql
CREATE DATABASE ironlog;
```

输入 `\q` 退出 psql。

> **注意**：后端默认使用 `.env` 中配置的数据库连接串。当前配置为：
>  

```
> DATABASE_URL=postgresql+asyncpg://postgres:114514@localhost:5432/ironlog
> ```

> 如果你的 PostgreSQL 用户名或密码不同，请修改 `backend/.env` 文件。

---

## 二、后端启动

### 1. 进入后端目录

```powershell
cd d:\workspaces\vscodeWorkspace\project\bodybuilding\ironlog\backend
```

### 2. 创建 Python 虚拟环境

```powershell
python -m venv venv
```

### 3. 激活虚拟环境

```powershell
.\venv\Scripts\Activate.ps1
```

> 如果遇到 PowerShell 执行策略限制，先执行：
>  

```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### 4. 安装 Python 依赖

```powershell
pip install -r requirements.txt
```

> `pydantic-settings` 如果缺失，需额外安装：
>  

```powershell
> pip install pydantic-settings
> ```

### 5. 运行数据库迁移

```powershell
alembic upgrade head
```

此命令会根据 `alembic/versions/` 中的迁移脚本创建所有数据表。

### 6. 启动后端服务

```powershell
uvicorn app.main:app --reload --port 8000
```

启动成功后会看到类似输出：

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

### 7. 验证后端

浏览器访问 [http://localhost:8000/health](http://localhost:8000/health)，应返回：

```json
{"status": "ok"}
```

API 文档地址：[http://localhost:8000/docs](http://localhost:8000/docs)

---

## 三、前端启动

**打开一个新的终端窗口**（后端需保持运行）。

### 1. 进入前端目录

```powershell
cd d:\workspaces\vscodeWorkspace\project\bodybuilding\ironlog\frontend
```

### 2. 安装 Node.js 依赖

```powershell
npm install
```

### 3. 启动前端开发服务器

```powershell
npm run dev
```

启动成功后会看到类似输出：

```
  VITE v5.4.7  ready in 300 ms

  ➜  Local:   http://localhost:5173/
```

### 4. 访问应用

浏览器打开 [http://localhost:5173](http://localhost:5173)

> 前端通过 Vite 代理将 `/api` 请求转发到 `http://localhost:8000` ，
> 因此**后端必须同时运行**才能正常使用。

---

## 四、使用流程

1. 打开 `http://localhost:5173`，页面会自动跳转到 **登录页**
2. 点击"注册"创建新账户（邮箱 + 密码，密码至少 6 位）
3. 注册成功后自动登录，进入**首页**
4. 点击"开始训练"进入**新建训练页**，可：
   - 启动计时器
   - 选择动作、添加组数
   - 切换 kg/lb 单位
   - 记录重量和次数
5. 保存后可在**训练列表**和**训练详情**中查看
6. 训练详情页支持：编辑、复制、分享、删除
7. **个人中心**可编辑昵称、身高、体重等信息

---

## 五、常用命令速查

| 操作 | 命令 | 工作目录 |
|------|------|---------|
| 激活虚拟环境 | `.\venv\Scripts\Activate.ps1` | `backend/` |
| 启动后端 | `uvicorn app.main:app --reload --port 8000` | `backend/` |
| 启动前端 | `npm run dev` | `frontend/` |
| 数据库迁移 | `alembic upgrade head` | `backend/` |
| 前端构建 | `npm run build` | `frontend/` |
| 查看 API 文档 | 浏览器打开 `http://localhost:8000/docs` | — |

---

## 六、常见问题

### Q: `ModuleNotFoundError: No module named 'app'`

A: 确保在 `backend/` 目录下运行命令，并且虚拟环境已激活。

### Q: `ModuleNotFoundError: No module named 'pydantic_settings'`

A: 执行 `pip install pydantic-settings` 。

### Q: Alembic 迁移失败 / 数据库连接错误

A: 检查 PostgreSQL 是否启动，以及 `backend/.env` 中的 `DATABASE_URL` 配置是否与你的数据库一致。

### Q: 前端页面白屏或接口 404

A: 确认后端服务正在 8000 端口运行，前端 Vite 代理才能正常转发。

### Q: PowerShell 执行策略报错

A: 执行 `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` 后重试。
