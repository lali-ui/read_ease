'use client'
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Timer, Book, Brain, Sparkles, Sun, Moon } from 'lucide-react';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import axios from 'axios';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
}

const ReadingApp = () => {
  const [currentMode, setCurrentMode] = useState('general');
  const [fontSize, setFontSize] = useState(16);
  const [lineSpacing, setLineSpacing] = useState(1.5);
  const [showFocusLine, setShowFocusLine] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [timerDuration, setTimerDuration] = useState(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerDuration);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [inputType, setInputType] = useState<'text' | 'pdf' | 'url'>('text');
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [customColor, setCustomColor] = useState<string>('#000000'); // Default color

  const modes: Record<string, { icon: React.ReactElement; name: string; style: React.CSSProperties }> = {
    dyslexia: {
      icon: <Book className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-black'}`} />,
      name: 'Dyslexia Mode',
      style: {
        fontFamily: 'Arial, sans-serif',
        backgroundColor: isDarkMode ? '#2D2D2D' : '#FFF9E6',
        letterSpacing: '0.1em',
        wordSpacing: '0.2em',
        color: isDarkMode ? '#FFFFFF' : '#000000',
      }
    },
    adhd: {
      icon: <Timer className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-black'}`} />,
      name: 'ADHD Mode',
      style: {
        backgroundColor: isDarkMode ? '#2D2D2D' : '#F0F7FF',
        color: isDarkMode ? '#FFFFFF' : '#000000',
      }
    },
    autism: {
      icon: <Brain className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-black'}`} />,
      name: 'Autism Mode',
      style: {
        backgroundColor: isDarkMode ? '#2D2D2D' : '#F5F5F5',
        padding: '2rem',
        color: isDarkMode ? '#FFFFFF' : '#000000',
      }
    },
    general: {
      icon: <Sparkles className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-black'}`} />,
      name: 'General Mode',
      style: {
        backgroundColor: isDarkMode ? '#2D2D2D' : '#FFFFFF',
        color: isDarkMode ? '#FFFFFF' : '#000000',
      }
    }
  };

  const switchMode = (direction: 'next' | 'prev') => {
    const modesList = Object.keys(modes);
    const currentIndex = modesList.indexOf(currentMode);
    let newIndex;
    
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % modesList.length;
    } else {
      newIndex = (currentIndex - 1 + modesList.length) % modesList.length;
    }
    
    setCurrentMode(modesList[newIndex]);
  };

  useEffect(() => {
    const savedSettings = localStorage.getItem('readingAppSettings');
    if (savedSettings) {
      const { mode, fontSize, lineSpacing } = JSON.parse(savedSettings);
      setCurrentMode(mode);
      setFontSize(fontSize);
      setLineSpacing(lineSpacing);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('readingAppSettings', JSON.stringify({ mode: currentMode, fontSize, lineSpacing }));
  }, [currentMode, fontSize, lineSpacing]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

  const handleStartTimer = () => {
    setTimeLeft(timerDuration);
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(timerDuration);
  };

  const handleTextToSpeech = () => {
    const utterance = new SpeechSynthesisUtterance(extractedText);
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }

    utterance.onend = () => {
      setIsSpeaking(false);
    };
  };

  // const fetchContentFromUrl = async () => {
  //   try {
  //     const response = await fetch(url);
  //     const text = await response.text();
  //     setFetchedText(text);
  //   } catch (error) {
  //     console.error('Error fetching content:', error);
  //   }
  // };

  // const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
  //   e.preventDefault();
  //   const pastedText = e.clipboardData.getData('text');
  //   setInputText(pastedText);
  //   setExtractedText(pastedText);
  // };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        extractTextFromPDF(file);
      } else {
        extractTextFromImage(file);
      }
    }
  };

  const extractTextFromPDF = async (file: File) => {
    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
        cMapPacked: true
      });
      
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .filter((item): item is TextItem => 'str' in item)
          .map(item => item.str)
          .join(' ');
        
        fullText += pageText + '\n\n';
      }
      
      if (fullText.trim()) {
        setInputText(fullText);
        setExtractedText(fullText);
      } else {
        setInputText('No text could be extracted from this PDF. The file might be scanned or protected.');
        setExtractedText('No text could be extracted from this PDF. The file might be scanned or protected.');
      }
    } catch (error) {
      console.error('PDF Processing Error:', error);
      setInputText('Error processing PDF. Please ensure the file is not corrupted or password protected.');
      setExtractedText('Error processing PDF. Please ensure the file is not corrupted or password protected.');
    } finally {
      setIsLoading(false);
    }
  };

  const extractTextFromImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setInputText('Error: File must be an image for OCR processing.');
      setExtractedText('Error: File must be an image for OCR processing.');
      return;
    }

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: m => console.log(m)
      });
      if (result.data.text) {
        setInputText(result.data.text);
        setExtractedText(result.data.text);
      } else {
        setInputText('No text could be extracted from this image.');
        setExtractedText('No text could be extracted from this image.');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      setInputText('Error processing image. Please try another file.');
      setExtractedText('Error processing image. Please try another file.');
    }
  };

  const handleUrlSubmit = async () => {
    if (!url) return;
    
    setIsLoading(true);
    try {
        const response = await axios.get(`https://app.scrapingbee.com/api/v1`, {
            params: {
                api_key: '2V9QGZVWWXRNCKSR0SL0919OUW1EGZABVB36DSTV5ZVYZ4HL23154YSU8Q1VGCG7G6DPOH7HSRYBFRX7', // Replace with your actual API key
                url: url
            }
        });
        
        // Extract and clean the scraped content
        const scrapedContent = response.data; // Assuming this contains the HTML content
        
        // Create a new DOM parser
        const parser = new DOMParser();
        const doc = parser.parseFromString(scrapedContent, 'text/html');
        
        // Remove unwanted elements
        const unwantedElements = ['script', 'style', 'header', 'footer', 'nav', 'aside'];
        unwantedElements.forEach(tag => {
            const elements = doc.getElementsByTagName(tag);
            while (elements.length > 0) {
                elements[0]?.parentNode?.removeChild(elements[0]);
            }
        });

        // Extract text content from the body
        const textContent = doc.body.innerText || ''; // Get the text content
        
        // Clean the text content to focus on main information
        const cleanedText = textContent
            .split('\n') // Split by new lines
            .filter(line => line.trim() !== '' && line.length > 20) // Remove empty lines and short lines
            .join('\n'); // Join back into a single string
        
        setExtractedText(cleanedText.trim()); // Set the cleaned text content
        setInputText(''); // Clear input text if needed
    } catch (error) {
        console.error('Error fetching URL content:', error);
        setExtractedText('Error: Could not fetch content from the provided URL. Please make sure the URL is correct and accessible.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                ReadEase
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                {isDarkMode ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-black" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            <Card className={`p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="space-y-4">
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  Reading Mode
                </h2>
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => switchMode('prev')} 
                    className="p-1 rounded hover:bg-gray-100"
                    aria-label="Previous mode"
                  >
                    <ChevronLeft className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-black'}`} />
                  </button>
                  <div className="flex items-center gap-2">
                    {modes[currentMode].icon}
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      {modes[currentMode].name}
                    </span>
                  </div>
                  <button 
                    onClick={() => switchMode('next')} 
                    className="p-1 rounded hover:bg-gray-100"
                    aria-label="Next mode"
                  >
                    <ChevronRight className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-black'}`} />
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    Font Size
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="32"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    Line Spacing
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={lineSpacing}
                    onChange={(e) => setLineSpacing(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>

              {currentMode === 'adhd' && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      Focus Line
                    </span>
                    <input
                      type="checkbox"
                      checked={showFocusLine}
                      onChange={(e) => setShowFocusLine(e.target.checked)}
                      className="rounded"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      Timer (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={timerDuration / 60}
                      onChange={(e) => setTimerDuration(Number(e.target.value) * 60)}
                      className={`w-full p-2 rounded border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'
                      }`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleStartTimer}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Start
                    </button>
                    <button 
                      onClick={handlePauseTimer}
                      className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Pause
                    </button>
                    <button 
                      onClick={handleResetTimer}
                      className="flex-1 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="text-center">
                    <span className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      {Math.floor(timeLeft / 60)}:{('0' + (timeLeft % 60)).slice(-2)}
                    </span>
                  </div>
                </div>
              )}

              {currentMode === 'dyslexia' && (
                <div className="mt-6">
                  <button 
                    onClick={handleTextToSpeech}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    {isSpeaking ? 'Stop Reading' : 'Read Aloud'}
                  </button>
                </div>
              )}
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9">
            <Card className={`overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {/* Input Type Selector */}
              <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setInputType('text')}
                    className={`p-4 rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${
                      inputType === 'text'
                        ? isDarkMode
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-700'
                        : isDarkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg">📝</span>
                    <span className="font-medium">Direct Text</span>
                  </button>

                  <button
                    onClick={() => setInputType('pdf')}
                    className={`p-4 rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${
                      inputType === 'pdf'
                        ? isDarkMode
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-700'
                        : isDarkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg">📄</span>
                    <span className="font-medium">PDF/Image</span>
                  </button>

                  <button
                    onClick={() => setInputType('url')}
                    className={`p-4 rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${
                      inputType === 'url'
                        ? isDarkMode
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-700'
                        : isDarkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg">🔗</span>
                    <span className="font-medium">URL Input</span>
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-6">
                {inputType === 'text' && (
                  <div className="space-y-4">
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={(e) => {
                        setInputText(e.target.value);
                        setExtractedText(e.target.value);
                      }}
                      onPaste={(e) => {
                        const pastedText = e.clipboardData.getData('text');
                        setInputText(pastedText);
                        setExtractedText(pastedText);
                      }}
                      placeholder="Paste or type your text here..."
                      className={`w-full h-64 p-4 rounded-lg border resize-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-black placeholder-gray-500'
                      }`}
                    />
                  </div>
                )}

                {inputType === 'pdf' && (
                  <div className="space-y-4">
                    <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
                      isDarkMode ? 'border-gray-600' : 'border-gray-300'
                    }`}>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className={`cursor-pointer flex flex-col items-center gap-3 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}
                      >
                        <span className="text-3xl">📎</span>
                        <span className="font-medium">Drop your file here or click to upload</span>
                        <span className="text-sm text-gray-500">Supports PDF and Image files</span>
                      </label>
                    </div>
                    {isLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                        <p className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Processing your file...</p>
                      </div>
                    ) : (
                      extractedText && (
                        <div className={`mt-6 p-6 rounded-lg border ${
                          isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'
                        }`}>
                          <pre className="whitespace-pre-wrap">{extractedText}</pre>
                        </div>
                      )
                    )}
                  </div>
                )}

                {inputType === 'url' && (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Enter a URL to extract text from..."
                        className={`flex-1 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 transition-all ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-black placeholder-gray-500'
                        }`}
                      />
                      <button
                        onClick={handleUrlSubmit}
                        disabled={isLoading}
                        className={`px-6 py-3 bg-blue-500 text-white rounded-lg transition-colors ${
                          isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                        }`}
                      >
                        {isLoading ? 'Extracting...' : 'Extract Text'}
                      </button>
                    </div>
                    {isLoading && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading...</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-6">
                  <div className="flex gap-4 mb-4 items-center">
                    <button 
                      onClick={() => setIsBold(!isBold)} 
                      className={`p-2 rounded border transition-colors ${isBold ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black hover:bg-gray-300'}`}
                    >
                      Bold
                    </button>
                    <button 
                      onClick={() => setIsItalic(!isItalic)} 
                      className={`p-2 rounded border transition-colors ${isItalic ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black hover:bg-gray-300'}`}
                    >
                      Italic
                    </button>
                    <button 
                      onClick={() => setIsUnderline(!isUnderline)} 
                      className={`p-2 rounded border transition-colors ${isUnderline ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black hover:bg-gray-300'}`}
                    >
                      Underline
                    </button>
                    
                    <div className="relative">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="absolute opacity-0 cursor-pointer w-full h-full"
                        title="Select text color"
                        id="color-picker"
                      />
                      <div
                        className="w-10 h-10 border rounded cursor-pointer"
                        style={{ backgroundColor: customColor }}
                        onClick={() => document.getElementById('color-picker')?.click()}
                      >
                      </div>
                    </div>
                  </div>

                  <div
                    className={`mt-6 p-6 rounded-lg border ${showFocusLine ? 'space-y-2' : ''}`}
                    style={{
                      ...modes[currentMode].style,
                    }}
                  >
                    {showFocusLine ? (
                      extractedText.split('.').map((sentence, index) => (
                        <div
                          key={index}
                          className={`py-2 hover:bg-blue-100 transition-colors cursor-pointer ${
                            isDarkMode ? 'text-white' : 'text-black'
                          }`}
                          style={{
                            fontSize: `${fontSize}px`,
                            lineHeight: lineSpacing,
                            fontWeight: isBold ? 'bold' : 'normal',
                            fontStyle: isItalic ? 'italic' : 'normal',
                            textDecoration: isUnderline ? 'underline' : 'none',
                            fontFamily: isItalic ? 'serif' : 'inherit',
                            color: customColor,
                          }}
                        >
                          {sentence.trim() + '.'}
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          fontSize: `${fontSize}px`,
                          lineHeight: lineSpacing,
                          fontWeight: isBold ? 'bold' : 'normal',
                          fontStyle: isItalic ? 'italic' : 'normal',
                          textDecoration: isUnderline ? 'underline' : 'none',
                          fontFamily: isItalic ? 'serif' : 'inherit',
                          color: customColor,
                        }}
                      >
                        {extractedText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReadingApp;