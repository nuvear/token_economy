// App root — tiny hash router + session bootstrap.
// Routes: #/login plus the 11 shell destinations (see NAV in Shell.tsx).
import { useEffect, useState, type ComponentType } from "react";
import { Shell, UiProvider, useUi, routeAllowed } from "./shell/Shell";
import { auth } from "./api";
import Login from "./screens/Login";
import Home from "./screens/Home";
import DealWorkspace from "./screens/DealWorkspace";
import Approvals from "./screens/Approvals";
import PolicyStudio from "./screens/PolicyStudio";
import Proposal from "./screens/Proposal";
import Portfolio from "./screens/Portfolio";
import Insights from "./screens/Insights";
import Evidence from "./screens/Evidence";
import Engagements from "./screens/Engagements";
import Settings from "./screens/Settings";
import Help from "./screens/Help";

const SCREENS: Record<string, ComponentType> = {
  home: Home,
  deal: DealWorkspace,
  approvals: Approvals,
  policy: PolicyStudio,
  proposal: Proposal,
  portfolio: Portfolio,
  insights: Insights,
  evidence: Evidence,
  engagements: Engagements,
  settings: Settings,
  help: Help,
};

function parseRoute(): string {
  const raw = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return raw || "home";
}

function useHashRoute(): string {
  const [route, setRoute] = useState(parseRoute);
  useEffect(() => {
    const onChange = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

function Router() {
  const route = useHashRoute();
  const ui = useUi();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    auth
      .me()
      .then((r) => ui.setUser(r.user))
      .catch(() => ui.setUser(null))
      .finally(() => setChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checked) return null;

  if (!ui.user || route === "login") {
    return (
      <Login
        onLoggedIn={(u) => {
          ui.setUser(u);
          window.location.hash = "#/home";
        }}
      />
    );
  }

  // §2 role gate: a route hidden from this role's nav renders Home instead
  // (server guards enforce the matrix on every API call regardless).
  const allowed = route in SCREENS && routeAllowed(route, ui.user.role);
  const Screen = allowed ? SCREENS[route] : Home;
  return (
    <Shell route={allowed ? route : "home"}>
      <Screen />
    </Shell>
  );
}

export default function App() {
  return (
    <UiProvider>
      <Router />
    </UiProvider>
  );
}
