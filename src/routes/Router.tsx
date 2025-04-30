import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Clients from "../pages/Clients";
import Taxes from "../pages/Taxes";
import Settings from "../pages/Settings";
import Logout from "../pages/Logout";
import OperationHistory from "../pages/OperationHistory";
import Notifications from "../pages/Notifications";
import ClientProfilePage from "../pages/ClientProfilePage";

const Router = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/clients" element={<Clients />} />
      <Route path="/clients/:id" element={<ClientProfilePage />} />
      <Route path="/taxes" element={<Taxes />} />
      <Route path="/history" element={<OperationHistory/>} />
      <Route path="/notifications" element={<Notifications/>} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/logout" element={<Logout />} />
    </Routes>
  );
};

export default Router;
