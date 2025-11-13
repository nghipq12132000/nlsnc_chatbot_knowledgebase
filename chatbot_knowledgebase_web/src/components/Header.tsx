// components/Header.js
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  CogIcon, 
  QuestionMarkCircleIcon, 
  UserCircleIcon,
  Bars3Icon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <CpuChipIcon className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900">Knowledge Base</h1>
                <p className="text-xs text-gray-500 -mt-1">AI Assistant</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              href="/" 
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              Chat
            </Link>
            <Link 
              href="/admin" 
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              Admin
            </Link>
            <Link 
              href="/help" 
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              Help
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Help Button */}
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <QuestionMarkCircleIcon className="w-5 h-5" />
            </button>
            
            {/* Settings Button */}
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <CogIcon className="w-5 h-5" />
            </button>
            
            {/* User Avatar */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
                <UserCircleIcon className="w-5 h-5 text-gray-600" />
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Bars3Icon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}