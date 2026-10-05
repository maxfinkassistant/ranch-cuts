import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, createHashRouter, RouterProvider, ScrollRestoration } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import HowItWorks from "./pages/HowItWorks";
import About from "./pages/About";
import Find from "./pages/Find";
import Local from "./pages/Local";
import "./styles/global.css";

/* the national map carries the state outlines (~190 KB) and the order
   flow carries pdf-lib (~500 KB), so they load on demand */
const MapPage = lazy(() => import("./pages/MapPage"));
const Order = lazy(() => import("./pages/Order"));
const Track = lazy(() => import("./pages/Track"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerTicket = lazy(() => import("./pages/CustomerTicket"));

const wait = <main className="page section wide mute">Loading...</main>;
const L = (el: React.ReactNode) => <Suspense fallback={wait}>{el}</Suspense>;

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
      { path: "/map", element: L(<MapPage />) },
      { path: "/local/:slug", element: <Local /> },
      { path: "/how-it-works", element: <HowItWorks /> },
      { path: "/about", element: <About /> },
      { path: "/order", element: L(<Order />) },
      { path: "/track", element: L(<Track />) },
      { path: "/track/:code", element: L(<Track />) },
      { path: "/customers", element: L(<Customers />) },
      { path: "/customers/ticket/:code", element: L(<CustomerTicket />) },
    ],
  },
];

// Hash routing when opened as a file or when VITE_HASH_ROUTER is set
// (static hosts without an SPA fallback); clean URLs otherwise.
const useHash = window.location.protocol === "file:" || import.meta.env.VITE_HASH_ROUTER === "1" || !!import.meta.env.VITE_DEMO;
const router = useHash ? createHashRouter(routes) : createBrowserRouter(routes);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
