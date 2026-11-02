// API simulada em memória para a versão de demonstração (Vercel).
// Ativada com EXPO_PUBLIC_USE_MOCK=true. Os dados reiniciam ao recarregar a página.
import type { AlertFeed, AlertItem, Analysis, Child, ContentItem, Dashboard, WeeklyReport } from "@/src/api/client";
import { OFFLINE_ACTIVITIES, SEED_CONTENT } from "@/src/api/mockSeed";

type Fail = (message: string, status: number) => Error;

const BRACKETS = {
  toddler: { label: "Bebês", range: "2-4", max: 60 },
  explorer: { label: "Exploradores", range: "5-8", max: 120 },
  preteen: { label: "Pré-adolescentes", range: "9-12", max: 180 },
} as const;
type BracketKey = keyof typeof BRACKETS;

const bracketFor = (age: number): BracketKey => (age <= 4 ? "toddler" : age <= 8 ? "explorer" : "preteen");

const makeChild = (id: string, name: string, age: number, color: string, device: string): Child => {
  const key = bracketFor(age);
  const b = BRACKETS[key];
  return {
    id, name, age, bracket: key, bracket_label: b.label, bracket_range: b.range, avatar_color: color,
    device, shield_active: true, daily_limit_minutes: b.max, allowed_content: [],
  };
};

const children: Child[] = [
  makeChild("k1", "Leo", 5, "#0F5132", "Tablet"),
  makeChild("k2", "Mia", 3, "#2E9E68", "Celular"),
  makeChild("k3", "Nina", 10, "#F5C518", "Tablet"),
];

let parent = { id: "p1", name: "Família Demo", email: "parent@neurokid.app", picture: null, provider: "demo" };

// Cada criança mostra um estado diferente: calmo (verde), agitado (amarelo) e crítico (vermelho).
const PROFILES: Record<string, { minutes: number; wave: number[]; week: number[]; delta: number; spikes: number; balance: number }> = {
  k1: { minutes: 74, wave: [22, 28, 26, 34, 30, 38, 32, 36, 30, 28, 34, 30], week: [88, 95, 70, 110, 102, 85, 74], delta: -12, spikes: 3, balance: 88 },
  k2: { minutes: 54, wave: [48, 60, 72, 78, 70, 84, 76, 68, 74, 80, 72, 66], week: [40, 52, 47, 58, 50, 61, 54], delta: 8, spikes: 9, balance: 64 },
  k3: { minutes: 126, wave: [38, 46, 52, 58, 50, 62, 56, 48, 60, 54, 58, 52], week: [150, 128, 160, 140, 118, 172, 126], delta: -5, spikes: 5, balance: 76 },
};
const profileOf = (id: string) => PROFILES[id] ?? PROFILES.k1;

const at = (h: number, m = 0, daysAgo = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const isoDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

// ----------------------------------------------------------------- alertas
const cleared: Record<string, boolean> = {};
const alertItem = (id: string, kind: string, severity: string, title: string, message: string, action: string, when: string): AlertItem =>
  ({ id, kind, severity, title, message, action, at: when, cleared: false });

const alertsFor = (childId: string): { label: string; items: AlertItem[] }[] => {
  const auto = (n: string, h: number, d = 0) =>
    alertItem(`${childId}-${n}`, "auto_interruption", "critical", "Interrupção automática",
      "Hiperestimulação detectada em um vídeo acelerado (9 cortes/min).", "A tela entrou em Soft Landing de 12s com suavidade.", at(h, 42, d));
  const attention = (n: string, h: number, d = 0) =>
    alertItem(`${childId}-${n}`, "attention_transition", "moderate", "Transição de atenção",
      "Ciclo de atenção se fechando (limite de 25min atingido).", "Sugestão: proponha uma atividade física de transição.", at(h, 15, d));
  const digest = (n: string, h: number, d = 0) =>
    alertItem(`${childId}-${n}`, "digest", "calm", "Resumo de Descanso",
      "Os picos sensoriais leves ficaram dentro da faixa segura toda a tarde.", "Nenhuma ação necessária — o equilíbrio se manteve.", at(h, 5, d));
  if (childId === "k2") return [{ label: "Hoje", items: [auto("a1", 16), attention("a2", 14)] }, { label: "Ontem", items: [auto("a3", 17, 1)] }];
  if (childId === "k3") return [{ label: "Hoje", items: [attention("a1", 15), digest("a2", 12)] }, { label: "Ontem", items: [digest("a3", 19, 1)] }];
  return [{ label: "Hoje", items: [digest("a1", 17)] }, { label: "Ontem", items: [attention("a2", 16, 1)] }];
};

// --------------------------------------------------------------- conteúdo
const toItem = (c: (typeof SEED_CONTENT)[number], child?: Child): ContentItem => ({
  ...c,
  allowed: child ? child.allowed_content.includes(c.id) : false,
});

// ----------------------------------------------------------------- roteador
export async function mockRequest<T>(
  method: string,
  path: string,
  body: Record<string, any>,
  token: string,
  fail: Fail,
): Promise<T> {
  await new Promise((r) => setTimeout(r, 220)); // latência para os indicadores de carregamento aparecerem
  const [route, qs = ""] = path.split("?");
  const q: Record<string, string> = {};
  qs.split("&").filter(Boolean).forEach((p) => {
    const [k, v = ""] = p.split("=");
    q[decodeURIComponent(k)] = decodeURIComponent(v);
  });
  const getChild = (id: string): Child => children.find((c) => c.id === id) ?? (() => { throw fail("Perfil não encontrado.", 404); })();
  const out = (v: unknown) => v as T;
  let m: RegExpMatchArray | null;

  // --- autenticação
  if (route === "/auth/login" && method === "POST") {
    if (!body.email || !body.password) throw fail("Informe e-mail e senha.", 400);
    parent = { ...parent, email: String(body.email) };
    return out({ access_token: "demo-token", parent });
  }
  if (route === "/auth/register" && method === "POST") {
    if (!body.email || !body.password) throw fail("Preencha e-mail e senha.", 400);
    parent = { ...parent, name: String(body.name || "Família Demo"), email: String(body.email) };
    return out({ access_token: "demo-token", parent });
  }
  if (route === "/auth/session") throw fail("Login com Google indisponível na demonstração.", 400);
  if (route === "/auth/logout") return out({ ok: true });
  if (route === "/auth/me") {
    if (!token) throw fail("Não autenticado.", 401);
    return out(parent);
  }

  // --- crianças
  if (route === "/children" && method === "GET") return out(children.map((c) => ({ ...c })));
  if (route === "/children" && method === "POST") {
    const age = Number(body.age);
    if (!body.name || !(age >= 2 && age <= 12)) throw fail("Informe nome e idade entre 2 e 12 anos.", 400);
    const c = makeChild(`k${children.length + 1}`, String(body.name), age, String(body.avatar_color || "#0F5132"), String(body.device || "Tablet"));
    children.push(c);
    PROFILES[c.id] = { minutes: 20, wave: [24, 28, 26, 30, 28, 32, 30, 28, 26, 30, 28, 26], week: [30, 40, 35, 45, 38, 42, 20], delta: -4, spikes: 1, balance: 90 };
    return out({ ...c });
  }
  if ((m = route.match(/^\/children\/([^/]+)\/shield$/)) && method === "PATCH") {
    getChild(m[1]).shield_active = Boolean(body.shield_active);
    return out({ ok: true });
  }
  if ((m = route.match(/^\/children\/([^/]+)\/dashboard$/))) {
    const child = getChild(m[1]);
    const p = profileOf(child.id);
    const count = p.wave.length;
    const low = Math.round((p.wave.filter((v) => v < 50).length / count) * 100);
    const high = Math.round((p.wave.filter((v) => v >= 75).length / count) * 100);
    const avg = Math.round((p.wave.reduce((a, b) => a + b, 0) / count) * 10) / 10;
    const [label, tone] = avg < 45 ? ["Equilibrado", "calm"] : avg < 65 ? ["Um pouco agitado", "moderate"] : ["Precisa de pausa", "critical"];
    const dash: Dashboard = {
      child: { ...child },
      screen_time: { minutes: p.minutes, limit_minutes: child.daily_limit_minutes, ratio: Math.min(1, Math.round((p.minutes / child.daily_limit_minutes) * 100) / 100) },
      sensory: {
        status_label: label, status_tone: tone, avg_load: avg, low_pct: low, moderate_pct: 100 - low - high, high_pct: high,
        wave: p.wave.map((load, i) => ({ at: at(8 + i), load, hour: 8 + i })),
      },
      interventions_today: tone === "critical" ? 3 : tone === "moderate" ? 2 : 1,
      protected_device: child.device,
      shield_active: child.shield_active,
    };
    return out(dash);
  }
  if ((m = route.match(/^\/children\/([^/]+)\/screen-break$/))) return out({ break_minutes: 15 });
  if ((m = route.match(/^\/children\/([^/]+)\/offline-reminder$/))) return out({ ok: true });
  if ((m = route.match(/^\/children\/([^/]+)\/alerts\/clear$/))) {
    cleared[m[1]] = true;
    return out({ ok: true });
  }
  if ((m = route.match(/^\/children\/([^/]+)\/alerts$/))) {
    const groups = cleared[m[1]] ? [] : alertsFor(getChild(m[1]).id);
    const all = groups.flatMap((g) => g.items);
    const feed: AlertFeed = { total: all.length, critical: all.filter((a) => a.severity === "critical").length, groups };
    return out(feed);
  }
  if ((m = route.match(/^\/children\/([^/]+)\/weekly-report$/))) {
    const child = getChild(m[1]);
    const p = profileOf(child.id);
    const days = p.week.map((minutes, i) => {
      const ago = p.week.length - 1 - i;
      const d = new Date(); d.setDate(d.getDate() - ago);
      return { date: isoDate(ago), weekday: WEEKDAYS[d.getDay()], minutes, avg_load: p.wave[i % p.wave.length] };
    });
    const report: WeeklyReport = {
      child: { ...child },
      total_minutes: p.week.reduce((a, b) => a + b, 0),
      delta_pct: p.delta,
      spikes_intercepted: p.spikes,
      balance_score: p.balance,
      balance_label: p.balance >= 85 ? "Ótimo" : p.balance >= 70 ? "Bom" : "Requer atenção",
      avg_load: Math.round((p.wave.reduce((a, b) => a + b, 0) / p.wave.length) * 10) / 10,
      days,
      activities: OFFLINE_ACTIVITIES,
    };
    return out(report);
  }

  // --- acervo
  if (route === "/content" && method === "GET") {
    const child = q.child_id ? children.find((c) => c.id === q.child_id) : undefined;
    const key = q.bracket && q.bracket !== "all" ? q.bracket : null;
    return out(SEED_CONTENT.filter((c) => !key || c.age_brackets.includes(key)).map((c) => toItem(c, child)));
  }
  if ((m = route.match(/^\/content\/([^/]+)\/allow$/))) {
    const id = m[1];
    const child = getChild(String(body.child_id));
    const has = child.allowed_content.includes(id);
    child.allowed_content = body.allowed ? (has ? child.allowed_content : [...child.allowed_content, id]) : child.allowed_content.filter((x) => x !== id);
    return out({ ok: true, allowed: Boolean(body.allowed) });
  }
  if ((m = route.match(/^\/content\/([^/]+)\/classify$/))) {
    const c = SEED_CONTENT.find((x) => x.id === m![1]);
    if (!c) throw fail("Conteúdo não encontrado.", 404);
    const analysis: Analysis = {
      verdict: c.ai_verdict,
      sensory_load_score: Math.round(Math.min(100, c.cuts_per_minute * 14 + (c.flash_stimuli ? 25 : 0))),
      stimulus_badges: c.stimulus_badges,
      why: c.ai_reason,
      parent_tip: "Assistam juntos e conversem sobre o que viram depois: isso fixa o aprendizado e suaviza o fim da tela.",
      source: "demo",
    };
    return out(analysis);
  }
  if ((m = route.match(/^\/content\/([^/]+)$/))) {
    const c = SEED_CONTENT.find((x) => x.id === m![1]);
    if (!c) throw fail("Conteúdo não encontrado.", 404);
    return out(toItem(c, q.child_id ? children.find((k) => k.id === q.child_id) : undefined));
  }

  throw fail(`Rota não disponível na demonstração: ${method} ${route}`, 404);
}
