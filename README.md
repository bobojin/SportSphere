# 赛事管理系统

前后端分离的赛事运营工作台。

## 技术栈

- 前端：React + Vite
- 后端：Express
- 数据库：SQLite（Node `node:sqlite`）

## 当前能力

- 支持 10 个主流运动项目
- 支持 8 类主流赛制
- 支持赛事创建、状态流转、报名审核、任务推进
- 支持队伍单条录入与批量导入
- 支持自动赛程编排
  - 已实现：单败淘汰树、单循环、双循环 + 总决赛、小组赛 + 淘汰赛、双败首轮、资格赛 + 决赛
- 支持队伍详情与成绩统计
- 支持角色权限矩阵、当前操作者切换、角色调整
- 支持操作日志审计
- 支持示例数据一键重置

## 启动

推荐直接使用项目根目录脚本：

```bat
start.bat
stop.bat
restart.bat
```

脚本会固定使用 `4000` 端口。`stop.bat` 会优先按 `.sports-server.pid` 停止服务；如果 PID 文件失效，也会兜底识别并停止当前占用 `4000` 端口的旧进程。

开发环境里 `vite` 热更新服务受当前沙箱限制，稳定方式如下：

```bash
npm run build
npm start
```

启动后访问：

```text
http://localhost:4000
```

## 主要接口

- `GET /api/dashboard`
- `POST /api/users/current`
- `PATCH /api/users/:id/role`
- `POST /api/tournaments`
- `PATCH /api/tournaments/:id/status`
- `POST /api/tournaments/:id/teams`
- `POST /api/tournaments/:id/schedule`
- `PATCH /api/registrations/:id`
- `PATCH /api/tasks/:id`
- `PATCH /api/matches/:id`
- `POST /api/admin/reset-demo`

## 说明

- 当前服务已在本机 `4000` 端口启动。
- 我已经验证过“角色切换 -> 批量导入队伍 -> 自动编排赛程 -> 日志落库 -> 重置示例数据”整条链路。
