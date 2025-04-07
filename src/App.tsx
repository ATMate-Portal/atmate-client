import { useState } from "react";
import "./App.css";
import { BrowserRouter } from "react-router-dom";
import Router from "./routes/Router";
import Sidebar from './components/layout/Sidebar';



function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">

        <Sidebar />
        <main className="">

          <Router />
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
