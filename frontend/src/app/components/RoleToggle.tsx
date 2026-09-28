import React from "react";
import { Role } from "./pages/DealWorkspace";

export function RoleToggle({ currentRole, onChange }: { currentRole: Role, onChange: (role: Role) => void }) {
  const roles: Role[] = ["Client", "Provider", "Admin"];
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">View As:</span>
      <div className="flex bg-slate-100 p-1 rounded-lg">
        {roles.map(r => (
          <button
            key={r}
            onClick={() => onChange(r)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              currentRole === r 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
