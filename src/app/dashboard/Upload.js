import { useState, useEffect, useCallback } from "react";

export default function Upload() {
    const [uploading, setUploading] = useState(false);
    const uploadFileToFirebase = async (file) => {
        if (!file || !user) return null;
    
        try {
          setUploading(true);
          setError(null);
    
          if (!user.uid) {
            throw new Error("User ID not available. Please try logging in again.");
          }
    
          const docRef = await addDoc(collection(db, `users/${user.uid}/documents`), {
            fileName: file.name,
            userId: user.uid,
            createdAt: new Date(),
            fileType: file.type,
            fileSize: file.size,
            status: 'uploading',
            lastUpdated: new Date(),
            uploadedBy: user.email || user.displayName || user.uid,
            tags: []
          }).catch(err => {
            console.error("Document creation failed:", err);
            throw new Error(`Couldn't initialize document record: ${err.message}`);
          });
    
          const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const userFolderPath = `documents/users/${user.uid}`;
          const filePath = `${userFolderPath}/${fileName}`;
          const storageRef = ref(storage, filePath);
    
          if (!filePath.includes(user.uid)) {
            throw new Error("Storage path validation failed: User ID not included in path");
          }
    
          await uploadBytes(storageRef, file).catch(err => {
            console.error("Storage upload failed:", err);
            if (err.code === 'storage/unauthorized') {
              throw new Error(`Permission denied: Check Firebase Storage rules for access to ${userFolderPath}`);
            }
            throw new Error(`File upload failed: ${err.message}`);
          });
    
          const downloadURL = await getDownloadURL(storageRef).catch(err => {
            console.error("Failed to get download URL:", err);
            throw new Error(`Couldn't get file URL: ${err.message}`);
          });
    
          const documentRef = doc(db, `users/${user.uid}/documents`, docRef.id);
          await updateDoc(documentRef, {
            fileUrl: downloadURL,
            status: 'complete',
            lastUpdated: new Date(),
            storagePath: filePath
          }).catch(err => {
            console.error("Document update failed:", err);
            throw new Error(`Couldn't update document with download URL: ${err.message}`);
          });
    
          await fetchUserDocuments(user.uid);
          router.push(`/document/${docRef.id}`);
    
        } catch (error) {
          console.error("Upload error:", error);
          setError(error.message);
          alert(`Upload failed: ${error.message}`);
        } finally {
          setUploading(false);
          setFile(null);
        }
      };
    
      const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile?.type === "application/pdf" && selectedFile.size <= 20 * 1024 * 1024) {
          setFile(selectedFile);
          await uploadFileToFirebase(selectedFile);
        } else {
          alert("Please select a PDF file under 20MB");
        }
      };
    
      const handleDrop = async (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile?.type === "application/pdf" && droppedFile.size <= 20 * 1024 * 1024) {
          setFile(droppedFile);
          await uploadFileToFirebase(droppedFile);
        } else {
          alert("Please drop a PDF file under 20MB");
        }
      };
    
      const handleDocumentClick = (documentId) => {
        if (documentId === 'empty-state' || documentId === 'error-state') return;
        router.push(`/document/${documentId}?uid=${user.uid}`);
      };
    return (
        <div className="bg-white dark:bg-gray-800 p-6 mb-8 border-2 border-[#58b595] sketchy-box relative">
          <div className="absolute -top-3 -left-2 bg-[#58b595] text-white px-4 py-1 skewed-tab transform -rotate-2">
            <h2 className="text-xl font-bold">Upload Document</h2>
          </div>


          <div className="mt-4 pt-2">
            <div 
              className="border-dashed border-2 border-gray-400 dark:border-gray-600 p-8 text-center hover:border-[#58b595] transition-colors bg-[#fbfbf8] dark:bg-gray-800 sketchy-upload-area"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-12 w-12 text-[#58b595] sketchy-icon">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                <path d="M12 12v6"></path>
                <path d="m15 15-3-3-3 3"></path>
              </svg>
              <div className="mt-6 flex flex-col items-center">
                <label className="cursor-pointer">
                  <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                  <div className="px-6 py-3 bg-[#58b595] text-white hover:bg-[#e68a30] transition-colors flex items-center gap-2 transform hover:rotate-1 hover:scale-105 sketchy-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" x2="12" y1="3" y2="15"></line>
                    </svg>
                    {uploading ? 'Uploading...' : 'Choose PDF'}
                  </div>
                </label>
               
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Maximum file size: 20MB</p>
            </div>
          </div>
        </div>
    )
}