export function formatCurrency(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(value || 0);
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatShortDateTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function getBadgeTone(status) {
  if (["进行中", "直播中", "处理中", "已通过", "已确认", "已完成", "available", "在线"].includes(status)) {
    return "green";
  }

  if (
    ["报名中", "待处理", "待审核", "待开启", "待检录", "已报名", "warning", "busy", "忙碌"].includes(status)
  ) {
    return "amber";
  }

  if (["补材料", "critical", "离线"].includes(status)) {
    return "red";
  }

  return "slate";
}

export async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "请求失败");
  }

  return response.json();
}
