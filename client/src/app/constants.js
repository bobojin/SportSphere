export const STATUS_FILTERS = ["全部", "进行中", "报名中", "筹备中", "已结束"];

export const TOURNAMENT_STATUSES = ["筹备中", "报名中", "进行中", "已结束"];

export const ROLE_OPTIONS = ["admin", "director", "scheduler", "registrar", "operations", "viewer"].map((role) => ({
  value: role,
  label: role
}));

export const TASK_PRIORITY_OPTIONS = ["高", "中", "低"].map((priority) => ({
  value: priority,
  label: priority
}));

export const TASK_STATUS_OPTIONS = ["待处理", "处理中", "已完成"].map((status) => ({
  value: status,
  label: status
}));

export const NAV_ITEMS = [
  {
    id: "overview",
    label: "赛事总览",
    helper: "赛制、阶段、积分与晋级",
    icon: "dashboard_customize"
  },
  {
    id: "schedule",
    label: "赛程执行",
    helper: "场次、比分与直播状态",
    icon: "conversion_path"
  },
  {
    id: "teams",
    label: "参赛主体",
    helper: "参赛信息与报名审核",
    icon: "groups"
  },
  {
    id: "governance",
    label: "协同治理",
    helper: "角色、工单、权限与审计",
    icon: "admin_panel_settings"
  }
];

export const NAV_LOOKUP = Object.fromEntries(NAV_ITEMS.map((item) => [item.id, item]));

export const defaultCreateForm = {
  name: "",
  sportId: "",
  formatId: "",
  entryMode: "",
  seriesName: "",
  seriesLevel: "",
  parentTournamentId: "",
  qualifiesToCount: "0",
  qualifyRule: "",
  stageLabel: "",
  seasonLabel: "2026 新赛季",
  organizer: "",
  location: "上海",
  status: "筹备中",
  startDate: "2026-08-01",
  endDate: "2026-08-15",
  registrationDeadline: "2026-07-20",
  teamCount: "8",
  prizePool: "0",
  tags: "",
  notes: ""
};

export const defaultTeamDraft = {
  name: "",
  shortName: "",
  organization: "",
  region: "",
  coach: "",
  contactName: "",
  participantCount: "12"
};

export const defaultTaskDraft = {
  title: "",
  category: "竞赛",
  assignee: "",
  priority: "中",
  dueDate: "",
  status: "待处理"
};

export const ENTRY_MODE_LABELS = {
  team: "队伍",
  participant: "选手",
  entry: "参赛单元"
};

export const ENTRY_MODE_OPTIONS = [
  { value: "team", label: "团队", meta: "按队伍/战队/俱乐部报名" },
  { value: "participant", label: "个人", meta: "按单个选手报名" },
  { value: "entry", label: "参赛单元", meta: "按单打/双打/组合单位报名" }
];
