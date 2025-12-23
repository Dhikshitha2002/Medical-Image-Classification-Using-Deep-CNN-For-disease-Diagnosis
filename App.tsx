
import React, { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Page, DiagnosisResult } from './types';
import HomePage from './components/HomePage';
import UploadPage from './components/UploadPage';
import ProcessingPage from './components/ProcessingPage';
import ResultsPage from './components/ResultsPage';
import AboutModelPage from './components/AboutModelPage';
import TrainingPage from './components/TrainingPage';
import { generateDiseaseInformation, diagnoseImage } from './services/model_parameter';
import { BrainIcon } from './components/icons';

// Helper function to convert a File object to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // result is a data URL (e.g., "data:image/png;base64,iVBORw0KGgo...")
      // We need to strip the prefix
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};


const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.Training);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);

  useEffect(() => {
    // Cleanup function to revoke the object URL when the component unmounts or the URL changes
    return () => {
      if (uploadedFileUrl) {
        URL.revokeObjectURL(uploadedFileUrl);
      }
    };
  }, [uploadedFileUrl]);

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
  };

  const handleFileAnalyze = useCallback(async (file: File) => {
    // Revoke previous URL if it exists to prevent memory leaks
    if (uploadedFileUrl) {
      URL.revokeObjectURL(uploadedFileUrl);
    }
    const newFileUrl = URL.createObjectURL(file);
    setUploadedFileUrl(newFileUrl);
    setCurrentPage(Page.Processing);

    try {
      // Convert file to base64 to send to the model
      const base64Data = await fileToBase64(file);
      
      // Use Gemini to analyze the image features
      const prediction = await diagnoseImage(base64Data, file.type);
      
      // If the model can't diagnose, handle it gracefully
      if (prediction === "Not a medical image" || prediction === "Error During Analysis") {
        const result: DiagnosisResult = {
          prediction: "Analysis Failed",
          confidence: 0,
          summary: `The AI could not identify a medical condition in the provided image. This could be because it is not a recognized medical scan or due to an analysis error. Please try a different image.`,
          remedies: ["Ensure the image is a clear medical scan (e.g., X-ray, MRI, skin lesion photo)."],
          gradCamUrl: newFileUrl,
        };
        setDiagnosisResult(result);
        setCurrentPage(Page.Results);
        return;
      }
      
      const { summary, remedies } = await generateDiseaseInformation(prediction);
      const mockConfidence = Math.random() * (0.98 - 0.85) + 0.85; // Confidence remains simulated for now
      
      const result: DiagnosisResult = {
        prediction: prediction,
        confidence: mockConfidence,
        summary: summary,
        remedies: remedies,
        gradCamUrl: newFileUrl, // Use original for simulation
      };
  
      setDiagnosisResult(result);
      setCurrentPage(Page.Results);
    } catch (error) {
        console.error("Error during analysis process:", error);
        // Handle any errors during file reading or API calls
        const result: DiagnosisResult = {
          prediction: "Processing Error",
          confidence: 0,
          summary: "An unexpected error occurred while processing your image. Please check your connection and try again.",
          remedies: ["Check your internet connection.", "Try uploading the image again."],
          gradCamUrl: newFileUrl,
        };
        setDiagnosisResult(result);
        setCurrentPage(Page.Results);
    }
  }, [uploadedFileUrl]);

  const handleReset = () => {
    setUploadedFileUrl(null); // This will trigger the useEffect cleanup
    setDiagnosisResult(null);
    setCurrentPage(Page.Home);
  };

  const renderPage = () => {
    switch (currentPage) {
      case Page.Training:
        return <TrainingPage onComplete={() => navigateTo(Page.Home)} />;
      case Page.Home:
        return <HomePage onStart={() => navigateTo(Page.Upload)} />;
      case Page.Upload:
        return <UploadPage onAnalyze={handleFileAnalyze} />;
      case Page.Processing:
        return <ProcessingPage />;
      case Page.Results:
        return uploadedFileUrl && diagnosisResult && (
          <ResultsPage 
            originalImageUrl={uploadedFileUrl} 
            result={diagnosisResult} 
            onReset={handleReset}
            onShowModelInfo={() => navigateTo(Page.About)}
          />
        );
      case Page.About:
        return <AboutModelPage onBack={() => navigateTo(Page.Results)} />;
      default:
        return <TrainingPage onComplete={() => navigateTo(Page.Home)} />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 bg-neon-gradient bg-[size:400%_400%] animate-gradient-pulse overflow-hidden relative">
        {currentPage !== Page.Training && (
          <div className="absolute top-0 left-0 p-4 md:p-6 flex items-center gap-2 z-20">
              <BrainIcon className="w-8 h-8 text-cyan-300" />
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-wider">NeuroScan AI</h1>
          </div>
        )}
      <AnimatePresence mode="wait">
        {renderPage()}
      </AnimatePresence>
    </div>
  );
};

export default App;
