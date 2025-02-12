// src/routes.tsx
import { RouteObject } from "react-router-dom";
import Home from "../pages/Home";
import Clients from "../pages/Clients";
import Taxes from "../pages/Taxes";
import Settings from "../pages/Settings";
import Logout from "../pages/Logout";

const routes: RouteObject[] = [
  { path: "/", element: <Home /> },
  { path: "/clients", element: <Clients /> },
  { path: "/taxes", element: <Taxes /> },
  { path: "/settings", element: <Settings /> },
  { path: "/logout", element: <Logout /> },
];

export default routes;
