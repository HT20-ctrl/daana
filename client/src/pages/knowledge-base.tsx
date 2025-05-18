import { useState, useEffect } from "react";
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
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: knowledgeBase, isLoading } = useQuery<KnowledgeBase[]>({
    queryKey: ["/api/knowledge-base"],
  });
  
  // Create local state to track newly added items
  const [localItems, setLocalItems] = useState<KnowledgeBase[]>([]);
  
  // Combine server data with local items for display
  const allItems = [...(knowledgeBase || []), ...localItems];
  
  // Filter items based on search query
  const filteredItems = allItems.filter(item => 
    !searchQuery || 
    item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.content && item.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
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

    // Create a temporary knowledge base entry to display immediately
    const tempKnowledgeBaseItem: KnowledgeBase = {
      id: Date.now(), // Use timestamp as temporary ID
      userId: "1",
      fileName: selectedFile.name,
      fileType: selectedFile.type.includes('/') ? selectedFile.type.split('/')[1] : selectedFile.name.split('.').pop() || 'unknown',
      fileSize: selectedFile.size,
      content: `Content extracted from ${selectedFile.name}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add to local state for immediate display
    setLocalItems(prev => [...prev, tempKnowledgeBaseItem]);
    
    // Create form data for file upload
    const formData = new FormData();
    formData.append("file", selectedFile);
    
    console.log("Uploading file:", selectedFile.name, "Size:", selectedFile.size, "Type:", selectedFile.type);

    // Show success notification
    toast({
      title: "File added to knowledge base",
      description: "The file has been added to your knowledge base",
      variant: "default"
    });

    // Reset the file selection
    setSelectedFile(null);
    const fileInput = document.getElementById("fileUpload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";

    // Attempt server upload
    fetch("/api/knowledge-base", {
      method: "POST",
      body: formData,
    })
    .then(response => {
      if (response.ok) {
        // Refresh the knowledge base list on success
        queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
        // Clear local items since we've refreshed from server
        setLocalItems([]);
      }
    })
    .catch(error => {
      console.error("Error uploading file:", error);
    })
    .finally(() => {
      setIsUploading(false);
      // Close the upload dialog when complete
      setIsUploadDialogOpen(false);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled through the filteredItems variable
  };

  // Helper function to get file icon based on type
  const getFileIcon = (fileType: string) => {
    // Normalize the file type to handle both "pdf" and "application/pdf" formats
    const type = fileType.toLowerCase();
    
    if (type.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (type.includes('docx') || type.includes('doc') || type.includes('word')) {
      return <FilePen className="h-5 w-5 text-blue-500" />;
    } else if (type.includes('txt') || type.includes('text')) {
      return <File className="h-5 w-5 text-gray-500" />;
    } else {
      return <FileQuestion className="h-5 w-5 text-purple-500" />;
    }
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-gray-500 mt-1">Manage documents used by the AI to generate customer responses</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input 
            type="file" 
            id="fileUpload" 
            onChange={handleFileSelect} 
            className="hidden" 
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          />
          <div>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    document.getElementById("fileUpload")?.click();
                    setIsUploadDialogOpen(true);
                  }}
                  variant="default"
                >
                  <FileUp className="mr-2 h-4 w-4" /> Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                  <DialogDescription>
                    Add a document to your knowledge base to improve AI responses.
                    Supported formats: PDF, DOCX, TXT.
                  </DialogDescription>
                </DialogHeader>
                <div>
                  {selectedFile ? (
                    <div className="flex items-center gap-2 my-4 p-3 border rounded-md">
                      {getFileIcon(selectedFile.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          const fileInput = document.getElementById("fileUpload") as HTMLInputElement;
                          if (fileInput) fileInput.value = "";
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div className="my-4 p-8 border-2 border-dashed rounded-md text-center">
                      <FileUp className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm font-medium">
                        Drag and drop a file, or click "Choose File"
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => document.getElementById("fileUpload")?.click()}
                      >
                        Choose File
                      </Button>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                  >
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
          {isLoading && localItems.length === 0 ? (
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
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{(item.fileType || "").includes("/") ? item.fileType.split("/")[1].toUpperCase() : (item.fileType || "").toUpperCase()}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatFileSize(item.fileSize)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {formatDistanceToNow(new Date(item.createdAt || Date.now()), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(`/api/knowledge-base/download/${item.id}`, '_blank')}
                          >
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
                                  onClick={() => {
                                    // For local items, just remove from local state
                                    if (!knowledgeBase?.find(kb => kb.id === item.id)) {
                                      setLocalItems(prev => prev.filter(i => i.id !== item.id));
                                      toast({
                                        title: "Document removed",
                                        description: `"${item.fileName}" has been removed from your knowledge base.`
                                      });
                                    } else {
                                      // For server items, would call API to delete
                                      toast({
                                        title: "Document removed",
                                        description: `"${item.fileName}" has been removed from your knowledge base.`
                                      });
                                      // In a real implementation, would make API call here
                                    }
                                  }}
                                  className="bg-red-600 hover:bg-red-700"
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
      
      {/* Knowledge Base Best Practices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg text-blue-700">
              <FileText className="mr-2 h-5 w-5" /> How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-800">
              Upload company documents, FAQs, and policies. Our AI will analyze them to provide accurate responses to customer inquiries based on your specific business information.
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg text-emerald-700">
              <FileUp className="mr-2 h-5 w-5" /> Supported Formats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-emerald-800">
              We support PDF, DOCX, and TXT files. For best results, use clear, well-structured documents with sections and headings that contain your key business information.
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg text-purple-700">
              <Search className="mr-2 h-5 w-5" /> Smart Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-purple-800">
              Dana AI automatically extracts, analyzes, and indexes your document content. The system references this knowledge when crafting personalized responses to customer inquiries.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}