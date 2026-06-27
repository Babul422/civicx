import React, { useEffect, useRef, useState } from 'react';
import { Camera, Volume2, Mic, AlertTriangle, CheckCircle, Navigation, Sparkles, X, MapPin } from 'lucide-react';
import { Issue, User } from '../types';

interface ReportViewProps {
  currentUser: User | null;
  onNavigateToIssue: (id: string) => void;
  onRefreshIssues: () => void;
}

interface ClosestWard {
  name: string;
  ward: number;
}

// Map coordinates to closest Bengaluru ward center
function findClosestWard(lat: number, lng: number): ClosestWard {
  const centers = [
    { name: 'Koramangala', ward: 151, lat: 12.9352, lng: 77.6244 },
    { name: 'Indiranagar', ward: 75, lat: 12.9719, lng: 77.6412 },
    { name: 'Whitefield', ward: 84, lat: 12.9698, lng: 77.7500 },
    { name: 'JP Nagar', ward: 184, lat: 12.9063, lng: 77.5857 },
    { name: 'Jayanagar', ward: 170, lat: 12.9250, lng: 77.5938 },
    { name: 'HSR Layout', ward: 174, lat: 12.9103, lng: 77.6450 }
  ];

  let closest = centers[0];
  let minDistance = Infinity;
  for (const c of centers) {
    const d = Math.sqrt(Math.pow(c.lat - lat, 2) + Math.pow(c.lng - lng, 2));
    if (d < minDistance) {
      minDistance = d;
      closest = c;
    }
  }
  return { name: closest.name, ward: closest.ward };
}

export default function ReportView({ currentUser, onNavigateToIssue, onRefreshIssues }: ReportViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const miniMapRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Form State
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number>(12.9716);
  const [longitude, setLongitude] = useState<number>(77.5946);
  const [wardInfo, setWardInfo] = useState<ClosestWard>({ name: 'Bengaluru Central', ward: 151 });
  const [address, setAddress] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Status States
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [duplicateIssue, setDuplicateIssue] = useState<Issue | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Determine current step based on inputs
  const currentStep = !photo ? 1 : (isSubmitting ? 3 : 2);

  // Trigger GPS detection on load
  useEffect(() => {
    detectLocation();
  }, []);

  // Sync Leaflet map when location changes
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !miniMapRef.current || !photo) return; // Only init map if photo is uploaded and step 2 is active

    if (!miniMapInstanceRef.current) {
      const map = L.map(miniMapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([latitude, longitude], 15);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(map);

      const marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        updateCoordinates(position.lat, position.lng);
      });

      miniMapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      const map = miniMapInstanceRef.current;
      const marker = markerRef.current;
      map.setView([latitude, longitude], 15);
      marker.setLatLng([latitude, longitude]);
    }
  }, [latitude, longitude, photo]);

  const updateCoordinates = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    const closest = findClosestWard(lat, lng);
    setWardInfo(closest);
    setAddress(`${closest.name} Ward ${closest.ward}, near Metro Station, Bengaluru`);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateCoordinates(position.coords.latitude, position.coords.longitude);
        setIsLocating(false);
      },
      (error) => {
        console.warn('Geolocation access failed:', error.message);
        updateCoordinates(12.9716, 77.5946);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Drag and drop photo
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processPhotoFile(file);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPhotoFile(file);
    }
  };

  const processPhotoFile = (file: File) => {
    setPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setDuplicateIssue(null);
    setRejectionReason(null);
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Try Chrome/Safari!');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      setDescription((prev) => (prev ? `${prev} ${resultText}` : resultText));
      setIsListening(false);
    };

    recognition.onerror = (e: any) => {
      console.error('Speech recognition error:', e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) {
      setErrorMsg('Please select or capture a photo first.');
      return;
    }

    setIsSubmitting(true);
    setDuplicateIssue(null);
    setRejectionReason(null);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('photo', photo);
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    formData.append('description', description);
    formData.append('ward_number', wardInfo.ward.toString());
    formData.append('address_text', address);
    formData.append('reported_by', currentUser?.id || '00000000-0000-0000-0000-000000000001');

    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        if (data.duplicate) {
          setDuplicateIssue(data.existing_issue);
        } else if (data.rejected) {
          setRejectionReason(data.reason);
        } else {
          onRefreshIssues();
          onNavigateToIssue(data.id);
        }
      } else {
        setErrorMsg(data.error || 'Server error occurred while reporting issue.');
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMsg('Network error. Failed to reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[560px] mx-auto px-6 py-10 pb-28 font-sans" id="report-view-root">
      
      {/* Title block */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight flex items-center justify-center gap-2">
          <Sparkles className="text-blue-600 w-7 h-7" />
          Report Local Civic Issue
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Our AI analyzes photos to instantly categorize, assign and verify reports.
        </p>
      </div>

      {/* Progress Bar Header */}
      <div className="mb-8" id="report-progress-bar">
        <div className="flex items-center justify-between relative px-6">
          {/* Progress Connecting Line */}
          <div className="absolute top-4 left-10 right-10 h-0.5 bg-slate-200 z-0">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
            />
          </div>

          {/* Step 1 */}
          <div className="flex flex-col items-center relative z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}>
              {photo ? '✓' : '1'}
            </div>
            <span className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${currentStep >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
              Photo
            </span>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center relative z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border-2 border-slate-200'
            }`}>
              2
            </div>
            <span className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${currentStep >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
              Details
            </span>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center relative z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              currentStep === 3 ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border-2 border-slate-200'
            }`}>
              3
            </div>
            <span className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${currentStep === 3 ? 'text-blue-600' : 'text-slate-400'}`}>
              Submit
            </span>
          </div>
        </div>
      </div>

      {/* Duplicate Found Banner */}
      {duplicateIssue && (
        <div className="mb-6 bg-amber-50 border border-amber-100 rounded-2xl p-5 text-amber-900 shadow-sm animate-fade-in" id="duplicate-banner">
          <div className="flex gap-3.5">
            <AlertTriangle className="w-5.5 h-5.5 text-amber-500 flex-shrink-0" />
            <div>
              <span className="font-extrabold block text-sm tracking-tight">Issue Already Filed Nearby</span>
              <p className="text-xs mt-1 text-amber-800 leading-relaxed">
                A similar active <strong>{duplicateIssue.issue_type.replace(/_/g, ' ')}</strong> was recently reported within 100 meters.
              </p>
              <button
                type="button"
                onClick={() => onNavigateToIssue(duplicateIssue.id)}
                className="mt-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
              >
                View Existing Report &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Rejection Banner */}
      {rejectionReason && (
        <div className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-5 text-red-900 shadow-sm animate-fade-in" id="rejection-banner">
          <div className="flex gap-3.5">
            <AlertTriangle className="w-5.5 h-5.5 text-red-500 flex-shrink-0" />
            <div>
              <span className="font-extrabold block text-sm tracking-tight">AI Validation Rejection</span>
              <p className="text-xs mt-1 text-red-800 leading-relaxed">{rejectionReason}</p>
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                  setRejectionReason(null);
                }}
                className="mt-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* General Error Banner */}
      {errorMsg && (
        <div className="mb-6 bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-800 flex items-center gap-3 animate-fade-in" id="error-banner">
          <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span className="text-xs font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-6" id="report-issue-form">
        
        {/* STEP 1: Photo Upload zone */}
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 space-y-4">
          <span className="text-xs font-bold font-mono text-slate-400 block uppercase tracking-wider">
            Step 1: Upload Proof
          </span>

          {!photoPreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                backgroundImage: 'linear-gradient(135deg, #F0F7FF, #F8FAFC)',
                transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isDragOver ? '0 0 15px rgba(59, 130, 246, 0.25)' : 'none'
              }}
              className={`h-[260px] border-2 border-dashed rounded-[20px] transition-all flex flex-col items-center justify-center text-center p-6 cursor-pointer ${
                isDragOver ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-400'
              }`}
              id="upload-dropzone"
            >
              <Camera className="w-14 h-14 text-blue-300 mb-3 animate-pulse-slow" />
              <span className="text-base font-bold text-slate-700 block">
                Tap to take photo
              </span>
              <span className="text-xs text-slate-400 mt-1 font-medium block">
                or drag and drop here
              </span>
              <span className="text-[11px] text-slate-400 mt-2 font-mono font-medium block bg-white px-2.5 py-1 rounded-full border border-slate-100">
                JPG, PNG • Max 10MB
              </span>
            </div>
          ) : (
            <div className="relative rounded-[20px] overflow-hidden bg-slate-50 border border-slate-200 shadow-sm" id="photo-preview-box">
              <img
                src={photoPreview}
                alt="Issue preview"
                className="w-full h-64 object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                }}
                className="absolute top-3.5 right-3.5 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transition-all cursor-pointer"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
        </div>

        {/* AI Analysis shimmer (Shown during submit) */}
        {isSubmitting && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/50 rounded-2xl p-5 shadow-sm shimmer" id="ai-shimmer-card">
            <div className="flex items-center space-x-3.5">
              <span className="border-2 border-blue-500 border-t-transparent rounded-full w-5 h-5 animate-spin block" />
              <div>
                <span className="text-sm font-extrabold text-blue-900 flex items-center gap-1.5 font-display">
                  🤖 Analyzing with Gemini AI...
                </span>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Please hold on, mapping coordinates and analyzing tags (2-3 seconds)...</p>
              </div>
            </div>
          </div>
        )}

        {/* Revealed Steps after photo selected */}
        {photoPreview && !rejectionReason && (
          <div className="space-y-6 animate-slide-up">
            
            {/* STEP 2: Location Picker */}
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider block">
                  Step 2: Location
                </span>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={isLocating}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{isLocating ? 'Locating...' : 'Refresh GPS'}</span>
                </button>
              </div>

              {/* Location Card Details */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-start gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                  <MapPin className="w-5 h-5 fill-blue-500/10" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-extrabold text-slate-800 block leading-tight">
                    {address || 'Detecting address...'}
                  </span>
                  <span className="text-xs text-slate-400 font-bold font-mono mt-1 block">
                    Ward {wardInfo.ward} · {wardInfo.name}
                  </span>
                </div>
              </div>

              {/* Mini Map */}
              <div ref={miniMapRef} className="h-[200px] w-full rounded-2xl border border-slate-100 overflow-hidden z-10" id="mini-location-map" />
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Adjust Address Details
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Near 5th Cross Road, behind Corner House Ice Cream"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>
            </div>

            {/* STEP 3: Description & Voice */}
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider block">
                  Step 3: Description
                </span>
                <button
                  type="button"
                  onClick={startVoiceInput}
                  className={`text-[10px] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                    isListening
                      ? 'bg-red-50 border-red-200 text-red-600 animate-pulse'
                      : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isListening ? 'Listening...' : 'Record Voice'}</span>
                </button>
              </div>

              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                  placeholder="Describe the issue (optional)... e.g. Left lane has multiple deep potholes, hazardous during heavy rainfall."
                  rows={3}
                  maxLength={200}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold resize-none"
                />
                <span className="absolute bottom-3 right-4 text-[10px] text-slate-400 font-mono font-bold">
                  {description.length}/200
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !photo}
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-98 text-white font-extrabold text-base rounded-full shadow-lg shadow-blue-100 hover:shadow-xl hover:shadow-blue-200 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              id="submit-report-btn"
            >
              <span>🚀 Submit Report (+50 XP)</span>
            </button>

          </div>
        )}

      </form>

    </div>
  );
}
