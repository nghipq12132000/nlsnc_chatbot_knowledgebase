"use client";

import Link from "next/link";
import { 
  DocumentTextIcon, 
  CloudArrowUpIcon, 
  CogIcon,
  ChartBarIcon,
  ClockIcon,
  ServerIcon,
  FolderIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function Admin() {
  const stats = [
    {
      title: "Total Documents",
      value: "—",
      icon: "📄",
      description: "Available in knowledge base"
    },
    {
      title: "Last Upload", 
      value: "—",
      icon: "📤",
      description: "Most recent document upload"
    },
    {
      title: "Storage Used",
      value: "—", 
      icon: "💾",
      description: "Total storage consumption"
    },
    {
      title: "File Types",
      value: "—",
      icon: "📊",
      description: "Supported document formats"
    }
  ];

  const quickActions = [
    {
      title: "Manage Documents",
      description: "Browse, upload, and manage all documents in the knowledge base",
      href: "/admin/documents",
      icon: "�",
      color: "bg-blue-500"
    },
    {
      title: "Configure Settings",
      description: "Manage system settings and preferences",
      href: "/admin/settings", 
      icon: "⚙️",
      color: "bg-purple-500"
    }
  ];

  return (
    <div className="space-y-8 fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <ChartBarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Welcome back!</h1>
              <p className="text-blue-100">Manage your AI knowledge base from this dashboard</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = DocumentTextIcon; // placeholder for now
          const colorClasses = {
            blue: "bg-blue-50 text-blue-600",
            purple: "bg-purple-50 text-purple-600", 
            green: "bg-green-50 text-green-600",
            orange: "bg-orange-50 text-orange-600"
          };
          
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-600">
                  +0
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <ArrowTrendingUpIcon className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl p-6 text-white transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <DocumentTextIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{action.title}</h3>
                  <p className="text-white/90 text-sm leading-relaxed">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <ClockIcon className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="text-gray-500 text-center py-8">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <CheckCircleIcon className="w-4 h-4 mt-0.5 text-green-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">System Ready</p>
              <p className="text-xs text-gray-600 mt-1">Knowledge base is ready to accept documents</p>
              <p className="text-xs text-gray-500 mt-1">Just now</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}