import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KnowledgeBase } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileUp, 
  FileText, 
  File, 
  FilePen,
  Search,
  Trash2,
  Download,
  Calendar,
  FileQuestion
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: knowledgeBase, isLoading } = useQuery<KnowledgeBase[]>({
    queryKey: ["/api/knowledge-base"],
  });

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
      // Create a new FormData instance
      const formData = new FormData();
      
      // Append the file with the field name that matches what the server expects
      formData.append("file", selectedFile);
      
      console.log("Uploading file:", selectedFile.name, "Size:", selectedFile.size, "Type:", selectedFile.type);

      // Send the file to the server
      const response = await fetch("/api/knowledge-base", {
        method: "POST",
        body: formData,
        // Don't set Content-Type header - the browser will set it with the boundary
        credentials: "include"
      });

      // Check if there was a network error
      if (!response) {
        throw new Error("Network error occurred during upload");
      }
      
      // Check if the response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Upload failed (${response.status}): ${errorText}`);
      }
      
      // Success response handling
      try {
        const responseData = await response.json();
        console.log("Upload successful:", responseData);
      } catch (parseError) {
        // Even if JSON parsing fails, if the status was 200, we consider it a success
        console.log("Upload appears successful despite JSON parsing issues");
      }

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

  // Helper function to get file icon based on type
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "pdf":
        return <FilePen className="h-6 w-6 text-red-500" />;
      case "docx":
        return <File className="h-6 w-6 text-blue-500" />;
      case "txt":
        return <FileText className="h-6 w-6 text-gray-500" />;
      default:
        return <FileQuestion className="h-6 w-6 text-gray-400" />;
    }
  };

  // Format file size
  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filter knowledge base items based on search
  const filteredItems = knowledgeBase?.filter(item => 
    item.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by the filter above
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    try {
      // This would typically call an API endpoint to delete the file
      toast({
        title: "File deleted",
        description: "The file has been removed from your knowledge base",
      });
      
      // Refresh the knowledge base list
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the file",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
            <p className="mt-1 text-sm text-gray-600">
              Upload documents that will be used to power AI responses with company-specific knowledge.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <FileUp className="mr-2 h-4 w-4" /> Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                  <DialogDescription>
                    Upload a PDF, DOCX, or TXT file to add to your knowledge base. 
                    This content will be used by the AI to generate relevant responses.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <input
                      id="fileUpload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      onChange={handleFileSelect}
                    />
                    <Button 
                      variant="outline" 
                      className="h-24 flex flex-col items-center justify-center"
                      onClick={() => document.getElementById("fileUpload")?.click()}
                      disabled={isUploading}
                    >
                      <FileUp className="h-8 w-8 mb-2 text-gray-400" />
                      <span>{selectedFile ? selectedFile.name : "Select file"}</span>
                    </Button>
                    {selectedFile && (
                      <p className="text-xs text-gray-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={!selectedFile || isUploading} onClick={handleUpload}>
                    {isUploading ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2"></div>
                        Uploading...
                      </>
                    ) : "Upload"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle>Document Library</CardTitle>
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search documents..."
                  className="pl-10 w-full md:w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 rounded-full border-4 border-primary-600 border-t-transparent animate-spin"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No documents found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery 
                  ? `No results found for "${searchQuery}"`
                  : "Upload documents to enhance AI responses with your company knowledge."}
              </p>
              <Button className="mt-4" onClick={() => document.getElementById("fileUpload")?.click()}>
                <FileUp className="mr-2 h-4 w-4" /> Upload Document
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getFileIcon(item.fileType)}
                          <span className="ml-2 text-sm font-medium text-gray-900">{item.fileName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.fileType.toUpperCase()}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatFileSize(item.fileSize)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{item.fileName}" from your knowledge base.
                                  The AI will no longer be able to use this information when generating responses.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>AI Knowledge Integration</CardTitle>
          <CardDescription>How your knowledge base is used to enhance AI responses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Knowledge Processing</h3>
              <p className="text-sm text-gray-600">
                When you upload documents, Dana AI extracts and processes the text to make it available
                to the AI model. This allows the AI to generate responses that include information
                specific to your business.
              </p>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Response Enhancement</h3>
              <p className="text-sm text-gray-600">
                During conversations, the AI automatically searches your knowledge base for relevant information
                and incorporates it into responses. This makes the AI's answers more accurate and consistent
                with your company's policies and information.
              </p>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Best Practices</h3>
              <p className="text-sm text-gray-600">
                For optimal results, upload documents that contain frequently asked questions, product information,
                company policies, and other content that customers commonly inquire about. Keep your knowledge base
                updated to ensure the AI has the most current information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
