"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UploadDocumentsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the documents page
    router.replace("/admin/documents");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to Document Manager...</p>
      </div>
    </div>
  );
}