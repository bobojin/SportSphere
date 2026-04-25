import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "sports.db");
const homepageDir = path.join(__dirname, "..", "homepage");
const homepageDataDir = path.join(homepageDir, "data");
const homepageTournamentDataDir = path.join(homepageDataDir, "tournaments");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");

function run(sql, params = {}) {
  const statement = db.prepare(sql);
  if (Array.isArray(params)) {
    return statement.run(...params);
  }
  return statement.run(params);
}

function all(sql, params = {}) {
  const statement = db.prepare(sql);
  if (Array.isArray(params)) {
    return statement.all(...params);
  }
  return statement.all(params);
}

function get(sql, params = {}) {
  const statement = db.prepare(sql);
  if (Array.isArray(params)) {
    return statement.get(...params);
  }
  return statement.get(params);
}

function json(value) {
  return JSON.stringify(value);
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const ROLE_LABELS = {
  admin: "系统管理员",
  director: "赛事总监",
  scheduler: "编排专员",
  registrar: "报名审核",
  operations: "现场运营",
  viewer: "只读观察"
};

const ROLE_PERMISSIONS = {
  admin: [
    "tournament:create",
    "tournament:update",
    "tournament:delete",
    "team:manage",
    "schedule:generate",
    "registration:review",
    "task:manage",
    "match:update",
    "user:manage",
    "admin:reset"
  ],
  director: [
    "tournament:create",
    "tournament:update",
    "tournament:delete",
    "team:manage",
    "schedule:generate",
    "registration:review",
    "task:manage",
    "match:update",
    "user:manage"
  ],
  scheduler: ["team:manage", "schedule:generate", "match:update"],
  registrar: ["team:manage", "registration:review"],
  operations: ["task:manage", "match:update"],
  viewer: []
};

const PERMISSION_CATALOG = [
  { id: "tournament:create", label: "创建赛事", roles: ["admin", "director"] },
  { id: "tournament:update", label: "调整赛事状态", roles: ["admin", "director"] },
  { id: "tournament:delete", label: "删除赛事", roles: ["admin", "director"] },
  { id: "team:manage", label: "管理队伍", roles: ["admin", "director", "scheduler", "registrar"] },
  { id: "schedule:generate", label: "自动编排", roles: ["admin", "director", "scheduler"] },
  { id: "registration:review", label: "审核报名", roles: ["admin", "director", "registrar"] },
  { id: "task:manage", label: "推进任务", roles: ["admin", "director", "operations"] },
  { id: "match:update", label: "更新比赛", roles: ["admin", "director", "scheduler", "operations"] },
  { id: "user:manage", label: "管理角色", roles: ["admin", "director"] },
  { id: "admin:reset", label: "重置示例数据", roles: ["admin"] }
];

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function sanitizeStatus(value, allowed) {
  return allowed.includes(value) ? value : allowed[0];
}

function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

function hasColumn(tableName, columnName) {
  const columns = all(`PRAGMA table_info(${tableName})`);
  return columns.some((column) => column.name === columnName);
}

function hasTable(tableName) {
  return Boolean(get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [tableName])?.name);
}

function ensureColumn(tableName, columnName, definition) {
  if (!hasColumn(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

const ENTRY_MODE_CONFIG = {
  team: {
    mode: "team",
    singular: "队伍",
    plural: "队伍",
    pageLabel: "参赛单位",
    pageTitle: "队伍与报名",
    pageDescription: "当前页面只处理队伍与报名。新增和批量导入使用抽屉，不再把表单摊在正文。",
    createLabel: "新增队伍",
    createTitle: "新增队伍",
    createDescription: "队伍录入使用抽屉，页面主体只保留参赛信息与报名审核。",
    bulkTitle: "批量导入队伍",
    bulkDescription: "批量导入保留在抽屉里，正文只做结果查看与审核。",
    bulkHint: "每行一支队伍，格式：名称, 地区, 教练",
    nameLabel: "队伍名称",
    shortNameLabel: "简称",
    organizationLabel: "俱乐部",
    regionLabel: "地区",
    coachLabel: "教练",
    contactLabel: "队长",
    metaLabel: "地区 / 负责人",
    coachContactLabel: "教练 / 队长",
    memberCountLabel: "参赛人数",
    detailTitle: "队伍详情",
    countSummaryLabel: "正式队伍",
    unit: "支",
    defaultParticipantCount: 12
  },
  participant: {
    mode: "participant",
    singular: "选手",
    plural: "选手",
    pageLabel: "参赛主体",
    pageTitle: "选手与报名",
    pageDescription: "当前页面只处理选手与报名。个人项目不再伪装成队伍模型。",
    createLabel: "新增选手",
    createTitle: "新增选手",
    createDescription: "选手录入使用抽屉，页面主体只保留选手名册、成绩与报名审核。",
    bulkTitle: "批量导入选手",
    bulkDescription: "批量导入选手名单，页面主体只保留结果与审核。",
    bulkHint: "每行一名选手，格式：姓名, 地区, 教练",
    nameLabel: "选手姓名",
    shortNameLabel: "显示简称",
    organizationLabel: "所属机构",
    regionLabel: "地区",
    coachLabel: "教练",
    contactLabel: "联系人",
    metaLabel: "地区 / 机构",
    coachContactLabel: "教练 / 联系人",
    memberCountLabel: "随队人数",
    detailTitle: "选手详情",
    countSummaryLabel: "正式选手",
    unit: "人",
    defaultParticipantCount: 1
  },
  entry: {
    mode: "entry",
    singular: "参赛单元",
    plural: "参赛单元",
    pageLabel: "参赛主体",
    pageTitle: "参赛单元与报名",
    pageDescription: "当前页面统一处理参赛单元与报名，适配单打、双打或组合报名场景。",
    createLabel: "新增参赛单元",
    createTitle: "新增参赛单元",
    createDescription: "参赛单元录入使用抽屉，页面主体只保留参赛信息与审核流程。",
    bulkTitle: "批量导入参赛单元",
    bulkDescription: "批量导入参赛单元名单，页面主体只保留结果与审核。",
    bulkHint: "每行一个参赛单元，格式：名称, 地区, 教练",
    nameLabel: "参赛单元名称",
    shortNameLabel: "显示简称",
    organizationLabel: "所属机构",
    regionLabel: "地区",
    coachLabel: "教练",
    contactLabel: "联系人",
    metaLabel: "地区 / 机构",
    coachContactLabel: "教练 / 联系人",
    memberCountLabel: "成员数量",
    detailTitle: "参赛单元详情",
    countSummaryLabel: "正式参赛单元",
    unit: "项",
    defaultParticipantCount: 2
  }
};

function getEntryMode(participantsType) {
  if (participantsType === "individual") return "participant";
  if (participantsType === "single_double") return "entry";
  return "team";
}

function getEntryConfig(modeOrParticipantsType) {
  if (ENTRY_MODE_CONFIG[modeOrParticipantsType]) {
    return ENTRY_MODE_CONFIG[modeOrParticipantsType];
  }

  return ENTRY_MODE_CONFIG[getEntryMode(modeOrParticipantsType)] || ENTRY_MODE_CONFIG.team;
}

function addDays(dateString, offset) {
  const date = new Date(`${dateString}T09:00:00+08:00`);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function addHours(dateString, hourOffset) {
  const date = new Date(`${dateString}T09:00:00+08:00`);
  date.setHours(date.getHours() + hourOffset);
  return date.toISOString();
}

function getBracketSize(teamCount) {
  return 2 ** Math.ceil(Math.log2(Math.max(2, teamCount)));
}

function buildSeedOrder(size) {
  let order = [1, 2];

  while (order.length < size) {
    const nextSize = order.length * 2;
    const next = [];

    for (const seed of order) {
      next.push(seed, nextSize + 1 - seed);
    }

    order = next;
  }

  return order;
}

function calculateGroupStageMatches(teamCount) {
  const groups = Math.max(2, Math.min(4, teamCount >= 16 ? 4 : Math.ceil(teamCount / 4)));
  const baseSize = Math.floor(teamCount / groups);
  const remainder = teamCount % groups;
  let total = 0;

  for (let index = 0; index < groups; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0);
    total += Math.max(0, (size * (size - 1)) / 2);
  }

  return total;
}

function getKnockoutPlaceholderCount(teamCount) {
  const bracketSize = getBracketSize(teamCount);
  return bracketSize - teamCount + Math.max(0, bracketSize - 2);
}

function getDoubleEliminationPlaceholderCount(teamCount) {
  const bracketSize = getBracketSize(teamCount);
  return bracketSize * 3;
}

function createStageBlueprints(formatId, tournamentId, startDate, endDate, teamCount) {
  const base = {
    tournamentId,
    status: "筹备中",
    startDate,
    endDate
  };

  if (formatId === "group-knockout") {
    const qualifierCount = Math.max(4, Math.min(8, Math.max(2, Math.min(4, teamCount >= 16 ? 4 : Math.ceil(teamCount / 4))) * 2));
    return [
      {
        ...base,
        id: createId("stage"),
        name: "小组赛",
        stageType: "group",
        sequenceNo: 1,
        participantScope: `${teamCount} 队分组`,
        rulesSummary: "组内单循环，按排名晋级淘汰赛。",
        matchesPlanned: Math.max(4, calculateGroupStageMatches(teamCount))
      },
      {
        ...base,
        id: createId("stage"),
        name: "淘汰赛",
        stageType: "knockout",
        sequenceNo: 2,
        participantScope: `${qualifierCount} 队晋级`,
        rulesSummary: "小组晋级队伍交叉淘汰直至决赛。",
        matchesPlanned: qualifierCount - 1
      }
    ];
  }

  if (formatId === "double-round-robin") {
    return [
      {
        ...base,
        id: createId("stage"),
        name: "常规赛",
        stageType: "league",
        sequenceNo: 1,
        participantScope: `${teamCount} 队`,
        rulesSummary: "主客场双循环积分排名。",
        matchesPlanned: Math.max(2, teamCount * (teamCount - 1))
      },
      {
        ...base,
        id: createId("stage"),
        name: "总决赛",
        stageType: "knockout",
        sequenceNo: 2,
        participantScope: "前四晋级",
        rulesSummary: "前四进入淘汰赛，决出赛季冠军。",
        matchesPlanned: 3
      }
    ];
  }

  if (formatId === "double-elimination") {
    const bracketSize = getBracketSize(teamCount);
    return [
      {
        ...base,
        id: createId("stage"),
        name: "胜者组",
        stageType: "upper-bracket",
        sequenceNo: 1,
        participantScope: `${teamCount} 队`,
        rulesSummary: "全部参赛队从胜者组出发。",
        matchesPlanned: Math.max(1, bracketSize - 1)
      },
      {
        ...base,
        id: createId("stage"),
        name: "败者组",
        stageType: "lower-bracket",
        sequenceNo: 2,
        participantScope: "败者组流转",
        rulesSummary: "败者组承接落败队伍并产生挑战者。",
        matchesPlanned: Math.max(1, bracketSize - 2)
      },
      {
        ...base,
        id: createId("stage"),
        name: "总决赛",
        stageType: "grand-final",
        sequenceNo: 3,
        participantScope: "胜者组冠军 vs 败者组冠军",
        rulesSummary: "总决赛支持双败重置。",
        matchesPlanned: 2
      }
    ];
  }

  if (formatId === "time-qualifier-final") {
    return [
      {
        ...base,
        id: createId("stage"),
        name: "预赛",
        stageType: "qualifier",
        sequenceNo: 1,
        participantScope: `${teamCount} 队 / 人`,
        rulesSummary: "资格赛按成绩晋级决赛。",
        matchesPlanned: Math.max(2, teamCount)
      },
      {
        ...base,
        id: createId("stage"),
        name: "决赛",
        stageType: "final",
        sequenceNo: 2,
        participantScope: "A/B 决赛",
        rulesSummary: "按资格赛成绩编排决赛。",
        matchesPlanned: 1
      }
    ];
  }

  const single = createDefaultStageForFormat(formatId, tournamentId, startDate, endDate, teamCount);
  return [single];
}

function createDefaultStageForFormat(formatId, tournamentId, startDate, endDate, teamCount) {
  const defaults = {
    "single-elimination": {
      name: "淘汰赛",
      stageType: "knockout",
      participantScope: `${teamCount} 队`,
      rulesSummary: "单败淘汰，自动生成对阵树。",
      matchesPlanned: Math.max(1, teamCount - 1)
    },
    "double-elimination": {
      name: "双败阶段",
      stageType: "double-elimination",
      participantScope: `${teamCount} 队`,
      rulesSummary: "胜败者组并行，支持总决赛重置。",
      matchesPlanned: Math.max(2, teamCount * 2 - 2)
    },
    "round-robin": {
      name: "循环赛",
      stageType: "league",
      participantScope: `${teamCount} 队`,
      rulesSummary: "单循环积分排名。",
      matchesPlanned: Math.max(1, Math.floor((teamCount * (teamCount - 1)) / 2))
    },
    "double-round-robin": {
      name: "常规赛",
      stageType: "league",
      participantScope: `${teamCount} 队`,
      rulesSummary: "主客场双循环积分排名。",
      matchesPlanned: Math.max(2, teamCount * (teamCount - 1))
    },
    "group-knockout": {
      name: "小组赛",
      stageType: "group",
      participantScope: `${teamCount} 队分组`,
      rulesSummary: "小组排名决定淘汰赛晋级名额。",
      matchesPlanned: Math.max(4, calculateGroupStageMatches(teamCount))
    },
    swiss: {
      name: "瑞士轮",
      stageType: "swiss",
      participantScope: `${teamCount} 队 / 人`,
      rulesSummary: "按战绩动态配对。",
      matchesPlanned: Math.max(3, Math.ceil(Math.log2(teamCount)) * Math.floor(teamCount / 2))
    },
    ladder: {
      name: "阶梯挑战",
      stageType: "ladder",
      participantScope: `${teamCount} 队 / 人`,
      rulesSummary: "按席位发起挑战并动态调整排名。",
      matchesPlanned: Math.max(3, teamCount)
    },
    "time-qualifier-final": {
      name: "预赛",
      stageType: "qualifier",
      participantScope: `${teamCount} 队 / 人`,
      rulesSummary: "资格赛按成绩晋级决赛。",
      matchesPlanned: Math.max(2, teamCount)
    }
  };

  const fallback = defaults["group-knockout"];
  const config = defaults[formatId] || fallback;

  return {
    id: createId("stage"),
    tournamentId,
    name: config.name,
    stageType: config.stageType,
    sequenceNo: 1,
    status: "筹备中",
    participantScope: config.participantScope,
    rulesSummary: config.rulesSummary,
    matchesPlanned: config.matchesPlanned,
    startDate,
    endDate
  };
}

function insertStage(stage) {
  run(
    `
      INSERT INTO tournament_stages (
        id, tournament_id, name, stage_type, sequence_no, status, participant_scope,
        rules_summary, matches_planned, start_date, end_date
      ) VALUES (
        @id, @tournamentId, @name, @stageType, @sequenceNo, @status, @participantScope,
        @rulesSummary, @matchesPlanned, @startDate, @endDate
      )
    `,
    stage
  );
}

function insertTask(task) {
  run(
    `
      INSERT INTO operation_tasks (
        id, tournament_id, title, category, assignee, priority, due_date, status
      ) VALUES (
        @id, @tournamentId, @title, @category, @assignee, @priority, @dueDate, @status
      )
    `,
    task
  );
}

function serializeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    role: user.role,
    title: user.title,
    email: user.email,
    status: user.status,
    lastActiveAt: user.last_active_at,
    roleLabel: ROLE_LABELS[user.role] || user.role,
    permissions: permissionsForRole(user.role)
  };
}

function getCurrentUser(userId) {
  const resolvedUserId =
    userId ||
    get("SELECT state_value FROM app_state WHERE state_key = 'current_user_id'")?.state_value;

  return (
    get("SELECT * FROM users WHERE id = ?", [resolvedUserId]) ||
    get("SELECT * FROM users ORDER BY rowid ASC LIMIT 1")
  );
}

function getUserBySessionToken(token) {
  if (!token) return null;

  const session = get(
    `
      SELECT
        s.id AS session_id,
        s.user_id,
        s.token,
        s.created_at AS session_created_at,
        s.expires_at,
        u.id,
        u.name,
        u.role,
        u.title,
        u.email,
        u.password,
        u.status,
        u.last_active_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ?
    `,
    [token]
  );

  if (!session) {
    return null;
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    run("DELETE FROM sessions WHERE id = ?", [session.session_id]);
    return null;
  }

  return {
    id: session.user_id,
    name: session.name,
    role: session.role,
    title: session.title,
    email: session.email,
    password: session.password,
    status: session.status,
    last_active_at: session.last_active_at
  };
}

function createSession(userId) {
  run("DELETE FROM sessions WHERE user_id = ?", [userId]);

  const session = {
    id: createId("session"),
    userId,
    token: createId("token"),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString()
  };

  run(
    `
      INSERT INTO sessions (id, user_id, token, created_at, expires_at)
      VALUES (@id, @userId, @token, @createdAt, @expiresAt)
    `,
    session
  );

  return session;
}

function clearSession(token) {
  if (!token) return;
  run("DELETE FROM sessions WHERE token = ?", [token]);
}

function requirePermission(userId, permission) {
  const user = getCurrentUser(userId);

  if (!user) {
    throw new Error("当前用户不存在");
  }

  if (!permissionsForRole(user.role).includes(permission)) {
    throw new Error(`${ROLE_LABELS[user.role] || user.role} 无权执行 ${permission}`);
  }

  return user;
}

function insertLog({ actor, action, targetType, targetId, targetName, detail = {} }) {
  run(
    `
      INSERT INTO activity_logs (
        id, actor_id, actor_name, actor_role, action, target_type, target_id, target_name, detail_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      createId("log"),
      actor.id,
      actor.name,
      actor.role,
      action,
      targetType,
      targetId,
      targetName,
      json(detail),
      new Date().toISOString()
    ]
  );
}

function listTournamentEntries(tournamentId) {
  return all(
    `
      SELECT *
      FROM entries
      WHERE tournament_id = ?
      ORDER BY seed_no ASC, name ASC
    `,
    [tournamentId]
  ).map((row) => parseJsonFields(row, ["stats_json"]));
}

function listTournamentStages(tournamentId) {
  return all(
    `
      SELECT *
      FROM tournament_stages
      WHERE tournament_id = ?
      ORDER BY sequence_no ASC
    `,
    [tournamentId]
  );
}

function listTournamentMatches(tournamentId) {
  return all(
    `
      SELECT
        m.*,
        h.name AS home_entry_name,
        a.name AS away_entry_name
      FROM matches m
      JOIN entries h ON h.id = m.home_team_id
      JOIN entries a ON a.id = m.away_team_id
      WHERE m.tournament_id = ?
      ORDER BY m.sort_order ASC, m.scheduled_at ASC
    `,
    [tournamentId]
  ).map((row) => ({
    ...row,
    home_team_name: row.home_entry_name,
    away_team_name: row.away_entry_name
  }));
}

function getTournamentById(tournamentId) {
  return get(
    `
      SELECT
        t.*,
        s.participants_type,
        s.name AS sport_name,
        s.icon AS sport_icon,
        f.name AS format_name
      FROM tournaments t
      JOIN sports s ON s.id = t.sport_id
      JOIN competition_formats f ON f.id = t.format_id
      WHERE t.id = ?
    `,
    [tournamentId]
  );
}

function deleteTournamentMatches(tournamentId) {
  run("DELETE FROM matches WHERE tournament_id = ?", [tournamentId]);
}

function deleteTournamentStages(tournamentId) {
  run("DELETE FROM tournament_stages WHERE tournament_id = ?", [tournamentId]);
}

function deleteTournamentEntries(tournamentId) {
  run("DELETE FROM entries WHERE tournament_id = ?", [tournamentId]);
}

function deleteTournamentLegacyTeams(tournamentId) {
  run("DELETE FROM teams WHERE tournament_id = ?", [tournamentId]);
}

function deleteTournamentRegistrations(tournamentId) {
  run("DELETE FROM registrations WHERE tournament_id = ?", [tournamentId]);
}

function deleteTournamentTasks(tournamentId) {
  run("DELETE FROM operation_tasks WHERE tournament_id = ?", [tournamentId]);
}

function resetTournamentStages(tournamentId, formatId, teamCount, startDate, endDate) {
  run("DELETE FROM tournament_stages WHERE tournament_id = ?", [tournamentId]);

  const blueprints = createStageBlueprints(formatId, tournamentId, startDate, endDate, teamCount);
  blueprints.forEach((stage) => insertStage(stage));

  return blueprints;
}

function syncPlaceholderEntries(tournamentId, desiredCount) {
  const placeholders = all(
    `
      SELECT *
      FROM entries
      WHERE tournament_id = ? AND is_placeholder = 1
      ORDER BY seed_no ASC
    `,
    [tournamentId]
  );

  const currentCount = placeholders.length;

  if (currentCount > desiredCount) {
    const removeIds = placeholders.slice(desiredCount).map((item) => item.id);
    for (const id of removeIds) {
      run("DELETE FROM entries WHERE id = ?", [id]);
    }
  }

  if (currentCount < desiredCount) {
    const maxSeed =
      get("SELECT COALESCE(MAX(seed_no), 0) AS value FROM entries WHERE tournament_id = ?", [tournamentId])
        ?.value || 0;
    const tournament = getTournamentById(tournamentId);
    const config = getEntryConfig(tournament?.entry_mode || tournament?.participants_type);

    for (let index = 0; index < desiredCount - currentCount; index += 1) {
      run(
        `
          INSERT INTO entries (
            id, tournament_id, entity_type, name, short_name, seed_no, organization, region, coach,
            contact_name, participant_count, status, stats_json, member_names_json, notes,
            is_placeholder, legacy_team_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          createId("placeholder"),
          tournamentId,
          config.mode,
          "轮空席位",
          "BYE",
          maxSeed + index + 1,
          "系统占位",
          "系统",
          "系统",
          "系统",
          0,
          "轮空",
          json({ played: 0, won: 0, lost: 0 }),
          json([]),
          "",
          1
          ,
          null
        ]
      );
    }
  }
}

function updateEntryStatsFromMatches(tournamentId) {
  const entries = listTournamentEntries(tournamentId).filter((entry) => !entry.is_placeholder);
  const matches = listTournamentMatches(tournamentId);

  for (const entry of entries) {
    const stats = {
      played: 0,
      won: 0,
      lost: 0,
      drawn: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      points: 0
    };

    for (const match of matches) {
      if (match.status !== "已结束") continue;
      if (match.home_team_id !== entry.id && match.away_team_id !== entry.id) continue;

      const isHome = match.home_team_id === entry.id;
      const entryScore = isHome ? match.home_score : match.away_score;
      const opponentScore = isHome ? match.away_score : match.home_score;

      stats.played += 1;
      stats.scoreFor += entryScore;
      stats.scoreAgainst += opponentScore;

      if (entryScore > opponentScore) {
        stats.won += 1;
        stats.points += 3;
      } else if (entryScore < opponentScore) {
        stats.lost += 1;
      } else {
        stats.drawn += 1;
        stats.points += 1;
      }
    }

    run("UPDATE entries SET stats_json = ? WHERE id = ?", [json(stats), entry.id]);
  }
}

function generateRoundRobinPairs(teams) {
  if (teams.length < 2) return [];

  const list = [...teams];
  const isOdd = list.length % 2 === 1;

  if (isOdd) {
    list.push({ id: "bye", name: "轮空" });
  }

  const rounds = [];
  const totalRounds = list.length - 1;

  for (let round = 0; round < totalRounds; round += 1) {
    const pairs = [];

    for (let index = 0; index < list.length / 2; index += 1) {
      const home = list[index];
      const away = list[list.length - 1 - index];

      if (home.id !== "bye" && away.id !== "bye") {
        pairs.push([home, away]);
      }
    }

    rounds.push(pairs);

    const fixed = list[0];
    const rotating = list.slice(1);
    rotating.unshift(rotating.pop());
    list.splice(0, list.length, fixed, ...rotating);
  }

  return rounds;
}

function splitIntoGroups(teams, groupCount) {
  const groups = Array.from({ length: groupCount }, () => []);

  teams.forEach((team, index) => {
    groups[index % groupCount].push(team);
  });

  return groups;
}

function createMatchRow({
  tournament,
  stageId,
  roundLabel,
  bracketSlot,
  scheduledAt,
  venueId,
  homeTeamId,
  awayTeamId,
  officialId,
  importanceLevel,
  notes,
  phaseType,
  sortOrder,
  nextWinnerMatchId = null,
  nextLoserMatchId = null,
  nextWinnerSlot = null,
  nextLoserSlot = null
}) {
  return {
    id: createId("match"),
    tournamentId: tournament.id,
    stageId,
    roundLabel,
    bracketSlot,
    scheduledAt,
    venueId,
    homeTeamId,
    awayTeamId,
    homeScore: 0,
    awayScore: 0,
    status: "待进行",
    streamStatus: "待开启",
    officialId,
    importanceLevel,
    notes,
    phaseType,
    nextWinnerMatchId,
    nextLoserMatchId,
    nextWinnerSlot,
    nextLoserSlot,
    sortOrder
  };
}

function createByeTeam(seedNo) {
  return {
    id: `bye-${seedNo}`,
    name: "轮空席位",
    seed_no: seedNo,
    is_placeholder: 1
  };
}

function assignMatchParticipant(match, slot, teamId) {
  if (!match || !slot || !teamId) return;
  if (slot === "home") {
    match.homeTeamId = teamId;
  } else {
    match.awayTeamId = teamId;
  }
}

function buildDoubleEliminationRows({ tournament, stageMap, entries, placeholderPool = [] }) {
  const actualEntries = [...entries].filter((entry) => !entry.is_placeholder).sort((a, b) => a.seed_no - b.seed_no);
  if (actualEntries.length < 2) return [];

  const bracketSize = getBracketSize(actualEntries.length);
  const seedOrder = buildSeedOrder(bracketSize);
  const seedToEntry = new Map(actualEntries.map((entry) => [entry.seed_no, entry]));
  const upperEntrants = seedOrder.map((seed) => seedToEntry.get(seed) || createByeTeam(seed));
  const rows = [];
  const officialId = tournament.sport_id === "esports" ? "official-3" : "official-5";
  const venueId = tournament.sport_id === "esports" ? "venue-jingan-esports" : "venue-pudong-arena";
  let slotCounter = 1;

  const upperRounds = [];
  let currentEntrants = upperEntrants;
  let roundSize = bracketSize;
  let upperRoundIndex = 0;

  while (roundSize >= 2) {
    const matchCount = roundSize / 2;
    const roundLabel =
      roundSize === 2
        ? "胜者组决赛"
        : roundSize === 4
          ? "胜者组半决赛"
          : upperRoundIndex === 0
            ? "胜者组第 1 轮"
            : `胜者组第 ${upperRoundIndex + 1} 轮`;
    const roundMatches = [];

    for (let index = 0; index < matchCount; index += 1) {
      const home = currentEntrants[index * 2];
      const away = currentEntrants[index * 2 + 1];
      const match = createMatchRow({
        tournament,
        stageId: stageMap["upper-bracket"].id,
        roundLabel,
        bracketSlot: `U${slotCounter++}`,
        scheduledAt: addHours(addDays(tournament.start_date, upperRoundIndex), 11 + index * 3),
        venueId,
        homeTeamId: home.id,
        awayTeamId: away.id,
        officialId,
        importanceLevel: roundSize <= 4 ? "极高" : "高",
        notes: home.is_placeholder || away.is_placeholder ? "轮空自动晋级" : "双败胜者组自动编排",
        phaseType: "upper-bracket",
        sortOrder: upperRoundIndex * 100 + index
      });

      if (home.is_placeholder || away.is_placeholder) {
        match.status = "已结束";
        match.streamStatus = "已完成";
        if (home.is_placeholder && !away.is_placeholder) {
          match.homeScore = 0;
          match.awayScore = 1;
        } else if (!home.is_placeholder && away.is_placeholder) {
          match.homeScore = 1;
          match.awayScore = 0;
        }
      }

      roundMatches.push(match);
    }

    upperRounds.push(roundMatches);
    currentEntrants = Array.from({ length: matchCount }, (_, index) =>
      placeholderPool[index] || placeholderPool.at(-1) || actualEntries[0]
    );
    roundSize /= 2;
    upperRoundIndex += 1;
  }

  const lowerRounds = [];
  const totalUpperRounds = upperRounds.length;
  for (let round = 1; round <= Math.max(1, totalUpperRounds * 2 - 2); round += 1) {
    const sourceUpperRound = Math.ceil(round / 2);
    const matchCount = 2 ** Math.max(0, totalUpperRounds - sourceUpperRound - 1);
    const roundMatches = [];

    for (let index = 0; index < matchCount; index += 1) {
      roundMatches.push(
        createMatchRow({
          tournament,
          stageId: stageMap["lower-bracket"].id,
          roundLabel:
            round === totalUpperRounds * 2 - 2 ? "败者组决赛" : `败者组第 ${round} 轮`,
          bracketSlot: `L${slotCounter++}`,
          scheduledAt: addHours(addDays(tournament.start_date, sourceUpperRound), 18 + index * 2),
          venueId,
          homeTeamId: placeholderPool[index * 2]?.id || actualEntries[0].id,
          awayTeamId: placeholderPool[index * 2 + 1]?.id || actualEntries[Math.min(1, actualEntries.length - 1)].id,
          officialId,
          importanceLevel: round >= totalUpperRounds * 2 - 3 ? "极高" : "高",
          notes: "双败败者组自动编排",
          phaseType: "lower-bracket",
          sortOrder: 500 + round * 100 + index
        })
      );
    }

    lowerRounds.push(roundMatches);
  }

  for (let roundIndex = 0; roundIndex < upperRounds.length; roundIndex += 1) {
    const roundMatches = upperRounds[roundIndex];
    const nextUpper = upperRounds[roundIndex + 1] || [];
    const targetLowerRound = lowerRounds[roundIndex * 2] || lowerRounds.at(-1) || [];

    roundMatches.forEach((match, matchIndex) => {
      const nextUpperMatch = nextUpper[Math.floor(matchIndex / 2)];
      if (nextUpperMatch) {
        match.nextWinnerMatchId = nextUpperMatch.id;
        match.nextWinnerSlot = matchIndex % 2 === 0 ? "home" : "away";
      }

      const nextLowerMatch = targetLowerRound[Math.floor(matchIndex / 2)] || targetLowerRound[matchIndex];
      if (nextLowerMatch) {
        match.nextLoserMatchId = nextLowerMatch.id;
        match.nextLoserSlot = matchIndex % 2 === 0 ? "home" : "away";
      }
    });
  }

  for (let roundIndex = 0; roundIndex < lowerRounds.length - 1; roundIndex += 1) {
    const roundMatches = lowerRounds[roundIndex];
    const nextRound = lowerRounds[roundIndex + 1];

    roundMatches.forEach((match, matchIndex) => {
      const nextMatch = nextRound[Math.floor(matchIndex / 2)] || nextRound[matchIndex];
      if (nextMatch) {
        match.nextWinnerMatchId = nextMatch.id;
        match.nextWinnerSlot =
          nextRound.length === roundMatches.length ? (matchIndex % 2 === 0 ? "home" : "away") : "away";
      }
    });
  }

  const grandFinal = createMatchRow({
    tournament,
    stageId: stageMap["grand-final"].id,
    roundLabel: "总决赛",
    bracketSlot: `GF${slotCounter++}`,
    scheduledAt: addHours(tournament.end_date, 18),
    venueId,
    homeTeamId: actualEntries[0].id,
    awayTeamId: actualEntries[Math.min(1, actualEntries.length - 1)].id,
    officialId: "official-4",
    importanceLevel: "极高",
    notes: "胜者组冠军 vs 败者组冠军",
    phaseType: "grand-final",
    sortOrder: 2000
  });
  const grandFinalReset = createMatchRow({
    tournament,
    stageId: stageMap["grand-final"].id,
    roundLabel: "总决赛重置",
    bracketSlot: `GF${slotCounter++}`,
    scheduledAt: addHours(tournament.end_date, 21),
    venueId,
    homeTeamId: placeholderPool.at(-2)?.id || actualEntries[0].id,
    awayTeamId: placeholderPool.at(-1)?.id || actualEntries[Math.min(1, actualEntries.length - 1)].id,
    officialId: "official-4",
    importanceLevel: "极高",
    notes: "仅在败者组冠军首胜时启用",
    phaseType: "grand-final",
    sortOrder: 2010
  });
  grandFinal.nextLoserMatchId = grandFinalReset.id;

  const lastUpper = upperRounds.at(-1)?.[0];
  if (lastUpper) {
    lastUpper.nextWinnerMatchId = grandFinal.id;
    lastUpper.nextWinnerSlot = "home";
  }

  const lastLower = lowerRounds.at(-1)?.[0];
  if (lastLower) {
    lastLower.nextWinnerMatchId = grandFinal.id;
    lastLower.nextWinnerSlot = "away";
  }

  upperRounds.flat().forEach((match) => rows.push(match));
  lowerRounds.flat().forEach((match) => rows.push(match));
  rows.push(grandFinal, grandFinalReset);

  return rows;
}

function computeGroupRankings(entries, matches) {
  const tables = new Map();

  for (const entry of entries.filter((item) => !item.is_placeholder)) {
    const groupKey = String.fromCharCode(65 + ((entry.seed_no - 1) % Math.max(1, Math.ceil(entries.length / 4))));
    if (!tables.has(groupKey)) {
      tables.set(groupKey, []);
    }
    tables.get(groupKey).push({
      teamId: entry.id,
      teamName: entry.name,
      seedNo: entry.seed_no,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      scoreDiff: 0,
      points: 0
    });
  }

  const indexByTeam = new Map();
  for (const [groupKey, rows] of tables.entries()) {
    for (const row of rows) {
      indexByTeam.set(row.teamId, { groupKey, row });
    }
  }

  for (const match of matches) {
    if (match.phase_type !== "group" || match.status !== "已结束") continue;
    const home = indexByTeam.get(match.home_team_id);
    const away = indexByTeam.get(match.away_team_id);
    if (!home || !away || home.groupKey !== away.groupKey) continue;

    home.row.played += 1;
    away.row.played += 1;
    home.row.scoreFor += match.home_score;
    home.row.scoreAgainst += match.away_score;
    away.row.scoreFor += match.away_score;
    away.row.scoreAgainst += match.home_score;

    if (match.home_score > match.away_score) {
      home.row.wins += 1;
      home.row.points += 3;
      away.row.losses += 1;
    } else if (match.home_score < match.away_score) {
      away.row.wins += 1;
      away.row.points += 3;
      home.row.losses += 1;
    } else {
      home.row.draws += 1;
      away.row.draws += 1;
      home.row.points += 1;
      away.row.points += 1;
    }
  }

  return [...tables.entries()].map(([groupName, rows]) => {
    const ordered = rows
      .map((row) => ({ ...row, scoreDiff: row.scoreFor - row.scoreAgainst }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
        if (b.scoreFor !== a.scoreFor) return b.scoreFor - a.scoreFor;
        return a.seedNo - b.seedNo;
      })
      .map((row, index) => ({
        ...row,
        rank: index + 1,
        qualified: index < 2
      }));

    return {
      groupName,
      rows: ordered
    };
  });
}

function computeLeagueStandings(entries, matches) {
  const table = entries
    .filter((entry) => !entry.is_placeholder)
    .map((entry) => ({
      teamId: entry.id,
      teamName: entry.name,
      seedNo: entry.seed_no,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      scoreDiff: 0,
      points: 0
    }));

  const byTeam = new Map(table.map((row) => [row.teamId, row]));

  for (const match of matches) {
    if (!["league", "group"].includes(match.phase_type) || match.status !== "已结束") continue;
    const home = byTeam.get(match.home_team_id);
    const away = byTeam.get(match.away_team_id);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.scoreFor += match.home_score;
    home.scoreAgainst += match.away_score;
    away.scoreFor += match.away_score;
    away.scoreAgainst += match.home_score;

    if (match.home_score > match.away_score) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (match.home_score < match.away_score) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return table
    .map((row) => ({ ...row, scoreDiff: row.scoreFor - row.scoreAgainst }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
      if (b.scoreFor !== a.scoreFor) return b.scoreFor - a.scoreFor;
      return a.seedNo - b.seedNo;
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1
    }));
}

function buildTournamentInsights(tournaments, entries, matches) {
  return tournaments.map((tournament) => {
    const tournamentEntries = entries.filter((entry) => entry.tournament_id === tournament.id);
    const tournamentMatches = matches.filter((match) => match.tournament_id === tournament.id);
    const standings = computeLeagueStandings(tournamentEntries, tournamentMatches);
    const groups = computeGroupRankings(tournamentEntries, tournamentMatches);
    const advancement =
      tournament.format_id === "group-knockout"
        ? groups.flatMap((group) =>
            group.rows.filter((row) => row.qualified).map((row) => ({
              source: `${group.groupName} 组`,
              teamId: row.teamId,
              teamName: row.teamName,
              rank: row.rank
            }))
          )
        : standings.slice(0, tournament.format_id === "double-round-robin" ? 4 : 2).map((row) => ({
            source: "积分榜",
            teamId: row.teamId,
            teamName: row.teamName,
            rank: row.rank
          }));

    return {
      tournamentId: tournament.id,
      standings,
      groups,
      advancement
    };
  });
}

function autoAdvanceResolvedMatches(tournamentId) {
  const matches = listTournamentMatches(tournamentId);

  for (const match of matches) {
    const homeIsBye = String(match.home_team_id).startsWith("placeholder-") || String(match.home_team_name).includes("轮空");
    const awayIsBye = String(match.away_team_id).startsWith("placeholder-") || String(match.away_team_name).includes("轮空");

    if (match.status === "已结束") continue;
    if (!homeIsBye && !awayIsBye) continue;
    if (homeIsBye && awayIsBye) continue;

    const winnerId = homeIsBye ? match.away_team_id : match.home_team_id;
    const loserId = homeIsBye ? match.home_team_id : match.away_team_id;

    run(
      "UPDATE matches SET status = '已结束', stream_status = '已完成', home_score = ?, away_score = ? WHERE id = ?",
      [homeIsBye ? 0 : 1, awayIsBye ? 0 : 1, match.id]
    );

    if (match.next_winner_match_id) {
      run(
        match.next_winner_slot === "home"
          ? "UPDATE matches SET home_team_id = ? WHERE id = ?"
          : "UPDATE matches SET away_team_id = ? WHERE id = ?",
        [winnerId, match.next_winner_match_id]
      );
    }

    if (match.next_loser_match_id) {
      run(
        match.next_loser_slot === "home"
          ? "UPDATE matches SET home_team_id = ? WHERE id = ?"
          : "UPDATE matches SET away_team_id = ? WHERE id = ?",
        [loserId, match.next_loser_match_id]
      );
    }
  }
}

function buildMatchRows({ tournament, stageId, entries, placeholderPool = [] }) {
  const venueId = "venue-pudong-arena";
  const officialId = "official-5";
  const rows = [];
  let slotCounter = 1;

  if (entries.length < 2) {
    return rows;
  }

  if (tournament.format_id === "single-elimination") {
    const ordered = [...entries].filter((entry) => !entry.is_placeholder).sort((a, b) => a.seed_no - b.seed_no);
    const nextPower = 2 ** Math.ceil(Math.log2(Math.max(2, ordered.length)));
    const seeded = [...ordered];
    let placeholderIndex = 0;

    while (seeded.length < nextPower) {
      seeded.push(
        placeholderPool[placeholderIndex] || {
          id: ordered[0]?.id,
          name: "轮空席位",
          seed_no: seeded.length + 1,
          is_placeholder: 1
        }
      );
      placeholderIndex += 1;
    }

    let currentRoundSize = nextPower;
    let currentRoundEntrants = seeded;
    let roundIndex = 0;
    const createdRounds = [];

    while (currentRoundSize >= 2) {
      const labelMap = {
        2: "决赛",
        4: "半决赛",
        8: "1/4 决赛",
        16: "1/8 决赛",
        32: "1/16 决赛"
      };
      const roundMatches = [];
      const matchCount = currentRoundSize / 2;

      for (let index = 0; index < matchCount; index += 1) {
        const home = currentRoundEntrants[index * 2] || currentRoundEntrants[index];
        const away = currentRoundEntrants[index * 2 + 1] || currentRoundEntrants[currentRoundEntrants.length - 1 - index];
        const matchId = createId("match");

        roundMatches.push({
          id: matchId,
          tournamentId: tournament.id,
          stageId,
          roundLabel: labelMap[currentRoundSize] || `第 ${roundIndex + 1} 轮`,
          bracketSlot: `K${slotCounter++}`,
          scheduledAt: addHours(addDays(tournament.start_date, roundIndex), 9 + index * 3),
          venueId,
          homeTeamId: home.id,
          awayTeamId: away.id,
          homeScore: 0,
          awayScore: 0,
          status: home.is_placeholder || away.is_placeholder ? "已结束" : "待进行",
          streamStatus: home.is_placeholder || away.is_placeholder ? "已完成" : "待开启",
          officialId,
          importanceLevel: currentRoundSize <= 4 ? "极高" : "高",
          notes: home.is_placeholder || away.is_placeholder ? "自动晋级" : "淘汰赛自动编排",
          phaseType: "knockout",
          nextWinnerMatchId: null,
          nextLoserMatchId: null,
          nextWinnerSlot: null,
          nextLoserSlot: null,
          sortOrder: roundIndex * 100 + index
        });
      }

      createdRounds.push(roundMatches);
      currentRoundSize /= 2;
      currentRoundEntrants = Array.from({ length: currentRoundSize }, (_, index) => {
        const placeholder = placeholderPool[placeholderIndex + index];
        return placeholder || placeholderPool.at(-1) || ordered[0];
      });
      placeholderIndex += currentRoundSize;
      roundIndex += 1;
    }

    for (let index = 0; index < createdRounds.length - 1; index += 1) {
      const currentRound = createdRounds[index];
      const nextRound = createdRounds[index + 1];

      currentRound.forEach((match, matchIndex) => {
        const nextMatch = nextRound[Math.floor(matchIndex / 2)];
        match.nextWinnerMatchId = nextMatch.id;
        match.nextWinnerSlot = matchIndex % 2 === 0 ? "home" : "away";
      });
    }

    createdRounds.flat().forEach((match) => rows.push(match));
  }

  if (tournament.format_id === "round-robin" || tournament.format_id === "double-round-robin") {
    const rounds = generateRoundRobinPairs(entries);
    const roundMultiplier = tournament.format_id === "double-round-robin" ? 2 : 1;

    for (let cycle = 0; cycle < roundMultiplier; cycle += 1) {
      rounds.forEach((pairs, roundIndex) => {
        pairs.forEach(([home, away], pairIndex) => {
          const isReturnLeg = cycle === 1;
          rows.push({
            id: createId("match"),
            tournamentId: tournament.id,
            stageId,
            roundLabel: `第 ${roundIndex + 1 + cycle * rounds.length} 轮`,
            bracketSlot: `R${slotCounter++}`,
            scheduledAt: addHours(addDays(tournament.start_date, roundIndex + cycle * rounds.length), 10 + pairIndex * 2),
            venueId,
            homeTeamId: isReturnLeg ? away.id : home.id,
            awayTeamId: isReturnLeg ? home.id : away.id,
            homeScore: 0,
            awayScore: 0,
            status: "待进行",
            streamStatus: "待排期",
            officialId,
            importanceLevel: "中",
            notes: "循环赛自动编排",
            phaseType: "league",
            nextWinnerMatchId: null,
            nextLoserMatchId: null,
            nextWinnerSlot: null,
            nextLoserSlot: null,
            sortOrder: cycle * 100 + roundIndex * 10 + pairIndex
          });
        });
      });
    }
  }

  if (tournament.format_id === "group-knockout") {
    const groupCount = Math.max(2, Math.min(4, entries.length >= 16 ? 4 : Math.ceil(entries.length / 4)));
    const groups = splitIntoGroups(
      [...entries].sort((a, b) => a.seed_no - b.seed_no),
      groupCount
    );

    groups.forEach((groupTeams, groupIndex) => {
      const rounds = generateRoundRobinPairs(groupTeams);
      rounds.forEach((pairs, roundIndex) => {
        pairs.forEach(([home, away], pairIndex) => {
          rows.push({
            id: createId("match"),
            tournamentId: tournament.id,
            stageId,
            roundLabel: `${String.fromCharCode(65 + groupIndex)} 组第 ${roundIndex + 1} 轮`,
            bracketSlot: `G${slotCounter++}`,
            scheduledAt: addHours(addDays(tournament.start_date, roundIndex + groupIndex), 11 + pairIndex * 2),
            venueId,
            homeTeamId: home.id,
            awayTeamId: away.id,
            homeScore: 0,
            awayScore: 0,
            status: "待进行",
            streamStatus: "待开启",
            officialId,
            importanceLevel: "中",
            notes: "小组赛自动编排",
            phaseType: "group",
            nextWinnerMatchId: null,
            nextLoserMatchId: null,
            nextWinnerSlot: null,
            nextLoserSlot: null,
            sortOrder: groupIndex * 100 + roundIndex * 10 + pairIndex
          });
        });
      });
    });
  }

  if (tournament.format_id === "double-elimination") {
    return rows;
  }

  if (tournament.format_id === "time-qualifier-final") {
    const qualifierHeats = Math.max(2, Math.ceil(entries.length / 2));

    for (let index = 0; index < qualifierHeats; index += 1) {
      rows.push({
        id: createId("match"),
        tournamentId: tournament.id,
        stageId,
        roundLabel: `预赛第 ${index + 1} 组`,
        bracketSlot: `Q${slotCounter++}`,
        scheduledAt: addHours(addDays(tournament.start_date, 0), 9 + index),
        venueId: "venue-minhang-aquatic",
        homeTeamId: entries[index % entries.length].id,
        awayTeamId: entries[(index + 1) % entries.length].id,
        homeScore: 0,
        awayScore: 0,
        status: "待进行",
        streamStatus: "待开启",
        officialId: "official-5",
        importanceLevel: "中",
        notes: "资格赛自动编排",
        phaseType: "qualifier",
        nextWinnerMatchId: null,
        nextLoserMatchId: null,
        nextWinnerSlot: null,
        nextLoserSlot: null,
        sortOrder: index
      });
    }

    rows.push({
      id: createId("match"),
      tournamentId: tournament.id,
      stageId,
      roundLabel: "A 组决赛",
      bracketSlot: `F${slotCounter++}`,
      scheduledAt: addHours(addDays(tournament.end_date, 0), 15),
      venueId: "venue-minhang-aquatic",
      homeTeamId: entries[0].id,
      awayTeamId: entries[Math.min(1, entries.length - 1)].id,
      homeScore: 0,
      awayScore: 0,
      status: "待进行",
      streamStatus: "待开启",
      officialId: "official-5",
      importanceLevel: "高",
      notes: "决赛自动编排",
      phaseType: "final",
      nextWinnerMatchId: null,
      nextLoserMatchId: null,
      nextWinnerSlot: null,
      nextLoserSlot: null,
      sortOrder: 999
    });
  }

  return rows;
}

function insertMatches(rows) {
  const stmt = db.prepare(`
    INSERT INTO matches (
      id, tournament_id, stage_id, round_label, bracket_slot, scheduled_at, venue_id, home_team_id,
      away_team_id, home_score, away_score, status, stream_status, official_id, importance_level, notes,
      phase_type, next_winner_match_id, next_loser_match_id, next_winner_slot, next_loser_slot, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const row of rows) {
    stmt.run(
      row.id,
      row.tournamentId,
      row.stageId,
      row.roundLabel,
      row.bracketSlot,
      row.scheduledAt,
      row.venueId,
      row.homeTeamId,
      row.awayTeamId,
      row.homeScore,
      row.awayScore,
      row.status,
      row.streamStatus,
      row.officialId,
      row.importanceLevel,
      row.notes,
      row.phaseType || "standard",
      row.nextWinnerMatchId,
      row.nextLoserMatchId,
      row.nextWinnerSlot,
      row.nextLoserSlot,
      row.sortOrder || 0
    );
  }
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sports (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      participants_type TEXT NOT NULL,
      icon TEXT NOT NULL,
      popularity_rank INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS competition_formats (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      suitable_for TEXT NOT NULL,
      structure_notes TEXT NOT NULL,
      rules_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      area TEXT NOT NULL,
      surface_type TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      indoor INTEGER NOT NULL,
      support_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS officials (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      level TEXT NOT NULL,
      city TEXT NOT NULL,
      availability_status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      sport_id TEXT NOT NULL,
      format_id TEXT NOT NULL,
      entry_mode TEXT NOT NULL DEFAULT 'team',
      season_label TEXT NOT NULL,
      organizer TEXT NOT NULL,
      location TEXT NOT NULL,
      level TEXT NOT NULL,
      status TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      registration_deadline TEXT NOT NULL,
      team_count INTEGER NOT NULL,
      match_count INTEGER NOT NULL,
      venue_count INTEGER NOT NULL,
      prize_pool INTEGER NOT NULL,
      broadcast_channels TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      highlights_json TEXT NOT NULL,
      notes TEXT NOT NULL,
      FOREIGN KEY (sport_id) REFERENCES sports(id),
      FOREIGN KEY (format_id) REFERENCES competition_formats(id)
    );

    CREATE TABLE IF NOT EXISTS tournament_stages (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      name TEXT NOT NULL,
      stage_type TEXT NOT NULL,
      sequence_no INTEGER NOT NULL,
      status TEXT NOT NULL,
      participant_scope TEXT NOT NULL,
      rules_summary TEXT NOT NULL,
      matches_planned INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      seed_no INTEGER NOT NULL,
      club TEXT NOT NULL,
      region TEXT NOT NULL,
      coach TEXT NOT NULL,
      captain TEXT NOT NULL,
      participant_count INTEGER NOT NULL,
      status TEXT NOT NULL,
      stats_json TEXT NOT NULL,
      is_placeholder INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );

    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      seed_no INTEGER NOT NULL,
      organization TEXT NOT NULL,
      region TEXT NOT NULL,
      coach TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      participant_count INTEGER NOT NULL,
      status TEXT NOT NULL,
      stats_json TEXT NOT NULL,
      member_names_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      is_placeholder INTEGER NOT NULL DEFAULT 0,
      legacy_team_id TEXT,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      stage_id TEXT NOT NULL,
      round_label TEXT NOT NULL,
      bracket_slot TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      venue_id TEXT NOT NULL,
      home_team_id TEXT NOT NULL,
      away_team_id TEXT NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      status TEXT NOT NULL,
      stream_status TEXT NOT NULL,
      official_id TEXT NOT NULL,
      importance_level TEXT NOT NULL,
      notes TEXT NOT NULL,
      phase_type TEXT NOT NULL DEFAULT 'standard',
      next_winner_match_id TEXT,
      next_loser_match_id TEXT,
      next_winner_slot TEXT,
      next_loser_slot TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (stage_id) REFERENCES tournament_stages(id),
      FOREIGN KEY (venue_id) REFERENCES venues(id),
      FOREIGN KEY (home_team_id) REFERENCES teams(id),
      FOREIGN KEY (away_team_id) REFERENCES teams(id),
      FOREIGN KEY (official_id) REFERENCES officials(id)
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      applicant_name TEXT NOT NULL,
      organization TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      fee_status TEXT NOT NULL,
      compliance_status TEXT NOT NULL,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );

    CREATE TABLE IF NOT EXISTS operation_tasks (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      assignee TEXT NOT NULL,
      priority TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      title TEXT NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL DEFAULT 'pass123',
      status TEXT NOT NULL,
      last_active_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_name TEXT NOT NULL,
      detail_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_state (
      state_key TEXT PRIMARY KEY,
      state_value TEXT NOT NULL
    );
  `);

  ensureColumn("teams", "is_placeholder", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("tournaments", "entry_mode", "TEXT NOT NULL DEFAULT 'team'");
  ensureColumn("matches", "phase_type", "TEXT NOT NULL DEFAULT 'standard'");
  ensureColumn("matches", "next_winner_match_id", "TEXT");
  ensureColumn("matches", "next_loser_match_id", "TEXT");
  ensureColumn("matches", "next_winner_slot", "TEXT");
  ensureColumn("matches", "next_loser_slot", "TEXT");
  ensureColumn("matches", "sort_order", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("users", "password", "TEXT NOT NULL DEFAULT 'pass123'");
  ensureColumn("entries", "member_names_json", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("entries", "notes", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("entries", "legacy_team_id", "TEXT");

  migrateTeamsToEntries();
  normalizeTournamentEntryModes();
}

function migrateTeamsToEntries() {
  if (!hasTable("teams") || !hasTable("entries")) return;

  const existingCount = get("SELECT COUNT(*) AS count FROM entries")?.count || 0;
  if (existingCount > 0) return;

  const legacyTeams = all("SELECT * FROM teams ORDER BY tournament_id ASC, seed_no ASC");
  if (!legacyTeams.length) return;

  const tournamentModes = new Map(
    all(`
      SELECT
        t.id,
        s.participants_type
      FROM tournaments t
      JOIN sports s ON s.id = t.sport_id
    `).map((row) => [row.id, getEntryMode(row.participants_type)])
  );

  const insertEntry = db.prepare(`
    INSERT INTO entries (
      id, tournament_id, entity_type, name, short_name, seed_no, organization, region, coach,
      contact_name, participant_count, status, stats_json, member_names_json, notes, is_placeholder, legacy_team_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const team of legacyTeams) {
    const mode = tournamentModes.get(team.tournament_id) || "team";
    insertEntry.run(
      team.id,
      team.tournament_id,
      mode,
      team.name,
      team.short_name,
      team.seed_no,
      team.club,
      team.region,
      team.coach,
      team.captain,
      team.participant_count,
      team.status,
      team.stats_json,
      json([]),
      "",
      team.is_placeholder,
      team.id
    );
  }
}

function normalizeTournamentEntryModes() {
  if (!hasTable("tournaments")) return;

  const tournaments = all(`
    SELECT
      t.id,
      t.entry_mode,
      s.participants_type
    FROM tournaments t
    JOIN sports s ON s.id = t.sport_id
  `);

  for (const tournament of tournaments) {
    if (!ENTRY_MODE_CONFIG[tournament.entry_mode]) {
      const expected = getEntryMode(tournament.participants_type);
      run("UPDATE tournaments SET entry_mode = ? WHERE id = ?", [expected, tournament.id]);
    }
  }
}

function hasSeedData() {
  const row = get("SELECT COUNT(*) AS count FROM tournaments");
  return row && row.count > 0;
}

function seedSports() {
  const sports = [
    ["football", "足球", "team", "team", "sports_soccer", 1],
    ["basketball", "篮球", "team", "team", "sports_basketball", 2],
    ["volleyball", "排球", "team", "team", "sports_volleyball", 3],
    ["badminton", "羽毛球", "racket", "single_double", "sports_tennis", 4],
    ["table-tennis", "乒乓球", "racket", "single_double", "table_restaurant", 5],
    ["tennis", "网球", "racket", "single_double", "tennis", 6],
    ["baseball", "棒球", "team", "team", "sports_baseball", 7],
    ["esports", "电子竞技", "digital", "team", "stadia_controller", 8],
    ["swimming", "游泳", "aquatic", "individual", "pool", 9],
    ["athletics", "田径", "track-field", "individual", "directions_run", 10]
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO sports (id, name, category, participants_type, icon, popularity_rank)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const item of sports) {
    stmt.run(...item);
  }
}

function seedFormats() {
  const formats = [
    {
      id: "single-elimination",
      name: "单败淘汰",
      category: "knockout",
      suitableFor: "短周期杯赛、线上对战赛",
      notes: "输一场即淘汰，适合快速产出冠军。",
      rules: ["支持 4-128 队", "可配置三四名决赛", "支持主客队位次保护"]
    },
    {
      id: "double-elimination",
      name: "双败淘汰",
      category: "knockout",
      suitableFor: "电竞、羽毛球团体赛",
      notes: "设胜者组与败者组，提高容错。",
      rules: ["败者组复活", "总决赛支持重置", "适合高水平对抗"]
    },
    {
      id: "round-robin",
      name: "单循环",
      category: "league",
      suitableFor: "联赛、小组赛",
      notes: "每支队伍都交手一次，排名公平。",
      rules: ["支持奇偶队自动轮空", "积分规则可配置", "支持净胜分排序"]
    },
    {
      id: "double-round-robin",
      name: "双循环",
      category: "league",
      suitableFor: "主客场联赛",
      notes: "每支队伍主客场各打一轮。",
      rules: ["支持主客场平衡", "赛程自动避冲突", "适合长期赛季"]
    },
    {
      id: "group-knockout",
      name: "小组赛 + 淘汰赛",
      category: "hybrid",
      suitableFor: "足球杯赛、综合赛事",
      notes: "先分组后晋级，兼顾曝光与竞技性。",
      rules: ["小组数量可配", "晋级名额可配", "支持交叉淘汰"]
    },
    {
      id: "swiss",
      name: "瑞士轮",
      category: "ranking",
      suitableFor: "棋牌、电竞、个人积分赛",
      notes: "相近积分对手匹配，轮次固定。",
      rules: ["支持胜负积分", "自动避重赛", "按战绩实时配对"]
    },
    {
      id: "ladder",
      name: "阶梯挑战",
      category: "ranking",
      suitableFor: "俱乐部内部排名赛",
      notes: "低位向高位发起挑战，排名动态变化。",
      rules: ["支持挑战窗口", "支持冻结席位", "适合常态化运营"]
    },
    {
      id: "time-qualifier-final",
      name: "资格赛 + 决赛",
      category: "timed",
      suitableFor: "田径、游泳",
      notes: "预赛计时晋级，决赛定名次。",
      rules: ["支持最好成绩晋级", "支持分组计时", "支持 A/B 决赛"]
    }
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO competition_formats (id, name, category, suitable_for, structure_notes, rules_json)
    VALUES (@id, @name, @category, @suitableFor, @notes, @rulesJson)
  `);

  for (const item of formats) {
    stmt.run({
      id: item.id,
      name: item.name,
      category: item.category,
      suitableFor: item.suitableFor,
      notes: item.notes,
      rulesJson: json(item.rules)
    });
  }
}

function seedVenues() {
  const venues = [
    {
      id: "venue-hongkou",
      name: "虹口竞技中心",
      city: "上海",
      area: "虹口",
      surfaceType: "天然草 + 综合馆",
      capacity: 18000,
      indoor: 0,
      support: ["LED 大屏", "转播机位", "混采区", "VAR 工位"]
    },
    {
      id: "venue-pudong-arena",
      name: "浦东城市馆",
      city: "上海",
      area: "浦东",
      surfaceType: "木地板",
      capacity: 12000,
      indoor: 1,
      support: ["直播导播间", "球员通道", "新闻发布厅"]
    },
    {
      id: "venue-xuhui-racket",
      name: "徐汇羽网中心",
      city: "上海",
      area: "徐汇",
      surfaceType: "PVC + 硬地",
      capacity: 3500,
      indoor: 1,
      support: ["鹰眼预留", "热身场", "器材库"]
    },
    {
      id: "venue-minhang-aquatic",
      name: "闵行水上中心",
      city: "上海",
      area: "闵行",
      surfaceType: "50 米泳池",
      capacity: 4200,
      indoor: 1,
      support: ["电子计时", "检录区", "媒体看台"]
    },
    {
      id: "venue-jingan-esports",
      name: "静安电竞馆",
      city: "上海",
      area: "静安",
      surfaceType: "电竞舞台",
      capacity: 2800,
      indoor: 1,
      support: ["战队训练室", "OB 导播", "直播串流机房"]
    }
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO venues (id, name, city, area, surface_type, capacity, indoor, support_json)
    VALUES (@id, @name, @city, @area, @surfaceType, @capacity, @indoor, @supportJson)
  `);

  for (const item of venues) {
    stmt.run({
      id: item.id,
      name: item.name,
      city: item.city,
      area: item.area,
      surfaceType: item.surfaceType,
      capacity: item.capacity,
      indoor: item.indoor,
      supportJson: json(item.support)
    });
  }
}

function seedOfficials() {
  const officials = [
    ["official-1", "周楠", "主裁判", "国家级", "上海", "available"],
    ["official-2", "宋昀", "副裁判", "一级", "上海", "busy"],
    ["official-3", "许铮", "技术代表", "国家级", "南京", "available"],
    ["official-4", "陈澈", "赛事监督", "国际级", "北京", "available"],
    ["official-5", "林朔", "裁判长", "国家级", "杭州", "available"]
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO officials (id, name, role, level, city, availability_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const item of officials) {
    stmt.run(...item);
  }
}

function seedTournaments() {
  const tournaments = [
    {
      id: "tournament-super-cup",
      name: "城市超级杯足球邀请赛",
      shortName: "城市超级杯",
      sportId: "football",
      formatId: "group-knockout",
      seasonLabel: "2026 春季",
      organizer: "申城赛事运营中心",
      location: "上海",
      level: "市级重点赛事",
      status: "进行中",
      entryMode: "team",
      startDate: "2026-05-02",
      endDate: "2026-05-18",
      registrationDeadline: "2026-04-20",
      teamCount: 16,
      matchCount: 32,
      venueCount: 3,
      prizePool: 600000,
      broadcastChannels: "视频号 / B站 / 地面体育频道",
      tags: ["青训", "品牌赞助", "直播"],
      highlights: ["四组循环赛", "八强交叉淘汰", "配套新闻发布会与直播"],
      notes: "重点监控场地冲突、直播窗口和安保排班。"
    },
    {
      id: "tournament-hoops-league",
      name: "东岸篮球冠军联赛",
      shortName: "东岸联赛",
      sportId: "basketball",
      formatId: "double-round-robin",
      seasonLabel: "2026 赛季",
      organizer: "东岸体育文化",
      location: "上海",
      level: "商业联赛",
      status: "报名中",
      entryMode: "team",
      startDate: "2026-06-10",
      endDate: "2026-08-28",
      registrationDeadline: "2026-05-20",
      teamCount: 12,
      matchCount: 132,
      venueCount: 2,
      prizePool: 450000,
      broadcastChannels: "咪咕体育 / 公众号图文",
      tags: ["赞助招商", "票务", "球员数据"],
      highlights: ["主客场双循环", "技术统计全量采集", "总决赛三场两胜"],
      notes: "联赛期长，需要完善赛程重排和主客场冲突处理。"
    },
    {
      id: "tournament-esports-masters",
      name: "先锋电竞大师赛",
      shortName: "先锋大师赛",
      sportId: "esports",
      formatId: "double-elimination",
      seasonLabel: "2026 第 2 赛段",
      organizer: "火线数字竞技",
      location: "上海",
      level: "品牌巡回赛",
      status: "进行中",
      entryMode: "team",
      startDate: "2026-04-25",
      endDate: "2026-05-03",
      registrationDeadline: "2026-04-15",
      teamCount: 8,
      matchCount: 14,
      venueCount: 1,
      prizePool: 800000,
      broadcastChannels: "斗鱼 / 虎牙 / 抖音",
      tags: ["双败", "直播制作", "赞助权益"],
      highlights: ["胜败者组并行", "直播流管理", "选手休息室排班"],
      notes: "需要重点跟踪导播、串流状态和总决赛重置逻辑。"
    },
    {
      id: "tournament-swim-open",
      name: "城市公开游泳锦标赛",
      shortName: "游泳公开赛",
      sportId: "swimming",
      formatId: "time-qualifier-final",
      seasonLabel: "2026 夏季",
      organizer: "城市泳协",
      location: "上海",
      level: "公开赛",
      status: "筹备中",
      entryMode: "participant",
      startDate: "2026-07-12",
      endDate: "2026-07-14",
      registrationDeadline: "2026-06-28",
      teamCount: 24,
      matchCount: 36,
      venueCount: 1,
      prizePool: 200000,
      broadcastChannels: "官方小程序",
      tags: ["计时", "检录", "分组"],
      highlights: ["预赛计时晋级", "A/B 决赛", "成绩公告联动"],
      notes: "重点是检录、分组编排和成绩发布。"
    }
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO tournaments (
      id, name, short_name, sport_id, format_id, season_label, organizer, location, level,
      status, entry_mode, start_date, end_date, registration_deadline, team_count, match_count, venue_count,
      prize_pool, broadcast_channels, tags_json, highlights_json, notes
    ) VALUES (
      @id, @name, @shortName, @sportId, @formatId, @seasonLabel, @organizer, @location, @level,
      @status, @entryMode, @startDate, @endDate, @registrationDeadline, @teamCount, @matchCount, @venueCount,
      @prizePool, @broadcastChannels, @tagsJson, @highlightsJson, @notes
    )
  `);

  for (const item of tournaments) {
    stmt.run({
      id: item.id,
      name: item.name,
      shortName: item.shortName,
      sportId: item.sportId,
      formatId: item.formatId,
      seasonLabel: item.seasonLabel,
      organizer: item.organizer,
      location: item.location,
      level: item.level,
      status: item.status,
      entryMode: item.entryMode,
      startDate: item.startDate,
      endDate: item.endDate,
      registrationDeadline: item.registrationDeadline,
      teamCount: item.teamCount,
      matchCount: item.matchCount,
      venueCount: item.venueCount,
      prizePool: item.prizePool,
      broadcastChannels: item.broadcastChannels,
      notes: item.notes,
      tagsJson: json(item.tags),
      highlightsJson: json(item.highlights)
    });
  }
}

function seedStages() {
  const stages = [
    ["stage-fb-groups", "tournament-super-cup", "小组赛", "group", 1, "进行中", "16 队分 4 组", "组内单循环，前二出线", 24, "2026-05-02", "2026-05-11"],
    ["stage-fb-knockout", "tournament-super-cup", "淘汰赛", "knockout", 2, "未开始", "8 队", "八强至决赛，单败淘汰", 8, "2026-05-13", "2026-05-18"],
    ["stage-bb-regular", "tournament-hoops-league", "常规赛", "league", 1, "报名中", "12 队", "主客场双循环积分排名", 132, "2026-06-10", "2026-08-18"],
    ["stage-bb-finals", "tournament-hoops-league", "总决赛", "knockout", 2, "未开始", "前四", "半决赛单场，总决赛三场两胜", 5, "2026-08-22", "2026-08-28"],
    ["stage-es-upper", "tournament-esports-masters", "胜者组", "upper-bracket", 1, "进行中", "8 队", "双败淘汰胜者线", 7, "2026-04-25", "2026-05-02"],
    ["stage-es-lower", "tournament-esports-masters", "败者组", "lower-bracket", 2, "进行中", "败者队伍", "双败淘汰败者线", 6, "2026-04-26", "2026-05-03"],
    ["stage-sw-heats", "tournament-swim-open", "预赛", "qualifier", 1, "筹备中", "24 队/个人", "分组计时取前八", 24, "2026-07-12", "2026-07-13"],
    ["stage-sw-finals", "tournament-swim-open", "决赛", "final", 2, "筹备中", "A/B 决赛", "按成绩编道出发", 12, "2026-07-14", "2026-07-14"]
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO tournament_stages (
      id, tournament_id, name, stage_type, sequence_no, status, participant_scope,
      rules_summary, matches_planned, start_date, end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of stages) {
    stmt.run(...item);
  }
}

function seedEntries() {
  const entries = [
    ["entry-fb-1", "tournament-super-cup", "team", "申城联队", "SCL", 1, "申城青训", "上海", "顾尧", "季岩", 28, "已确认", { played: 2, won: 2, lost: 0, scoreFor: 5, scoreAgainst: 1 }],
    ["entry-fb-2", "tournament-super-cup", "team", "海港青年", "HGQ", 2, "海港学院", "上海", "唐越", "陆泽", 26, "已确认", { played: 2, won: 1, lost: 1, scoreFor: 3, scoreAgainst: 2 }],
    ["entry-fb-3", "tournament-super-cup", "team", "苏城竞技", "SCJ", 3, "苏城体育", "苏州", "汪廷", "郝凡", 27, "已确认", { played: 2, won: 1, lost: 1, scoreFor: 4, scoreAgainst: 4 }],
    ["entry-fb-4", "tournament-super-cup", "team", "杭城先锋", "HCX", 4, "杭城俱乐部", "杭州", "邵宁", "孟辰", 27, "待补材料", { played: 2, won: 0, lost: 2, scoreFor: 1, scoreAgainst: 6 }],
    ["entry-bb-1", "tournament-hoops-league", "team", "东岸骑士", "DAQ", 1, "东岸俱乐部", "上海", "林策", "郑野", 18, "待审核", { played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 }],
    ["entry-bb-2", "tournament-hoops-league", "team", "北湾烈焰", "BWL", 2, "北湾体育", "宁波", "陈律", "何启", 18, "已报名", { played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 }],
    ["entry-es-1", "tournament-esports-masters", "team", "Nova Pulse", "NVP", 1, "Nova Pulse", "上海", "Aren", "Mio", 6, "已确认", { played: 3, won: 3, lost: 0, roundsFor: 7, roundsAgainst: 2 }],
    ["entry-es-2", "tournament-esports-masters", "team", "Crimson Unit", "CRU", 2, "Crimson Unit", "广州", "Frost", "K", 6, "已确认", { played: 3, won: 2, lost: 1, roundsFor: 6, roundsAgainst: 4 }],
    ["entry-es-3", "tournament-esports-masters", "team", "Blue Circuit", "BLC", 3, "Blue Circuit", "成都", "Sage", "Volt", 6, "已确认", { played: 2, won: 1, lost: 1, roundsFor: 3, roundsAgainst: 3 }],
    ["entry-es-4", "tournament-esports-masters", "team", "Iron Harbor", "IRH", 4, "Iron Harbor", "北京", "Knox", "Ray", 6, "已确认", { played: 2, won: 0, lost: 2, roundsFor: 1, roundsAgainst: 4 }],
    ["entry-sw-1", "tournament-swim-open", "participant", "韩未", "韩未", 1, "浦东泳协", "上海", "周朔", "韩未", 1, "待检录", { entries: 1, finalists: 0, medals: 0 }],
    ["entry-sw-2", "tournament-swim-open", "participant", "罗溪", "罗溪", 2, "闵行泳协", "上海", "于森", "罗溪", 1, "待检录", { entries: 1, finalists: 0, medals: 0 }],
    ["entry-sw-3", "tournament-swim-open", "participant", "顾年", "顾年", 3, "徐汇泳协", "上海", "赵旻", "顾年", 1, "待检录", { entries: 1, finalists: 0, medals: 0 }]
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO entries (
      id, tournament_id, entity_type, name, short_name, seed_no, organization, region, coach, contact_name,
      participant_count, status, stats_json, member_names_json, notes, is_placeholder, legacy_team_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of entries) {
    stmt.run(...item.slice(0, 12), json(item[12]), json([]), "", 0, null);
  }
}

function seedMatches() {
  const matches = [
    ["match-fb-1", "tournament-super-cup", "stage-fb-groups", "A 组第 1 轮", "A1", "2026-05-02T18:30:00+08:00", "venue-hongkou", "entry-fb-1", "entry-fb-4", 3, 1, "已结束", "已完成", "official-1", "高", "揭幕战", "group"],
    ["match-fb-2", "tournament-super-cup", "stage-fb-groups", "A 组第 2 轮", "A2", "2026-05-05T18:30:00+08:00", "venue-hongkou", "entry-fb-2", "entry-fb-3", 2, 2, "已结束", "已完成", "official-2", "中", "补时阶段扳平", "group"],
    ["match-fb-3", "tournament-super-cup", "stage-fb-groups", "A 组第 3 轮", "A3", "2026-05-08T19:00:00+08:00", "venue-hongkou", "entry-fb-1", "entry-fb-2", 0, 0, "待进行", "待开启", "official-1", "高", "小组头名争夺", "group"],
    ["match-bb-1", "tournament-hoops-league", "stage-bb-regular", "第 1 轮", "R1-G1", "2026-06-10T19:30:00+08:00", "venue-pudong-arena", "entry-bb-1", "entry-bb-2", 0, 0, "待进行", "待排期", "official-5", "高", "赛季揭幕战", "league"],
    ["match-es-1", "tournament-esports-masters", "stage-es-upper", "胜者组首轮", "U1", "2026-04-25T14:00:00+08:00", "venue-jingan-esports", "entry-es-1", "entry-es-4", 2, 0, "已结束", "已完成", "official-3", "高", "主舞台 BO3", "upper-bracket"],
    ["match-es-2", "tournament-esports-masters", "stage-es-upper", "胜者组半决赛", "U2", "2026-04-26T16:00:00+08:00", "venue-jingan-esports", "entry-es-1", "entry-es-2", 2, 1, "进行中", "直播中", "official-4", "极高", "峰值在线 12 万", "upper-bracket"],
    ["match-es-3", "tournament-esports-masters", "stage-es-lower", "败者组首轮", "L1", "2026-04-26T19:30:00+08:00", "venue-jingan-esports", "entry-es-3", "entry-es-4", 0, 0, "待进行", "待开启", "official-3", "中", "败者生死战", "lower-bracket"]
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO matches (
      id, tournament_id, stage_id, round_label, bracket_slot, scheduled_at, venue_id, home_team_id,
      away_team_id, home_score, away_score, status, stream_status, official_id, importance_level, notes, phase_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of matches) {
    stmt.run(...item);
  }
}

function seedRegistrations() {
  const registrations = [
    ["reg-1", "tournament-hoops-league", "梁策", "东岸骑士", "13800001234", "领队", "待审核", "2026-04-18 10:22", "已缴费", "资料完整"],
    ["reg-2", "tournament-hoops-league", "严初", "临港迅影", "13800008811", "经理", "补材料", "2026-04-19 14:05", "待缴费", "缺保险证明"],
    ["reg-3", "tournament-swim-open", "韩未", "浦东泳队", "13900006543", "教练", "已通过", "2026-04-21 09:30", "已缴费", "待分组"],
    ["reg-4", "tournament-super-cup", "邵宁", "杭城先锋", "13711112222", "主教练", "待审核", "2026-04-17 18:11", "已缴费", "缺球员证件复核"]
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO registrations (
      id, tournament_id, applicant_name, organization, contact_phone, role,
      status, submitted_at, fee_status, compliance_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of registrations) {
    stmt.run(...item);
  }
}

function seedTasks() {
  const tasks = [
    ["task-1", "tournament-super-cup", "完成八强赛程锁场", "场地", "孙颂", "高", "2026-05-09", "处理中"],
    ["task-2", "tournament-super-cup", "直播导播脚本终审", "直播", "朱颖", "高", "2026-05-08", "待处理"],
    ["task-3", "tournament-esports-masters", "总决赛赞助权益排布", "商务", "陆格", "中", "2026-05-01", "处理中"],
    ["task-4", "tournament-esports-masters", "败者组设备热备检查", "技术", "石亦", "高", "2026-04-26", "待处理"],
    ["task-5", "tournament-hoops-league", "报名队伍资质复审", "报名", "彭睿", "中", "2026-05-18", "待处理"],
    ["task-6", "tournament-swim-open", "预赛检录规则确认", "竞赛", "高谦", "高", "2026-07-05", "待处理"]
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO operation_tasks (
      id, tournament_id, title, category, assignee, priority, due_date, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of tasks) {
    stmt.run(...item);
  }
}

function seedUsers() {
  const users = [
    ["user-admin", "林岫", "admin", "系统管理员", "linxiu@sports.local", "pass123", "在线", "2026-04-24T16:20:00+08:00"],
    ["user-director", "周聿", "director", "赛事总监", "zhouyu@sports.local", "pass123", "在线", "2026-04-24T16:12:00+08:00"],
    ["user-scheduler", "沈策", "scheduler", "编排专员", "shence@sports.local", "pass123", "在线", "2026-04-24T15:55:00+08:00"],
    ["user-registrar", "唐宁", "registrar", "报名审核", "tangning@sports.local", "pass123", "忙碌", "2026-04-24T15:42:00+08:00"],
    ["user-operations", "顾寻", "operations", "现场运营", "guxun@sports.local", "pass123", "在线", "2026-04-24T16:05:00+08:00"],
    ["user-viewer", "许原", "viewer", "只读观察", "xuyuan@sports.local", "pass123", "离线", "2026-04-24T11:18:00+08:00"]
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO users (id, name, role, title, email, password, status, last_active_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of users) {
    stmt.run(...item);
  }
}

function seedLogs() {
  const logs = [
    [
      "log-seed-1",
      "user-director",
      "周聿",
      "director",
      "创建赛事",
      "tournament",
      "tournament-hoops-league",
      "东岸篮球冠军联赛",
      { source: "seed" },
      "2026-04-20T10:20:00+08:00"
    ],
    [
      "log-seed-2",
      "user-scheduler",
      "沈策",
      "scheduler",
      "生成赛程",
      "tournament",
      "tournament-esports-masters",
      "先锋电竞大师赛",
      { format: "双败淘汰" },
      "2026-04-22T14:40:00+08:00"
    ],
    [
      "log-seed-3",
      "user-registrar",
      "唐宁",
      "registrar",
      "审核报名",
      "registration",
      "reg-3",
      "浦东泳队报名",
      { status: "已通过" },
      "2026-04-23T09:15:00+08:00"
    ],
    [
      "log-seed-4",
      "user-operations",
      "顾寻",
      "operations",
      "推进任务",
      "task",
      "task-2",
      "直播导播脚本终审",
      { status: "待处理" },
      "2026-04-24T10:05:00+08:00"
    ]
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO activity_logs (
      id, actor_id, actor_name, actor_role, action, target_type, target_id, target_name, detail_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of logs) {
    stmt.run(...item.slice(0, 8), json(item[8]), item[9]);
  }
}

function seedAppState() {
  run(
    `
      INSERT INTO app_state (state_key, state_value)
      VALUES ('current_user_id', 'user-director')
      ON CONFLICT(state_key) DO UPDATE SET state_value = excluded.state_value
    `
  );
}

function seedAll() {
  seedSports();
  seedFormats();
  seedVenues();
  seedOfficials();
  seedTournaments();
  seedStages();
  seedEntries();
  seedMatches();
  seedRegistrations();
  seedTasks();
  seedUsers();
  seedLogs();
  seedAppState();
}

function parseJsonFields(row, fields) {
  const parsed = { ...row };
  for (const field of fields) {
    if (parsed[field]) {
      parsed[field] = JSON.parse(parsed[field]);
    }
  }
  return parsed;
}

function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function clearDirectory(dir) {
  ensureDirectory(dir);

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(target, { recursive: true, force: true });
    } else {
      fs.unlinkSync(target);
    }
  }
}

function writeJsonFile(filePath, payload) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function buildHomepageSnapshots() {
  const dashboard = getDashboardData();
  const generatedAt = new Date().toISOString();
  const insightsByTournament = new Map((dashboard.tournamentInsights || []).map((item) => [item.tournamentId, item]));
  const entriesByTournament = new Map();
  const stagesByTournament = new Map();
  const matchesByTournament = new Map();

  for (const entry of dashboard.teamDetails || []) {
    if (entry.is_placeholder) continue;
    if (!entriesByTournament.has(entry.tournament_id)) {
      entriesByTournament.set(entry.tournament_id, []);
    }
    entriesByTournament.get(entry.tournament_id).push({
      id: entry.id,
      name: entry.name,
      shortName: entry.short_name,
      organization: entry.organization,
      region: entry.region,
      coach: entry.coach,
      contactName: entry.contact_name,
      participantCount: entry.participant_count,
      status: entry.status,
      seedNo: entry.seed_no,
      memberNames: Array.isArray(entry.memberNames) ? entry.memberNames : [],
      computed: entry.computed || null
    });
  }

  for (const stage of dashboard.stages || []) {
    if (!stagesByTournament.has(stage.tournament_id)) {
      stagesByTournament.set(stage.tournament_id, []);
    }
    stagesByTournament.get(stage.tournament_id).push({
      id: stage.id,
      name: stage.name,
      stageType: stage.stage_type,
      status: stage.status,
      participantScope: stage.participant_scope,
      rulesSummary: stage.rules_summary,
      matchesPlanned: stage.matches_planned,
      startDate: stage.start_date,
      endDate: stage.end_date
    });
  }

  for (const match of dashboard.matches || []) {
    if (!matchesByTournament.has(match.tournament_id)) {
      matchesByTournament.set(match.tournament_id, []);
    }
    matchesByTournament.get(match.tournament_id).push({
      id: match.id,
      roundLabel: match.round_label,
      bracketSlot: match.bracket_slot,
      stageName: match.stage_name,
      scheduledAt: match.scheduled_at,
      venueName: match.venue_name,
      homeTeamName: match.home_team_name,
      awayTeamName: match.away_team_name,
      homeScore: match.home_score,
      awayScore: match.away_score,
      status: match.status,
      streamStatus: match.stream_status,
      officialName: match.official_name,
      importanceLevel: match.importance_level,
      notes: match.notes,
      phaseType: match.phase_type
    });
  }

  const tournaments = (dashboard.tournaments || []).map((tournament) => {
    const tournamentMatches = matchesByTournament.get(tournament.id) || [];
    const liveMatchCount = tournamentMatches.filter(
      (match) => match.status === "进行中" || match.streamStatus === "直播中"
    ).length;
    const completedMatchCount = tournamentMatches.filter((match) => match.status === "已结束").length;
    const upcomingMatchCount = tournamentMatches.filter((match) => match.status !== "已结束").length;

    return {
      id: tournament.id,
      name: tournament.name,
      shortName: tournament.short_name,
      sportName: tournament.sport_name,
      sportIcon: tournament.sport_icon,
      formatName: tournament.format_name,
      seasonLabel: tournament.season_label,
      organizer: tournament.organizer,
      location: tournament.location,
      level: tournament.level,
      status: tournament.status,
      startDate: tournament.start_date,
      endDate: tournament.end_date,
      registrationDeadline: tournament.registration_deadline,
      teamCount: tournament.team_count,
      matchCount: tournament.match_count,
      venueCount: tournament.venue_count,
      prizePool: tournament.prize_pool,
      broadcastChannels: tournament.broadcast_channels,
      notes: tournament.notes,
      tags: Array.isArray(tournament.tags_json) ? tournament.tags_json : [],
      highlights: Array.isArray(tournament.highlights_json) ? tournament.highlights_json : [],
      entryPresentation: tournament.entryPresentation,
      liveMatchCount,
      upcomingMatchCount,
      completedMatchCount,
      detailUrl: `./tournament.html?id=${encodeURIComponent(tournament.id)}`,
      jsonPath: `./data/tournaments/${encodeURIComponent(tournament.id)}.json`
    };
  });

  const listPayload = {
    generatedAt,
    totals: {
      total: tournaments.length,
      running: tournaments.filter((item) => item.status === "进行中").length,
      registration: tournaments.filter((item) => item.status === "报名中").length,
      preparing: tournaments.filter((item) => item.status === "筹备中").length,
      finished: tournaments.filter((item) => item.status === "已结束").length
    },
    tournaments
  };

  const detailPayloads = tournaments.map((tournament) => {
    const entries = entriesByTournament.get(tournament.id) || [];
    const stages = stagesByTournament.get(tournament.id) || [];
    const matches = matchesByTournament.get(tournament.id) || [];
    const insights = insightsByTournament.get(tournament.id) || {
      standings: [],
      groups: [],
      advancement: []
    };

    return {
      generatedAt,
      tournament,
      metrics: {
        liveMatchCount: tournament.liveMatchCount,
        upcomingMatchCount: tournament.upcomingMatchCount,
        completedMatchCount: tournament.completedMatchCount,
        participantCount: entries.length,
        stageCount: stages.length
      },
      stages,
      entries,
      matches: {
        live: matches.filter((match) => match.status === "进行中" || match.streamStatus === "直播中"),
        upcoming: matches.filter((match) => match.status !== "已结束").slice(0, 8),
        recent: matches.filter((match) => match.status === "已结束").slice(0, 8),
        all: matches
      },
      insights
    };
  });

  return { listPayload, detailPayloads };
}

export function syncHomepageData() {
  ensureDirectory(homepageTournamentDataDir);
  clearDirectory(homepageTournamentDataDir);

  const { listPayload, detailPayloads } = buildHomepageSnapshots();

  writeJsonFile(path.join(homepageDataDir, "tournaments.json"), listPayload);
  for (const detail of detailPayloads) {
    writeJsonFile(path.join(homepageTournamentDataDir, `${detail.tournament.id}.json`), detail);
  }
}

export function initializeDatabase() {
  initSchema();
  if (!hasSeedData()) {
    db.exec("BEGIN");
    try {
      seedAll();
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  syncHomepageData();
}

export function resetDemoData() {
  initSchema();
  db.exec("BEGIN");
  try {
    db.exec(`
      DELETE FROM sessions;
      DELETE FROM activity_logs;
      DELETE FROM app_state;
      DELETE FROM matches;
      DELETE FROM entries;
      DELETE FROM teams;
      DELETE FROM registrations;
      DELETE FROM operation_tasks;
      DELETE FROM tournament_stages;
      DELETE FROM tournaments;
      DELETE FROM officials;
      DELETE FROM venues;
      DELETE FROM competition_formats;
      DELETE FROM sports;
    `);
    seedAll();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  syncHomepageData();
}

export function switchCurrentUser(userId, actorId = "user-admin") {
  const actor = requirePermission(actorId, "user:manage");
  const target = get("SELECT * FROM users WHERE id = ?", [userId]);

  if (!target) {
    throw new Error("目标用户不存在");
  }

  insertLog({
    actor,
    action: "切换当前用户",
    targetType: "user",
    targetId: target.id,
    targetName: target.name,
    detail: { role: target.role }
  });

  run(
    `
      INSERT INTO app_state (state_key, state_value)
      VALUES ('current_user_id', ?)
      ON CONFLICT(state_key) DO UPDATE SET state_value = excluded.state_value
    `,
    [userId]
  );

  return target;
}

export function loginUser(identifier, password) {
  const normalized = String(identifier || "").trim().toLowerCase();
  const secret = String(password || "").trim();
  const user = get(
    `
      SELECT *
      FROM users
      WHERE lower(email) = ? OR lower(name) = ? OR lower(id) = ?
    `,
    [normalized, normalized, normalized]
  );

  if (!user || user.password !== secret) {
    throw new Error("账号或密码错误");
  }

  const session = createSession(user.id);

  run(
    `
      INSERT INTO app_state (state_key, state_value)
      VALUES ('current_user_id', ?)
      ON CONFLICT(state_key) DO UPDATE SET state_value = excluded.state_value
    `,
    [user.id]
  );

  insertLog({
    actor: user,
    action: "登录系统",
    targetType: "session",
    targetId: session.id,
    targetName: user.name,
    detail: { email: user.email }
  });

  return {
    user,
    session
  };
}

export function logoutUser(token, actorId) {
  const actor = getCurrentUser(actorId);

  if (!actor) {
    return;
  }

  clearSession(token);

  insertLog({
    actor,
    action: "退出系统",
    targetType: "session",
    targetId: actor.id,
    targetName: actor.name,
    detail: {}
  });
}

export function getSessionUser(token) {
  return serializeUser(getUserBySessionToken(token));
}

export function updateUserRole(userId, role, actorId = "user-admin") {
  const actor = requirePermission(actorId, "user:manage");
  const allowedRoles = Object.keys(ROLE_LABELS);

  if (!allowedRoles.includes(role)) {
    throw new Error("角色无效");
  }

  const target = get("SELECT * FROM users WHERE id = ?", [userId]);

  if (!target) {
    throw new Error("用户不存在");
  }

  run("UPDATE users SET role = ?, title = ? WHERE id = ?", [role, ROLE_LABELS[role], userId]);
  insertLog({
    actor,
    action: "调整角色",
    targetType: "user",
    targetId: userId,
    targetName: target.name,
    detail: { role }
  });
}

export function getDashboardData(userId) {
  const resolvedCurrentUser = userId ? getCurrentUser(userId) : null;

  const overview = get(`
    SELECT
      COUNT(*) AS totalTournaments,
      SUM(CASE WHEN status = '进行中' THEN 1 ELSE 0 END) AS activeTournaments,
      SUM(team_count) AS totalTeams,
      SUM(match_count) AS totalMatches,
      SUM(prize_pool) AS totalPrizePool
    FROM tournaments
  `);

  const sports = all(`
    SELECT
      s.id,
      s.name,
      s.icon,
      s.category,
      s.participants_type,
      COUNT(t.id) AS tournamentCount
    FROM sports s
    LEFT JOIN tournaments t ON t.sport_id = s.id
    GROUP BY s.id, s.name, s.icon, s.category, s.participants_type
    ORDER BY s.popularity_rank ASC
  `);

  const tournaments = all(`
    SELECT
      t.*,
      s.name AS sport_name,
      s.icon AS sport_icon,
      s.participants_type,
      f.name AS format_name
    FROM tournaments t
    JOIN sports s ON s.id = t.sport_id
    JOIN competition_formats f ON f.id = t.format_id
    ORDER BY
      CASE t.status
        WHEN '进行中' THEN 1
        WHEN '报名中' THEN 2
        WHEN '筹备中' THEN 3
        ELSE 4
      END,
      t.start_date ASC
  `).map((row) => {
    const parsed = parseJsonFields(row, ["tags_json", "highlights_json"]);
    return {
      ...parsed,
      entryPresentation: getEntryConfig(parsed.entry_mode || parsed.participants_type)
    };
  });

  const stages = all(`
    SELECT
      ts.*,
      t.name AS tournament_name
    FROM tournament_stages ts
    JOIN tournaments t ON t.id = ts.tournament_id
    ORDER BY t.start_date, ts.sequence_no
  `);

  const matches = all(`
    SELECT
      m.*,
      t.name AS tournament_name,
      ts.name AS stage_name,
      v.name AS venue_name,
      h.name AS home_team_name,
      a.name AS away_team_name,
      o.name AS official_name
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    JOIN tournament_stages ts ON ts.id = m.stage_id
    JOIN venues v ON v.id = m.venue_id
    JOIN entries h ON h.id = m.home_team_id
    JOIN entries a ON a.id = m.away_team_id
    JOIN officials o ON o.id = m.official_id
    ORDER BY m.scheduled_at ASC
  `);

  const registrations = all(`
    SELECT
      r.*,
      t.name AS tournament_name
    FROM registrations r
    JOIN tournaments t ON t.id = r.tournament_id
    ORDER BY r.submitted_at DESC
  `);

  const tasks = all(`
    SELECT
      ot.*,
      t.name AS tournament_name
    FROM operation_tasks ot
    JOIN tournaments t ON t.id = ot.tournament_id
    ORDER BY
      CASE ot.priority
        WHEN '高' THEN 1
        WHEN '中' THEN 2
        ELSE 3
      END,
      ot.due_date ASC
  `);

  const venues = all(`SELECT * FROM venues ORDER BY capacity DESC`).map((row) =>
    parseJsonFields(row, ["support_json"])
  );

  const officials = all(`SELECT * FROM officials ORDER BY availability_status, level DESC`);

  const entries = all(`
    SELECT
      e.*,
      t.name AS tournament_name
    FROM entries e
    JOIN tournaments t ON t.id = e.tournament_id
    ORDER BY t.start_date ASC, e.seed_no ASC
  `).map((row) => parseJsonFields(row, ["stats_json", "member_names_json"]));

  const teamDetails = entries.map((entry) => {
    const teamMatches = matches.filter(
      (match) => match.home_team_id === entry.id || match.away_team_id === entry.id
    );
    const wins = teamMatches.filter((match) => {
      if (match.status !== "已结束") return false;
      if (match.home_team_id === entry.id) return match.home_score > match.away_score;
      return match.away_score > match.home_score;
    }).length;
    const losses = teamMatches.filter((match) => {
      if (match.status !== "已结束") return false;
      if (match.home_team_id === entry.id) return match.home_score < match.away_score;
      return match.away_score < match.home_score;
    }).length;
    const upcoming = teamMatches
      .filter((match) => match.status !== "已结束")
      .slice(0, 2)
      .map((match) => ({
        id: match.id,
        roundLabel: match.round_label,
        scheduledAt: match.scheduled_at,
        opponentName: match.home_team_id === entry.id ? match.away_team_name : match.home_team_name
      }));

    return {
      ...entry,
      club: entry.organization,
      captain: entry.contact_name,
      memberNames: Array.isArray(entry.member_names_json) ? entry.member_names_json : [],
      computed: {
        matchesPlayed: teamMatches.filter((match) => match.status === "已结束").length,
        wins,
        losses,
        upcoming,
        totalMatches: teamMatches.length
      }
    };
  });

  const formats = all(`SELECT * FROM competition_formats ORDER BY name ASC`).map((row) =>
    parseJsonFields(row, ["rules_json"])
  );

  const users = all(`SELECT * FROM users ORDER BY rowid ASC`).map(serializeUser);

  const activityLogs = all(`
    SELECT *
    FROM activity_logs
    ORDER BY created_at DESC
    LIMIT 24
  `).map((row) => parseJsonFields(row, ["detail_json"]));
  const insights = buildTournamentInsights(tournaments, entries, matches);

  const alerts = [
    {
      id: "alert-1",
      level: "warning",
      title: "城市超级杯存在 2 场直播窗口冲突",
      detail: "5 月 8 日 19:00 与 19:30 两场重点比赛存在资源重叠。"
    },
    {
      id: "alert-2",
      level: "info",
      title: "东岸联赛报名材料待复核 5 份",
      detail: "主要集中在保险与球员身份校验。"
    },
    {
      id: "alert-3",
      level: "critical",
      title: "先锋大师赛败者组设备热备未完成",
      detail: "总决赛前需要完成网络冗余和舞台备机测试。"
    }
  ];

  return {
    overview,
    sports,
    formats,
    tournaments,
    stages,
    matches,
    registrations,
    tasks,
    venues,
    officials,
    teams: entries.map((entry) => ({
      ...entry,
      club: entry.organization,
      captain: entry.contact_name
    })),
    entries,
    teamDetails,
    users,
    activityLogs,
    tournamentInsights: insights,
    currentUser: serializeUser(resolvedCurrentUser),
    session: {
      authenticated: Boolean(resolvedCurrentUser)
    },
    loginOptions: users.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      roleLabel: user.roleLabel,
      email: user.email
    })),
    permissionCatalog: PERMISSION_CATALOG,
    alerts,
    capabilities: {
      sportsCoverage: [
        "足球",
        "篮球",
        "排球",
        "羽毛球",
        "乒乓球",
        "网球",
        "棒球",
        "电子竞技",
        "游泳",
        "田径"
      ],
      formatCoverage: [
        "单败淘汰",
        "双败淘汰",
        "单循环",
        "双循环",
        "小组赛 + 淘汰赛",
        "瑞士轮",
        "阶梯挑战",
        "资格赛 + 决赛"
      ],
      modules: [
        "赛事总览",
        "项目与赛制库",
        "赛程编排",
        "队伍与报名管理",
        "场馆与裁判资源",
        "直播与运营任务",
        "阶段管理与风险预警"
      ]
    }
  };
}

export function createTournament(payload) {
  const actor = requirePermission(payload.actorId, "tournament:create");
  const tournamentId = `tournament-${slugify(payload.name) || "custom"}-${Date.now().toString(36)}`;
  const shortName = payload.name.trim().slice(0, 12);
  const teamCount = Number(payload.teamCount) || 8;
  const prizePool = Number(payload.prizePool) || 0;
  const formatId = payload.formatId;
  const sportId = payload.sportId;
  const defaultEntryMode = getEntryMode(get("SELECT participants_type FROM sports WHERE id = ?", [sportId])?.participants_type);
  const entryMode = ENTRY_MODE_CONFIG[payload.entryMode] ? payload.entryMode : defaultEntryMode;
  const tags = Array.isArray(payload.tags) ? payload.tags : [];
  const startDate = payload.startDate;
  const endDate = payload.endDate;
  const registrationDeadline = payload.registrationDeadline || startDate;
  const status = sanitizeStatus(payload.status || "筹备中", [
    "筹备中",
    "报名中",
    "进行中",
    "已结束"
  ]);

  run(
    `
      INSERT INTO tournaments (
        id, name, short_name, sport_id, format_id, season_label, organizer, location, level,
        status, entry_mode, start_date, end_date, registration_deadline, team_count, match_count, venue_count,
        prize_pool, broadcast_channels, tags_json, highlights_json, notes
      ) VALUES (
        @id, @name, @shortName, @sportId, @formatId, @seasonLabel, @organizer, @location, @level,
        @status, @entryMode, @startDate, @endDate, @registrationDeadline, @teamCount, @matchCount, @venueCount,
        @prizePool, @broadcastChannels, @tagsJson, @highlightsJson, @notes
      )
    `,
    {
      id: tournamentId,
      name: payload.name.trim(),
      shortName,
      sportId,
      formatId,
      seasonLabel: payload.seasonLabel?.trim() || "未命名赛季",
      organizer: payload.organizer?.trim() || "待填写主办方",
      location: payload.location?.trim() || "待定",
      level: "自定义赛事",
      status,
      entryMode,
      startDate,
      endDate,
      registrationDeadline,
      teamCount,
      matchCount: 0,
      venueCount: 0,
      prizePool,
      broadcastChannels: "待配置",
      tagsJson: json(tags),
      highlightsJson: json(["自动创建", "待编排赛程", "待配置资源"]),
      notes: payload.notes?.trim() || "新建赛事待完善赛程、资源和报名设置。"
    }
  );

  createStageBlueprints(formatId, tournamentId, startDate, endDate, teamCount).forEach((stage) =>
    insertStage(stage)
  );

  insertTask({
    id: createId("task"),
    tournamentId,
    title: "补充场馆与裁判资源",
    category: "资源",
    assignee: "待分配",
    priority: "高",
    dueDate: registrationDeadline,
    status: "待处理"
  });

  insertTask({
    id: createId("task"),
    tournamentId,
    title: "确认报名规则与参赛材料",
    category: "报名",
    assignee: "待分配",
    priority: "中",
    dueDate: registrationDeadline,
    status: "待处理"
  });

  insertLog({
    actor,
    action: "创建赛事",
    targetType: "tournament",
    targetId: tournamentId,
    targetName: payload.name.trim(),
    detail: {
      sportId,
      formatId,
      seasonLabel: payload.seasonLabel?.trim() || "未命名赛季"
    }
  });

  syncHomepageData();
  return tournamentId;
}

export function updateTournamentStatus(id, status, actorId = "user-director") {
  const actor = requirePermission(actorId, "tournament:update");
  const nextStatus = sanitizeStatus(status, ["筹备中", "报名中", "进行中", "已结束"]);
  const existing = get("SELECT id FROM tournaments WHERE id = ?", [id]);

  if (!existing) {
    throw new Error("赛事不存在");
  }

  run("UPDATE tournaments SET status = ? WHERE id = ?", [nextStatus, id]);
  const tournament = getTournamentById(id);
  insertLog({
    actor,
    action: "更新赛事状态",
    targetType: "tournament",
    targetId: id,
    targetName: tournament?.name || id,
    detail: { status: nextStatus }
  });
  syncHomepageData();
}

export function deleteTournament(id, actorId = "user-director") {
  const actor = requirePermission(actorId, "tournament:delete");
  const tournament = getTournamentById(id);

  if (!tournament) {
    throw new Error("赛事不存在");
  }

  db.exec("BEGIN");
  try {
    deleteTournamentMatches(id);
    deleteTournamentStages(id);
    deleteTournamentEntries(id);
    deleteTournamentLegacyTeams(id);
    deleteTournamentRegistrations(id);
    deleteTournamentTasks(id);
    run("DELETE FROM tournaments WHERE id = ?", [id]);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  insertLog({
    actor,
    action: "删除赛事",
    targetType: "tournament",
    targetId: id,
    targetName: tournament.name,
    detail: {
      status: tournament.status,
      seasonLabel: tournament.season_label
    }
  });
  syncHomepageData();
}

export function updateRegistrationStatus(id, status, actorId = "user-registrar") {
  const actor = requirePermission(actorId, "registration:review");
  const nextStatus = sanitizeStatus(status, ["待审核", "补材料", "已通过"]);
  const existing = get("SELECT id FROM registrations WHERE id = ?", [id]);

  if (!existing) {
    throw new Error("报名记录不存在");
  }

  run("UPDATE registrations SET status = ? WHERE id = ?", [nextStatus, id]);
  const registration = get("SELECT organization FROM registrations WHERE id = ?", [id]);
  insertLog({
    actor,
    action: "审核报名",
    targetType: "registration",
    targetId: id,
    targetName: registration?.organization || id,
    detail: { status: nextStatus }
  });
  syncHomepageData();
}

export function updateTaskStatus(id, status, actorId = "user-operations") {
  const actor = requirePermission(actorId, "task:manage");
  const nextStatus = sanitizeStatus(status, ["待处理", "处理中", "已完成"]);
  const existing = get("SELECT id FROM operation_tasks WHERE id = ?", [id]);

  if (!existing) {
    throw new Error("任务不存在");
  }

  run("UPDATE operation_tasks SET status = ? WHERE id = ?", [nextStatus, id]);
  const task = get("SELECT title FROM operation_tasks WHERE id = ?", [id]);
  insertLog({
    actor,
    action: "推进任务",
    targetType: "task",
    targetId: id,
    targetName: task?.title || id,
    detail: { status: nextStatus }
  });
  syncHomepageData();
}

export function createTask(payload, actorId = "user-operations") {
  const actor = requirePermission(actorId, "task:manage");
  const tournament = get("SELECT id, name, registration_deadline FROM tournaments WHERE id = ?", [payload?.tournamentId]);

  if (!tournament) {
    throw new Error("未找到所属赛事");
  }

  const title = String(payload?.title || "").trim();
  if (!title) {
    throw new Error("请先填写任务标题");
  }

  const category = String(payload?.category || "").trim() || "竞赛";
  const assignee = String(payload?.assignee || "").trim() || "待分配";
  const priority = sanitizeStatus(payload?.priority || "中", ["高", "中", "低"]);
  const status = sanitizeStatus(payload?.status || "待处理", ["待处理", "处理中", "已完成"]);
  const dueDate = String(payload?.dueDate || "").trim() || tournament.registration_deadline;
  const id = createId("task");

  insertTask({
    id,
    tournamentId: tournament.id,
    title,
    category,
    assignee,
    priority,
    dueDate,
    status
  });

  insertLog({
    actor,
    action: "创建任务",
    targetType: "task",
    targetId: id,
    targetName: title,
    detail: {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      category,
      priority,
      dueDate
    }
  });
  syncHomepageData();
}

export function updateMatchStatus(id, status, streamStatus, actorId = "user-operations") {
  const actor = requirePermission(actorId, "match:update");
  const existing = get("SELECT * FROM matches WHERE id = ?", [id]);

  if (!existing) {
    throw new Error("场次不存在");
  }

  const nextStatus = sanitizeStatus(status || "待进行", ["待进行", "进行中", "已结束"]);
  const nextStreamStatus = sanitizeStatus(streamStatus || "待开启", [
    "待排期",
    "待开启",
    "直播中",
    "已完成"
  ]);

  const homeScore =
    typeof status === "object" && status !== null ? Number(status.homeScore) || 0 : existing.home_score;
  const awayScore =
    typeof status === "object" && status !== null ? Number(status.awayScore) || 0 : existing.away_score;
  const normalizedStatus =
    typeof status === "object" && status !== null ? sanitizeStatus(status.status || "待进行", ["待进行", "进行中", "已结束"]) : nextStatus;
  const normalizedStreamStatus =
    typeof status === "object" && status !== null
      ? sanitizeStatus(status.streamStatus || "待开启", ["待排期", "待开启", "直播中", "已完成"])
      : nextStreamStatus;

  if (
    normalizedStatus === "已结束" &&
    ["knockout", "upper-bracket", "lower-bracket", "final", "grand-final"].includes(existing.phase_type) &&
    existing.home_team_id !== existing.away_team_id &&
    homeScore === awayScore
  ) {
    throw new Error("淘汰赛完赛不能录入平局比分");
  }

  run(
    "UPDATE matches SET status = ?, stream_status = ?, home_score = ?, away_score = ? WHERE id = ?",
    [normalizedStatus, normalizedStreamStatus, homeScore, awayScore, id]
  );
  const match = get("SELECT round_label FROM matches WHERE id = ?", [id]);

  if (normalizedStatus === "已结束") {
    const persisted = get("SELECT * FROM matches WHERE id = ?", [id]);
    const winnerId = homeScore > awayScore ? persisted.home_team_id : persisted.away_team_id;
    const loserId = homeScore > awayScore ? persisted.away_team_id : persisted.home_team_id;

    if (persisted.next_winner_match_id) {
      const target = get("SELECT * FROM matches WHERE id = ?", [persisted.next_winner_match_id]);
      if (target) {
        const slot = persisted.next_winner_slot || "home";
        run(
          slot === "home"
            ? "UPDATE matches SET home_team_id = ? WHERE id = ?"
            : "UPDATE matches SET away_team_id = ? WHERE id = ?",
          [winnerId, target.id]
        );
      }
    }

    if (persisted.next_loser_match_id) {
      const target = get("SELECT * FROM matches WHERE id = ?", [persisted.next_loser_match_id]);
      if (target) {
        const slot = persisted.next_loser_slot || "away";
        run(
          slot === "home"
            ? "UPDATE matches SET home_team_id = ? WHERE id = ?"
            : "UPDATE matches SET away_team_id = ? WHERE id = ?",
          [loserId, target.id]
        );
      }
    }

    if (persisted.phase_type === "grand-final" && persisted.round_label === "总决赛" && awayScore > homeScore && persisted.next_loser_match_id) {
      run("UPDATE matches SET status = '待进行', stream_status = '待开启' WHERE id = ?", [
        persisted.next_loser_match_id
      ]);
    }
  }

  updateEntryStatsFromMatches(existing.tournament_id);
  insertLog({
    actor,
    action: "更新比赛",
    targetType: "match",
    targetId: id,
    targetName: match?.round_label || id,
    detail: {
      status: normalizedStatus,
      streamStatus: normalizedStreamStatus,
      homeScore,
      awayScore
    }
  });
  syncHomepageData();
}

export function addEntriesToTournament(tournamentId, entries, actorId = "user-scheduler") {
  const actor = requirePermission(actorId, "team:manage");
  const tournament = getTournamentById(tournamentId);
  const config = getEntryConfig(tournament?.entry_mode || tournament?.participants_type);

  if (!tournament) {
    throw new Error("赛事不存在");
  }

  const existingEntries = listTournamentEntries(tournamentId);
  let seed = existingEntries.length + 1;

  db.exec("BEGIN");
  try {
    for (const entry of entries) {
      if (!entry.name) continue;

      run(
        `
          INSERT INTO entries (
            id, tournament_id, entity_type, name, short_name, seed_no, organization, region, coach,
            contact_name, participant_count, status, stats_json, member_names_json, notes, is_placeholder, legacy_team_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          createId("entry"),
          tournamentId,
          config.mode,
          entry.name,
          (entry.shortName || entry.name).slice(0, 12),
          seed,
          entry.organization || entry.club || entry.name,
          entry.region || tournament.location,
          entry.coach || "待填写",
          entry.contactName || entry.captain || "待填写",
          Number(entry.participantCount) || config.defaultParticipantCount,
          "已报名",
          json({ played: 0, won: 0, lost: 0 }),
          json(Array.isArray(entry.memberNames) ? entry.memberNames.filter(Boolean) : []),
          entry.notes || "",
          0,
          null
        ]
      );
      seed += 1;
    }

    run(
      "UPDATE tournaments SET team_count = (SELECT COUNT(*) FROM entries WHERE tournament_id = ?) WHERE id = ?",
      [tournamentId, tournamentId]
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  insertLog({
    actor,
    action: "新增参赛主体",
    targetType: "tournament",
    targetId: tournamentId,
    targetName: tournament.name,
    detail: { entries: entries.map((entry) => entry.name).filter(Boolean) }
  });
  syncHomepageData();
}

export function generateSchedule(tournamentId, actorId = "user-scheduler") {
  const actor = requirePermission(actorId, "schedule:generate");
  const tournament = getTournamentById(tournamentId);

  if (!tournament) {
    throw new Error("赛事不存在");
  }

  const entries = listTournamentEntries(tournamentId);

  if (entries.length < 2) {
    throw new Error("至少需要两个参赛主体才能编排赛程");
  }

  db.exec("BEGIN");
  try {
    deleteTournamentMatches(tournamentId);
    if (tournament.format_id === "single-elimination") {
      syncPlaceholderEntries(tournamentId, getKnockoutPlaceholderCount(entries.length));
    } else if (tournament.format_id === "double-elimination") {
      syncPlaceholderEntries(tournamentId, getDoubleEliminationPlaceholderCount(entries.length));
    } else if (tournament.format_id === "group-knockout") {
      const qualifierCount = Math.max(4, Math.min(8, Math.max(2, Math.min(4, entries.length >= 16 ? 4 : Math.ceil(entries.length / 4))) * 2));
      syncPlaceholderEntries(tournamentId, getKnockoutPlaceholderCount(qualifierCount));
    } else if (tournament.format_id === "double-round-robin") {
      syncPlaceholderEntries(tournamentId, getKnockoutPlaceholderCount(4));
    } else {
      syncPlaceholderEntries(tournamentId, 0);
    }

    const stageBlueprints = resetTournamentStages(
      tournamentId,
      tournament.format_id,
      entries.length,
      tournament.start_date,
      tournament.end_date
    );

    const refreshedEntries = listTournamentEntries(tournamentId);
    const stageMap = Object.fromEntries(stageBlueprints.map((stage) => [stage.stageType, stage]));
    const rows = [];

    if (tournament.format_id === "group-knockout") {
      const qualifierCount = Math.max(4, Math.min(8, Math.max(2, Math.min(4, refreshedEntries.length >= 16 ? 4 : Math.ceil(refreshedEntries.length / 4))) * 2));
      const knockoutPlaceholders = refreshedEntries.filter((entry) => entry.is_placeholder).slice(0, getKnockoutPlaceholderCount(qualifierCount));
      rows.push(
        ...buildMatchRows({
          tournament,
          stageId: stageMap.group.id,
          entries: refreshedEntries.filter((entry) => !entry.is_placeholder)
        })
      );

      rows.push(
        ...buildMatchRows({
          tournament: { ...tournament, format_id: "single-elimination", start_date: addDays(tournament.start_date, 7) },
          stageId: stageMap.knockout.id,
          entries: refreshedEntries
            .filter((entry) => !entry.is_placeholder)
            .slice(0, qualifierCount),
          placeholderPool: knockoutPlaceholders
        }).map((row, index) => ({
          ...row,
          roundLabel: row.roundLabel.replace("1/8", "淘汰").replace("1/4", "八强"),
          notes: "淘汰赛自动编排",
          sortOrder: 500 + index
        }))
      );
    } else if (tournament.format_id === "double-round-robin") {
      rows.push(
        ...buildMatchRows({
          tournament,
          stageId: stageMap.league.id,
          entries: refreshedEntries.filter((entry) => !entry.is_placeholder)
        })
      );
      const playoffPlaceholders = refreshedEntries.filter((entry) => entry.is_placeholder).slice(0, getKnockoutPlaceholderCount(4));
      rows.push(
        ...buildMatchRows({
          tournament: { ...tournament, format_id: "single-elimination", start_date: addDays(tournament.end_date, -5) },
          stageId: stageMap.knockout.id,
          entries: refreshedEntries.filter((entry) => !entry.is_placeholder).slice(0, 4),
          placeholderPool: playoffPlaceholders
        }).map((row, index) => ({
          ...row,
          notes: "季后赛自动编排",
          sortOrder: 1000 + index
        }))
      );
    } else {
      const primaryStage = stageBlueprints[0];
      if (tournament.format_id === "double-elimination") {
        rows.push(
          ...buildDoubleEliminationRows({
            tournament,
            stageMap,
            entries: refreshedEntries,
            placeholderPool: refreshedEntries.filter((entry) => entry.is_placeholder)
          })
        );
      } else {
        rows.push(
          ...buildMatchRows({
            tournament,
            stageId: primaryStage.id,
            entries: refreshedEntries,
            placeholderPool: refreshedEntries.filter((entry) => entry.is_placeholder)
          })
        );
      }
    }

    insertMatches(rows);
    autoAdvanceResolvedMatches(tournamentId);
    updateEntryStatsFromMatches(tournamentId);
    run("UPDATE tournaments SET match_count = ? WHERE id = ?", [rows.length, tournamentId]);
    insertTask({
      id: createId("task"),
      tournamentId,
      title: "复核自动编排赛程",
      category: "赛程",
      assignee: "编排专员",
      priority: "高",
      dueDate: tournament.registration_deadline,
      status: "待处理"
    });

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  insertLog({
    actor,
    action: "生成赛程",
    targetType: "tournament",
    targetId: tournamentId,
    targetName: tournament.name,
    detail: { formatId: tournament.format_id, entryCount: entries.length }
  });
  syncHomepageData();
}
