import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, createHashRouter, RouterProvider, ScrollRestoration } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import HowItWorks from "./pages/HowItWorks";
import About from "./pages/About";
import Find from "./pages/Find";
import Local from "./pages/Local";
import Order from "./pages/Order";
import Track from "./pages/Track";
import Customers from "./pages/Customers";
import CustomerTicket from "./pages/CustomerTicket";
import "./styles/global.css";

/* the national map carries the state outlines (~190 KB), so it loads on demand */
const MapPage = lazy(() => import("./pages/MapPage"));

function Root() {
  return (
    <>
      <ScrollRestoration />
      <Layout />
    </>
  );
}

const routes = [
  {
    element: <Root />,
    children: [
      { path: "/", element: <Landing /> },
      { path: "/find", element: <Find /> },
      { path: "/find/:zip", element: <Find /> },
      { path: "/map", element: <Suspense fallback={<main className="page section wide">Loading the map...</main>}><MapPage /></Suspense> },
      { path: "/local/:slug", element: <Local /> },
      { path: "/how-it-works", element: <HowItWorks /> },
      { path: "/about", element: <About /> },
      { path: "/order", element: <Order /> },
      { path: "/track", element: <Track /> },
      { path: "/track/:code", element: <Track /> },
      { path: "/customers", element: <Customers /> },
      { path: "/customers/ticket/:code", element: <CustomerTicket /> },
    ],
  },
];

// Hash routing when opened as a file or when VITE_HASH_ROUTER is set
// (static hosts without an SPA fallback); clean URLs otherwise.
const useHash = window.location.protocol === "file:" || import.meta.env.VITE_HASH_ROUTER === "1";
const router = useHash ? createHashRouter(routes) : createBrowserRouter(routes);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
