import { useState } from "react";
import API_CONFIG from "../config/api";

export default function UploadDocumentsComponent() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<"files" | "folder">("files");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
    setMessage(null);
  };

  const handleModeChange = (mode: "files" | "folder") => {
    setUploadMode(mode);
    setSelectedFiles(null);
    setMessage(null);
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setMessage("Please select files or a folder to upload.");
      return;
    }

    setIsUploading(true);
    setMessage(null);

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

      setMessage("Files uploaded successfully!");
      setSelectedFiles(null);
    } catch (error) {
      setMessage("Error uploading files.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded shadow">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Upload Mode:</label>
        <div className="flex gap-4 mb-4">
          <button
            type="button"
            onClick={() => handleModeChange("files")}
            className={`px-4 py-2 rounded ${
              uploadMode === "files"
                ? "bg-blue-600 text-white"
                : "bg-gray-200"
            }`}
          >
            Select Files
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("folder")}
            className={`px-4 py-2 rounded ${
              uploadMode === "folder"
                ? "bg-blue-600 text-white"
                : "bg-gray-200"
            }`}
          >
            Select Folder
          </button>
        </div>

        <input
          key={uploadMode} // Force re-render when mode changes
          type="file"
          multiple
          {...(uploadMode === "folder" ? { webkitdirectory: "true" } : {})}
          onChange={handleFileChange}
          className="block w-full"
        />
      </div>

      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        disabled={isUploading || !selectedFiles}
      >
        {isUploading ? "Uploading..." : "Upload"}
      </button>

      {message && (
        <div className="mt-4 text-center text-sm text-red-600">{message}</div>
      )}

      {selectedFiles && selectedFiles.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Selected Files:</h2>
          <ul className="list-disc pl-5 max-h-40 overflow-auto">
            {Array.from(selectedFiles).map((file, idx) => (
              <li key={idx}>{(file as any).webkitRelativePath || file.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}