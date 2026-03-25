type DashboardPayload = {
  appId: string;
  userId: string;
  summary: {
    total: number;
    favorites: number;
    subjectCount: number;
    latestTitle: string | null;
  };
  generatedAt: string;
};

type NotificationPayload = {
  appId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

const APP_ID = "formula-finder";

async function postJson(url: string, payload: unknown) {
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function sendDashboardSummary(payload: Omit<DashboardPayload, "appId" | "generatedAt">) {
  const webhook = import.meta.env.ANSIVERSA_DASHBOARD_WEBHOOK_URL;
  if (!webhook) return;

  await postJson(webhook, {
    appId: APP_ID,
    ...payload,
    generatedAt: new Date().toISOString(),
  } satisfies DashboardPayload);
}

export async function sendHighSignalNotification(payload: Omit<NotificationPayload, "appId" | "createdAt">) {
  const webhook = import.meta.env.ANSIVERSA_NOTIFICATION_WEBHOOK_URL;
  if (!webhook) return;

  await postJson(webhook, {
    appId: APP_ID,
    ...payload,
    createdAt: new Date().toISOString(),
  } satisfies NotificationPayload);
}
