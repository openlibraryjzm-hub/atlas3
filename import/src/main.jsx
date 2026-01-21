import React from "react";
import ReactDOM from "react-dom/client";
// Switch between App and AppDebug by changing the import:
import App from "./App";
// import App from "./AppDebug"; // Uncomment this line to see debug bounds

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
