"use client";

import Output from "@/components/Output";
import TextArea from "@/components/TextArea";
import { type ChatOutput } from "@/types";
import { useState } from "react";
import Header from '../components/Header';
import { 
  LightBulbIcon, 
  DocumentTextIcon, 
  ChartBarIcon, 
  CpuChipIcon,
  ClockIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function Home() {
  const [outputs, setOutputs] = useState<ChatOutput[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      
      {/* Hero Section */}
      {outputs.length === 0 && (
        <div className="relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 transform -skew-y-6 origin-top-left"></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
            {/* Main Hero Content */}
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium mb-8">
                <CpuChipIcon className="w-4 h-4 mr-2" />
                Powered by Advanced AI Technology
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 leading-tight">
                <span className="block">Knowledge Base</span>
                <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Chatbot Assistant
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                Get instant, accurate answers from your organization's knowledge base. 
                Our AI-powered assistant helps you find information quickly and efficiently.
              </p>
              
              {/* Feature Cards */}
              <div className="grid md:grid-cols-3 gap-6 mb-16">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <LightBulbIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Answers</h3>
                  <p className="text-gray-600 text-sm">
                    Get intelligent responses based on your specific documents and data
                  </p>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="bg-green-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <ClockIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Instant Results</h3>
                  <p className="text-gray-600 text-sm">
                    Find information in seconds, not hours of searching through documents
                  </p>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="bg-purple-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure & Reliable</h3>
                  <p className="text-gray-600 text-sm">
                    Your data stays private with enterprise-grade security and accuracy
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Interface Container */}
      <div className={`container mx-auto px-4 ${
        outputs.length === 0 ? 'pt-0 pb-32' : 'pt-10 pb-32'
      }`}>
        <div className="w-full max-w-4xl mx-auto">
          {outputs.length === 0 && (
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                What would you like to know?
              </h2>
              <p className="text-gray-600">
                Ask me anything about your organization's documents and knowledge base.
              </p>
            </div>
          )}

          <TextArea
            setIsGenerating={setIsGenerating}
            isGenerating={isGenerating}
            outputs={outputs}
            setOutputs={setOutputs}
          />

          {outputs.map((output, i) => {
            return <Output key={i} output={output} />;
          })}
        </div>
      </div>
    </div>
  );
}
