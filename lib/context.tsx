'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Role = 'exec' | 'category_manager' | 'store_manager';

interface AppContextType {
  role: Role;
  setRole: (r: Role) => void;
  apiKey: string;
  setApiKey: (k: string) => void;
  selectedStore: string;
  setSelectedStore: (s: string) => void;
  lookerMode: 'mock' | 'live';
  setLookerMode: (m: 'mock' | 'live') => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (v: boolean) => void;

  // Anomaly Settings
  wowDeclineThreshold: number;
  setWowDeclineThreshold: (t: number) => void;
  wasteSpikeThreshold: number;
  setWasteSpikeThreshold: (t: number) => void;

  // AI & Copilot Settings
  aiAutopilot: boolean;
  setAiAutopilot: (a: boolean) => void;
  aiConfidenceThreshold: number;
  setAiConfidenceThreshold: (c: number) => void;
  geminiTemperature: number;
  setGeminiTemperature: (t: number) => void;

  // Notification Noise
  muteNotificationNoise: boolean;
  setMuteNotificationNoise: (m: boolean) => void;

  // Looker IAM Sandbox Overrides
  userAttributeStoreScope: string;
  setUserAttributeStoreScope: (s: string) => void;
  userAttributeCategoryScope: string;
  setUserAttributeCategoryScope: (c: string) => void;

  // Demo Mode
  demoMode: boolean;
  setDemoMode: (d: boolean) => void;

  /** After JWT login: user must complete platform setup (role + API key) once per session */
  platformSetupComplete: boolean;
  setPlatformSetupComplete: (v: boolean) => void;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole]                             = useState<Role>('exec');
  const [apiKey, setApiKey]                 = useState('');
  const [selectedStore, setSelectedStore]   = useState('S001');
  const [lookerMode, setLookerMode]         = useState<'mock' | 'live'>('mock');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Settings states with defaults
  const [wowDeclineThreshold, setWowDeclineThreshold] = useState<number>(10);
  const [wasteSpikeThreshold, setWasteSpikeThreshold] = useState<number>(15);
  const [aiAutopilot, setAiAutopilot] = useState<boolean>(false);
  const [aiConfidenceThreshold, setAiConfidenceThreshold] = useState<number>(70);
  const [geminiTemperature, setGeminiTemperature] = useState<number>(0.2);
  const [muteNotificationNoise, setMuteNotificationNoise] = useState<boolean>(false);
  const [userAttributeStoreScope, setUserAttributeStoreScope] = useState<string>('All');
  const [userAttributeCategoryScope, setUserAttributeCategoryScope] = useState<string>('All');
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [platformSetupComplete, setPlatformSetupCompleteState] = useState<boolean>(false);

  // Persist to sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('di_session');
    if (saved) {
      const s = JSON.parse(saved);
      setRole(s.role || 'exec');
      setApiKey(s.apiKey || '');
      setSelectedStore(s.selectedStore || 'S001');
      setIsAuthenticated(s.isAuthenticated || false);
      
      // Load saved settings if they exist
      if (s.wowDeclineThreshold !== undefined) setWowDeclineThreshold(s.wowDeclineThreshold);
      if (s.wasteSpikeThreshold !== undefined) setWasteSpikeThreshold(s.wasteSpikeThreshold);
      if (s.aiAutopilot !== undefined) setAiAutopilot(s.aiAutopilot);
      if (s.aiConfidenceThreshold !== undefined) setAiConfidenceThreshold(s.aiConfidenceThreshold);
      if (s.geminiTemperature !== undefined) setGeminiTemperature(s.geminiTemperature);
      if (s.muteNotificationNoise !== undefined) setMuteNotificationNoise(s.muteNotificationNoise);
      if (s.userAttributeStoreScope !== undefined) setUserAttributeStoreScope(s.userAttributeStoreScope);
      if (s.userAttributeCategoryScope !== undefined) setUserAttributeCategoryScope(s.userAttributeCategoryScope);
      if (s.demoMode !== undefined) setDemoMode(s.demoMode);
      if (s.platformSetupComplete !== undefined) setPlatformSetupCompleteState(s.platformSetupComplete);
    }
  }, []);

  const save = (updates: Partial<any>) => {
    const current = JSON.parse(sessionStorage.getItem('di_session') || '{}');
    sessionStorage.setItem('di_session', JSON.stringify({ ...current, ...updates }));
  };

  const handleSetRole = (r: Role) => { setRole(r); save({ role: r }); };
  const handleSetApiKey = (k: string) => { setApiKey(k); save({ apiKey: k }); };
  const handleSetStore = (s: string) => { setSelectedStore(s); save({ selectedStore: s }); };
  const handleSetAuth = (v: boolean) => { setIsAuthenticated(v); save({ isAuthenticated: v }); };
  
  const handleSetWowDeclineThreshold = (t: number) => { setWowDeclineThreshold(t); save({ wowDeclineThreshold: t }); };
  const handleSetWasteSpikeThreshold = (t: number) => { setWasteSpikeThreshold(t); save({ wasteSpikeThreshold: t }); };
  const handleSetAiAutopilot = (a: boolean) => { setAiAutopilot(a); save({ aiAutopilot: a }); };
  const handleSetAiConfidenceThreshold = (c: number) => { setAiConfidenceThreshold(c); save({ aiConfidenceThreshold: c }); };
  const handleSetGeminiTemperature = (t: number) => { setGeminiTemperature(t); save({ geminiTemperature: t }); };
  const handleSetMuteNotificationNoise = (m: boolean) => { setMuteNotificationNoise(m); save({ muteNotificationNoise: m }); };
  const handleSetUserAttributeStoreScope = (s: string) => { setUserAttributeStoreScope(s); save({ userAttributeStoreScope: s }); };
  const handleSetUserAttributeCategoryScope = (c: string) => { setUserAttributeCategoryScope(c); save({ userAttributeCategoryScope: c }); };
  const handleSetDemoMode = (d: boolean) => { setDemoMode(d); save({ demoMode: d }); };
  const handleSetPlatformSetupComplete = (v: boolean) => {
    setPlatformSetupCompleteState(v);
    save({ platformSetupComplete: v });
  };

  return (
    <AppContext.Provider value={{
      role, setRole: handleSetRole,
      apiKey, setApiKey: handleSetApiKey,
      selectedStore, setSelectedStore: handleSetStore,
      lookerMode, setLookerMode,
      isAuthenticated, setIsAuthenticated: handleSetAuth,
      
      wowDeclineThreshold, setWowDeclineThreshold: handleSetWowDeclineThreshold,
      wasteSpikeThreshold, setWasteSpikeThreshold: handleSetWasteSpikeThreshold,
      aiAutopilot, setAiAutopilot: handleSetAiAutopilot,
      aiConfidenceThreshold, setAiConfidenceThreshold: handleSetAiConfidenceThreshold,
      geminiTemperature, setGeminiTemperature: handleSetGeminiTemperature,
      muteNotificationNoise, setMuteNotificationNoise: handleSetMuteNotificationNoise,
      userAttributeStoreScope, setUserAttributeStoreScope: handleSetUserAttributeStoreScope,
      userAttributeCategoryScope, setUserAttributeCategoryScope: handleSetUserAttributeCategoryScope,
      demoMode, setDemoMode: handleSetDemoMode,
      platformSetupComplete, setPlatformSetupComplete: handleSetPlatformSetupComplete,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
