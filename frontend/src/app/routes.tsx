import React from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Auth } from "./components/pages/Auth";
import { Landing } from "./components/pages/Landing";
import { AdminGuard } from "../auth/AdminGuard";

const Dashboard = React.lazy(() => import("./components/pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Companies = React.lazy(() => import("./components/pages/Companies").then(m => ({ default: m.Companies })));
const DealWorkspace = React.lazy(() => import("./components/pages/DealWorkspace").then(m => ({ default: m.DealWorkspace })));
const Deals = React.lazy(() => import("./components/pages/Deals").then(m => ({ default: m.Deals })));
const Contracts = React.lazy(() => import("./components/pages/Contracts").then(m => ({ default: m.Contracts })));
const Messaging = React.lazy(() => import("./components/pages/Messaging").then(m => ({ default: m.Messaging })));
const Ledger = React.lazy(() => import("./components/pages/Ledger").then(m => ({ default: m.Ledger })));
const Admin = React.lazy(() => import("./components/pages/Admin").then(m => ({ default: m.Admin })));
const Marketplace = React.lazy(() => import("./components/pages/Marketplace").then(m => ({ default: m.Marketplace })));
const Investor = React.lazy(() => import("./components/pages/Investor").then(m => ({ default: m.Investor })));
const Settings = React.lazy(() => import("./components/pages/Settings").then(m => ({ default: m.Settings })));
const ComponentMap = React.lazy(() => import("./components/pages/ComponentMap").then(m => ({ default: m.ComponentMap })));
const ActiveRequirements = React.lazy(() => import("./components/pages/ActiveRequirements").then(m => ({ default: m.ActiveRequirements })));
const ClosedRequirements = React.lazy(() => import("./components/pages/ClosedRequirements").then(m => ({ default: m.ClosedRequirements })));
const RequirementDetails = React.lazy(() => import("./components/pages/RequirementDetails").then(m => ({ default: m.RequirementDetails })));
const MatchingRequirements = React.lazy(() => import("./components/pages/MatchingRequirements").then(m => ({ default: m.MatchingRequirements })));
const SentProposals = React.lazy(() => import("./components/pages/SentProposals").then(m => ({ default: m.SentProposals })));
const ReceivedProposals = React.lazy(() => import("./components/pages/ReceivedProposals").then(m => ({ default: m.ReceivedProposals })));
const EnquiriesSent = React.lazy(() => import("./components/pages/EnquiriesSent").then(m => ({ default: m.EnquiriesSent })));
const EnquiriesReceived = React.lazy(() => import("./components/pages/EnquiriesReceived").then(m => ({ default: m.EnquiriesReceived })));
const EnquiriesArchived = React.lazy(() => import("./components/pages/EnquiriesArchived").then(m => ({ default: m.EnquiriesArchived })));
const ServicesPage = React.lazy(() => import("./components/pages/ServicesPage").then(m => ({ default: m.ServicesPage })));
const ExploreBusinesses = React.lazy(() => import("./components/pages/ExploreBusinesses").then(m => ({ default: m.ExploreBusinesses })));
const SendProposal = React.lazy(() => import("./components/pages/SendProposal").then(m => ({ default: m.SendProposal })));
const PostRequirementPage = React.lazy(() => import("./components/pages/PostRequirementPage").then(m => ({ default: m.PostRequirementPage })));
const NotificationsPage = React.lazy(() => import("./components/pages/NotificationsPage").then(m => ({ default: m.NotificationsPage })));
const VerificationPage = React.lazy(() => import("./components/pages/VerificationPage").then(m => ({ default: m.VerificationPage })));

export const router = createBrowserRouter([
  { path: "/",         element: <Navigate to="/landing" replace /> },
  { path: "/landing",  Component: Landing },
  { path: "/services", Component: ServicesPage },
  { path: "/explore",  Component: ExploreBusinesses },
  { path: "/auth",     Component: Auth },
  {
    path: "/app",
    Component: Layout,
    children: [
      { index: true,                          Component: Dashboard },
      { path: "dashboard",                    Component: Dashboard },
      { path: "deals",                        Component: Deals },
      { path: "deals/:id",                    Component: DealWorkspace },
      { path: "companies",                    Component: Companies },
      { path: "contracts",                    Component: Contracts },
      { path: "messaging",                    Component: Messaging },
      { path: "ledger",                       Component: Ledger },
      { path: "admin",                        element: <AdminGuard><Admin /></AdminGuard> },
      { path: "marketplace",                  Component: Marketplace },
      { path: "investor",                     Component: Investor },
      { path: "settings",                     Component: Settings },
      { path: "verification",                 Component: VerificationPage },
      { path: "component-map",                Component: ComponentMap },
      // Requirements
      { path: "requirements/active",          Component: ActiveRequirements },
      { path: "requirements/new",             Component: PostRequirementPage },
      { path: "requirements/closed",          Component: ClosedRequirements },
      { path: "requirements/details",         Component: RequirementDetails },
      // Opportunities
      { path: "opportunities/matching",       Component: MatchingRequirements },
      { path: "opportunities/send",           Component: SendProposal },
      { path: "opportunities/send/:id",       Component: SendProposal },
      { path: "opportunities/sent",           Component: SentProposals },
      { path: "opportunities/received",       Component: ReceivedProposals },
      // Enquiries
      { path: "enquiries/sent",               Component: EnquiriesSent },
      { path: "enquiries/received",           Component: EnquiriesReceived },
      { path: "enquiries/archived",           Component: EnquiriesArchived },
      // Notifications
      { path: "notifications",                Component: NotificationsPage },
      // Fallback
      { path: "*",                            Component: Dashboard },
    ],
  },
]);
