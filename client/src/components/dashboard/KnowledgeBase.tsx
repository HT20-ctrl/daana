import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, FileText, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { KnowledgeBase as KnowledgeBaseType } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

interface KnowledgeBaseProps {
  knowledgeBase: KnowledgeBaseType[];
  isLoading: boolean;
}

export default function KnowledgeBase({ knowledgeBase = [], isLoading }: KnowledgeBaseProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    // Check file type
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"
    ];
    
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, DOCX, or TXT file",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      console.log("Starting upload process for file:", selectedFile.name);
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Using the correct API endpoint for knowledge base upload
      // Make sure the FormData contains the file with the correct field name
      console.log("Checking FormData contents:");
      for (const pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }
      
      console.log("Sending upload request to /api/knowledge-base");
      const response = await fetch("/api/knowledge-base", {
        method: "POST",
        body: formData
      });

      console.log("Response status:", response.status);
      
      let responseText = "";
      try {
        responseText = await response.text();
        console.log("Response body:", responseText);
      } catch (e) {
        console.log("Couldn't read response text");
      }

      if (!response.ok) {
        throw new Error(`Upload failed (${response.status}): ${response.statusText} - ${responseText}`);
      }

      console.log("Upload successful, refreshing knowledge base data");
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      
      toast({
        title: "Upload successful",
        description: "The file has been added to your knowledge base",
        variant: "default"
      });

      setSelectedFile(null);
      // Reset the file input
      const fileInput = document.getElementById("fileUpload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to get file icon
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "pdf":
        return <FileText className="text-red-500 text-xl mr-2" />;
      case "docx":
        return <File className="text-blue-500 text-xl mr-2" />;
      default:
        return <FileText className="text-gray-500 text-xl mr-2" />;
    }
  };

  // Helper function to format file size
  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="shadow rounded-lg animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "900ms" }}>
      <CardHeader className="px-4 py-5 sm:px-6">
        <CardTitle className="text-lg font-medium leading-6 text-gray-900">Knowledge Base</CardTitle>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">Documents powering your AI responses.</p>
      </CardHeader>
      <CardContent className="border-t border-gray-200 px-4 py-5 sm:p-6">
        <div className="mb-4">
          <input
            id="fileUpload"
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={handleFileSelect}
          />
          <Button 
            className="w-full flex justify-center items-center" 
            onClick={() => document.getElementById("fileUpload")?.click()}
            disabled={isUploading}
          >
            <FileUp className="mr-2 h-4 w-4" /> 
            {selectedFile ? selectedFile.name : "Upload New Document"}
          </Button>
          
          {selectedFile && (
            <div className="mt-2 flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={() => setSelectedFile(null)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                className="text-xs ml-2"
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin mr-1"></div>
                    Uploading...
                  </>
                ) : "Upload"}
              </Button>
            </div>
          )}
        </div>
        
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary-600 border-t-transparent animate-spin"></div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {knowledgeBase.length === 0 ? (
              <li className="py-4 text-center text-sm text-gray-500">
                No documents uploaded yet.
              </li>
            ) : (
              knowledgeBase.map((item) => (
                <li key={item.id} className="py-3 flex justify-between items-center hover:bg-gray-50 rounded-md px-2">
                  <div className="flex items-center overflow-hidden">
                    {getFileIcon(item.fileType)}
                    <span className="text-sm text-gray-900 truncate max-w-[180px]" title={item.fileName}>
                      {item.fileName}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-2">
                      {formatFileSize(item.fileSize)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(item.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{knowledgeBase.length} documents uploaded</p>
            <a href="/app/knowledge-base" className="text-sm font-medium text-primary-600 hover:text-primary-500">
              Manage all
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
