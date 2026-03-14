import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Settings, Key } from 'lucide-react'

const AIKeyProvider = () => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');
  const [inputKey, setInputKey] = useState('');
  const [showModal, setShowModal] = useState(!apiKey);

  useEffect(() => {
    if (!apiKey) setShowModal(true);
  }, [apiKey]);

  const handleSave = () => {
    if (inputKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', inputKey.trim());
      setApiKey(inputKey.trim());
      setShowModal(false);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('GEMINI_API_KEY');
    setApiKey('');
    setInputKey('');
    setShowModal(true);
  };

  return (
    <>
      {/* Main App Canvas */}
      <div className={showModal ? 'blur-sm pointer-events-none' : ''}>
        <App />
      </div>

      {/* Floating Settings Button */}
      {!showModal && (
        <button 
          onClick={() => setShowModal(true)}
          className="fixed bottom-4 right-4 bg-slate-800 text-white p-3 rounded-full shadow-lg hover:bg-slate-700 transition-all z-40"
          title="Change API Key"
        >
          <Settings className="w-5 h-5" />
        </button>
      )}

      {/* API Key Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Key className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-center text-slate-900 mb-2">API Key Required</h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              This application requires an API Key to function. It will be stored securely in your browser's local storage.
            </p>
            
            <div className="space-y-4">
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Enter your API Key..."
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-mono text-sm"
              />
              
              <div className="flex gap-3">
                {apiKey && (
                  <button 
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  onClick={handleSave}
                  className="flex-[2] py-3 px-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium transition-colors"
                >
                  Save Key
                </button>
              </div>

              {apiKey && (
                 <button 
                  onClick={handleClear}
                  className="w-full py-2 text-sm text-red-600 hover:text-red-700 hover:underline mt-2"
                >
                  Clear Saved Key
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AIKeyProvider />
  </React.StrictMode>,
)