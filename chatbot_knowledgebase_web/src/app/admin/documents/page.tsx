"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import FileDetailsModal from "../../../components/FileDetailsModal";
import DeleteConfirmModal from "../../../components/DeleteConfirmModal";
import API_CONFIG from "../../../config/api";

interface FileItem {
  name: string;
  type: "file" | "directory";
  path: string;
  size?: number;
  modified?: number;
  extension?: string;
  children_count?: number;
}

interface BreadcrumbItem {
  name: string;
  path: string;
}

interface AdminFilesResponse {
  items: FileItem[];
  current_path: string;
  breadcrumb: BreadcrumbItem[];
  total_items: number;
  directories: number;
  files: number;
  base_directory: string;
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <DocumentsPageContent />
    </Suspense>
  );
}

function DocumentsPageContent() {
  const [files, setFiles] = useState<AdminFilesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "size" | "modified">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Upload states
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<"files" | "folder">("files");

  // Delete states
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentPath = searchParams.get("path") || "";

  const loadFiles = async (path: string = "") => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (path) params.set("path", path);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/admin/files?${params}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data: AdminFilesResponse = await response.json();
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
      console.error("Error loading files:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  const navigateToPath = (path: string) => {
    const params = new URLSearchParams();
    if (path) params.set("path", path);
    router.push(`/admin/documents?${params}`);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "—";
    
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
    if (!timestamp) return "—";
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getFileIcon = (item: FileItem): string => {
    if (item.type === "directory") return "📁";
    
    const ext = item.extension?.toLowerCase();
    switch (ext) {
      case ".pdf": return "📄";
      case ".xlsx": case ".xls": return "📊";
      case ".pptx": case ".ppt": return "📈";
      case ".docx": case ".doc": return "📝";
      case ".txt": return "📃";
      case ".md": return "📋";
      case ".jpg": case ".jpeg": case ".png": case ".gif": return "🖼️";
      default: return "📄";
    }
  };

  const filteredItems = files?.items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    // Directories first
    if (a.type === "directory" && b.type === "file") return -1;
    if (a.type === "file" && b.type === "directory") return 1;
    
    let compareValue = 0;
    
    switch (sortBy) {
      case "name":
        compareValue = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        break;
      case "size":
        compareValue = (a.size || 0) - (b.size || 0);
        break;
      case "modified":
        compareValue = (a.modified || 0) - (b.modified || 0);
        break;
    }
    
    return sortOrder === "asc" ? compareValue : -compareValue;
  });

  const handleSort = (field: "name" | "size" | "modified") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: "name" | "size" | "modified") => {
    if (sortBy !== field) return "↕️";
    return sortOrder === "asc" ? "⬆️" : "⬇️";
  };

  // Upload functions
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
    setUploadMessage(null);
  };

  const handleUploadModeChange = (mode: "files" | "folder") => {
    setUploadMode(mode);
    setSelectedFiles(null);
    setUploadMessage(null);
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setUploadMessage("Please select files or a folder to upload.");
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);

    const formData = new FormData();
    Array.from(selectedFiles).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILES_UPLOAD}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      setUploadMessage("Files uploaded successfully!");
      setSelectedFiles(null);
      
      // Refresh the file list
      await loadFiles(currentPath);
      
      // Close upload panel after successful upload
      setTimeout(() => {
        setShowUpload(false);
        setUploadMessage(null);
      }, 2000);
      
    } catch (error) {
      setUploadMessage("Error uploading files. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (file: FileItem) => {
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
      
      // Refresh the file list
      await loadFiles(currentPath);
      
      // Close the delete modal
      setFileToDelete(null);
      
    } catch (error) {
      console.error('Error deleting file:', error);
      alert(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Files</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => loadFiles(currentPath)}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Professional Header Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Document Management</h1>
                  <p className="text-blue-100 mt-1">
                    Centralized knowledge base document library
                  </p>
                </div>
              </div>
              
              {/* Quick Stats in Header */}
              {files && (
                <div className="hidden lg:flex items-center gap-6 text-white">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{files.total_items}</div>
                    <div className="text-sm text-blue-100">Total Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{files.directories}</div>
                    <div className="text-sm text-blue-100">Folders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{files.files}</div>
                    <div className="text-sm text-blue-100">Documents</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls Section */}
          <div className="px-8 py-6 bg-gray-50 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left side - Breadcrumb */}
              {files && (
                <nav className="flex items-center space-x-2 text-sm bg-white rounded-lg px-4 py-2 border border-gray-200">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 1v6" />
                  </svg>
                  <button
                    onClick={() => navigateToPath("")}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    Home
                  </button>
                  
                  {files.breadcrumb.map((crumb, index) => (
                    <span key={index} className="flex items-center space-x-2">
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <button
                        onClick={() => navigateToPath(crumb.path)}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        {crumb.name}
                      </button>
                    </span>
                  ))}
                </nav>
              )}

              {/* Right side - Actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowUpload(!showUpload)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    showUpload
                      ? "bg-gray-500 text-white shadow-md"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {showUpload ? "Cancel Upload" : "Upload Documents"}
                </button>
                
                {/* Enhanced Search */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-4 py-3 w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        {/* Professional Upload Section */}
        {showUpload && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">Upload Documents</h3>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              {/* Upload Mode Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Upload Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleUploadModeChange("files")}
                    className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                      uploadMode === "files"
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                        : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-semibold">Select Files</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUploadModeChange("folder")}
                    className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                      uploadMode === "folder"
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                        : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                    <span className="font-semibold">Select Folder</span>
                  </button>
                </div>
              </div>

              {/* Professional File Input */}
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">
                  Choose {uploadMode === "folder" ? "Folder" : "Files"}
                </label>
                <div className="relative">
                  <input
                    key={uploadMode}
                    type="file"
                    multiple
                    {...(uploadMode === "folder" ? { webkitdirectory: "true" } : {})}
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-blue-100 rounded-full">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-700">
                          Drop {uploadMode === "folder" ? "folder" : "files"} here or click to browse
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Supports PDF, DOCX, XLSX, PPTX, TXT, MD and more
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Selected Files Preview */}
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="font-bold text-blue-800">
                      Selected Files ({selectedFiles.length})
                    </h4>
                  </div>
                  <div className="bg-white rounded-lg p-4 max-h-40 overflow-auto border border-blue-200">
                    <div className="grid grid-cols-1 gap-2">
                      {Array.from(selectedFiles).slice(0, 10).map((file, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-gray-700 truncate">
                            {(file as any).webkitRelativePath || file.name}
                          </span>
                          <span className="text-xs text-gray-500 ml-auto">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      ))}
                      {selectedFiles.length > 10 && (
                        <div className="text-center py-2 text-sm text-gray-500 border-t border-gray-200">
                          ... and {selectedFiles.length - 10} more files
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Upload Button and Message */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !selectedFiles || selectedFiles.length === 0}
                  className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold transition-all duration-200 ${
                    isUploading || !selectedFiles || selectedFiles.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  }`}
                >
                  {isUploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload Documents
                    </>
                  )}
                </button>

                {uploadMessage && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
                    uploadMessage.includes("success") 
                      ? "bg-green-100 text-green-800 border border-green-200" 
                      : "bg-red-100 text-red-800 border border-red-200"
                  }`}>
                    {uploadMessage.includes("success") ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {uploadMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>

      {/* Professional Stats Cards - Mobile Only */}
      {files && (
        <div className="lg:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Folders</p>
                  <p className="text-2xl font-bold text-gray-800">{files.directories}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Documents</p>
                  <p className="text-2xl font-bold text-gray-800">{files.files}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-800">{files.total_items}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional File List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-200 rounded-lg">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">
                {searchTerm ? `Search Results for "${searchTerm}"` : "Directory Contents"}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                {sortedItems.length} item{sortedItems.length !== 1 ? 's' : ''}
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {sortedItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-gray-100 rounded-full">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                </div>
                {searchTerm ? (
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-600">No documents found</p>
                    <p className="text-gray-500 mt-1">Try adjusting your search criteria</p>
                    <button
                      onClick={() => setSearchTerm("")}
                      className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-600">This directory is empty</p>
                    <p className="text-gray-500 mt-1">Upload some documents to get started</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Professional Table Header */}
              <div className="grid grid-cols-12 gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 mb-2">
                <div className="col-span-7 lg:col-span-6 flex items-center gap-3">
                  <div className="w-6"></div> {/* Icon space */}
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-2 font-bold text-gray-700 hover:text-blue-600 transition-colors group"
                  >
                    Name
                    <div className="text-gray-400 group-hover:text-blue-600">
                      {sortBy === "name" ? (
                        sortOrder === "asc" ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                      )}
                    </div>
                  </button>
                </div>
                <div className="col-span-2 hidden lg:block">
                  <button
                    onClick={() => handleSort("size")}
                    className="flex items-center gap-2 font-bold text-gray-700 hover:text-blue-600 transition-colors group"
                  >
                    Size
                    <div className="text-gray-400 group-hover:text-blue-600">
                      {sortBy === "size" ? (
                        sortOrder === "asc" ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                      )}
                    </div>
                  </button>
                </div>
                <div className="col-span-2 hidden lg:block">
                  <button
                    onClick={() => handleSort("modified")}
                    className="flex items-center gap-2 font-bold text-gray-700 hover:text-blue-600 transition-colors group"
                  >
                    Modified
                    <div className="text-gray-400 group-hover:text-blue-600">
                      {sortBy === "modified" ? (
                        sortOrder === "asc" ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                      )}
                    </div>
                  </button>
                </div>
                <div className="col-span-3 lg:col-span-2 text-center font-bold text-gray-700">
                  Actions
                </div>
              </div>

              {/* Professional File List Items */}
              <div className="space-y-1">
                {sortedItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-4 p-4 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group border border-transparent hover:border-blue-200"
                  >
                    {/* Icon & Name */}
                    <div className="col-span-7 lg:col-span-6 flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0">
                        {item.type === "directory" ? (
                          <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {item.type === "directory" ? (
                          <button
                            onClick={() => navigateToPath(item.path)}
                            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline truncate block transition-colors text-left"
                          >
                            {item.name}
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedFile(item)}
                            className="font-semibold text-gray-800 hover:text-blue-600 truncate block transition-colors text-left"
                          >
                            {item.name}
                          </button>
                        )}
                        {item.type === "directory" && item.children_count !== undefined && (
                          <p className="text-xs text-gray-500 mt-1">
                            {item.children_count} item{item.children_count !== 1 ? 's' : ''}
                          </p>
                        )}
                        {item.type === "file" && item.extension && (
                          <p className="text-xs text-gray-500 mt-1 uppercase">
                            {item.extension.replace('.', '')} file
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Size - Hidden on mobile */}
                    <div className="col-span-2 hidden lg:flex items-center">
                      <span className="text-sm text-gray-600 font-medium">
                        {formatFileSize(item.size)}
                      </span>
                    </div>

                    {/* Date - Hidden on mobile */}
                    <div className="col-span-2 hidden lg:flex items-center">
                      <span className="text-sm text-gray-600 font-medium">
                        {formatDate(item.modified)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-5 lg:col-span-2 flex items-center justify-end gap-2">
                      {item.type === "file" && (
                        <>
                          <button
                            onClick={() => setSelectedFile(item)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 group/btn"
                            title="View details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <a
                            href={`${API_CONFIG.BASE_URL}/download?filename=${encodeURIComponent(item.path)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all duration-200 group/btn"
                            title="Download file"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFileToDelete(item);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 group/btn"
                            title="Delete file"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                      {item.type === "directory" && (
                        <button
                          onClick={() => navigateToPath(item.path)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 group/btn"
                          title="Open folder"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* File Details Modal */}
      {selectedFile && (
        <FileDetailsModal
          file={selectedFile}
          isOpen={!!selectedFile}
          onClose={() => setSelectedFile(null)}
          onFileDeleted={() => {
            // Refresh the file list after deletion
            loadFiles(currentPath);
            setSelectedFile(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <DeleteConfirmModal
          isOpen={!!fileToDelete}
          fileName={fileToDelete.name}
          onConfirm={() => handleDeleteFile(fileToDelete)}
          onCancel={() => setFileToDelete(null)}
        />
      )}
    </div>
    </div>
  );
}