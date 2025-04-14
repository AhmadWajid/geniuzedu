"use client";
import MarkdownViewer from '@/components/MarkdownViewer';
import React from 'react';
import TestPanel from './TestPanel'; // Add import for TestPanel

// Reusable Generate Button Component
const GenerateButton = ({
  contentType,
  isGenerating,
  isExtracting,
  onClick,
  disabled
}) => {
  const buttonText = {
    notes: 'Generate Notes',
    flashcards: 'Generate Flashcards',
    test: 'Generate Test'
  };

  const buttonIcons = {
    notes: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    ),
    flashcards: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
        <line x1="6" y1="6" x2="6.01" y2="6"></line>
        <line x1="6" y1="18" x2="6.01" y2="18"></line>
      </svg>
    ),
    test: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <circle cx="12" cy="14" r="4"></circle>
        <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
      </svg>
    )
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isGenerating || isExtracting}
      className="px-4 py-2 bg-[#58b595] text-white rounded-lg hover:bg-[#e68a30] transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
    >
      {isGenerating ? (
        <>
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {`Generating ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}...`}
        </>
      ) : isExtracting ? (
        <>
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Extracting Text...
        </>
      ) : (
        <>
          {buttonIcons[contentType]}
          {buttonText[contentType]}
        </>
      )}
    </button>
  );
};

// Reusable Generation Form Component
const GenerationForm = ({
  contentType,
  customInstructions,
  onInstructionsChange,
  isGenerating,
  isExtracting,
  extractionProgress,
  onGenerateContent,
  error
}) => {
  const placeholders = {
    notes: "Add specific instructions for note generation. For example: 'Focus on key concepts and definitions' or 'Format as bullet points'.",
    flashcards: "Add specific instructions for flashcard generation. For example: 'Focus on key terms and definitions' or 'Include numerical examples'.",
    test: "E.g. 'Create a test on the first three sections only' or 'Make a challenging test with 20 questions'"
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-3">
        <label htmlFor={`${contentType}-instructions`} className="block text-sm font-medium mb-1">
          Custom Instructions (Optional)
        </label>
        <textarea
          id={`${contentType}-instructions`}
          value={customInstructions}
          onChange={onInstructionsChange}
          className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          placeholder={placeholders[contentType]}
          rows={3}
        />
      </div>
      
      {/* Show extraction status when in progress */}
      {isExtracting && (
        <div className="mb-3 p-2 sm:p-3 bg-blue-50 text-blue-700 rounded-lg">
          <div className="flex items-center">
            <div className="mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
            <span className="text-sm">Extracting document text: {extractionProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${extractionProgress}%` }}></div>
          </div>
          <p className="text-xs mt-2">Please wait for text extraction to complete before generating {contentType}.</p>
        </div>
      )}
      
      <GenerateButton
        contentType={contentType}
        isGenerating={isGenerating}
        isExtracting={isExtracting}
        onClick={() => onGenerateContent(contentType)}
      />
      
      {error && (
        <div className="mt-3 p-2 sm:p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

// Tab Components
const ChatTab = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 text-center py-4">Chat messages will appear here.</p>
        {/* Chat messages would be mapped and displayed here */}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask a question about this document..."
          className="flex-1 p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
        />
        <button className="px-4 py-2 bg-[#58b595] text-white rounded-lg hover:bg-[#e68a30] transition-colors flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          Send
        </button>
      </div>
    </div>
  );
};

const NotesTab = ({
  generatedContent,
  notesContent,
  notesError,
  isGenerating,
  isExtracting,
  extractionProgress,
  customInstructions,
  onGenerateContent,
  onInstructionsChange,
  onDeleteNotes,
  setNotesContent
}) => {
  // Check if we have actual content to display
  const hasValidContent = generatedContent.notes && notesContent && notesContent.trim().length > 0;
  
  return (
    <div className="h-full flex flex-col">
      {hasValidContent ? (
        <>
          <div className="flex-1 overflow-y-auto mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <MarkdownViewer
                content={notesContent}
                className="text-sm prose prose-sm max-w-none dark:prose-invert"></MarkdownViewer>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => onDeleteNotes()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
              Delete Notes
            </button>
          </div>
        </>
      ) : (
        <GenerationForm
          contentType="notes"
          customInstructions={customInstructions}
          onInstructionsChange={onInstructionsChange}
          isGenerating={isGenerating}
          isExtracting={isExtracting}
          extractionProgress={extractionProgress}
          onGenerateContent={onGenerateContent}
          error={notesError}
        />
      )}
    </div>
  );
};

const FlashcardsTab = ({
  generatedContent,
  flashcardsContent,
  flashcardsError,
  isGenerating,
  isExtracting,
  extractionProgress,
  customInstructions,
  onGenerateContent,
  onInstructionsChange,
  onDeleteFlashcards
}) => {
  const [currentCardIndex, setCurrentCardIndex] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [showGenerationForm, setShowGenerationForm] = React.useState(false);

  const flipCard = () => setIsFlipped(!isFlipped);
  
  const nextCard = () => {
    if (currentCardIndex < flashcardsContent.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  };
  
  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleDeleteFlashcards = () => {
    onDeleteFlashcards();
    setShowGenerationForm(true);
  };

  // Reset showGenerationForm when content changes
  React.useEffect(() => {
    if (flashcardsContent && flashcardsContent.length > 0) {
      setShowGenerationForm(false);
    }
  }, [flashcardsContent]);

  // Determine whether to show flashcards or generation form
  const hasFlashcardsContent = generatedContent.flashcards && 
                               flashcardsContent && 
                               flashcardsContent.length > 0;
  
  return (
    <div className="h-full flex flex-col">
      {hasFlashcardsContent && !showGenerationForm ? (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center mb-2">
            <div 
              className="w-full max-w-md aspect-[3/2] border-l-4 border-[#58b595] bg-white dark:bg-gray-800 rounded-lg shadow-md cursor-pointer transition-all duration-300 perspective-[1000px]"
              onClick={flipCard}
            >
              <div className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                <div className="absolute inset-0 p-3 sm:p-6 flex items-center justify-center text-center [backface-visibility:hidden]">
                  <MarkdownViewer
                    content={flashcardsContent[currentCardIndex]?.question || 'No question available'}
                    className="text-sm prose prose-sm max-w-none dark:prose-invert"></MarkdownViewer>
                </div>
                <div className="absolute inset-0 p-3 sm:p-6 flex items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <MarkdownViewer
                    content={flashcardsContent[currentCardIndex]?.answer || 'No answer available'}
                    className="text-sm prose prose-sm max-w-none dark:prose-invert"></MarkdownViewer>
                </div>
              </div>
            </div>
            <p className="mt-3 text-gray-600 dark:text-gray-400 text-sm">
              Card {currentCardIndex + 1} of {flashcardsContent.length}
            </p>
          </div>
          <div className="flex justify-between mb-3 gap-2">
            <button 
              onClick={prevCard} 
              disabled={currentCardIndex === 0}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Previous
            </button>
            <button 
              onClick={nextCard} 
              disabled={currentCardIndex === flashcardsContent.length - 1}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1 text-sm"
            >
              Next
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleDeleteFlashcards}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
              Delete Flashcards
            </button>
          </div>
        </div>
      ) : (
        <GenerationForm
          contentType="flashcards"
          customInstructions={customInstructions}
          onInstructionsChange={onInstructionsChange}
          isGenerating={isGenerating}
          isExtracting={isExtracting}
          extractionProgress={extractionProgress}
          onGenerateContent={onGenerateContent}
          error={flashcardsError}
        />
      )}
    </div>
  );
};

const InteractivePanel = ({
  document,
  documentId,
  activeTab,
  generatedContent,
  notesContent,
  notesError,
  flashcardsContent,
  flashcardsError,
  testQuestions,
  testError,
  isGenerating,
  isExtracting,
  extractionProgress,
  customInstructions,
  onTabChange,
  onGenerateContent,
  onDeleteNotes,
  onDeleteFlashcards,
  onDeleteTest,
  onInstructionsChange,
  setGeneratedContent,
  setNotesContent,
  setFlashcardsContent,
  isPanelExpanded,
  onTogglePanel
}) => {
  const toggleFullWidth = () => {
    onTogglePanel(!isPanelExpanded);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatTab />;
      case 'notes':
        return (
          <NotesTab
            generatedContent={generatedContent}
            notesContent={notesContent}
            notesError={notesError}
            isGenerating={isGenerating}
            isExtracting={isExtracting}
            extractionProgress={extractionProgress}
            customInstructions={customInstructions}
            onGenerateContent={onGenerateContent}
            onInstructionsChange={onInstructionsChange}
            onDeleteNotes={onDeleteNotes}
            setNotesContent={setNotesContent}
          />
        );
      case 'flashcards':
        return (
          <FlashcardsTab
            generatedContent={generatedContent}
            flashcardsContent={flashcardsContent}
            flashcardsError={flashcardsError}
            isGenerating={isGenerating}
            isExtracting={isExtracting}
            extractionProgress={extractionProgress}
            customInstructions={customInstructions}
            onGenerateContent={onGenerateContent}
            onInstructionsChange={onInstructionsChange}
            onDeleteFlashcards={onDeleteFlashcards}
          />
        );
      case 'test':
        if (generatedContent.test) {
          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
               
              </div>
              <TestPanel 
                questions={testQuestions} 
                onBack={() => setGeneratedContent(prev => ({...prev, test: false}))}
              />
               <button
                  onClick={onDeleteTest}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Delete Test
                </button>
            </div>
          );
        } else {
          return (
            <div className="space-y-4">
              <GenerationForm
                contentType="test"
                customInstructions={customInstructions}
                onInstructionsChange={onInstructionsChange}
                isGenerating={isGenerating}
                isExtracting={isExtracting}
                extractionProgress={extractionProgress}
                onGenerateContent={onGenerateContent}
                error={testError}
              />
            </div>
          );
        }
      default:
        return null;
    }
  };

  return (
    <div className={`transition-all duration-300 ${isPanelExpanded ? 'w-full' : 'w-full lg:w-1/2'}`}>
      <div className="bg-white dark:bg-gray-900 shadow-md border-l-4 border-[#58b595] rounded-lg p-2 sm:p-4 h-[500px] md:h-[700px] flex flex-col">
        {/* Toggle Full Width Button */}
        <div className="flex justify-end mb-1 sm:mb-2">
          <button 
            onClick={toggleFullWidth}
            className="text-gray-500 hover:text-[#58b595] transition-colors flex items-center gap-1 text-xs sm:text-sm"
          >
            {isPanelExpanded ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 14 10 14 10 20"></polyline>
                  <polyline points="20 10 14 10 14 4"></polyline>
                  <line x1="14" y1="10" x2="21" y2="3"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
                Show PDF
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
                Expand Panel
              </>
            )}
          </button>
        </div>

        {/* Document info summary with extraction status */}
        {isExtracting && (
          <div className="mb-3 p-2 sm:p-3 bg-blue-50 text-blue-700 rounded-lg">
            <div className="flex items-center">
              <div className="mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
              <span className="text-sm">Processing document: {extractionProgress}%</span>
            </div>
            <p className="text-xs mt-1">Extracting text for AI features. This will be done only once.</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${extractionProgress}%` }}></div>
            </div>
          </div>
        )}
        
        {/* Tabs - Mobile friendly with smaller text and padding */}
        <div className="flex border-b mb-2 sm:mb-4 dark:border-gray-700 overflow-x-auto">
          <button
            onClick={() => onTabChange('chat')}
            className={`px-2 sm:px-4 py-1 sm:py-2 font-medium text-sm ${
              activeTab === 'chat'
                ? 'text-[#58b595] border-b-2 border-[#58b595] dark:text-[#58b595] dark:border-[#58b595]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => onTabChange('notes')}
            className={`px-2 sm:px-4 py-1 sm:py-2 font-medium text-sm ${
              activeTab === 'notes'
                ? 'text-[#58b595] border-b-2 border-[#58b595] dark:text-[#58b595] dark:border-[#58b595]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Notes
          </button>
          <button
            onClick={() => onTabChange('flashcards')}
            className={`px-2 sm:px-4 py-1 sm:py-2 font-medium text-sm ${
              activeTab === 'flashcards'
                ? 'text-[#58b595] border-b-2 border-[#58b595] dark:text-[#58b595] dark:border-[#58b595]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => onTabChange('test')}
            className={`px-2 sm:px-4 py-1 sm:py-2 font-medium text-sm ${
              activeTab === 'test'
                ? 'text-[#58b595] border-b-2 border-[#58b595] dark:text-[#58b595] dark:border-[#58b595]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Test
          </button>
        </div>

        {/* Dynamic Content Area - Reduced padding for mobile */}
        <div className="flex-1 min-h-0 overflow-auto p-2 sm:p-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default InteractivePanel;