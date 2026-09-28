import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  FileText,
  MessageSquare,
  DollarSign,
  Shield,
  Store,
  TrendingUp,
  Settings as SettingsIcon,
  Home,
  LogIn,
  Search,
  Code2,
  Package,
  Layout as LayoutIcon,
  Component,
  Zap,
} from "lucide-react";

interface ComponentNode {
  id: string;
  name: string;
  category: "pages" | "features" | "ui" | "layout";
  route?: string;
  description: string;
  icon?: any;
  dependencies?: string[];
  filePath?: string;
}

const componentData: ComponentNode[] = [
  // Pages
  {
    id: "landing",
    name: "Landing",
    category: "pages",
    route: "/landing",
    description: "Public landing page",
    icon: Home,
    filePath: "pages/Landing.tsx",
  },
  {
    id: "auth",
    name: "Auth",
    category: "pages",
    route: "/auth",
    description: "Authentication & login",
    icon: LogIn,
    filePath: "pages/Auth.tsx",
  },
  {
    id: "dashboard",
    name: "Dashboard",
    category: "pages",
    route: "/",
    description: "Main dashboard with KPIs",
    icon: LayoutDashboard,
    dependencies: ["overview-cards", "chart-container"],
    filePath: "pages/Dashboard.tsx",
  },
  {
    id: "companies",
    name: "Companies",
    category: "pages",
    route: "/companies",
    description: "Companies directory",
    icon: Building2,
    filePath: "pages/Companies.tsx",
  },
  {
    id: "deals",
    name: "Deals",
    category: "pages",
    route: "/deals",
    description: "Deal pipeline overview",
    icon: Briefcase,
    filePath: "pages/Deals.tsx",
  },
  {
    id: "deal-workspace",
    name: "Deal Workspace",
    category: "pages",
    route: "/deals/:id",
    description: "Individual deal management",
    icon: Briefcase,
    dependencies: [
      "milestone-timeline",
      "deal-alerts",
      "escrow-payment",
      "risk-panel",
      "activity-chat",
      "deal-details",
    ],
    filePath: "pages/DealWorkspace.tsx",
  },
  {
    id: "contracts",
    name: "Contracts",
    category: "pages",
    route: "/contracts",
    description: "Contract management & e-signatures",
    icon: FileText,
    dependencies: ["contract-docs"],
    filePath: "pages/Contracts.tsx",
  },
  {
    id: "messaging",
    name: "Messaging",
    category: "pages",
    route: "/messaging",
    description: "Internal messaging",
    icon: MessageSquare,
    filePath: "pages/Messaging.tsx",
  },
  {
    id: "ledger",
    name: "Financial Ledger",
    category: "pages",
    route: "/ledger",
    description: "Transaction tracking & analytics",
    icon: DollarSign,
    dependencies: ["chart-container"],
    filePath: "pages/Ledger.tsx",
  },
  {
    id: "admin",
    name: "Admin Panel",
    category: "pages",
    route: "/admin",
    description: "User & compliance management",
    icon: Shield,
    filePath: "pages/Admin.tsx",
  },
  {
    id: "marketplace",
    name: "Marketplace",
    category: "pages",
    route: "/marketplace",
    description: "B2B marketplace",
    icon: Store,
    filePath: "pages/Marketplace.tsx",
  },
  {
    id: "investor",
    name: "Investor Dashboard",
    category: "pages",
    route: "/investor",
    description: "Premium analytics & insights",
    icon: TrendingUp,
    dependencies: ["chart-container"],
    filePath: "pages/Investor.tsx",
  },
  {
    id: "settings",
    name: "Settings",
    category: "pages",
    route: "/settings",
    description: "User & system settings",
    icon: SettingsIcon,
    filePath: "pages/Settings.tsx",
  },
  // Layout
  {
    id: "layout",
    name: "Layout",
    category: "layout",
    description: "Main app layout with sidebar",
    icon: LayoutIcon,
    dependencies: ["header"],
    filePath: "Layout.tsx",
  },
  {
    id: "header",
    name: "Header",
    category: "layout",
    description: "Top navigation header",
    icon: LayoutIcon,
    filePath: "Header.tsx",
  },
  // Feature Components
  {
    id: "overview-cards",
    name: "OverviewCards",
    category: "features",
    description: "Dashboard KPI cards",
    icon: Component,
    filePath: "OverviewCards.tsx",
  },
  {
    id: "milestone-timeline",
    name: "MilestoneTimeline",
    category: "features",
    description: "Deal milestone tracker",
    icon: Component,
    filePath: "MilestoneTimeline.tsx",
  },
  {
    id: "role-toggle",
    name: "RoleToggle",
    category: "features",
    description: "User role switcher",
    icon: Component,
    filePath: "RoleToggle.tsx",
  },
  {
    id: "deal-alerts",
    name: "DealAlerts",
    category: "features",
    description: "Deal notifications panel",
    icon: Component,
    filePath: "DealAlerts.tsx",
  },
  {
    id: "escrow-payment",
    name: "EscrowPayment",
    category: "features",
    description: "Escrow management widget",
    icon: Component,
    filePath: "EscrowPayment.tsx",
  },
  {
    id: "contract-docs",
    name: "ContractDocs",
    category: "features",
    description: "Contract document viewer",
    icon: Component,
    filePath: "ContractDocs.tsx",
  },
  {
    id: "risk-panel",
    name: "RiskPanel",
    category: "features",
    description: "Risk assessment display",
    icon: Component,
    filePath: "RiskPanel.tsx",
  },
  {
    id: "activity-chat",
    name: "ActivityChat",
    category: "features",
    description: "Activity feed & chat",
    icon: Component,
    filePath: "ActivityChat.tsx",
  },
  {
    id: "deal-details",
    name: "DealDetails",
    category: "features",
    description: "Deal information panel",
    icon: Component,
    filePath: "DealDetails.tsx",
  },
  {
    id: "user-flow-stepper",
    name: "UserFlowStepper",
    category: "features",
    description: "Multi-step form wizard",
    icon: Component,
    filePath: "UserFlowStepper.tsx",
  },
  {
    id: "onboarding",
    name: "Onboarding",
    category: "features",
    description: "User onboarding flow",
    icon: Component,
    filePath: "Onboarding.tsx",
  },
  {
    id: "chart-container",
    name: "ChartContainer",
    category: "features",
    description: "Reusable chart wrapper",
    icon: Component,
    filePath: "ui/ChartContainer.tsx",
  },
  // UI Components (representative sample)
  {
    id: "ui-button",
    name: "Button",
    category: "ui",
    description: "shadcn/ui button",
    icon: Package,
    filePath: "ui/button.tsx",
  },
  {
    id: "ui-card",
    name: "Card",
    category: "ui",
    description: "shadcn/ui card",
    icon: Package,
    filePath: "ui/card.tsx",
  },
  {
    id: "ui-dialog",
    name: "Dialog",
    category: "ui",
    description: "shadcn/ui dialog/modal",
    icon: Package,
    filePath: "ui/dialog.tsx",
  },
  {
    id: "ui-table",
    name: "Table",
    category: "ui",
    description: "shadcn/ui table",
    icon: Package,
    filePath: "ui/table.tsx",
  },
  {
    id: "ui-chart",
    name: "Chart",
    category: "ui",
    description: "shadcn/ui chart components",
    icon: Package,
    filePath: "ui/chart.tsx",
  },
  {
    id: "ui-form",
    name: "Form",
    category: "ui",
    description: "shadcn/ui form components",
    icon: Package,
    filePath: "ui/form.tsx",
  },
  {
    id: "ui-dropdown",
    name: "Dropdown Menu",
    category: "ui",
    description: "shadcn/ui dropdown",
    icon: Package,
    filePath: "ui/dropdown-menu.tsx",
  },
  {
    id: "ui-tabs",
    name: "Tabs",
    category: "ui",
    description: "shadcn/ui tabs",
    icon: Package,
    filePath: "ui/tabs.tsx",
  },
  {
    id: "ui-badge",
    name: "Badge",
    category: "ui",
    description: "shadcn/ui badge",
    icon: Package,
    filePath: "ui/badge.tsx",
  },
  {
    id: "ui-sidebar",
    name: "Sidebar",
    category: "ui",
    description: "shadcn/ui sidebar",
    icon: Package,
    filePath: "ui/sidebar.tsx",
  },
  {
    id: "ui-more",
    name: "+ 33 more UI components",
    category: "ui",
    description: "Additional shadcn/ui components",
    icon: Zap,
    filePath: "ui/",
  },
];

export function ComponentMap() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const categories = [
    { id: "pages", label: "Pages", color: "bg-purple-100 text-teal-700", count: 13 },
    { id: "features", label: "Features", color: "bg-blue-100 text-blue-700", count: 12 },
    { id: "layout", label: "Layout", color: "bg-purple-100 text-purple-700", count: 2 },
    { id: "ui", label: "UI Library", color: "bg-gray-100 text-gray-700", count: 43 },
  ];

  const filteredComponents = componentData.filter((comp) => {
    const matchesSearch =
      comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comp.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || comp.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedComponents = categories.map((cat) => ({
    ...cat,
    components: filteredComponents.filter((c) => c.category === cat.id),
  }));

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Code2 className="w-8 h-8 text-[#8B5CF6]" />
            <h1 className="text-3xl font-semibold text-gray-900">Component Map</h1>
          </div>
          <p className="text-gray-600">
            Visual architecture of the B2B SaaS marketplace platform
          </p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          {categories.map((cat, idx) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              whileHover={{ y: -4, boxShadow: "0 12px 24px rgba(0,0,0,0.08)" }}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`bg-white rounded-xl p-6 cursor-pointer transition-all ${
                selectedCategory === cat.id ? "ring-2 ring-[#8B5CF6]" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${cat.color}`}>
                  {cat.label}
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{cat.count}</div>
              <div className="text-sm text-gray-500 mt-1">
                {cat.count === 1 ? "component" : "components"}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search components..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] transition-all"
            />
          </div>
          {selectedCategory && (
            <div className="mt-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
                <span>Clear filter</span>
                <span className="text-[#8B5CF6]">×</span>
              </button>
            </div>
          )}
        </motion.div>

        {/* Component Grid */}
        <div className="space-y-8">
          {groupedComponents.map((group, groupIdx) => {
            if (group.components.length === 0) return null;

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + groupIdx * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <h2 className={`px-4 py-2 rounded-lg font-semibold ${group.color}`}>
                    {group.label}
                  </h2>
                  <span className="text-gray-500 text-sm">
                    {group.components.length} of {group.count}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.components.map((component, idx) => {
                    const Icon = component.icon || Component;
                    const isNavigable = component.route !== undefined;
                    const isHovered = hoveredNode === component.id;
                    const hasDependencies =
                      component.dependencies && component.dependencies.length > 0;

                    return (
                      <motion.div
                        key={component.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        whileHover={{
                          y: -6,
                          boxShadow: "0 16px 32px rgba(15, 157, 157, 0.12)",
                        }}
                        onHoverStart={() => setHoveredNode(component.id)}
                        onHoverEnd={() => setHoveredNode(null)}
                        onClick={() => {
                          if (isNavigable && component.route) {
                            navigate(component.route);
                          }
                        }}
                        className={`bg-white rounded-xl p-5 transition-all ${
                          isNavigable ? "cursor-pointer" : ""
                        } ${
                          isHovered && hasDependencies ? "ring-2 ring-[#8B5CF6]" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div
                            className={`p-3 rounded-lg ${
                              group.id === "pages"
                                ? "bg-purple-50"
                                : group.id === "features"
                                ? "bg-blue-50"
                                : group.id === "layout"
                                ? "bg-purple-50"
                                : "bg-gray-50"
                            }`}
                          >
                            <Icon
                              className={`w-6 h-6 ${
                                group.id === "pages"
                                  ? "text-cyan-600"
                                  : group.id === "features"
                                  ? "text-blue-600"
                                  : group.id === "layout"
                                  ? "text-purple-600"
                                  : "text-gray-600"
                              }`}
                            />
                          </div>
                          {isNavigable && (
                            <span className="px-2 py-1 bg-[#8B5CF6] bg-opacity-10 text-[#8B5CF6] text-xs rounded-md font-medium">
                              Navigate
                            </span>
                          )}
                        </div>

                        <h3 className="font-semibold text-gray-900 mb-1">
                          {component.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {component.description}
                        </p>

                        {component.filePath && (
                          <div className="flex items-center gap-2 mb-2">
                            <code className="text-xs text-[#8B5CF6] bg-purple-50 px-2 py-1 rounded font-mono flex-1">
                              {component.filePath}
                            </code>
                          </div>
                        )}

                        {component.route && (
                          <code className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded block mb-2 font-mono">
                            Route: {component.route}
                          </code>
                        )}

                        {hasDependencies && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{
                              height: isHovered ? "auto" : 0,
                              opacity: isHovered ? 1 : 0,
                            }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-3 border-t border-gray-100 mt-3">
                              <div className="text-xs font-medium text-gray-700 mb-2">
                                Dependencies:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {component.dependencies?.map((dep) => (
                                  <span
                                    key={dep}
                                    className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
                                  >
                                    {dep}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredComponents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No components found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search or filter criteria
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
