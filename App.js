import React from "react";
import { BrowserRouter } from "react-router-dom";
import AdminRoutes from "./routes";

function App() {
  return (
    <BrowserRouter>
      <AdminRoutes />
    </BrowserRouter>
  );
}

export default App;