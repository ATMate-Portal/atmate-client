import { useState } from "react";
import "./App.css";
import { BrowserRouter } from "react-router-dom";
import Router from "./routes/Router";
import Sidebar from './components/layout/Sidebar';



function App() {
  return (
<BrowserRouter>
  <div className="app-wrapper">
    <Sidebar />
    <main className="app-main">
      <Router />
    </main>
  </div>
</BrowserRouter>

  );
}

export default App;
