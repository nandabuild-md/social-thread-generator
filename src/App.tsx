import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Wand2, Image as ImageIcon, Download, Plus, Trash2, 
  Settings, Loader2, Sparkles, Move, ChevronRight, ChevronLeft,
  Twitter, MessageCircle, Repeat2, Heart, BarChart3,
  Palette, Type, Layout, Moon, ImagePlus
} from 'lucide-react';

// --- API & Utility Functions ---
const apiKey = ""; // Execution environment provides this

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url, options, maxRetries = 5) => {
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error?.message || 'Unknown error'}`);
      }
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`, error);
      await sleep(delay);
      delay *= 2;
    }
  }
};

const callGemini = async (prompt, systemInstruction = "", schema = null) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
  };

  if (schema) {
    payload.generationConfig = {
      responseMimeType: "application/json",
      responseSchema: schema
    };
  }

  const data = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return data.candidates?.[0]?.content?.parts?.[0]?.text;
};

const callImagen = async (promptText) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
  const data = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: { prompt: promptText }, parameters: { sampleCount: 1 } })
  });
  return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
};

// --- Constants ---
const CONTENT_FORMULAS = {
  TOFU: [
    { id: "listicle", name: "The Listicle (Mistakes/Tips)", desc: "A numbered list of common mistakes or actionable tips. Highly readable and shareable." },
    { id: "contrarian", name: "The Contrarian Take", desc: "Start with an unpopular opinion, explain why the masses are wrong, and provide the correct view." },
    { id: "hsla", name: "Hook, Story, Lesson, Application", desc: "Start with a strong hook, tell a relatable short story, extract the core lesson, and tell them how to apply it." }
  ],
  MOFU: [
    { id: "pas", name: "Problem, Agitate, Solution (PAS)", desc: "Identify a specific painful problem, agitate it by showing the consequences, then present the solution." },
    { id: "bab", name: "Before, After, Bridge (BAB)", desc: "Show the current bad situation (Before), paint the picture of the ideal situation (After), and explain how to get there (Bridge)." },
    { id: "framework", name: "Step-by-Step Framework", desc: "Break down a complex process into a simple, easy-to-follow 3 to 5 step framework." }
  ],
  BOFU: [
    { id: "aida", name: "Attention, Interest, Desire, Action", desc: "Grab attention, build interest with facts, create desire with benefits, and demand action." },
    { id: "objection", name: "Objection Crusher", desc: "Address the top reasons people don't convert, systematically dismantle them with proof, and present the offer." },
    { id: "star_story", name: "Star, Story, Solution", desc: "Introduce a 'Star' (user/client), tell their struggle (Story), and reveal how the product saved them (Solution)." }
  ]
};

// --- Components ---

// 1. Draggable Image Component
const DraggableImage = ({ src, initialPosition, onPositionChange, scale = 1 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(initialPosition || { x: 50, y: 50 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
      if (onPositionChange) onPositionChange({ x: newX, y: newY });
    }
  }, [isDragging, dragStart, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!src) return null;

  return (
    <div 
      ref={containerRef}
      className={`absolute cursor-move group z-10 ${isDragging ? 'opacity-90' : 'opacity-100'}`}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute -top-3 -left-3 bg-blue-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
        <Move size={14} />
      </div>
      <img 
        src={src} 
        alt="Draggable element" 
        className="max-w-[150px] max-h-[150px] object-contain rounded-lg shadow-lg border-2 border-transparent group-hover:border-blue-500 transition-colors"
        draggable={false}
      />
    </div>
  );
};

// 2. Main App Component
export default function App() {
  // Config State
  const [topic, setTopic] = useState("How to build a personal brand in 2026");
  const [funnelStage, setFunnelStage] = useState("TOFU");
  const [contentFormula, setContentFormula] = useState(CONTENT_FORMULAS["TOFU"][0].id);
  const [profileName, setProfileName] = useState("Creator Name");
  const [profileHandle, setProfileHandle] = useState("@creator_handle");
  const [profileImage, setProfileImage] = useState("");
  const [productImage, setProductImage] = useState("");
  
  // New Design State
  const [aspectRatio, setAspectRatio] = useState("1/1");
  const [cardTheme, setCardTheme] = useState("light");
  const [fontFamily, setFontFamily] = useState("'Inter', sans-serif");
  const [bgPrompt, setBgPrompt] = useState("");
  
  // App State
  const [slides, setSlides] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false); // New state to handle accurate html2canvas renders

  // Update formula selection if funnel stage changes
  useEffect(() => {
    setContentFormula(CONTENT_FORMULAS[funnelStage][0].id);
  }, [funnelStage]);

  // Dynamically load html2canvas for exporting
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // Dynamically inject PWA Manifest
  useEffect(() => {
    const manifest = {
      short_name: "CarouselGen",
      name: "CarouselGen - AI Social Content",
      description: "Generate viral social media carousels and Twitter threads using AI.",
      icons: [
        {
          src: "https://placehold.co/192x192/1e1e1e/4f46e5.png?text=CG",
          type: "image/png",
          sizes: "192x192",
          purpose: "any maskable"
        },
        {
          src: "https://placehold.co/512x512/1e1e1e/4f46e5.png?text=CG",
          type: "image/png",
          sizes: "512x512",
          purpose: "any maskable"
        }
      ],
      start_url: "/",
      display: "standalone",
      orientation: "portrait",
      theme_color: "#ffffff",
      background_color: "#f5f5f5"
    };
    
    const stringManifest = JSON.stringify(manifest);
    const blob = new Blob([stringManifest], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(blob);
    
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestURL;
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
      URL.revokeObjectURL(manifestURL);
    };
  }, []);

  const handleImageUpload = (e, setter) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setter(url);
    }
  };

  const enhancePrompt = async () => {
    if (!topic.trim()) return;
    setIsEnhancing(true);
    setError("");
    try {
      const funnelDescriptions = {
        TOFU: "Top of Funnel: Broad, highly viral, educational, attention-grabbing. Focus on maximum reach, shareability, raising awareness and solving general problems.",
        MOFU: "Middle of Funnel: Deeper dive, building trust. Introduce specific frameworks or concepts related to a product/solution.",
        BOFU: "Bottom of Funnel: Highly actionable, product-focused. Hard sell, focusing on benefits, overcoming objections, and conversion."
      };
      
      const selectedFormula = CONTENT_FORMULAS[funnelStage].find(f => f.id === contentFormula);
      
      const systemInstruction = `You are an expert social media strategist. Take the user's brief topic idea and expand it into a detailed, highly engaging prompt for a social media carousel. Keep it under 3 sentences. 
      Tailor the tone and focus to match this specific marketing funnel stage: ${funnelStage} (${funnelDescriptions[funnelStage]}). 
      Base the narrative structure on this Content Formula: ${selectedFormula.name} (${selectedFormula.desc}).
      CRITICAL TONE: Write in a highly human, conversational tone. Do NOT use typical AI buzzwords like 'delve', 'unlock', 'unleash', 'elevate', 'tapestry', 'demystify', or 'testament'. Keep it authentic and relatable.
      CRITICAL LANGUAGE RULE: You MUST respond in the exact same language as the user's original topic prompt. If the user writes in Indonesian, your enhancement MUST be in Indonesian.`;
      
      const enhanced = await callGemini(topic, systemInstruction);
      if (enhanced) setTopic(enhanced.trim());
    } catch (err) {
      setError("Failed to enhance prompt. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const generateCarousel = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    setIsGenerating(true);
    setError("");
    
    try {
      const funnelDescriptions = {
        TOFU: "Top of Funnel: Broad, highly viral, educational, attention-grabbing. Focus on maximum reach, shareability, raising awareness and solving general problems.",
        MOFU: "Middle of Funnel: Deeper dive, building trust. Introduce specific frameworks or concepts related to a product/solution.",
        BOFU: "Bottom of Funnel: Highly actionable, product-focused. Hard sell, focusing on benefits, overcoming objections, and conversion."
      };

      const selectedFormula = CONTENT_FORMULAS[funnelStage].find(f => f.id === contentFormula);

      const systemInstruction = `
        You are an elite social media ghostwriter specializing in viral Twitter/LinkedIn carousels.
        Create a compelling carousel based on the user's topic.
        Target Funnel Stage: ${funnelStage} (${funnelDescriptions[funnelStage]})
        Applied Content Formula: ${selectedFormula.name} (${selectedFormula.desc})
        
        RULES:
        1. Generate between 3 to 8 slides total depending on the topic's depth.
        2. Slide 1 must be a strong hook representing the beginning of the Applied Content Formula.
        3. The middle slides MUST logically flow through the steps defined in the Applied Content Formula.
        4. The FINAL slide MUST be a Call-To-Action (CTA) prompting the user to buy a product, click a link, or follow.
        5. Provide content suitable for a clean, modern aesthetic. Keep text punchy and readable (under 280 characters per slide).
        6. Indicate if a product image should be shown on the slide (always true for the final CTA slide, and perhaps 1-2 others depending on funnel stage).
        7. HUMAN TONE REQUIRED: Write like a real human practitioner. Use conversational language, varied sentence lengths, and active voice. DO NOT use typical AI cliches (e.g., "delve", "testament", "tapestry", "demystify", "unlock", "elevate", "landscape", "beacon"). Sound authentic, slightly edgy if appropriate, and highly relatable. Avoid robotic formatting.
        8. CRITICAL LANGUAGE RULE: You MUST write the carousel content in the exact same language as the user's topic. If the topic is in Indonesian, the slides MUST be in Indonesian.
      `;

      const schema = {
        type: "OBJECT",
        properties: {
          slides: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                text: { type: "STRING", description: "The core text content of the slide." },
                showProductImage: { type: "BOOLEAN", description: "Whether to overlay the product image on this slide." }
              },
              required: ["text", "showProductImage"]
            }
          }
        },
        required: ["slides"]
      };

      const responseText = await callGemini(topic, systemInstruction, schema);
      const data = JSON.parse(responseText);
      
      const newSlides = data.slides.map((s, idx) => ({
        id: crypto.randomUUID(),
        text: s.text,
        showProductImage: s.showProductImage,
        imagePos: { x: 250, y: 150 },
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        cardScale: 100,
        fontSize: 28,
        fontFamily: fontFamily,
        stats: {
          comments: String(Math.floor(Math.random() * 50) + 5),
          reposts: String(Math.floor(Math.random() * 100) + 10),
          likes: String(Math.floor(Math.random() * 500) + 50),
          views: (Math.random() * 10 + 1).toFixed(1) + 'k'
        }
      }));
      
      setSlides(newSlides);
      setCurrentSlideIndex(0);
    } catch (err) {
      setError("Failed to generate content. " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateSlideText = (id, newText) => {
    setSlides(slides.map(s => s.id === id ? { ...s, text: newText } : s));
  };

  const updateSlideImagePos = (id, newPos) => {
    setSlides(slides.map(s => s.id === id ? { ...s, imagePos: newPos } : s));
  };

  const updateSlideStat = (id, field, value) => {
    setSlides(slides.map(s => s.id === id ? { ...s, stats: { ...s.stats, [field]: value } } : s));
  };

  const updateSlideFontSize = (id, delta) => {
    setSlides(slides.map(s => {
      if (s.id === id) {
        const newSize = Math.max(12, Math.min(72, (s.fontSize || 28) + delta));
        return { ...s, fontSize: newSize };
      }
      return s;
    }));
  };

  const updateSlideScale = (id, delta) => {
    setSlides(slides.map(s => {
      if (s.id === id) {
        const newScale = Math.max(50, Math.min(150, (s.cardScale || 100) + delta));
        return { ...s, cardScale: newScale };
      }
      return s;
    }));
  };

  const updateSlideFontFamily = (id, newFont) => {
    setSlides(slides.map(s => s.id === id ? { ...s, fontFamily: newFont } : s));
  };

  const applyTextSettingsToAll = (id) => {
    const currentSlide = slides.find(s => s.id === id);
    if (!currentSlide) return;
    
    const targetScale = currentSlide.cardScale || 100;
    const targetFontSize = currentSlide.fontSize || 28;
    const targetFont = currentSlide.fontFamily || fontFamily;
    const targetBackground = currentSlide.background; // Apply background as well
    
    setSlides(slides.map(s => ({
      ...s,
      cardScale: targetScale,
      fontSize: targetFontSize,
      fontFamily: targetFont,
      background: targetBackground
    })));
  };

  const toggleSlideImage = (id) => {
    setSlides(slides.map(s => s.id === id ? { ...s, showProductImage: !s.showProductImage } : s));
  };

  const randomizeGradient = (id) => {
    const gradients = [
      'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
      'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)',
      'linear-gradient(120deg, #f6d365 0%, #fda085 100%)',
      'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(to right, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)',
      'linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)'
    ];
    const randomBg = gradients[Math.floor(Math.random() * gradients.length)];
    setSlides(slides.map(s => s.id === id ? { ...s, background: randomBg } : s));
  };

  const generateBgImage = async (id) => {
    const currentSlide = slides.find(s => s.id === id);
    let promptToUse = bgPrompt;

    // If no manual prompt, automatically contextualize it based on the slide's content
    if (!promptToUse && currentSlide) {
        promptToUse = `A clean, minimalist, high-quality, abstract background pattern suitable for presenting text. It should visually represent this concept: "${currentSlide.text.substring(0, 80)}". Do not include any words or text in the image. Use soft, non-distracting colors.`;
    }

    if (!promptToUse) {
      setError("Please add text to the slide first, or enter a manual background prompt.");
      return;
    }

    setIsGeneratingBg(true);
    setError("");
    try {
      const imageUrl = await callImagen(promptToUse);
      setSlides(slides.map(s => s.id === id ? { ...s, background: `url(${imageUrl}) center/cover` } : s));
    } catch (err) {
      setError("Failed to generate background image: " + err.message);
    } finally {
      setIsGeneratingBg(false);
    }
  };

  const deleteSlide = (id) => {
    const newSlides = slides.filter(s => s.id !== id);
    setSlides(newSlides);
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(Math.max(0, newSlides.length - 1));
    }
  };

  const addSlide = () => {
    const newSlide = {
      id: crypto.randomUUID(),
      text: "New slide content...",
      showProductImage: false,
      imagePos: { x: 250, y: 150 },
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      cardScale: 100,
      fontSize: 28,
      fontFamily: fontFamily,
      stats: { comments: '10', reposts: '25', likes: '120', views: '1.5k' }
    };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
  };

  const exportSlide = async (slideId, index) => {
    if (!window.html2canvas) {
      setError("Export library is still loading. Please try again in a moment.");
      return;
    }
    
    // Trigger export mode to swap textareas/inputs with static divs for perfect capturing
    setIsExporting(true);
    await sleep(200); // Give React time to render the static elements

    const element = document.getElementById(`slide-${slideId}`);
    if (!element) {
        setIsExporting(false);
        return;
    }
    
    try {
      const canvas = await window.html2canvas(element, { 
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: null,
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `slide-${index + 1}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export error:", err);
      setError("Failed to export slide. Check CORS issues.");
    } finally {
      setIsExporting(false); // Revert to editable state
    }
  };

  const exportAll = async () => {
    const originalIndex = currentSlideIndex;
    for (let i = 0; i < slides.length; i++) {
      setCurrentSlideIndex(i); // Navigate to the slide
      await sleep(500); // Wait for the transition and slide to mount in DOM
      await exportSlide(slides[i].id, i);
      await sleep(300); // Brief pause to prevent browser freezing between downloads
    }
    setCurrentSlideIndex(originalIndex); // Return to original position
  };

  const getRatioClasses = () => {
    switch(aspectRatio) {
      case '4/5': return 'w-[450px] aspect-[4/5]';
      case '16/9': return 'w-[750px] aspect-video';
      case '1/1':
      default: return 'w-[500px] aspect-square';
    }
  };

  // --- UI Render ---
  return (
    <div className="flex h-screen bg-neutral-100 font-sans text-neutral-900 overflow-hidden">
      
      {/* Left Sidebar: Configuration */}
      <div className="w-80 bg-white border-r border-neutral-200 flex flex-col h-full overflow-y-auto shadow-sm z-20">
        <div className="p-6 border-b border-neutral-100">
          <h1 className="text-xl font-bold flex items-center gap-2 text-neutral-800">
            <Sparkles className="text-blue-500" size={24} />
            CarouselGen
          </h1>
          <p className="text-xs text-neutral-500 mt-1">AI-Powered Social Funnels</p>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Topic Input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700 flex justify-between items-center">
              Core Topic
              <button 
                onClick={enhancePrompt} 
                disabled={isEnhancing || !topic}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
                title="Use AI to expand your prompt"
              >
                {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                Enhance
              </button>
            </label>
            <textarea
              className="w-full text-sm p-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none h-24"
              placeholder="e.g., How to build a personal brand..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          {/* Funnel Stage */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700">Funnel Stage</label>
            <select 
              className="w-full text-sm p-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              value={funnelStage}
              onChange={(e) => setFunnelStage(e.target.value)}
            >
              <option value="TOFU">Top of Funnel (Awareness)</option>
              <option value="MOFU">Middle of Funnel (Consideration)</option>
              <option value="BOFU">Bottom of Funnel (Conversion)</option>
            </select>
          </div>

          {/* Content Formula */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700">Content Formula</label>
            <select 
              className="w-full text-sm p-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              value={contentFormula}
              onChange={(e) => setContentFormula(e.target.value)}
            >
              {CONTENT_FORMULAS[funnelStage].map(formula => (
                <option key={formula.id} value={formula.id}>{formula.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-neutral-500 leading-snug">
              {CONTENT_FORMULAS[funnelStage].find(f => f.id === contentFormula)?.desc}
            </p>
          </div>

          {/* Design Settings */}
          <div className="space-y-4 pt-4 border-t border-neutral-100">
            <h3 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
              <Palette size={16} /> Design Settings
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-neutral-500 flex items-center gap-1"><Layout size={12}/> Ratio</label>
                <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full text-sm p-2 border border-neutral-200 rounded-md outline-none">
                  <option value="1/1">1:1</option>
                  <option value="4/5">4:5</option>
                  <option value="16/9">16:9</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-neutral-500 flex items-center gap-1"><Moon size={12}/> Theme</label>
                <select value={cardTheme} onChange={e => setCardTheme(e.target.value)} className="w-full text-sm p-2 border border-neutral-200 rounded-md outline-none">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-500 flex items-center gap-1"><Type size={12}/> Font Family</label>
              <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full text-sm p-2 border border-neutral-200 rounded-md outline-none">
                <option value="'Inter', sans-serif">Inter (Sans)</option>
                <option value="'Merriweather', serif">Merriweather (Serif)</option>
                <option value="'Roboto Mono', monospace">Roboto Mono</option>
                <option value="system-ui, sans-serif">System Default</option>
              </select>
            </div>
          </div>

          {/* Profile Config */}
          <div className="space-y-4 pt-4 border-t border-neutral-100">
            <h3 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
              <Settings size={16} /> Profile Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-neutral-500">Name</label>
                <input 
                  type="text" 
                  className="w-full text-sm p-2 border border-neutral-200 rounded-md outline-none" 
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-neutral-500">Handle</label>
                <input 
                  type="text" 
                  className="w-full text-sm p-2 border border-neutral-200 rounded-md outline-none" 
                  value={profileHandle}
                  onChange={(e) => setProfileHandle(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-neutral-500">Profile Image</label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0 border border-neutral-300">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      <ImageIcon size={16} />
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="text-xs w-full text-neutral-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                  onChange={(e) => handleImageUpload(e, setProfileImage)}
                />
              </div>
            </div>
          </div>

          {/* Product Image Config */}
          <div className="space-y-2 pt-4 border-t border-neutral-100">
             <h3 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
              <ImageIcon size={16} /> Product Image (Optional)
            </h3>
            <p className="text-xs text-neutral-500">Upload an image to feature in CTA slides.</p>
            <input 
              type="file" 
              accept="image/*" 
              className="text-xs w-full text-neutral-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
              onChange={(e) => handleImageUpload(e, setProductImage)}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-neutral-200 bg-neutral-50">
          <button
            onClick={generateCarousel}
            disabled={isGenerating}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex justify-center items-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
            {isGenerating ? "Generating..." : "Generate Carousel"}
          </button>
        </div>
      </div>

      {/* Right Main Area: Canvas / Editor */}
      <div className="flex-1 flex flex-col relative h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
        {slides.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
            <ImageIcon size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">No slides generated yet</p>
            <p className="text-sm">Configure your details on the left and hit generate.</p>
          </div>
        ) : (
          <>
            {/* Top Toolbar */}
            <div className="h-16 border-b border-neutral-200 bg-white/80 backdrop-blur-sm flex items-center justify-between px-8 shadow-sm z-10">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-neutral-700">
                  Slide {currentSlideIndex + 1} of {slides.length}
                </span>
                <div className="flex items-center bg-neutral-100 rounded-lg p-1">
                  <button 
                    onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                    disabled={currentSlideIndex === 0}
                    className="p-1 rounded text-neutral-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                    disabled={currentSlideIndex === slides.length - 1}
                    className="p-1 rounded text-neutral-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
              
              {/* Toolbar Background AI controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-neutral-200 rounded-md shadow-sm">
                   <input 
                     value={bgPrompt} 
                     onChange={e => setBgPrompt(e.target.value)} 
                     placeholder="Auto-generate bg (or type)..."
                     className="text-xs outline-none w-44 text-neutral-700 placeholder:text-neutral-400"
                   />
                   <button 
                     onClick={() => generateBgImage(slides[currentSlideIndex].id)} 
                     disabled={isGeneratingBg}
                     className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                     title="Generate AI Background"
                   >
                     {isGeneratingBg ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                   </button>
                </div>

                 <button
                  onClick={addSlide}
                  className="px-3 py-1.5 bg-white border border-neutral-200 text-neutral-700 text-sm rounded-md hover:bg-neutral-50 transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Plus size={16} /> Add Slide
                </button>
                <button
                  onClick={exportAll}
                  disabled={isExporting}
                  className="px-4 py-1.5 bg-neutral-900 text-white text-sm rounded-md hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
                  {isExporting ? 'Exporting...' : 'Export All'}
                </button>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start pt-12 pb-24">
              
              {/* Outer Slide Canvas Container */}
              {slides[currentSlideIndex] && (
                <div className="relative group transition-all duration-300">
                  
                  {/* Slide Controls (Floating) */}
                  <div className={`absolute -right-16 top-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 ${isExporting ? 'hidden' : ''}`}>
                      <button
                        onClick={() => randomizeGradient(slides[currentSlideIndex].id)}
                        className="p-2 bg-white rounded-full text-neutral-600 hover:bg-neutral-50 transition-colors shadow-sm border border-neutral-200"
                        title="Randomize Background Gradient"
                      >
                        <Palette size={18} />
                      </button>
                     <button
                        onClick={() => toggleSlideImage(slides[currentSlideIndex].id)}
                        className={`p-2 rounded-full shadow-sm border ${slides[currentSlideIndex].showProductImage ? 'bg-blue-100 border-blue-200 text-blue-600' : 'bg-white border-neutral-200 text-neutral-600'} hover:bg-neutral-50 transition-colors`}
                        title="Toggle Product Image"
                      >
                        <ImageIcon size={18} />
                      </button>
                      <button
                        onClick={() => deleteSlide(slides[currentSlideIndex].id)}
                        className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm border border-neutral-200"
                        title="Delete Slide"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => exportSlide(slides[currentSlideIndex].id, currentSlideIndex)}
                        className="p-2 bg-white rounded-full text-neutral-600 hover:bg-neutral-50 transition-colors shadow-sm border border-neutral-200"
                        title="Download Slide"
                      >
                        <Download size={18} />
                      </button>
                  </div>

                  {/* Text Controls (Floating Left) */}
                  <div className={`absolute -left-40 top-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 ${isExporting ? 'hidden' : ''}`}>
                    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-3 flex flex-col gap-3 w-[140px]">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider text-center flex items-center justify-center gap-1"><Layout size={12}/> Styles</p>
                      
                      {/* Font Size Controls */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[9px] text-neutral-400 uppercase font-bold">
                          <span>Text Size</span>
                          <span>{slides[currentSlideIndex].fontSize || 28}px</span>
                        </div>
                        <div className="flex bg-neutral-100 rounded-lg p-0.5 mb-1">
                          <button 
                            onClick={() => updateSlideFontSize(slides[currentSlideIndex].id, -2)} 
                            className="flex-1 p-1 hover:bg-white rounded-md text-neutral-700 font-bold text-sm shadow-sm transition-all"
                            title="Decrease Font Size"
                          >A-</button>
                          <button 
                            onClick={() => updateSlideFontSize(slides[currentSlideIndex].id, 2)} 
                            className="flex-1 p-1 hover:bg-white rounded-md text-neutral-700 font-bold text-sm shadow-sm transition-all"
                            title="Increase Font Size"
                          >A+</button>
                        </div>
                        <input 
                          type="range" 
                          min="12" 
                          max="72" 
                          value={slides[currentSlideIndex].fontSize || 28} 
                          onChange={(e) => {
                            setSlides(slides.map(s => s.id === slides[currentSlideIndex].id ? { ...s, fontSize: parseInt(e.target.value) } : s));
                          }}
                          className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-600"
                        />
                      </div>

                      <hr className="border-neutral-100" />

                      {/* Card Scale Controls */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[9px] text-neutral-400 uppercase font-bold">
                          <span>Card Scale</span>
                          <span>{slides[currentSlideIndex].cardScale || 100}%</span>
                        </div>
                        <div className="flex bg-neutral-100 rounded-lg p-0.5 mb-1">
                          <button 
                            onClick={() => updateSlideScale(slides[currentSlideIndex].id, -5)} 
                            className="flex-1 p-1 hover:bg-white rounded-md text-neutral-700 font-bold text-sm shadow-sm transition-all"
                            title="Decrease Card Scale"
                          >-</button>
                          <button 
                            onClick={() => updateSlideScale(slides[currentSlideIndex].id, 5)} 
                            className="flex-1 p-1 hover:bg-white rounded-md text-neutral-700 font-bold text-sm shadow-sm transition-all"
                            title="Increase Card Scale"
                          >+</button>
                        </div>
                        <input 
                          type="range" 
                          min="50" 
                          max="150" 
                          value={slides[currentSlideIndex].cardScale || 100} 
                          onChange={(e) => {
                            setSlides(slides.map(s => s.id === slides[currentSlideIndex].id ? { ...s, cardScale: parseInt(e.target.value) } : s));
                          }}
                          className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-600"
                        />
                      </div>
                      
                      <hr className="border-neutral-100" />

                      <select 
                        className="w-full text-[11px] p-1.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 hover:bg-white cursor-pointer"
                        value={slides[currentSlideIndex].fontFamily || fontFamily}
                        onChange={(e) => updateSlideFontFamily(slides[currentSlideIndex].id, e.target.value)}
                      >
                        <option value="'Inter', sans-serif">Inter</option>
                        <option value="'Merriweather', serif">Merriweather</option>
                        <option value="'Roboto Mono', monospace">Roboto Mono</option>
                        <option value="system-ui, sans-serif">System Default</option>
                      </select>

                      <button 
                        onClick={() => applyTextSettingsToAll(slides[currentSlideIndex].id)}
                        className="w-full text-[10px] font-semibold py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-md transition-colors shadow-sm"
                        title="Apply background, scale, font size, and font to all slides"
                      >
                        Apply to All
                      </button>
                    </div>
                  </div>

                  {/* The Exportable Canvas Wrapper */}
                  <div 
                    id={`slide-${slides[currentSlideIndex].id}`}
                    className={`${getRatioClasses()} rounded-sm shadow-xl flex items-center justify-center relative overflow-hidden transition-all`}
                    style={{ background: slides[currentSlideIndex].background, fontFamily: slides[currentSlideIndex].fontFamily || fontFamily }}
                  >
                    
                    {/* Draggable Product Image Overlay */}
                    {slides[currentSlideIndex].showProductImage && productImage && (
                      <DraggableImage 
                        src={productImage}
                        initialPosition={slides[currentSlideIndex].imagePos}
                        onPositionChange={(pos) => updateSlideImagePos(slides[currentSlideIndex].id, pos)}
                      />
                    )}

                    {/* Placeholder if toggle is on but no image uploaded */}
                    {slides[currentSlideIndex].showProductImage && !productImage && !isExporting && (
                       <div className="absolute inset-0 m-auto w-40 h-40 border-2 border-dashed border-neutral-800/30 rounded-xl flex flex-col items-center justify-center text-neutral-600 bg-white/50 backdrop-blur-sm z-10 pointer-events-none">
                         <ImageIcon size={32} className="mb-2" />
                         <span className="text-xs font-medium text-center px-4">Upload Product Image</span>
                       </div>
                    )}

                    {/* Inner Twitter Card - Dynamic Height & Scaled via CSS Transform */}
                    <div 
                      className={`w-[85%] max-w-full rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-8 flex flex-col relative z-10 ${cardTheme === 'dark' ? 'bg-[#181818] text-neutral-100 border border-neutral-800' : 'bg-white text-neutral-900 border border-neutral-100'}`}
                      style={{ 
                        transform: `scale(${(slides[currentSlideIndex].cardScale || 100) / 100})`, 
                        transformOrigin: 'center center' 
                      }}
                    >
                      
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          {/* Hardcoded min sizes fix html2canvas aspect-ratio squishing */}
                          <div style={{ minWidth: '48px', minHeight: '48px' }} className="w-12 h-12 rounded-full bg-neutral-200 overflow-hidden border border-neutral-100 flex-shrink-0">
                             {profileImage ? (
                              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" crossOrigin="anonymous" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-tr from-blue-100 to-blue-50" />
                            )}
                          </div>
                          <div>
                            <h3 className={`font-bold leading-tight ${cardTheme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>{profileName || "Name"}</h3>
                            <p className={`text-sm leading-tight ${cardTheme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}`}>{profileHandle || "@handle"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Body Content - Swaps to a static div during export to prevent textarea cropping in html2canvas */}
                      <div className="flex flex-col justify-center w-full">
                        {isExporting ? (
                          <div 
                            style={{ 
                              fontSize: `${slides[currentSlideIndex].fontSize || 28}px`,
                              whiteSpace: 'pre-wrap', 
                              wordBreak: 'break-word' 
                            }}
                            className={`w-full font-medium leading-snug overflow-hidden ${cardTheme === 'dark' ? 'text-white' : 'text-neutral-800'}`}
                          >
                            {slides[currentSlideIndex].text}
                          </div>
                        ) : (
                          <textarea
                            ref={(el) => {
                              if (el) {
                                el.style.height = 'auto';
                                el.style.height = el.scrollHeight + 'px';
                              }
                            }}
                            style={{ fontSize: `${slides[currentSlideIndex].fontSize || 28}px` }}
                            className={`w-full font-medium leading-snug resize-none outline-none bg-transparent overflow-hidden break-words whitespace-pre-wrap ${cardTheme === 'dark' ? 'text-white' : 'text-neutral-800'}`}
                            value={slides[currentSlideIndex].text}
                            onChange={(e) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                              updateSlideText(slides[currentSlideIndex].id, e.target.value);
                            }}
                            placeholder="Write your brilliant thought here..."
                            rows={1}
                          />
                        )}
                      </div>

                      {/* Footer (Editable Stats) */}
                      <div className={`mt-6 pt-4 border-t flex items-center justify-between text-sm px-2 ${cardTheme === 'dark' ? 'border-neutral-800 text-neutral-400' : 'border-neutral-100 text-neutral-500'}`}>
                        <div className="flex items-center gap-6">
                          <span className="flex items-center gap-1.5">
                            <MessageCircle size={18} /> 
                            {isExporting ? (
                              <span className="w-8">{slides[currentSlideIndex].stats.comments}</span>
                            ) : (
                              <input 
                                value={slides[currentSlideIndex].stats.comments} 
                                onChange={e => updateSlideStat(slides[currentSlideIndex].id, 'comments', e.target.value)}
                                className="w-8 bg-transparent outline-none focus:border-b border-neutral-400 hover:text-blue-500 transition-colors"
                              />
                            )}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Repeat2 size={18} />
                            {isExporting ? (
                              <span className="w-8">{slides[currentSlideIndex].stats.reposts}</span>
                            ) : (
                              <input 
                                value={slides[currentSlideIndex].stats.reposts} 
                                onChange={e => updateSlideStat(slides[currentSlideIndex].id, 'reposts', e.target.value)}
                                className="w-8 bg-transparent outline-none focus:border-b border-neutral-400 hover:text-green-500 transition-colors"
                              />
                            )}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Heart size={18} />
                            {isExporting ? (
                              <span className="w-10">{slides[currentSlideIndex].stats.likes}</span>
                            ) : (
                              <input 
                                value={slides[currentSlideIndex].stats.likes} 
                                onChange={e => updateSlideStat(slides[currentSlideIndex].id, 'likes', e.target.value)}
                                className="w-10 bg-transparent outline-none focus:border-b border-neutral-400 hover:text-red-500 transition-colors"
                              />
                            )}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <BarChart3 size={18} />
                            {isExporting ? (
                              <span className="w-10">{slides[currentSlideIndex].stats.views}</span>
                            ) : (
                              <input 
                                value={slides[currentSlideIndex].stats.views} 
                                onChange={e => updateSlideStat(slides[currentSlideIndex].id, 'views', e.target.value)}
                                className="w-10 bg-transparent outline-none focus:border-b border-neutral-400 hover:text-blue-400 transition-colors"
                              />
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Indicator dots */}
                  <div className={`flex justify-center gap-2 mt-6 ${isExporting ? 'hidden' : ''}`}>
                    {slides.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${idx === currentSlideIndex ? 'bg-neutral-800 w-4' : 'bg-neutral-300 hover:bg-neutral-400'}`}
                      />
                    ))}
                  </div>

                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}