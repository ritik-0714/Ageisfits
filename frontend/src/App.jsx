import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PlanPage from "./pages/PlanPage.jsx";
import FormCheck from "./pages/FormCheck.jsx";
import InjuryMap from "./pages/InjuryMap.jsx";
import Devices from "./pages/Devices.jsx";
import Connect from "./pages/Connect.jsx";
import Store from "./pages/Store.jsx";

// Any logged-in user can open the app. There is no email-verification step.
function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="p-10 font-mono text-sm text-mute">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function Home() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/verify" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/plan" element={<Protected><PlanPage /></Protected>} />
      <Route path="/connect" element={<Protected><Connect /></Protected>} />
      <Route path="/devices" element={<Protected><Devices /></Protected>} />
      <Route path="/form-check" element={<Protected><FormCheck /></Protected>} />
      <Route path="/injury-map" element={<Protected><InjuryMap /></Protected>} />
      <Route path="/store" element={<Protected><Store /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
