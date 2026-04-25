import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  initializeDatabase,
  getDashboardData,
  resetDemoData,
  createTournament,
  deleteTournament,
  addEntriesToTournament,
  generateSchedule,
  switchCurrentUser,
  updateUserRole,
  updateTournamentStatus,
  updateRegistrationStatus,
  createTask,
  updateTaskStatus,
  updateMatchStatus,
  loginUser,
  logoutUser,
  getSessionUser
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const clientDist = path.join(rootDir, "dist", "client");
const homepageDir = path.join(rootDir, "homepage");

initializeDatabase();

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());
app.use("/homepage", express.static(homepageDir));

function parseCookies(header) {
  return String(header || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((map, entry) => {
      const index = entry.indexOf("=");
      if (index === -1) return map;
      const key = entry.slice(0, index).trim();
      const value = decodeURIComponent(entry.slice(index + 1).trim());
      map[key] = value;
      return map;
    }, {});
}

function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", `sports_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "sports_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

app.use((req, _res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  const user = getSessionUser(cookies.sports_session);
  req.sessionToken = cookies.sports_session || "";
  req.currentUser = user || null;
  next();
});

function requireAuth(req, res, next) {
  if (!req.currentUser) {
    res.status(401).json({ error: "请先登录" });
    return;
  }
  next();
}

app.get("/api/dashboard", (req, res) => {
  res.json(getDashboardData(req.currentUser?.id));
});

app.post("/api/auth/login", (req, res) => {
  try {
    const result = loginUser(req.body?.identifier, req.body?.password);
    setSessionCookie(res, result.session.token);
    res.json({ dashboard: getDashboardData(result.user.id) });
  } catch (error) {
    res.status(401).json({ error: error.message || "登录失败" });
  }
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  try {
    logoutUser(req.sessionToken, req.currentUser.id);
    clearSessionCookie(res);
    res.json({ dashboard: getDashboardData() });
  } catch (error) {
    res.status(400).json({ error: error.message || "退出失败" });
  }
});

app.post("/api/admin/reset-demo", requireAuth, (req, res) => {
  try {
    if (!req.currentUser.permissions.includes("admin:reset")) {
      res.status(403).json({ error: "当前账号无权重置示例数据" });
      return;
    }
    resetDemoData();
    clearSessionCookie(res);
    res.json({ dashboard: getDashboardData() });
  } catch (error) {
    res.status(500).json({ error: error.message || "重置示例数据失败" });
  }
});

app.post("/api/users/current", requireAuth, (req, res) => {
  try {
    switchCurrentUser(req.body?.userId, req.currentUser.id);
    res.json({ dashboard: getDashboardData(req.currentUser.id) });
  } catch (error) {
    res.status(400).json({ error: error.message || "切换用户失败" });
  }
});

app.patch("/api/users/:id/role", requireAuth, (req, res) => {
  try {
    updateUserRole(req.params.id, req.body?.role, req.currentUser.id);
    res.json({ dashboard: getDashboardData(req.currentUser.id) });
  } catch (error) {
    res.status(400).json({ error: error.message || "更新角色失败" });
  }
});

app.post("/api/tournaments", requireAuth, (req, res) => {
  try {
    const payload = req.body || {};

    if (!payload.name || !payload.sportId || !payload.formatId || !payload.startDate || !payload.endDate) {
      res.status(400).json({ error: "创建赛事缺少必要字段" });
      return;
    }

    const createdTournamentId = createTournament({ ...payload, actorId: req.currentUser.id });
    res.status(201).json({
      createdTournamentId,
      dashboard: getDashboardData(req.currentUser.id)
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "创建赛事失败" });
  }
});

app.patch("/api/tournaments/:id/status", requireAuth, (req, res) => {
  try {
    updateTournamentStatus(req.params.id, req.body?.status, req.currentUser.id);
    res.json({ dashboard: getDashboardData(req.currentUser.id) });
  } catch (error) {
    res.status(400).json({ error: error.message || "更新赛事状态失败" });
  }
});

app.delete("/api/tournaments/:id", requireAuth, (req, res) => {
  try {
    deleteTournament(req.params.id, req.currentUser.id);
    res.json({ deletedTournamentId: req.params.id, dashboard: getDashboardData(req.currentUser.id) });
  } catch (error) {
    res.status(400).json({ error: error.message || "删除赛事失败" });
  }
});

app.post("/api/tournaments/:id/teams", requireAuth, (req, res) => {
  try {
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];

    if (entries.length === 0) {
      res.status(400).json({ error: "至少需要一条参赛主体信息" });
      return;
    }

    addEntriesToTournament(req.params.id, entries, req.currentUser.id);
    res.status(201).json({ dashboard: getDashboardData(req.currentUser.id) });
  } catch (error) {
    res.status(400).json({ error: error.message || "新增参赛主体失败" });
  }
});

app.post("/api/tournaments/:id/schedule", requireAuth, (req, res) => {
  try {
    generateSchedule(req.params.id, req.currentUser.id);
    res.json({ dashboard: getDashboardData(req.currentUser.id) });
  } catch (error) {
    res.status(400).json({ error: error.message || "生成赛程失败" });
  }
});

app.patch("/api/registrations/:id", requireAuth, (req, res) => {
  try {
    updateRegistrationStatus(req.params.id, req.body?.status, req.currentUser.id);
    res.json({ dashboard: getDashboardData(req.currentUser.id) });
  } catch (error) {
    res.status(400).json({ error: error.message || "更新报名状态失败" });
  }
});

app.patch("/api/tasks/:id", requireAuth, (req, res) => {
  try {
    updateTaskStatus(req.params.id, req.body?.status, req.currentUser.id);
    res.json({ dashboard: getDashboardData(req.currentUser.id) });
  } catch (error) {
    res.status(400).json({ error: error.message || "更新任务状态失败" });
  }
});

app.post("/api/tasks", requireAuth, (req, res) => {
  try {
    createTask(req.body || {}, req.currentUser.id);
    res.status(201).json({ dashboard: getDashboardData(req.currentUser.id) });
  } catch (error) {
    res.status(400).json({ error: error.message || "创建任务失败" });
  }
});

app.patch("/api/matches/:id", requireAuth, (req, res) => {
  try {
    updateMatchStatus(
      req.params.id,
      {
        status: req.body?.status,
        streamStatus: req.body?.streamStatus,
        homeScore: req.body?.homeScore,
        awayScore: req.body?.awayScore
      },
      req.body?.streamStatus,
      req.currentUser.id
    );
    res.json({ dashboard: getDashboardData(req.currentUser.id) });
  } catch (error) {
    res.status(400).json({ error: error.message || "更新场次失败" });
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientDist));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`);
});
