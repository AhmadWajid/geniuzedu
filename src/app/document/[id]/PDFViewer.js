"use client";

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

export default function PDFViewer({ document, setPdfTextContent }) {
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState(null);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPdfLoading(false);
  };

  const onDocumentLoadError = (error) => {
    console.error("PDF load error:", error);
    setPdfError(`Error loading PDF: ${error.message}`);
    setPdfLoading(false);
  };

  // const extractTextContent = async (page) => {
  //   try {
  //     const textContent = await page.getTextContent();
  //     const textItems = textContent.items.map(item => item.str);
  //     const text = textItems.join(' ');
  //     setPdfTextContent(prevText => prevText + ' ' + text);
  //     return text;
  //   } catch (error) {
  //     console.error("Error extracting text content:", error);
  //     return '';
  //   }
  // };

  // const onPageLoadSuccess = async (page) => {
  //   // await extractTextContent(page);
  // };

  return (
    <div className="w-full lg:w-1/2 overflow-hidden">
      <div className="bg-white  shadow-lg  rounded-lg mx-auto">
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
          <div className="w-full h-[500px] md:h-[700px] border-0 overflow-auto">
            <Document
              file={document.fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              horizontalscrollbar={true}
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
            </Document>
          </div>
        )}
      </div>
      
      {pdfError && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">
          {pdfError}
        </div>
      )}
    </div>
  );
}