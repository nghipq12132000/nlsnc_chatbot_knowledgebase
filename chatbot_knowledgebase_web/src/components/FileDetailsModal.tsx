"use client";

import { useState } from "react";
import API_CONFIG from "../config/api";
import DeleteConfirmModal from "./DeleteConfirmModal";

interface FileItem {
  name: string;
  type: "file" | "directory";
  path: string;
  size?: number;
  modified?: number;
  extension?: string;
  children_count?: number;
}

interface FileDetailsModalProps {
  file: FileItem;
  isOpen: boolean;
  onClose: () => void;
  onFileDeleted?: (fileName: string) => void;
}

export default function FileDetailsModal({ file, isOpen, onClose, onFileDeleted }: FileDetailsModalProps) {
  const [copying, setCopying] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!isOpen) return null;

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown";
    
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
  };

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp * 1000).toLocaleString();
  };

  const copyPath = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(file.path);
    } catch (err) {
      console.error("Failed to copy path:", err);
    } finally {
      setTimeout(() => setCopying(false), 1000);
    }
  };

  const handleDeleteFile = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/admin/files/delete?filename=${encodeURIComponent(file.path)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete file');
      }

      const result = await response.json();
      console.log('File deleted successfully:', result);
      
      // Call the onFileDeleted callback if provided
      if (onFileDeleted) {
        onFileDeleted(file.name);
      }
      
      // Close both modals
      setShowDeleteModal(false);
      onClose();
      
    } catch (error) {
      console.error('Error deleting file:', error);
      alert(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const downloadUrl = `${API_CONFIG.BASE_URL}/download?filename=${encodeURIComponent(file.path)}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-gray-100">
        {/* Professional Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Document Details</h3>
                <p className="text-blue-100 text-sm">File information and actions</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {/* Professional Content */}
        <div className="p-8 space-y-6">
          {/* File Info Card */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-800 truncate mb-2">
                  {file.name}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 font-medium">Type:</span>
                    <span className="ml-2 text-gray-800 font-semibold">
                      {file.extension ? file.extension.toUpperCase().replace('.', '') + ' Document' : 'File'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Size:</span>
                    <span className="ml-2 text-gray-800 font-semibold">{formatFileSize(file.size)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Properties */}
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Properties
            </h4>
            
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                <div className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Full Path</span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-gray-100 px-3 py-1 rounded-lg text-gray-800 max-w-xs truncate">
                        {file.path}
                      </code>
                      <button
                        onClick={copyPath}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200"
                        title="Copy path"
                      >
                        {copying ? (
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">File Size</span>
                    <span className="text-gray-800 font-medium">{formatFileSize(file.size)}</span>
                  </div>
                </div>

                <div className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Last Modified</span>
                    <span className="text-gray-800 font-medium">{formatDate(file.modified)}</span>
                  </div>
                </div>

                {file.extension && (
                  <div className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">File Extension</span>
                      <span className="text-gray-800 font-medium bg-blue-100 px-3 py-1 rounded-full text-sm">
                        {file.extension.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Professional Footer */}
        <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 sm:justify-between">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
              
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
            
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download File
            </a>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        fileName={file.name}
        onConfirm={handleDeleteFile}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}