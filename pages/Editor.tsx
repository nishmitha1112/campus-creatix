import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';import { User } from '../types';
import { Button, Input } from '../components/Common';
import { 
  ArrowLeft, Plus, Trash2, Save, Share2, 
  Check, Layers, Move, Instagram, Download, MessageCircle, X
} from 'lucide-react';
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp,updateDoc, } from "firebase/firestore";
import { getDocs, query, where } from "firebase/firestore";

// --- TYPES ---
interface TextElement {
  id: string;
  type: 'name' | 'branch' | 'role' | 'custom';
  text: string;
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)
  fontSize: number; // Base pixel size
  fontFamily: string;
  textColor: string;
  backgroundColor: string; // Hex or 'transparent'
}

const FONTS = [
  'Inter', 
  'Poppins', 
  'Oswald', 
  'Montserrat', 
  'Roboto', 
  'Playfair Display',
  'Lato', 
  'Merriweather', 
  'Open Sans'
];

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#1F2937', '#4B5563', '#9CA3AF', 
  '#DC2626', '#EA580C', '#D97706', '#65A30D', '#16A34A', 
  '#059669', '#0891B2', '#2563EB', '#4F46E5', '#7C3AED', 
  '#DB2777', '#E11D48', '#5B5FEF', '#D8D9F7', '#FBBF24'
];

const DEFAULT_BG = 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1200&auto=format&fit=crop';
const CANVAS_BASE_WIDTH = 800;

// --- COLOR MATH HELPERS ---
const hexToRgb = (hex: string) => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const rgbToHsv = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToRgb = (h: number, s: number, v: number) => {
  let r, g, b;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = (v / 100) * (1 - s / 100);
  const q = (v / 100) * (1 - (s / 100) * f);
  const t = (v / 100) * (1 - (s / 100) * (1 - f));
  const val = v / 100;
  
  switch (i % 6) {
    case 0: r = val; g = t; b = p; break;
    case 1: r = q; g = val; b = p; break;
    case 2: r = p; g = val; b = t; break;
    case 3: r = p; g = q; b = val; break;
    case 4: r = t; g = p; b = val; break;
    case 5: r = val; g = p; b = q; break;
    default: r = 0; g = 0; b = 0;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

const Editor: React.FC<{ user: User }> = ({ user }) => {
  const [isLoading, setIsLoading] = useState(true);
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
const passedImage = location.state?.imageUrl;
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragItem = useRef<{ id: string; startX: number; startY: number; initX: number; initY: number } | null>(null);
  const satRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  // State
  const [elements, setElements] = useState<TextElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
const [posterImage, setPosterImage] = useState<string | null>(passedImage || null);  
  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Color Picker State
  const [recentColors, setRecentColors] = useState<string[]>([]);
  // Simplified config: only need open state and prop, positioning is now CSS-based
  const [pickerConfig, setPickerConfig] = useState<{
    isOpen: boolean;
    prop: 'textColor' | 'backgroundColor' | null;
  }>({ isOpen: false, prop: null });

  const [hsv, setHsv] = useState({ h: 0, s: 0, v: 100 });
  const [isDragging, setIsDragging] = useState<'sat' | 'hue' | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const savedLayout = localStorage.getItem(`campusCreatix_layout_${postId}`);
    if (savedLayout) {
      const parsed = JSON.parse(savedLayout);
      const migrated = parsed.map((el: any) => ({
          ...el,
          textColor: el.textColor || el.color || '#ffffff', 
          backgroundColor: el.backgroundColor || 'transparent'
      }));
      setElements(migrated);
    } else {
      const defaults: TextElement[] = [
        {
          id: 'name', type: 'name', text: `Dr. ${user.displayName}`,
          x: 5, y: 80, fontSize: 32, fontFamily: 'Inter',
          textColor: '#ffffff', backgroundColor: 'transparent'
        },
        {
          id: 'branch', type: 'branch', text: user.department || 'Department',
          x: 5, y: 86, fontSize: 24, fontFamily: 'Inter',
          textColor: '#e5e7eb', backgroundColor: 'transparent'
        },
        {
          id: 'role', type: 'role', text: user.position || 'Faculty',
          x: 5, y: 91, fontSize: 18, fontFamily: 'Inter',
          textColor: '#d1d5db', backgroundColor: 'transparent'
        }
      ];
      setElements(defaults);
    }
  }, [postId, user]);
  // --- LOAD POSTER IMAGE FROM FIRESTORE ---
useEffect(() => {

  // If image already came from Feed, don't fetch again
  if (passedImage) return;

  const loadPoster = async () => {

    if (!postId) return;

    const ref = doc(db, "creatives", postId);

    const snap = await getDoc(ref);

    if (snap.exists()) {

      const data: any = snap.data();

      setPosterImage(data.imageUrl);
    }
  };
  loadPoster();

}, [postId, passedImage]);

  // --- DRAG HANDLERS ---
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    if (!containerRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const el = elements.find(item => item.id === id);
    if (!el) return;
    setSelectedId(id);
    dragItem.current = { id, startX: clientX, startY: clientY, initX: el.x, initY: el.y };
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!dragItem.current || !containerRef.current) return;
    e.preventDefault(); 
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const deltaXPercent = ((clientX - dragItem.current.startX) / width) * 100;
    const deltaYPercent = ((clientY - dragItem.current.startY) / height) * 100;
    const newX = Math.min(100, Math.max(0, dragItem.current.initX + deltaXPercent));
    const newY = Math.min(100, Math.max(0, dragItem.current.initY + deltaYPercent));
    setElements(prev => prev.map(el => el.id === dragItem.current!.id ? { ...el, x: newX, y: newY } : el));
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
  };

  // --- LAYER MANAGEMENT ---
  const handleAddText = () => {
    const newId = `custom_${Date.now()}`;
    const newEl: TextElement = {
      id: newId, type: 'custom', 
      text: '', // Start empty so it's invisible on canvas until typed
      x: 50, y: 50, fontSize: 24, fontFamily: 'Inter',
      textColor: '#000000', backgroundColor: 'transparent'
    };
    setElements([...elements, newEl]);
    setSelectedId(newId);
  };

  const updateSelected = (key: keyof TextElement, value: any) => {
    if (!selectedId) return;
    setElements(prev => prev.map(el => el.id === selectedId ? { ...el, [key]: value } : el));
  };

  const handleDelete = () => {
    if (!selectedId) return;
    setElements(prev => prev.filter(el => el.id !== selectedId));
    setSelectedId(null);
  };

  const selectedElement = elements.find(e => e.id === selectedId);

  // --- COLOR PICKER LOGIC ---
  const openColorPicker = (e: React.MouseEvent, prop: 'textColor' | 'backgroundColor') => {
    e.stopPropagation();
    
    // Set Open State - No coordinate calculation needed
    setPickerConfig({ isOpen: true, prop });

    // Initialize HSV
    const currentHex = selectedElement ? selectedElement[prop] : '#000000';
    if (currentHex !== 'transparent') {
      const rgb = hexToRgb(currentHex);
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
    } else {
      setHsv({ h: 0, s: 0, v: 100 });
    }
  };

  const applyColor = (hex: string, addToRecent = false) => {
    if (pickerConfig.prop) {
      updateSelected(pickerConfig.prop, hex);
      if (addToRecent && hex !== 'transparent' && !recentColors.includes(hex)) {
        setRecentColors(prev => [hex, ...prev].slice(0, 5));
      }
    }
  };

  const handleSaturationChange = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!satRef.current) return;
    const rect = satRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
    const y = Math.min(Math.max(0, e.clientY - rect.top), rect.height);
    const s = (x / rect.width) * 100;
    const v = 100 - (y / rect.height) * 100;
    setHsv(prev => {
        const newHsv = { ...prev, s, v };
        const rgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
        applyColor(rgbToHex(rgb.r, rgb.g, rgb.b));
        return newHsv;
    });
  }, [pickerConfig.prop, selectedId]);

  const handleHueChange = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
    const h = (x / rect.width) * 360;
    setHsv(prev => {
        const newHsv = { ...prev, h };
        const rgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
        applyColor(rgbToHex(rgb.r, rgb.g, rgb.b));
        return newHsv;
    });
  }, [pickerConfig.prop, selectedId]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging === 'sat') handleSaturationChange(e);
      if (isDragging === 'hue') handleHueChange(e);
    };
    const onMouseUp = () => {
        if(isDragging) {
             const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
             applyColor(rgbToHex(rgb.r, rgb.g, rgb.b), true);
        }
        setIsDragging(null);
    };
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, handleSaturationChange, handleHueChange, hsv]);

  // --- SAVE & SHARE HELPERS ---
  const generateGhostCanvas = (): Promise<string> => {
    return new Promise<string>((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(''); return; }
      const img = new Image();
      img.crossOrigin = "anonymous";
     img.src = posterImage || DEFAULT_BG;
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        elements.forEach(el => {
          if (!el.text || !el.text.trim()) return;
          const scale = canvas.width / CANVAS_BASE_WIDTH;
          const x = (el.x / 100) * canvas.width;
          const y = (el.y / 100) * canvas.height;
          const fontSize = el.fontSize * scale;
          ctx.font = `${fontSize}px ${el.fontFamily}`;
          ctx.textBaseline = 'top';
          const padding = (el.backgroundColor && el.backgroundColor !== 'transparent') ? (fontSize * 0.4) : 0;
          const textWidth = ctx.measureText(el.text).width;
          const textHeight = fontSize * 1.2;
          if (el.backgroundColor && el.backgroundColor !== 'transparent') {
            ctx.fillStyle = el.backgroundColor;
            ctx.fillRect(x, y, textWidth + (padding * 2), textHeight + (padding * 2));
          }
          ctx.fillStyle = el.textColor;
          ctx.fillText(el.text, x + padding, y + padding);
        });
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve('');
    });
  };
const handleSave = async () => {

  try {

    const generatedImage = await generateGhostCanvas();

    const q = query(
      collection(db, "savedPosters"),
      where("posterId", "==", postId),
      where("facultyId", "==", user.uid)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {

      const docId = snapshot.docs[0].id;

      await updateDoc(doc(db, "savedPosters", docId), {
        imageUrl: generatedImage,
        savedAt: serverTimestamp()
      });

    } else {

      await addDoc(collection(db, "savedPosters"), {
        posterId: postId,
        title: `Poster ${new Date().toLocaleDateString()}`,
        imageUrl: generatedImage,
        facultyId: user.uid,
        savedAt: serverTimestamp()
      });
    }
    setToastMessage("Poster saved");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);

  } catch (error) {

    console.error("Save failed", error);

  }

};


  const handleShare = async () => {
    setIsGenerating(true);
    try {
        const dataUrl = await generateGhostCanvas();
        if (!dataUrl) throw new Error("Failed to generate image");

        // Save progress for tracking
       
        // Open Modal
        setGeneratedImage(dataUrl);
        setIsShareModalOpen(true);

    } catch (e) {
        console.error("Share failed", e);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSocialShare = async (platform: 'whatsapp' | 'instagram' | 'download') => {
      if (!generatedImage) return;

      const blob = await (await fetch(generatedImage)).blob();
      const file = new File([blob], 'poster.png', { type: 'image/png' });

      if (platform === 'download') {
          const link = document.createElement('a');
          link.download = `campus-creatix-${Date.now()}.png`;
          link.href = generatedImage;
          link.click();
          setToastMessage("Image downloaded");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
          return;
      }

      // Native Share if supported (Best for Mobile WhatsApp/Instagram)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
           try {
               await navigator.share({
                   files: [file],
                   title: 'CampusCreatix Poster',
                   text: 'Check out my new poster!'
               });
           } catch (e) {
               console.log('Share cancelled or failed', e);
           }
      } else {
          // Fallbacks for Desktop / Unsupported Browsers
          if (platform === 'whatsapp') {
             const link = document.createElement('a');
             link.download = `campus-creatix-${Date.now()}.png`;
             link.href = generatedImage;
             link.click();
             window.open(`https://wa.me/?text=${encodeURIComponent('Check out my new poster!')}`, '_blank');
          } else {
             const link = document.createElement('a');
             link.download = `campus-creatix-${Date.now()}.png`;
             link.href = generatedImage;
             link.click();
             alert("Image downloaded. You can now upload it to Instagram.");
          }
      }
  };
  // --- RENDERERS ---
  const renderColorPanel = () => {
    if (!pickerConfig.isOpen) return null;
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    const currentVal = selectedElement ? selectedElement[pickerConfig.prop!] : '#000000';
    if (isLoading) {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Loading Editor...</p>
      </div>
    </div>
  );
}
  return (
      <>
        {/* Transparent Overlay for clicking outside */}
        <div className="fixed inset-0 z-30 bg-transparent" onClick={() => setPickerConfig({ ...pickerConfig, isOpen: false })}></div>
        
        {/* The Panel - Anchored to Bottom of Control Panel Content Area */}
        <div 
            className="absolute bottom-[84px] left-0 right-0 z-40 bg-white border-t border-[var(--border-default)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex flex-col animate-in slide-in-from-bottom-5 duration-200"
            style={{ maxHeight: 'calc(100% - 84px)' }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex flex-col h-full overflow-hidden">
                {/* Top Section: Presets (Compact Grid) */}
                <div className="p-4 border-b border-[var(--border-default)] bg-gray-50 shrink-0">
                    <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Presets</h4>
                    <div className="flex flex-wrap gap-2">
                         {pickerConfig.prop === 'backgroundColor' && (
                            <button
                                onClick={() => { applyColor('transparent'); setPickerConfig(prev => ({...prev, isOpen: false})); }}
                                className="w-6 h-6 rounded border border-[var(--border-default)] relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/checkerboard-white.png')] hover:scale-110 transition-transform"
                                title="Transparent"
                            >
                                <div className="absolute inset-0 flex items-center justify-center text-red-500 font-bold text-[10px]">/</div>
                            </button>
                        )}
                        {PRESET_COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => { applyColor(c, true); setPickerConfig(prev => ({...prev, isOpen: false})); }}
                                className="w-6 h-6 rounded border border-[var(--border-default)] shadow-sm hover:scale-110 transition-transform relative"
                                style={{ backgroundColor: c }}
                            >
                                {currentVal === c && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Check size={12} className={['#FFFFFF', '#D8D9F7', '#FBBF24'].includes(c) ? 'text-black' : 'text-white'} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    {recentColors.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                             <div className="flex flex-wrap gap-2">
                                {recentColors.map((c, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { applyColor(c); setPickerConfig(prev => ({...prev, isOpen: false})); }}
                                        className="w-6 h-6 rounded border border-[var(--border-default)] shadow-sm hover:scale-110 transition-transform"
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                             </div>
                        </div>
                    )}
                </div>

                {/* Bottom Section: Advanced */}
                <div className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-end">
                       <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Custom</h4>
                       <span className="text-[10px] font-mono text-[var(--text-muted)]">{hex}</span>
                    </div>

                    {/* Saturation Box */}
                    <div 
                        ref={satRef}
                        className="w-full h-28 rounded-lg cursor-crosshair relative shadow-inner ring-1 ring-black/5"
                        style={{ 
                            backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
                            backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)'
                        }}
                        onMouseDown={(e) => { setIsDragging('sat'); handleSaturationChange(e); }}
                    >
                        <div 
                            className="w-3 h-3 rounded-full border border-white shadow-md absolute -ml-1.5 -mt-1.5 pointer-events-none"
                            style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, backgroundColor: hex }}
                        ></div>
                    </div>

                    {/* Hue Slider */}
                    <div 
                        ref={hueRef}
                        className="w-full h-3 rounded-full cursor-pointer relative shadow-inner ring-1 ring-black/5"
                        style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
                        onMouseDown={(e) => { setIsDragging('hue'); handleHueChange(e); }}
                    >
                        <div 
                            className="w-4 h-4 rounded-full bg-white border border-gray-300 shadow absolute -ml-2 -top-0.5 pointer-events-none"
                            style={{ left: `${(hsv.h / 360) * 100}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white -m-8 mt-[-2rem] overflow-hidden relative">
      {/* 1. HEADER */}
      <div className="h-16 border-b border-[var(--border-default)] flex items-center justify-between px-6 bg-white shrink-0 z-20">
        <div><h1 className="text-xl font-bold text-[var(--text-heading)]">Edit Poster</h1></div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
        <div className="absolute top-4 left-6 z-10 md:static md:hidden">
             <Button variant="outline" onClick={() => navigate(-1)} className="bg-white/90 backdrop-blur border border-[var(--border-default)] px-3 py-1 text-xs font-bold gap-1">
                <ArrowLeft size={14} /> Back
             </Button>
        </div>

        {/* 2. CANVAS AREA */}
        <div className="w-full md:w-2/3 bg-gray-100 flex items-center justify-center p-4 md:p-8 overflow-hidden relative">
           <div className="hidden md:block absolute top-6 left-6 z-10">
               <Button variant="outline" onClick={() => navigate(-1)} className="bg-white hover:bg-gray-50 border border-[var(--border-default)] px-4 py-2 text-sm font-bold gap-2 shadow-sm">
                  <ArrowLeft size={16} /> Back to Dashboard
               </Button>
           </div>

           <div 
             ref={containerRef}
             className="relative shadow-2xl bg-white select-none overflow-hidden"
             style={{ aspectRatio: '4/3', maxHeight: '100%', maxWidth: '100%', width: 'auto', height: 'auto' }}
             onMouseDown={() => setSelectedId(null)}
           >
            <img
  ref={imageRef}
  src={posterImage || DEFAULT_BG}
  alt="Poster Background"
  className="w-full h-full object-cover pointer-events-none"
  onLoad={() => setIsLoading(false)}
/>              
              {elements.map(el => {
                if (!el.text) return null;
                return (
                <div
                  key={el.id}
                  onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, el.id); }}
                  onTouchStart={(e) => { e.stopPropagation(); handleDragStart(e, el.id); }}
                  style={{
                    position: 'absolute',
                    left: `${el.x}%`, top: `${el.y}%`,
                    fontSize: `${(el.fontSize / CANVAS_BASE_WIDTH) * (containerRef.current?.offsetWidth || 800)}px`,
                    fontFamily: el.fontFamily,
                    color: el.textColor,
                    backgroundColor: el.backgroundColor,
                    padding: el.backgroundColor !== 'transparent' ? '0.4em' : '0',
                    cursor: 'move',
                    border: selectedId === el.id ? '2px dashed #5B5FEF' : '2px solid transparent',
                    lineHeight: 1.2, whiteSpace: 'nowrap', userSelect: 'none', touchAction: 'none',
                    opacity: 1,
                  }}
                >
                  {el.text}
                </div>
              )})}
           </div>
        </div>
               
        {/* 3. CONTROL PANEL - RELATIVE CONTAINER */}
        <div className="w-full md:w-1/3 bg-white border-l border-[var(--border-default)] flex flex-col h-[40vh] md:h-full z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-none overflow-hidden relative">
           <div className="flex-1 overflow-hidden p-6 space-y-4">
              
              {/* Layer Switcher Row */}
              <div>
                 <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Layers size={14} /> Layers
                 </label>
                 <div className="flex flex-wrap gap-2">
                    {elements.map((el, idx) => (
                      <button
                        key={el.id}
                        onClick={() => setSelectedId(el.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all truncate max-w-[120px] ${
                            selectedId === el.id 
                            ? 'bg-[var(--accent-secondary)] border-[var(--accent-primary)] text-[var(--accent-primary)]' 
                            : 'bg-white border-[var(--border-default)] text-[var(--text-body)] hover:bg-gray-50'
                        }`}
                      >
                         {el.text || `(Empty)`}
                      </button>
                    ))}
                    <button
                        onClick={handleAddText}
                        className="px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-gray-200 transition-all"
                    >
                        <Plus size={14} /> Add Text
                    </button>
                 </div>
              </div>

              {selectedElement ? (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="w-full h-px bg-[var(--border-default)]"></div>

                    {/* Content */}
                    <div>
                       <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Content</label>
                          <button onClick={handleDelete} className="text-red-500 p-1.5 hover:bg-red-50 rounded-md transition-colors" title="Delete Layer">
                             <Trash2 size={16} />
                          </button>
                       </div>
                       <Input 
                          key={selectedElement.id}
                          autoFocus
                          value={selectedElement.text}
                          onChange={(e) => updateSelected('text', e.target.value)}
                          className="font-medium"
                          placeholder={selectedElement.type === 'custom' ? "New Text" : `Enter ${selectedElement.type}`}
                       />
                    </div>

                    {/* Font & Size */}
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Font</label>
                          <select 
                             value={selectedElement.fontFamily}
                             onChange={(e) => updateSelected('fontFamily', e.target.value)}
                             className="w-full bg-[var(--input-bg)] border border-[var(--border-default)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                             style={{ fontFamily: selectedElement.fontFamily }}
                          >
                             {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Size: {selectedElement.fontSize}</label>
                          <input 
                             type="range" min="12" max="150"
                             value={selectedElement.fontSize}
                             onChange={(e) => updateSelected('fontSize', parseInt(e.target.value))}
                             className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)] mt-2"
                          />
                       </div>
                    </div>

                    {/* Appearance */}
                    <div>
                       <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Appearance</label>
                       <div className="flex gap-4">
                          <div className="flex-1 relative">
                             <label className="text-[10px] text-[var(--text-muted)] mb-1 block">Text Color</label>
                             <button
                                onClick={(e) => openColorPicker(e, 'textColor')}
                                className="w-full h-10 rounded-lg border border-[var(--border-default)] shadow-sm flex items-center gap-2 px-2 hover:bg-gray-50 transition-colors bg-white group"
                             >
                                <div 
                                    className="w-6 h-6 rounded border border-gray-200 shadow-sm"
                                    style={{ backgroundColor: selectedElement.textColor }}
                                ></div>
                                <span className="text-xs font-mono text-gray-500 group-hover:text-gray-800">{selectedElement.textColor}</span>
                             </button>
                          </div>

                          <div className="flex-1 relative">
                             <label className="text-[10px] text-[var(--text-muted)] mb-1 block">Background Color</label>
                             <button
                                onClick={(e) => openColorPicker(e, 'backgroundColor')}
                                className="w-full h-10 rounded-lg border border-[var(--border-default)] shadow-sm flex items-center gap-2 px-2 hover:bg-gray-50 transition-colors bg-white"
                             >
                                <div className="w-6 h-6 rounded border border-gray-200 shadow-sm relative overflow-hidden">
                                    {selectedElement.backgroundColor === 'transparent' && (
                                         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/checkerboard-white.png')] opacity-20"></div>
                                    )}
                                    <div className="absolute inset-0" style={{ backgroundColor: selectedElement.backgroundColor === 'transparent' ? 'transparent' : selectedElement.backgroundColor }}></div>
                                    {selectedElement.backgroundColor === 'transparent' && <div className="absolute inset-0 flex items-center justify-center text-[10px] text-red-500 font-bold">/</div>}
                                </div>
                                <span className="text-xs font-mono text-gray-500 truncate">{selectedElement.backgroundColor === 'transparent' ? 'None' : selectedElement.backgroundColor}</span>
                             </button>
                          </div>
                       </div>
                    </div>
                 </div>
              ) : (
                 <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)] opacity-50 border-t border-[var(--border-default)] mt-8">
                    <Move size={32} className="mb-2" />
                    <p className="text-sm font-medium">Select a layer to edit</p>
                 </div>
              )}
           </div>

           {/* Color Panel Rendered Here to be relative to container */}
           {renderColorPanel()}

           <div className="p-5 border-t border-[var(--border-default)] bg-white grid grid-cols-2 gap-4 shrink-0 relative z-30">
              <Button onClick={handleSave} className="bg-[var(--accent-primary)] text-white font-bold w-full justify-center"><Save size={18} /> Save</Button>
              <Button 
                onClick={handleShare} 
                className="bg-[var(--accent-primary)] text-white font-bold w-full justify-center hover:opacity-90 disabled:opacity-70 transition-all" 
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : <><Share2 size={18} /> Share</>}
              </Button>
           </div>
        </div>
      </div>
      
      {/* Toast Notification */}
      {showToast && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full shadow-xl z-[60] animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-2">
              <Check size={18} className="text-green-400" />
              <span className="font-medium text-sm">{toastMessage}</span>
          </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && generatedImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
                <button 
                    onClick={() => setIsShareModalOpen(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors p-1 rounded-full hover:bg-gray-100"
                >
                    <X size={24} />
                </button>
                
                <h3 className="text-xl font-bold text-center mb-6 text-gray-900">Share Poster</h3>
                
                <div className="flex justify-center mb-6">
                    <img src={generatedImage} alt="Generated Poster" className="h-48 rounded-lg shadow-md border border-gray-200" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    {/* WhatsApp */}
                    <button 
                        onClick={() => handleSocialShare('whatsapp')}
                        className="flex flex-col items-center gap-2 group p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <div className="w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                            <MessageCircle size={24} fill="currentColor" /> 
                        </div>
                        <span className="text-xs font-medium text-gray-600">WhatsApp</span>
                    </button>

                    {/* Instagram */}
                    <button 
                        onClick={() => handleSocialShare('instagram')}
                        className="flex flex-col items-center gap-2 group p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#F56040] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                            <Instagram size={24} />
                        </div>
                        <span className="text-xs font-medium text-gray-600">Instagram</span>
                    </button>

                    {/* Download */}
                    <button 
                        onClick={() => handleSocialShare('download')}
                        className="flex flex-col items-center gap-2 group p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center shadow-md group-hover:bg-gray-200 transition-colors">
                            <Download size={24} />
                        </div>
                        <span className="text-xs font-medium text-gray-600">Download</span>
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Editor;