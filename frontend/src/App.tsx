import { AppProvider, useApp } from "./store";
import { Shell } from "./components/layout";
import { Card, Toasts } from "./components/ui";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ClientDashboard from "./pages/client/Dashboard";
import Profile from "./pages/client/Profile";
import Agenda from "./pages/client/Agenda";
import Credits from "./pages/client/Credits";
import ClientContracts from "./pages/client/Contracts";
import History from "./pages/client/History";
import ClientFinancial from "./pages/client/Financial";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Rooms from "./pages/admin/Rooms";
import AgendaGeral from "./pages/admin/AgendaGeral";
import Clients from "./pages/admin/Clients";
import NewClient from "./pages/admin/NewClient";
import ClientDetail from "./pages/admin/ClientDetail";
import AdminContracts from "./pages/admin/Contracts";
import AdminFinancial from "./pages/admin/Financial";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import { FileQuestion } from "lucide-react";
import { Button } from "./components/ui";
import { useState } from "react";

function NotFound() {
  const { navigate } = useApp();
  return (
    <Card className="p-10 text-center">
      <FileQuestion className="mx-auto h-10 w-10 text-faint" />
      <h2 className="mt-4 text-[18px] font-bold text-ink">Página não encontrada</h2>
      <p className="mt-1 text-[13px] text-muted">O conteúdo solicitado ainda não está disponível neste MVP.</p>
      <Button className="mt-5" onClick={() => navigate("dashboard")}>
        Voltar ao dashboard
      </Button>
    </Card>
  );
}

function ClientRouter({ page }: { page: string }) {
  switch (page) {
    case "dashboard":
      return <ClientDashboard />;
    case "profile":
      return <Profile />;
    case "agenda":
      return <Agenda />;
    case "credits":
      return <Credits />;
    case "contracts":
      return <ClientContracts />;
    case "financial":
      return <ClientFinancial />;
    case "history":
      return <History />;
    case "settings":
      return <Settings />;
    case "notifications":
      return <Notifications />;
    default:
      return <NotFound />;
  }
}

function AdminRouter({ page, param }: { page: string; param?: string }) {
  switch (page) {
    case "dashboard":
      return <AdminDashboard />;
    case "rooms":
      return <Rooms />;
    case "schedule":
      return <AgendaGeral />;
    case "clients":
      return param ? <ClientDetail clientId={param} /> : <Clients />;
    case "new-client":
      return <NewClient />;
    case "contracts":
      return <AdminContracts />;
    case "financial":
      return <AdminFinancial />;
    case "reports":
      return <Reports />;
    case "settings":
      return <Settings />;
    case "notifications":
      return <Notifications />;
    default:
      return <NotFound />;
  }
}

function AppRoutes() {
  const { role, page, booting } = useApp();
  const [guestPage, setGuestPage] = useState<"login" | "signup">("login");
  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-[14px] text-muted">
        Carregando sua conta...
      </div>
    );
  }
  if (!role) {
    return guestPage === "signup" ? (
      <Signup onBack={() => setGuestPage("login")} />
    ) : (
      <Login onSignup={() => setGuestPage("signup")} />
    );
  }
  return (
    <Shell>
      <div key={page.name + (page.param ?? "")} className="animate-fade-up">
        {role === "admin" ? (
          <AdminRouter page={page.name} param={page.param} />
        ) : (
          <ClientRouter page={page.name} />
        )}
      </div>
    </Shell>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
      <Toasts />
    </AppProvider>
  );
}
