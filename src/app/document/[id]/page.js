"use client";

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '../../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
// Import react-pdf components
import { Document, Page, pdfjs } from 'react-pdf';
// Import CSS for react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import InteractivePanel from './InteractivePanel';
import * as Tesseract from 'tesseract.js';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

export default function DocumentPage({ params }) {
  // Unwrap params immediately
  const unwrappedParams = use(params);
  const documentId = unwrappedParams.id;
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState(null);
  const [scale, setScale] = useState(1.0); // Add state for zoom control
  const router = useRouter();
  const searchParams = useSearchParams();

  // Add state for tab management
  const [activeTab, setActiveTab] = useState('chat');
  const [generatedContent, setGeneratedContent] = useState({
    chat: true, // Chat is enabled by default
    notes: false,
    flashcards: false
  });

  // Add these new state variables for API interaction
  const [notesContent, setNotesContent] = useState('');
  const [notesError, setNotesError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  // Add state for PDF text content
  const [pdfTextContent, setPdfTextContent] = useState('');

  // Add these new state variables for flashcards
  const [flashcardsContent, setFlashcardsContent] = useState([]);
  const [flashcardsError, setFlashcardsError] = useState(null);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      
      if (!currentUser) {
        router.push('/');
      } else {
        // Either use the UID from URL params (if available) or from the current user
        const uidFromParams = searchParams.get('uid');
        const userId = uidFromParams || currentUser.uid;
        fetchDocument(documentId, userId);
      }
    });
    
    return () => unsubscribe();
  }, [documentId, router, searchParams]);

  const fetchDocument = async (documentId, userId) => {
    try {
      if (!userId) {
        throw new Error("User ID not available");
      }

      // Use the correct nested collection path
      const docRef = doc(db, `users/${userId}/documents`, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const documentData = docSnap.data();
        console.log("Document data loaded:", documentData);
        console.log("PDF URL:", documentData.fileUrl);
        setDocument(documentData);
        
        // Check if there are saved notes and set the state accordingly
        if (documentData.notes) {
          setNotesContent(documentData.notes);
          setGeneratedContent(prev => ({...prev, notes: true}));
        }
        
        // Check if there are saved flashcards and set the state accordingly
        if (documentData.flashcards && documentData.flashcards.length > 0) {
          setFlashcardsContent(documentData.flashcards);
          setGeneratedContent(prev => ({...prev, flashcards: true}));
        }
      } else {
        console.error("No such document!");
        router.push('/dashboard');
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching document: ", error);
      setLoading(false);
    }
  };

  // Function to handle when PDF document loads successfully
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPdfLoading(false);
  };

  // Function to handle PDF document load error
  const onDocumentLoadError = (error) => {
    console.error("PDF load error:", error);
    setPdfError(`Error loading PDF: ${error.message}`);
    setPdfLoading(false);
  };

  // Function to extract text content from a PDF page
  const extractTextContent = async (page) => {
    try {
      const textContent = await page.getTextContent();
      // Convert the text content items to a string
      const textItems = textContent.items.map(item => item.str);
      const text = textItems.join(' ');
      
      console.log("Extracted PDF text content:", text.substring(0, 200) + "...");

      // Update the text content with the new page text
      setPdfTextContent(prevText => {
        const updatedText = prevText + ' ' + text;
        
        // Check if the full text is too short after adding this page
        if (updatedText.length < 300) {
          console.log("Text content is too short, attempting OCR...");
          // Use OCR as a fallback when text layer doesn't provide enough text
          performOCROnPage(page).then(ocrText => {
            if (ocrText && ocrText.length > 0) {
              console.log("OCR extracted text:", ocrText.substring(0, 200) + "...");
              setPdfTextContent(prevText => prevText + ' ' + ocrText);
            }
          });
        }
        
        return updatedText;
      });
      
      return text;
    } catch (error) {
      console.error("Error extracting text content:", error);
      return '';
    }
  };

  // New function to perform OCR on a PDF page
  const performOCROnPage = async (page) => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || !window.document) {
        console.log("OCR skipped: Not in browser environment");
        return '';
      }
      
      // Convert the PDF page to an image for OCR
      const viewport = page.getViewport({ scale: 1.5 }); // Higher scale for better OCR quality
      const canvas = window.document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Render the PDF page to the canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Get the image data URL from the canvas
      const imageData = canvas.toDataURL('image/png');
      
      console.log("Starting OCR process...");
      // Use Tesseract.js to extract text from the image
      const worker = await Tesseract.createWorker('eng');
      const result = await worker.recognize(imageData);
      await worker.terminate();
      
      return result.data.text;
    } catch (error) {
      console.error("OCR error:", error);
      return '';
    }
  };

  // Function to handle when a page has been rendered
  const onPageLoadSuccess = async (page) => {
    // Extract text from the page
    await extractTextContent(page);
  };

  // Function to handle tab switching
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Add function to save notes to Firestore
  const saveNotesToFirestore = async (notes) => {
    try {
      if (!user || !document) return;
      
      const uidFromParams = searchParams.get('uid');
      const userId = uidFromParams || user.uid;
      
      const docRef = doc(db, `users/${userId}/documents`, documentId);
      await updateDoc(docRef, {
        notes: notes
      });
      
      console.log("Notes saved to Firestore");
    } catch (error) {
      console.error("Error saving notes to Firestore:", error);
    }
  };
  
  // Add function to save flashcards to Firestore
  const saveFlashcardsToFirestore = async (flashcards) => {
    try {
      if (!user || !document) return;
      
      const uidFromParams = searchParams.get('uid');
      const userId = uidFromParams || user.uid;
      
      const docRef = doc(db, `users/${userId}/documents`, documentId);
      await updateDoc(docRef, {
        flashcards: flashcards
      });
      
      console.log("Flashcards saved to Firestore");
    } catch (error) {
      console.error("Error saving flashcards to Firestore:", error);
    }
  };
  
  // Add function to delete notes from Firestore
  const deleteNotesFromFirestore = async () => {
    try {
      // Ask for confirmation before deleting
      if (!confirm('Are you sure you want to delete these notes?')) {
        return;
      }
      
      if (!user || !document) return;
      
      const uidFromParams = searchParams.get('uid');
      const userId = uidFromParams || user.uid;
      
      const docRef = doc(db, `users/${userId}/documents`, documentId);
      await updateDoc(docRef, {
        notes: null
      });
      
      // Reset notes content
      setNotesContent('');
      
      // Update UI state to show generate interface
      setGeneratedContent(prev => ({
        ...prev,
        notes: false
      }));
      
      console.log("Notes deleted from Firestore");
    } catch (error) {
      console.error("Error deleting notes from Firestore:", error);
    }
  };
  
  // Add function to delete flashcards from Firestore
  const deleteFlashcardsFromFirestore = async () => {
    try {
      // Ask for confirmation before deleting
      if (!confirm('Are you sure you want to delete these flashcards?')) {
        return;
      }
      
      if (!user || !document) return;
      
      const uidFromParams = searchParams.get('uid');
      const userId = uidFromParams || user.uid;
      
      const docRef = doc(db, `users/${userId}/documents`, documentId);
      await updateDoc(docRef, {
        flashcards: null
      });
      
      // Reset flashcards content
      setFlashcardsContent([]);
      
      // Update UI state to show generate interface
      setGeneratedContent(prev => ({
        ...prev,
        flashcards: false
      }));
      
      console.log("Flashcards deleted from Firestore");
    } catch (error) {
      console.error("Error deleting flashcards from Firestore:", error);
    }
  };

  // Update the generateContent function to save to Firestore
  const generateContent = async (contentType) => {
    if (contentType === 'notes') {
      try {
        setIsGenerating(true);
        setNotesError(null);
        
        console.log('Starting notes generation');
        
        // Use the extracted PDF text content if available, otherwise fallback to document.fileText
        const docText = pdfTextContent || document.fileText || 
                        "This is a sample document for testing note generation. " +
                        "Please upload a real document with text content for proper notes.";
        
        // Make the API call to generate notes with the correct endpoint
        const response = await fetch('/api/generate-notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentText: docText,
            customInstructions: customInstructions,
            type: 'notes'  // Specify notes type
          }),
        });
        
        console.log('API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to generate notes: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Notes generated successfully');
        setNotesContent(data.notes);
        
        // Save notes to Firestore
        await saveNotesToFirestore(data.notes);
        
        // Update UI state to show generated content
        setGeneratedContent(prev => ({
          ...prev,
          [contentType]: true
        }));
      } catch (error) {
        console.error('Error generating notes:', error);
        setNotesError(error.message || 'Failed to generate notes');
      } finally {
        setIsGenerating(false);
      }
    } else if (contentType === 'flashcards') {
      // Add flashcard generation
      try {
        setIsGenerating(true);
        setFlashcardsError(null);
        
        console.log('Starting flashcards generation');
        
        // Use the extracted PDF text content if available, otherwise fallback to document.fileText
        const docText = pdfTextContent || document.fileText || 
                        "This is a sample document for testing flashcard generation. " +
                        "Please upload a real document with text content for proper flashcards.";
        
        // Make the API call to generate flashcards
        const response = await fetch('/api/generate-notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentText: docText,
            customInstructions: customInstructions,
            type: 'flashcards'  // Specify flashcards type
          }),
        });
        
        console.log('API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          
          // Try to extract flashcards from error response if possible
          let extractedFlashcards = [];
          try {
            // Try to parse the error response as JSON
            const errorJson = JSON.parse(errorText);
            
            // Check if there's a rawResponse property
            if (errorJson.rawResponse) {
              // Try to extract JSON from the rawResponse
              const match = errorJson.rawResponse.match(/```json\s*([\s\S]*?)\s*```/);
              if (match && match[1]) {
                const parsedData = JSON.parse(match[1]);
                
                // Check for flashcards array
                if (parsedData.flashcards && Array.isArray(parsedData.flashcards)) {
                  extractedFlashcards = parsedData.flashcards;
                  console.log('Successfully extracted flashcards from error response');
                }
                
                // Check for flashcards_part_2 array and merge if needed
                if (parsedData.flashcards_part_2 && Array.isArray(parsedData.flashcards_part_2)) {
                  extractedFlashcards = [...extractedFlashcards, ...parsedData.flashcards_part_2];
                  console.log('Successfully merged flashcards_part_2');
                }
              }
            }
          } catch (parseError) {
            console.error('Failed to extract flashcards from error response:', parseError);
          }
          
          // If we successfully extracted flashcards, use them instead of throwing an error
          if (extractedFlashcards.length > 0) {
            console.log(`Successfully extracted ${extractedFlashcards.length} flashcards`);
            setFlashcardsContent(extractedFlashcards);
            await saveFlashcardsToFirestore(extractedFlashcards);
            setCurrentFlashcardIndex(0);
            setIsFlashcardFlipped(false);
            setGeneratedContent(prev => ({...prev, flashcards: true}));
            setIsGenerating(false);
            return;
          }
          
          // If we couldn't extract flashcards, throw the original error
          throw new Error(`Failed to generate flashcards: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Flashcards generated successfully:', data);
        
        if (data.flashcards && Array.isArray(data.flashcards)) {
          setFlashcardsContent(data.flashcards);
          
          // Save flashcards to Firestore
          await saveFlashcardsToFirestore(data.flashcards);
          
          // Reset flashcard display state
          setCurrentFlashcardIndex(0);
          setIsFlashcardFlipped(false);
        } else {
          throw new Error('Invalid flashcards data format');
        }
        
        // Update UI state to show generated content
        setGeneratedContent(prev => ({
          ...prev,
          [contentType]: true
        }));
      } catch (error) {
        console.error('Error generating flashcards:', error);
        setFlashcardsError(error.message || 'Failed to generate flashcards');
      } finally {
        setIsGenerating(false);
      }
    } else {
      // For other content types that don't have API implementation yet
      setGeneratedContent(prev => ({
        ...prev,
        [contentType]: true
      }));
    }
  };

  // Handle instructions change
  const handleInstructionsChange = (e) => {
    setCustomInstructions(e.target.value);
  };

  // Add zoom control functions
  const zoomIn = () => setScale(prevScale => Math.min(prevScale + 0.2, 3));
  const zoomOut = () => setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  const resetZoom = () => setScale(1.0);

  // Updated page navigation functions
  const goToPrevPage = () => setPageNumber(prevPageNumber => 
    prevPageNumber > 1 ? prevPageNumber - 1 : prevPageNumber
  );
  
  const goToNextPage = () => setPageNumber(prevPageNumber => 
    prevPageNumber < numPages ? prevPageNumber + 1 : prevPageNumber
  );

  // Function to download the PDF
  const downloadPdf = () => {
    if (document?.fileUrl) {
      const link = window.document.createElement('a');
      link.href = document.fileUrl;
      link.download = document.fileName || 'document.pdf';
      link.target = '_blank';
      link.click();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#58b595]-500"></div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col justify-center items-center min-h-[calc(100vh-64px)]">
          <h2 className="text-xl font-semibold mb-2">Document not found</h2>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-[#58b595] text-white rounded-lg"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{document.fileName}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Uploaded on {document.createdAt?.toDate ? new Date(document.createdAt.toDate()).toLocaleDateString() : 'Unknown date'}
          </p>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* Document Viewer Panel - Left Side */}
          <div className="w-full lg:w-1/2 overflow-hidden">
            <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-900/50 rounded-lg mx-auto">
              {document.fileUrl ? (
                pdfLoading ? (
                  <div className="flex flex-col justify-center items-center h-[500px] md:h-[700px] w-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#58b595]-500 mb-4"></div>
                    <p className="text-gray-500">Loading PDF viewer...</p>
                  </div>
                ) : null
              ) : (
                <div className="h-[500px] md:h-[700px] w-full flex items-center justify-center">
                  <p className="text-red-500">PDF URL not available</p>
                </div>
              )}
              
              {document.fileUrl && (
                <>
                  {/* Enhanced responsive controls */}
                  <div className="flex flex-wrap items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    {/* Page navigation controls */}
                    <div className="flex items-center space-x-2 my-1">
                      <button 
                        onClick={goToPrevPage}
                        disabled={pageNumber <= 1}
                        className={`p-2 rounded-md ${pageNumber <= 1 ? 'text-gray-400' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        aria-label="Previous page"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                      </button>
                      
                      <span className="text-sm">
                        Page {pageNumber} of {numPages || '?'}
                      </span>
                      
                      <button 
                        onClick={goToNextPage}
                        disabled={pageNumber >= numPages}
                        className={`p-2 rounded-md ${pageNumber >= numPages ? 'text-gray-400' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        aria-label="Next page"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Zoom controls */}
                    <div className="flex items-center space-x-2 my-1">
                      <button 
                        onClick={zoomOut}
                        className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                        aria-label="Zoom out"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                        </svg>
                      </button>
                      
                      <span className="text-sm">{Math.round(scale * 100)}%</span>
                      
                      <button 
                        onClick={zoomIn}
                        className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                        aria-label="Zoom in"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </button>
                      
                      <button 
                        onClick={resetZoom}
                        className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Reset
                      </button>
                    </div>
                    
                    {/* Download button */}
                    <div className="flex items-center my-1">
                      <button 
                        onClick={downloadPdf}
                        className="flex items-center px-3 py-1 text-xs bg-[#58b595] text-white rounded-md hover:bg-[#d88537]"
                        aria-label="Download PDF"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Download
                      </button>
                    </div>
                  </div>
                  
                  <div className="w-full h-[500px] md:h-[700px] border-0 overflow-auto">
                    <Document
                      file={document.fileUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      loading={
                        <div className="flex justify-center items-center h-full">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#58b595]-500"></div>
                        </div>
                      }
                      error={
                        <div className="flex justify-center items-center h-full text-red-500">
                          Failed to load PDF. Please try again.
                        </div>
                      }
                      className={`${pdfLoading ? 'hidden' : 'block'}`}
                    >
                      {/* Change to only render current page for better performance */}
                      <Page
                        pageNumber={pageNumber}
                        onLoadSuccess={onPageLoadSuccess}
                        className="mx-auto"
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        scale={scale}
                        renderZoomLayer={false}
                      />
                    </Document>
                  </div>
                </>
              )}
            </div>
            
            {/* PDF Error Message */}
            {pdfError && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">
                {pdfError}
              </div>
            )}
          </div>
          
          {/* Interactive Panel - Right Side */}
          <InteractivePanel
            document={document}
            documentId={documentId}
            activeTab={activeTab}
            generatedContent={generatedContent}
            notesContent={notesContent}
            notesError={notesError}
            flashcardsContent={flashcardsContent}
            flashcardsError={flashcardsError}
            isGenerating={isGenerating}
            customInstructions={customInstructions}
            onTabChange={handleTabChange}
            onGenerateContent={generateContent}
            onDeleteNotes={deleteNotesFromFirestore}
            onDeleteFlashcards={deleteFlashcardsFromFirestore}
            onInstructionsChange={handleInstructionsChange}
            setGeneratedContent={setGeneratedContent}
            setNotesContent={setNotesContent}
            setFlashcardsContent={setFlashcardsContent}
          />
        </div>
      </div>
    </div>
  );
}
