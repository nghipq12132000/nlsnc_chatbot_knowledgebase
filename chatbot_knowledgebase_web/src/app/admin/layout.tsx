"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  HomeIcon, 
  DocumentTextIcon, 
  CogIcon, 
  ArrowLeftIcon,
  CpuChipIcon,
  ChartBarIcon,
  BellIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  const navItems = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: HomeIcon,
      description: "Overview & Analytics"
    },
    {
      href: "/admin/documents",
      label: "Documents",
      icon: DocumentTextIcon,
      description: "File Management"
    },
    {
      href: "/admin/settings",
      label: "Settings",
      icon: CogIcon,
      description: "System Configuration"
    }
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Professional Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-72 bg-white shadow-xl border-r border-gray-200 z-30">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <CpuChipIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Admin Console</h1>
                <p className="text-xs text-gray-500">Knowledge Base Management</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      active
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm border border-blue-200"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <div className={`p-2 rounded-lg transition-colors ${
                      active 
                        ? "bg-blue-100 text-blue-600" 
                        : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-sm">{item.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
            
            {/* Quick Stats */}
            <div className="mt-8 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <ChartBarIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">Quick Stats</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Documents</span>
                  <span className="font-medium">—</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Storage</span>
                  <span className="font-medium">—</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Last Upload</span>
                  <span className="font-medium">—</span>
                </div>
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100">
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Chat</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-72 flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-8 py-6 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {navItems.find(item => isActive(item.href))?.label || "Dashboard"}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {navItems.find(item => isActive(item.href))?.description || "Manage your chatbot knowledge base"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                <span>Last updated:</span>
                <span className="font-medium">{new Date().toLocaleDateString()}</span>
              </div>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <BellIcon className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
                <UserCircleIcon className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}