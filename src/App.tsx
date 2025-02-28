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
        <main className="flex-1 p-4 max-w-4xl mx-auto">

          <Router />
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
