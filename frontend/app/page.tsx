"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Gauge,
  Home,
  Link2,
  Loader2,
  LogOut,
  Menu,
  MousePointerClick,
  Plus,
  Power,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

type View = "home" | "create" | "links" | "analytics" | "settings";
type AuthMode = "login" | "register";

type User = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
};

type ShortLink = {
  id: string;
  titulo: string | null;
  urlOriginal: string;
  codigoCurto: string;
  totalCliques: number;
  ativo: boolean;
  usuarioId: string;
  criadoEm: string;
};

type LinkSort = "recentes" | "antigos" | "mais-acessados" | "menos-acessados";

type Dashboard = {
  totalLinks: number;
  totalCliques: number;
  linkMaisAcessado: ShortLink | null;
  ultimosLinks: ShortLink[];
};

type LinkStats = {
  linkId: string;
  codigoCurto: string;
  totalCliques: number;
  cliques: Array<{
    id: string;
    enderecoIp: string | null;
    agenteUsuario: string | null;
    clicadoEm: string;
  }>;
};

const API_BASE = "";
const PUBLIC_BASE = process.env.NEXT_PUBLIC_PUBLIC_URL ?? "http://localhost:8080";
const AUTO_REFRESH_INTERVAL_MS = 30_000;
const AUTO_REFRESH_VIEWS: View[] = ["home", "links", "analytics", "settings"];

const navItems: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: "home", label: "Inicio", icon: Home },
  { id: "create", label: "Criar link", icon: Plus },
  { id: "links", label: "Meus links", icon: Link2 },
  { id: "analytics", label: "Analises", icon: BarChart3 },
  { id: "settings", label: "Conta", icon: Settings },
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

async function api<T>(path: string, token?: string | null, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(extractErrorMessage(text) || `Erro ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  if (!text) {
    return undefined as T;
  }

  if (!contentType.includes("application/json")) {
    return text as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Resposta invalida do servidor");
  }
}

function shortUrl(code: string) {
  return `${PUBLIC_BASE}/r/${code}`;
}

export default function Page() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [stats, setStats] = useState<LinkStats | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [view, setView] = useState<View>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [slowLoading, setSlowLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const autoRefreshingRef = useRef(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const loadApp = useCallback(
    async (currentToken: string, options: { showLoading?: boolean } = {}) => {
      const showLoading = options.showLoading ?? true;
      if (showLoading) {
        setLoading(true);
      }
      try {
        const [profile, nextDashboard, nextLinks] = await Promise.all([
          api<User>("/api/auth/me", currentToken),
          api<Dashboard>("/api/stats/dashboard", currentToken),
          api<ShortLink[]>("/api/links", currentToken),
        ]);

        setUser(profile);
        setDashboard(nextDashboard);
        setLinks(nextLinks);
        setSelectedLinkId((current) => current ?? nextLinks[0]?.id ?? null);
      } catch {
        localStorage.removeItem("linkito_token");
        setToken(null);
        setUser(null);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const stored = localStorage.getItem("linkito_token");
    if (stored) {
      setToken(stored);
      void loadApp(stored);
    } else {
      setLoading(false);
    }
  }, [loadApp]);

  useEffect(() => {
    if (!loading) {
      setSlowLoading(false);
      return;
    }

    const timeout = window.setTimeout(() => setSlowLoading(true), 2500);
    return () => window.clearTimeout(timeout);
  }, [loading]);

  const loadStats = useCallback(
    async (currentToken: string | null, linkId: string | null) => {
      if (!currentToken || !linkId) {
        setStats(null);
        return;
      }

      try {
        setStats(await api<LinkStats>(`/api/stats/links/${linkId}`, currentToken));
      } catch {
        setStats(null);
      }
    },
    [],
  );

  useEffect(() => {
    void loadStats(token, selectedLinkId);
  }, [loadStats, selectedLinkId, token]);

  async function handleAuthenticated(nextToken: string) {
    localStorage.setItem("linkito_token", nextToken);
    setToken(nextToken);
    await loadApp(nextToken);
  }

  function logout() {
    localStorage.removeItem("linkito_token");
    setToken(null);
    setUser(null);
    setLinks([]);
    setDashboard(null);
    setStats(null);
    setRefreshing(false);
    setView("home");
  }

  async function refresh() {
    if (!token || refreshing) {
      return;
    }

    setRefreshing(true);
    try {
      await loadApp(token, { showLoading: false });
      await loadStats(token, selectedLinkId);
      showToast("Dados atualizados");
    } finally {
      setRefreshing(false);
    }
  }

  const autoRefresh = useCallback(async () => {
    if (!token || autoRefreshingRef.current || document.visibilityState !== "visible") {
      return;
    }

    autoRefreshingRef.current = true;
    try {
      await loadApp(token, { showLoading: false });
      await loadStats(token, selectedLinkId);
    } finally {
      autoRefreshingRef.current = false;
    }
  }, [loadApp, loadStats, selectedLinkId, token]);

  useEffect(() => {
    if (!token || !AUTO_REFRESH_VIEWS.includes(view)) {
      return;
    }

    const interval = window.setInterval(() => {
      void autoRefresh();
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [autoRefresh, token, view]);

  async function copyLink(link: ShortLink) {
    await navigator.clipboard.writeText(shortUrl(link.codigoCurto));
    showToast("Link copiado");
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="aurora" />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass grid max-w-sm gap-3 rounded-3xl px-5 py-4 text-center text-sm text-white"
        >
          <div className="flex items-center justify-center gap-3 font-black">
            <Loader2 className="animate-spin text-[var(--acid)]" size={18} />
            Carregando Linkito
          </div>
          {slowLoading ? (
            <p className="text-xs font-bold leading-5 text-zinc-400">
              O backend gratuito pode estar acordando. Isso costuma levar alguns segundos no primeiro acesso.
            </p>
          ) : null}
        </motion.div>
      </main>
    );
  }

  if (!token || !user) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <main className="grain min-h-screen">
      <div className="aurora" />
      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-[#d7ff4f] px-4 py-2 text-sm font-black text-black shadow-[0_20px_70px_rgba(215,255,79,0.24)]"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <MobileTopbar user={user} onOpen={() => setMenuOpen(true)} />
      <Sidebar
        user={user}
        active={view}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={(nextView) => {
          setView(nextView);
          setMenuOpen(false);
        }}
        onLogout={logout}
      />

      <section className="mx-auto min-h-screen w-full max-w-7xl overflow-x-hidden px-4 pb-10 pt-20 lg:pl-[292px] lg:pt-6">
        <TopStrip user={user} view={view} onCreate={() => setView("create")} />

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {view === "home" ? (
              <HomeView
                dashboard={dashboard}
                links={links}
                onCreate={() => setView("create")}
                onCopy={copyLink}
                onRefresh={refresh}
                refreshing={refreshing}
              />
            ) : null}
            {view === "create" ? (
              <CreateView
                token={token}
                onCreated={async (link) => {
                  showToast("Link criado");
                  setLinks((current) => [link, ...current]);
                  setSelectedLinkId(link.id);
                  await refresh();
                  setView("links");
                }}
              />
            ) : null}
            {view === "links" ? (
              <LinksView
                token={token}
                links={links}
                onChanged={refresh}
                onCopy={copyLink}
                onStats={(link) => {
                  setSelectedLinkId(link.id);
                  setView("analytics");
                }}
                showToast={showToast}
                onRefresh={refresh}
                refreshing={refreshing}
              />
            ) : null}
            {view === "analytics" ? (
              <AnalyticsView
                links={links}
                selectedLinkId={selectedLinkId}
                onSelect={setSelectedLinkId}
                stats={stats}
                onRefresh={refresh}
                refreshing={refreshing}
              />
            ) : null}
            {view === "settings" ? (
              <SettingsView
                user={user}
                token={token}
                onUserUpdated={setUser}
                onLogout={logout}
                onRefresh={refresh}
                refreshing={refreshing}
                showToast={showToast}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  );
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (token: string) => Promise<void> }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [slowAuth, setSlowAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setSlowAuth(false);
      return;
    }

    const timeout = window.setTimeout(() => setSlowAuth(true), 2500);
    return () => window.clearTimeout(timeout);
  }, [loading]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const senha = String(form.get("senha") ?? "");
    const nome = String(form.get("nome") ?? "").trim();

    try {
      if (mode === "register") {
        await api("/api/auth/register", null, {
          method: "POST",
          body: JSON.stringify({ nome, email, senha }),
        });
      }

      const response = await api<{ token: string }>("/api/auth/login", null, {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      });

      await onAuthenticated(response.token);
    } catch (err) {
      setError(err instanceof Error ? normalizeError(err.message) : "Nao foi possivel entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grain relative grid min-h-screen px-4 py-6 sm:px-6 lg:grid-cols-[1fr_480px] lg:gap-8 lg:p-8">
      <div className="aurora" />
      <section className="hidden min-h-[calc(100vh-4rem)] flex-col justify-between rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 lg:flex">
        <LogoMark />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <p className="mb-5 w-fit rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[var(--acid)]">
            Premium short links
          </p>
          <h1 className="text-7xl font-black leading-[0.88] tracking-[-0.075em] text-white">
            Links curtos. Sinais claros.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-zinc-400">
            Um painel silencioso, rapido e preciso para criar, pausar, copiar e
            medir links sem transformar a tela em uma planilha.
          </p>
        </motion.div>
        <div className="grid max-w-xl grid-cols-3 gap-3">
          <AuthMiniCard icon={ShieldCheck} title="JWT" body="Sessao protegida" />
          <AuthMiniCard icon={MousePointerClick} title="Cliques" body="Eventos rastreados" />
          <AuthMiniCard icon={Gauge} title="Foco" body="Fluxo direto" />
        </div>
      </section>

      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-8 lg:hidden">
          <LogoMark />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="glass rounded-[2rem] p-5 sm:p-6"
        >
          <div className="mb-6 flex rounded-2xl border border-white/10 bg-black/30 p-1">
            {(["login", "register"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  setError(null);
                }}
                className={clsx(
                  "relative flex-1 rounded-xl px-4 py-3 text-sm font-black transition",
                  mode === item ? "text-black" : "text-zinc-400 hover:text-white",
                )}
              >
                {mode === item ? (
                  <motion.span
                    layoutId="auth-pill"
                    className="absolute inset-0 rounded-xl bg-[var(--acid)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <span className="relative">{item === "login" ? "Entrar" : "Criar conta"}</span>
              </button>
            ))}
          </div>

          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--aqua)]">
              {mode === "login" ? "Bem-vindo de volta" : "Comece agora"}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-white">
              {mode === "login" ? "Acesse seu painel." : "Crie seu espaco."}
            </h2>
          </div>

          <form onSubmit={submit} className="grid gap-3">
            <AnimatePresence initial={false}>
              {mode === "register" ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <TextInput name="nome" label="Nome" placeholder="Seu nome" required />
                </motion.div>
              ) : null}
            </AnimatePresence>
            <TextInput name="email" label="Email" placeholder="voce@email.com" type="email" required />
            <TextInput name="senha" label="Senha" placeholder="Minimo 6 caracteres" type="password" required />
            <AnimatePresence>
              {error ? (
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100"
                >
                  {error}
                </motion.p>
              ) : null}
            </AnimatePresence>
            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={{ y: -1 }}
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-[var(--acid)] px-4 py-4 text-sm font-black text-black shadow-[0_20px_70px_rgba(215,255,79,0.18)] transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : null}
              {mode === "login" ? "Entrar no painel" : "Criar e entrar"}
            </motion.button>
            <AnimatePresence>
              {slowAuth ? (
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs font-bold leading-5 text-zinc-400"
                >
                  O backend pode estar acordando no Render. Aguarde alguns segundos sem fechar a tela.
                </motion.p>
              ) : null}
            </AnimatePresence>
          </form>
        </motion.div>
      </section>
    </main>
  );
}

function MobileTopbar({ user, onOpen }: { user: User; onOpen: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur-2xl lg:hidden">
      <div className="flex items-center justify-between">
        <LogoMark compact />
        <div className="flex items-center gap-2">
          <div className="max-w-[150px] truncate rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-300">
            {user.nome}
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-white"
            aria-label="Abrir menu"
          >
            <Menu size={19} />
          </button>
        </div>
      </div>
    </header>
  );
}

function Sidebar({
  user,
  active,
  open,
  onClose,
  onNavigate,
  onLogout,
}: {
  user: User;
  active: View;
  open: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
  onLogout: () => void;
}) {
  const sidebar = (
    <motion.aside
      initial={{ x: -24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -24, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="glass flex h-full w-[290px] flex-col rounded-r-[2rem] p-4 lg:fixed lg:bottom-4 lg:left-4 lg:top-4 lg:z-40 lg:h-auto lg:rounded-[2rem]"
    >
      <div className="mb-8 flex items-center justify-between">
        <LogoMark />
        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-300 lg:hidden"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="grid gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={clsx(
                "group relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-3 text-left text-sm font-black transition",
                selected ? "text-black" : "text-zinc-400 hover:bg-white/[0.05] hover:text-white",
              )}
            >
              {selected ? (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-2xl bg-[var(--acid)]"
                  transition={{ type: "spring", stiffness: 420, damping: 35 }}
                />
              ) : null}
              <span
                className={clsx(
                  "relative grid h-9 w-9 place-items-center rounded-xl transition",
                  selected ? "bg-black/10" : "bg-white/[0.05] group-hover:bg-white/[0.08]",
                )}
              >
                <Icon size={18} />
              </span>
              <span className="relative">{item.label}</span>
              {selected ? <ChevronRight className="relative ml-auto" size={18} /> : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto grid gap-3">
        <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--aqua)]">
            Sessao
          </p>
          <p className="mt-2 truncate font-black text-white">{user.nome}</p>
          <p className="truncate text-sm text-zinc-500">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-zinc-300 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-100"
        >
          <LogOut size={17} />
          Sair
        </button>
      </div>
    </motion.aside>
  );

  return (
    <>
      <div className="hidden lg:block">{sidebar}</div>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xl lg:hidden"
            onClick={onClose}
          >
            <div className="h-full" onClick={(event) => event.stopPropagation()}>
              {sidebar}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function TopStrip({ user, view, onCreate }: { user: User; view: View; onCreate: () => void }) {
  const title = navItems.find((item) => item.id === view)?.label ?? "Linkito";
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
    >
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--aqua)]">
          Linkito
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl">
          {title}
        </h1>
      </div>
      <div className="hidden items-center gap-3 lg:flex">
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-zinc-300">
          {user.nome}
        </div>
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onCreate}
          className="rounded-full bg-[var(--acid)] px-5 py-3 text-sm font-black text-black shadow-[0_18px_60px_rgba(215,255,79,0.18)]"
        >
          Novo link
        </motion.button>
      </div>
    </motion.header>
  );
}

function HomeView({
  dashboard,
  links,
  onCreate,
  onCopy,
  onRefresh,
  refreshing,
}: {
  dashboard: Dashboard | null;
  links: ShortLink[];
  onCreate: () => void;
  onCopy: (link: ShortLink) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const best = dashboard?.linkMaisAcessado ?? links.toSorted((a, b) => b.totalCliques - a.totalCliques)[0];
  const activeLinks = links.filter((link) => link.ativo).length;

  return (
    <div className="grid gap-4">
      <motion.section
        whileHover={{ y: -2 }}
        className="glass overflow-hidden rounded-[2rem] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="w-fit rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[var(--acid)]">
              Painel silencioso
            </p>
            <h2 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.065em] text-white sm:text-6xl">
              Seus links, sem ruido.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400">
              Crie, copie, pause e leia os sinais importantes. O resto fica no
              menu lateral quando voce precisar.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onCreate}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--acid)] px-5 py-4 text-sm font-black text-black shadow-[0_20px_70px_rgba(215,255,79,0.18)] sm:w-fit"
          >
            <Plus size={18} />
            Criar primeiro link
          </motion.button>
        </div>
      </motion.section>

      <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={Link2} label="Links" value={dashboard?.totalLinks ?? links.length} tone="acid" />
        <StatCard icon={MousePointerClick} label="Cliques" value={dashboard?.totalCliques ?? 0} tone="aqua" />
        <StatCard icon={Power} label="Ativos" value={activeLinks} tone="coral" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Panel title="Links recentes" action={<RefreshButton loading={refreshing} onClick={onRefresh} />}>
          <div className="grid gap-2">
            {(dashboard?.ultimosLinks?.length ? dashboard.ultimosLinks : links.slice(0, 5)).map((link) => (
              <LinkRow key={link.id} link={link} onCopy={() => onCopy(link)} />
            ))}
            {!links.length ? <EmptyState text="Nenhum link ainda. Crie um link para iniciar." /> : null}
          </div>
        </Panel>

        <Panel title="Destaque" action="Mais acessado">
          {best ? (
            <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--aqua)]">
                {best.codigoCurto}
              </p>
              <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-white">
                {best.titulo || "Link sem titulo"}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-5 text-zinc-500">
                {best.urlOriginal}
              </p>
              <div className="mt-6 flex items-end justify-between">
                <div>
                  <p className="text-5xl font-black tracking-[-0.06em] text-white">
                    {best.totalCliques}
                  </p>
                  <p className="text-sm text-zinc-500">cliques totais</p>
                </div>
                <ArrowUpRight className="text-[var(--acid)]" size={30} />
              </div>
            </div>
          ) : (
            <EmptyState text="Seu link mais acessado vai aparecer aqui." />
          )}
        </Panel>
      </section>
    </div>
  );
}

function CreateView({
  token,
  onCreated,
}: {
  token: string;
  onCreated: (link: ShortLink) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const link = await api<ShortLink>("/api/links", token, {
        method: "POST",
        body: JSON.stringify({
          titulo: title || null,
          urlOriginal: url,
        }),
      });
      setUrl("");
      setTitle("");
      await onCreated(link);
    } catch (err) {
      setError(err instanceof Error ? normalizeError(err.message) : "Nao foi possivel criar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <motion.form
        onSubmit={submit}
        className="glass rounded-[2rem] p-5 sm:p-6"
        whileHover={{ y: -2 }}
      >
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--acid)]">
          Novo link
        </p>
        <h2 className="mt-3 text-4xl font-black leading-none tracking-[-0.06em] text-white sm:text-5xl">
          Cole. Nomeie. Publique.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400">
          O link curto e gerado automaticamente pelo backend. Voce so precisa
          definir um destino e, se quiser, um titulo facil de lembrar.
        </p>
        <div className="mt-7 grid gap-4">
          <TextInput
            label="URL original"
            name="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://seusite.com/campanha"
            required
          />
          <TextInput
            label="Título (opcional)"
            name="titulo"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Lancamento, bio, newsletter..."
          />
          <AnimatePresence>
            {error ? (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100"
              >
                {error}
              </motion.p>
            ) : null}
          </AnimatePresence>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--acid)] px-5 py-4 text-sm font-black text-black transition disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            Gerar link premium
          </motion.button>
        </div>
      </motion.form>

      <Panel title="Fluxo premium" action="Essencial">
        <div className="grid gap-3">
          <FeatureLine title="Codigo curto unico" body="Gerado pelo backend com 8 caracteres." />
          <FeatureLine title="Copiar em um toque" body="Depois de criado, o link aparece na sua lista." />
          <FeatureLine title="Pausar quando quiser" body="Links inativos retornam status 410 no redirect." />
          <FeatureLine title="Cliques registrados" body="Cada acesso alimenta as estatisticas do link." />
        </div>
      </Panel>
    </section>
  );
}

function LinksView({
  token,
  links,
  onChanged,
  onCopy,
  onStats,
  showToast,
  onRefresh,
  refreshing,
}: {
  token: string;
  links: ShortLink[];
  onChanged: () => Promise<void>;
  onCopy: (link: ShortLink) => void;
  onStats: (link: ShortLink) => void;
  showToast: (message: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<LinkSort>("recentes");
  const [linkToRemove, setLinkToRemove] = useState<ShortLink | null>(null);
  const [removing, setRemoving] = useState(false);
  const filtered = links.filter((link) => {
    const content = `${link.titulo ?? ""} ${link.urlOriginal} ${link.codigoCurto}`.toLowerCase();
    return content.includes(query.toLowerCase());
  });
  const sortedLinks = filtered.toSorted((a, b) => {
    if (sort === "mais-acessados") {
      return b.totalCliques - a.totalCliques;
    }

    if (sort === "menos-acessados") {
      return a.totalCliques - b.totalCliques;
    }

    const dateA = new Date(a.criadoEm).getTime();
    const dateB = new Date(b.criadoEm).getTime();
    return sort === "antigos" ? dateA - dateB : dateB - dateA;
  });

  async function toggle(link: ShortLink) {
    await api<ShortLink>(`/api/links/${link.id}`, token, {
      method: "PUT",
      body: JSON.stringify({ ativo: !link.ativo }),
    });
    showToast(link.ativo ? "Link pausado" : "Link reativado");
    await onChanged();
  }

  async function confirmRemove() {
    if (!linkToRemove) {
      return;
    }

    setRemoving(true);
    try {
      await api(`/api/links/${linkToRemove.id}`, token, { method: "DELETE" });
      showToast("Link removido");
      setLinkToRemove(null);
      await onChanged();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <Panel title="Biblioteca de links" action={<RefreshButton loading={refreshing} onClick={onRefresh} />}>
        <div className="mb-4 grid gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <Search className="text-zinc-500" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por titulo, destino ou codigo"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
            />
          </div>
          <SortControl value={sort} onChange={setSort} />
        </div>

        <div className="grid gap-3">
          {sortedLinks.map((link, index) => (
            <motion.article
              key={link.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035 }}
              className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-4 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-black tracking-[-0.03em] text-white">
                      {link.titulo || "Link sem titulo"}
                    </h3>
                    <span
                      className={clsx(
                        "rounded-full px-2.5 py-1 text-xs font-black",
                        link.ativo ? "bg-[var(--acid)] text-black" : "bg-zinc-800 text-zinc-400",
                      )}
                    >
                      {link.ativo ? "ativo" : "pausado"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-bold text-[var(--aqua)]">
                    {shortUrl(link.codigoCurto)}
                  </p>
                  <p className="mt-1 truncate text-sm text-zinc-500">{link.urlOriginal}</p>
                </div>
                <div className="flex min-w-0 flex-wrap gap-2">
                  <IconButton label="Copiar" icon={Copy} onClick={() => onCopy(link)} />
                  <IconButton label="Stats" icon={BarChart3} onClick={() => onStats(link)} />
                  <IconButton
                    label={link.ativo ? "Pausar" : "Ativar"}
                    icon={Power}
                    onClick={() => void toggle(link)}
                  />
                  <IconButton label="Remover" icon={Trash2} onClick={() => setLinkToRemove(link)} danger />
                </div>
              </div>
            </motion.article>
          ))}
          {!sortedLinks.length ? <EmptyState text="Nada encontrado." /> : null}
        </div>
      </Panel>

      <DeleteLinkDialog
        link={linkToRemove}
        loading={removing}
        onClose={() => {
          if (!removing) {
            setLinkToRemove(null);
          }
        }}
        onConfirm={() => void confirmRemove()}
      />
    </>
  );
}

function AnalyticsView({
  links,
  selectedLinkId,
  onSelect,
  stats,
  onRefresh,
  refreshing,
}: {
  links: ShortLink[];
  selectedLinkId: string | null;
  onSelect: (id: string) => void;
  stats: LinkStats | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const selected = links.find((link) => link.id === selectedLinkId) ?? links[0];
  const maxClicks = Math.max(...links.map((link) => link.totalCliques), 1);

  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[360px_1fr]">
      <Panel title="Escolha um link" action="Analises">
        <div className="grid max-h-[540px] gap-2 overflow-y-auto pr-1 hide-scrollbar">
          {links.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => onSelect(link.id)}
              className={clsx(
                "min-w-0 rounded-3xl border p-4 text-left transition",
                selected?.id === link.id
                  ? "border-[var(--acid)] bg-[var(--acid)] text-black"
                  : "border-white/10 bg-black/30 text-white hover:border-white/20",
              )}
            >
              <p className="truncate font-black">{link.titulo || link.codigoCurto}</p>
              <p className={clsx("mt-1 truncate text-sm", selected?.id === link.id ? "text-black/60" : "text-zinc-500")}>
                {link.totalCliques} cliques
              </p>
            </button>
          ))}
          {!links.length ? <EmptyState text="Crie um link para ver analises." /> : null}
        </div>
      </Panel>

      <div className="grid min-w-0 gap-4">
        <section className="glass min-w-0 overflow-hidden rounded-[2rem] p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--aqua)]">
            Link selecionado
          </p>
          <h2 className="mt-3 break-words text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl sm:tracking-[-0.06em]">
            {selected?.titulo || selected?.codigoCurto || "Sem dados"}
          </h2>
          <p className="mt-2 truncate text-sm text-zinc-500">{selected?.urlOriginal}</p>
          <div className="mt-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard icon={MousePointerClick} label="Cliques salvos" value={stats?.totalCliques ?? selected?.totalCliques ?? 0} tone="acid" />
            <StatCard icon={Activity} label="Eventos" value={stats?.cliques.length ?? 0} tone="aqua" />
            <StatCard icon={Power} label="Status" value={selected?.ativo ? "Ativo" : "Pausado"} tone="coral" />
          </div>
        </section>

        <Panel title="Ranking rapido" action="Todos os links">
          <div className="grid gap-3">
            {links.slice().sort((a, b) => b.totalCliques - a.totalCliques).slice(0, 6).map((link) => (
              <div key={link.id} className="grid gap-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-black text-white">{link.titulo || link.codigoCurto}</span>
                  <span className="text-zinc-500">{link.totalCliques}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(link.totalCliques / maxClicks) * 100}%` }}
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--acid),var(--aqua))]"
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Cliques recentes" action={<RefreshButton loading={refreshing} onClick={onRefresh} />}>
          <div className="grid gap-2">
            {stats?.cliques.slice(0, 8).map((click) => (
              <div key={click.id} className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-white">{click.enderecoIp || "IP desconhecido"}</p>
                  <p className="text-xs text-zinc-500">{formatDate(click.clicadoEm)}</p>
                </div>
                <p className="mt-1 truncate text-xs text-zinc-500">{click.agenteUsuario || "User-Agent ausente"}</p>
              </div>
            ))}
            {stats && !stats.cliques.length ? <EmptyState text="Ainda nao ha cliques registrados." /> : null}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function SettingsView({
  user,
  token,
  onUserUpdated,
  onLogout,
  onRefresh,
  refreshing,
  showToast,
}: {
  user: User;
  token: string;
  onUserUpdated: (user: User) => void;
  onLogout: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  showToast: (message: string) => void;
}) {
  const [name, setName] = useState(user.nome);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setName(user.nome);
    setEmail(user.email);
  }, [user.email, user.nome]);

  async function submitProfile(event: FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError(null);

    try {
      const updated = await api<User>("/api/auth/me", token, {
        method: "PUT",
        body: JSON.stringify({ nome: name.trim(), email: email.trim() }),
      });
      onUserUpdated(updated);
      showToast("Perfil atualizado");
    } catch (err) {
      setProfileError(err instanceof Error ? normalizeError(err.message) : "Nao foi possivel atualizar");
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordError(null);

    try {
      await api("/api/auth/password", token, {
        method: "PUT",
        body: JSON.stringify({ senhaAtual: currentPassword, novaSenha: newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      showToast("Senha atualizada");
    } catch (err) {
      setPasswordError(err instanceof Error ? normalizeError(err.message) : "Nao foi possivel alterar a senha");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-4">
      <Panel title="Conta" action={<RefreshButton loading={refreshing} onClick={onRefresh} />}>
        <form onSubmit={submitProfile} className="grid gap-3">
          <TextInput
            label="Nome"
            name="nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Seu nome"
            required
          />
          <TextInput
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@email.com"
            required
          />
          <ReadOnlyField label="Perfil" value={user.perfil} />
          <AnimatePresence>
            {profileError ? (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100"
              >
                {profileError}
              </motion.p>
            ) : null}
          </AnimatePresence>
          <button
            type="submit"
            disabled={savingProfile}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--acid)] px-4 py-3 text-sm font-black text-black transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingProfile ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />}
            Salvar perfil
          </button>
        </form>
      </Panel>

      <Panel title="Senha" action="Seguranca">
        <form onSubmit={submitPassword} className="grid gap-3">
          <TextInput
            label="Senha atual"
            name="senhaAtual"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Sua senha atual"
            required
          />
          <TextInput
            label="Nova senha"
            name="novaSenha"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Minimo 6 caracteres"
            required
          />
          <AnimatePresence>
            {passwordError ? (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100"
              >
                {passwordError}
              </motion.p>
            ) : null}
          </AnimatePresence>
          <button
            type="submit"
            disabled={savingPassword}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-zinc-200 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingPassword ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
            Alterar senha
          </button>
        </form>
      </Panel>

      <Panel title="Sessao" action="Sair">
        <div className="grid gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-black text-red-100 transition hover:bg-red-400/15"
          >
            <LogOut size={17} />
            Encerrar sessao
          </button>
        </div>
      </Panel>
    </section>
  );
}

function DeleteLinkDialog({
  link,
  loading,
  onClose,
  onConfirm,
}: {
  link: ShortLink | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {link ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-link-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="glass w-full max-w-md overflow-hidden rounded-[2rem] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.38)]"
          >
            <div className="mb-5 flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-100">
                <Trash2 size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-200">
                  Remover link
                </p>
                <h2 id="delete-link-title" className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                  Excluir este link?
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Esta ação remove o link da sua biblioteca e não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/35 p-4">
              <p className="truncate font-black text-white">{link.titulo || "Link sem titulo"}</p>
              <p className="mt-1 truncate text-sm font-bold text-[var(--aqua)]">
                {shortUrl(link.codigoCurto)}
              </p>
              <p className="mt-1 truncate text-xs text-zinc-500">{link.urlOriginal}</p>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-zinc-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/15 px-4 py-3 text-sm font-black text-red-100 transition hover:bg-red-400/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="animate-spin" size={17} /> : <Trash2 size={17} />}
                Excluir link
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-[var(--acid)] text-lg font-black text-black shadow-[0_0_44px_rgba(215,255,79,0.22)]">
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[var(--coral)] ring-4 ring-black" />
        L
      </div>
      {!compact ? (
        <div>
          <p className="font-black tracking-[-0.03em] text-white">Linkito</p>
          <p className="text-xs font-bold text-zinc-500">short links</p>
        </div>
      ) : null}
    </div>
  );
}

function AuthMiniCard({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-3xl border border-white/10 bg-black/30 p-4"
    >
      <Icon className="text-[var(--acid)]" size={20} />
      <p className="mt-4 font-black text-white">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{body}</p>
    </motion.div>
  );
}

function TextInput({
  label,
  name,
  placeholder,
  type = "text",
  required,
  value,
  onChange,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      <span className="relative">
        <input
          name={name}
          type={inputType}
          required={required}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={clsx(
            "w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-[var(--acid)] focus:bg-black/55 focus:shadow-[0_0_0_4px_rgba(215,255,79,0.08)]",
            isPassword && "pr-12",
          )}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        ) : null}
      </span>
    </label>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="glass min-w-0 overflow-hidden rounded-[2rem] p-4 sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black tracking-[-0.03em] text-white">{title}</h2>
        {typeof action === "string" ? (
          <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-black text-zinc-400">
            {action}
          </span>
        ) : (
          action
        )}
      </div>
      {children}
    </motion.section>
  );
}

function RefreshButton({
  loading,
  onClick,
}: {
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-black text-zinc-400 transition hover:border-[var(--acid)]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      aria-label="Atualizar dados"
    >
      <RefreshCw className={clsx(loading && "animate-spin")} size={13} />
      Atualizar
    </button>
  );
}

function SortControl({
  value,
  onChange,
}: {
  value: LinkSort;
  onChange: (value: LinkSort) => void;
}) {
  const options: Array<{ value: LinkSort; label: string }> = [
    { value: "recentes", label: "Recentes" },
    { value: "antigos", label: "Antigos" },
    { value: "mais-acessados", label: "Mais acessados" },
    { value: "menos-acessados", label: "Menos acessados" },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
      <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">
        Ordenar por
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={clsx(
                "rounded-xl border px-3 py-2 text-xs font-black transition",
                selected
                  ? "border-[var(--acid)] bg-[var(--acid)] text-black shadow-[0_12px_32px_rgba(215,255,79,0.12)]"
                  : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-white",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone: "acid" | "aqua" | "coral";
}) {
  const color = tone === "acid" ? "var(--acid)" : tone === "aqua" ? "var(--aqua)" : "var(--coral)";
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="glass min-w-0 overflow-hidden rounded-[2rem] p-4"
    >
      <div className="flex items-center justify-between">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-black/35 soft-ring">
          <Icon style={{ color }} size={19} />
        </div>
        <Check className="text-zinc-700" size={18} />
      </div>
      <p className="mt-5 text-sm font-bold text-zinc-500">{label}</p>
      <p className="mt-1 break-words text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl sm:tracking-[-0.06em]">{value}</p>
    </motion.div>
  );
}

function LinkRow({ link, onCopy }: { link: ShortLink; onCopy: () => void }) {
  return (
    <motion.div
      whileHover={{ x: 4 }}
      className="flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-3"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-white">{link.titulo || "Link sem titulo"}</p>
        <p className="mt-1 truncate text-xs text-zinc-500">{shortUrl(link.codigoCurto)}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-zinc-300 transition hover:bg-[var(--acid)] hover:text-black"
        aria-label="Copiar link"
      >
        <Copy size={17} />
      </button>
    </motion.div>
  );
}

function IconButton({
  label,
  icon: Icon,
  onClick,
  danger,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      type="button"
      onClick={onClick}
      className={clsx(
        "flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition",
        danger
          ? "border-red-400/20 bg-red-400/10 text-red-100 hover:bg-red-400/15"
          : "border-white/10 bg-white/[0.05] text-zinc-300 hover:bg-[var(--acid)] hover:text-black",
      )}
      >
      <Icon className="shrink-0" size={15} />
      <span className="truncate">{label}</span>
    </motion.button>
  );
}

function FeatureLine({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
      <p className="font-black text-white">{title}</p>
      <p className="mt-1 text-sm leading-5 text-zinc-500">{body}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm font-bold text-zinc-500">
      {text}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-2 font-black text-white">{value}</p>
    </div>
  );
}

function extractErrorMessage(text: string) {
  if (!text) {
    return "";
  }

  try {
    const data = JSON.parse(text) as { mensagem?: string; message?: string; error?: string };
    return data.mensagem ?? data.message ?? data.error ?? text;
  } catch {
    return text;
  }
}

function normalizeError(error: string) {
  if (error.includes("credenciais-invalidas")) {
    return "Email ou senha invalidos.";
  }

  if (error.includes("Email já está em uso") || error.includes("Email ja esta em uso")) {
    return "Email já está em uso.";
  }

  if (error.includes("URL válida") || error.includes("URL valida")) {
    return "Informe uma URL válida com http:// ou https://.";
  }

  if (error.includes("email válido") || error.includes("email valido")) {
    return "Informe um email válido.";
  }

  if (error.includes("Senha atual invalida") || error.includes("Senha atual inválida")) {
    return "Senha atual inválida.";
  }

  if (error.toLowerCase().includes("failed to fetch")) {
    return "Nao consegui falar com o backend. Verifique se ele esta rodando na porta 8080.";
  }

  return error.replaceAll("\"", "") || "Algo nao saiu como esperado.";
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
