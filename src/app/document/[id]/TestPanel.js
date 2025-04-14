"use client";

import { useState } from 'react';
import MarkdownViewer from '@/components/MarkdownViewer';

export default function TestPanel({ questions, onBack }) {
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  
  const handleAnswerSelect = (questionIndex, answer) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };
  
  const handleSubmitClick = () => {
    const unansweredCount = questions.length - Object.keys(selectedAnswers).length;
    
    if (unansweredCount > 0) {
      setShowIncompleteWarning(true);
    } else {
      handleSubmit();
    }
  };
  
  const handleSubmit = () => {
    setShowIncompleteWarning(false);
    setShowResults(true);
  };
  
  const cancelIncompleteSubmit = () => {
    setShowIncompleteWarning(false);
  };
  
  const resetTest = () => {
    setSelectedAnswers({});
    setShowResults(false);
  };
  
  const calculateScore = () => {
    let correct = 0;
    
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correct++;
      }
    });
    
    return { 
      correct, 
      total: questions.length, 
      percentage: Math.round((correct / questions.length) * 100) 
    };
  };
  
  if (!questions || questions.length === 0) {
    return (
      <div className="text-center py-8 bg-[#fbfbf8] dark:bg-gray-800 border-2 border-[#58b595] rounded-lg p-6 sketchy-box">
        <p className="text-gray-500 dark:text-gray-400">No test questions available</p>
      </div>
    );
  }
  
  // Show results if test is completed
  if (showResults) {
    const score = calculateScore();
    
    return (
      <div className="space-y-8">
        <button 
          onClick={resetTest}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-[#58b595] dark:hover:text-[#58b595] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M3 12h18M3 12L9 6M3 12l6 6"/>
          </svg>
          Try Again
        </button>
        
        <div className="bg-gradient-to-br from-[#fbfbf8] to-[#edf7f4] dark:from-gray-800 dark:to-gray-900 p-8 rounded-lg shadow-md border-l-4 border-[#58b595]">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Test Results</h2>
          <div className="flex justify-center mb-8">
            <div className="relative w-36 h-36">
              <div className="absolute inset-0 rounded-full border-8 border-gray-200 dark:border-gray-700 transform -rotate-3"></div>
              <div className="absolute inset-0 rounded-full border-8 border-[#58b595] opacity-75 transform rotate-3" 
                   style={{ clipPath: `polygon(50% 50%, 50% 0%, ${50 + score.percentage/100 * 50}% 0%, 100% ${score.percentage}%, 100% 100%, 0% 100%, 0% ${100 - score.percentage}%)` }}>
              </div>
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                <div className="text-center transform hover:scale-105 transition-transform">
                  <span className="block text-4xl font-bold text-[#58b595]">{score.percentage}%</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{score.correct} of {score.total}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            {questions.map((question, index) => {
              const isCorrect = selectedAnswers[index] === question.correctAnswer;
              
              return (
                <div 
                  key={index} 
                  className={`p-6 rounded-lg border-2 transform transition-all duration-300 hover:rotate-0 hover:scale-[1.01] ${
                    isCorrect 
                      ? 'border-[#58b595] bg-[#edf7f4] dark:bg-[#58b595]/10' 
                      : 'border-[#e68a30] bg-[#fdf4ea] dark:bg-[#e68a30]/10'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <span className={`flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center font-bold ${
                      isCorrect ? 'bg-[#58b595]' : 'bg-[#e68a30]'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 mb-2">
                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        <MarkdownViewer
                                        content={question.question}
                                        className="text-sm prose prose-sm max-w-none dark:prose-invert"></MarkdownViewer>
                      </div>
                      
                      <div className="mt-3 pl-2">
                        {question.type === 'multiple_choice' ? (
                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div 
                                key={optionIndex} 
                                className={`p-2 rounded border ${
                                  option === question.correctAnswer 
                                    ? 'bg-[#edf7f4] border-[#58b595] dark:bg-[#58b595]/20' 
                                    : selectedAnswers[index] === option 
                                      ? 'bg-[#fdf4ea] border-[#e68a30] dark:bg-[#e68a30]/20' 
                                      : 'border-gray-200 dark:border-gray-700'
                                }`}
                              >
                                {option}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex space-x-4">
                            <div className={`p-2 rounded border ${
                              question.correctAnswer === 'True' 
                                ? 'bg-[#edf7f4] border-[#58b595] dark:bg-[#58b595]/20' 
                                : selectedAnswers[index] === 'True' 
                                  ? 'bg-[#fdf4ea] border-[#e68a30] dark:bg-[#e68a30]/20' 
                                  : 'border-gray-200 dark:border-gray-700'
                            }`}>
                              True
                            </div>
                            <div className={`p-2 rounded border ${
                              question.correctAnswer === 'False' 
                                ? 'bg-[#edf7f4] border-[#58b595] dark:bg-[#58b595]/20' 
                                : selectedAnswers[index] === 'False' 
                                  ? 'bg-[#fdf4ea] border-[#e68a30] dark:bg-[#e68a30]/20' 
                                  : 'border-gray-200 dark:border-gray-700'
                            }`}>
                              False
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm">
                          <span className="font-semibold">Explanation:</span> {question.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  
  // Show test questions
  return (
    <div className="space-y-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-[#58b595] dark:hover:text-[#58b595] transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="m12 19-7-7 7-7"></path>
          <path d="M19 12H5"></path>
        </svg>
        Back
      </button>
      
      {questions.map((question, index) => (
        <div 
          key={index}
          className="bg-gradient-to-br from-[#fbfbf8] to-[#edf7f4] dark:from-gray-800 dark:to-gray-700 p-8 rounded-lg shadow-md border-l-4 border-[#58b595]"
        >
          <div className="flex items-start space-x-4">
            <span className="flex-shrink-0 w-8 h-8 bg-[#58b595] text-white rounded-full flex items-center justify-center font-bold">
              {index + 1}
            </span>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex-1">
              <MarkdownViewer
                content={question.question}
                className="text-sm prose prose-sm max-w-none dark:prose-invert"></MarkdownViewer>
            </div>
          </div>
          
          <div className="mt-6 pl-4 sm:pl-12">
            {question.type === 'multiple_choice' ? (
              <div className="space-y-3">
                {question.options.map((option, optIndex) => (
                  <label 
                    key={optIndex} 
                    className="relative flex items-start sm:items-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer transform transition-all duration-200 hover:scale-[1.01] hover:border-[#58b595] dark:hover:border-[#58b595] group"
                  >
                    <input 
                      type="radio" 
                      name={`question-${index}`} 
                      className="mt-1 sm:mt-0 w-4 h-4 text-[#58b595] focus:ring-[#58b595] focus:ring-offset-2" 
                      value={option}
                      checked={selectedAnswers[index] === option}
                      onChange={() => handleAnswerSelect(index, option)}
                    />
                    <span 
                      className="ml-3 text-gray-800 dark:text-gray-200 group-hover:text-[#58b595] dark:group-hover:text-[#58b595] transition-colors"
                    >
                      <MarkdownViewer
                        content={option}
                        className="text-sm prose prose-sm max-w-none dark:prose-invert"></MarkdownViewer>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-6">
                <label className="relative flex-1 flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer transform transition-all duration-200 hover:scale-[1.01] hover:border-[#58b595] dark:hover:border-[#58b595] group">
                  <input 
                    type="radio" 
                    name={`question-${index}`} 
                    className="w-4 h-4 text-[#58b595] focus:ring-[#58b595] focus:ring-offset-2" 
                    value="True"
                    checked={selectedAnswers[index] === "True"}
                    onChange={() => handleAnswerSelect(index, "True")}
                  />
                  <span className="ml-3 text-gray-800 dark:text-gray-200 group-hover:text-[#58b595] dark:group-hover:text-[#58b595] transition-colors">
                    True
                  </span>
                </label>
                
                <label className="relative flex-1 flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer transform transition-all duration-200 hover:scale-[1.01] hover:border-[#58b595] dark:hover:border-[#58b595] group">
                  <input 
                    type="radio" 
                    name={`question-${index}`} 
                    className="w-4 h-4 text-[#58b595] focus:ring-[#58b595] focus:ring-offset-2" 
                    value="False"
                    checked={selectedAnswers[index] === "False"}
                    onChange={() => handleAnswerSelect(index, "False")}
                  />
                  <span className="ml-3 text-gray-800 dark:text-gray-200 group-hover:text-[#58b595] dark:group-hover:text-[#58b595] transition-colors">
                    False
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>
      ))}
      
      {/* Incomplete Warning Modal */}
      {showIncompleteWarning && (
        <div className="fixed inset-0 bg-black/[.75] bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border-l-4 border-[#e68a30] animate-fade-in">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Incomplete Test</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You have {questions.length - Object.keys(selectedAnswers).length} unanswered question(s). Are you sure you want to submit your test?
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={cancelIncompleteSubmit}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Go Back
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-[#e68a30] text-white rounded-md hover:bg-[#d67920]"
              >
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="sticky bottom-4 flex justify-center">
        <button
          onClick={handleSubmitClick}
          className="px-6 py-3 bg-[#58b595] text-white rounded-lg font-medium shadow-md hover:bg-[#e68a30] transform transition hover:scale-105 hover:rotate-1"
        >
          Submit Test
        </button>
      </div>
    </div>
  );
}