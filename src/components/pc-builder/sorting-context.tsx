
'use client';

import React, { createContext, useState, useContext, useMemo, ReactNode } from 'react';
import { Monitor, Keyboard, Mouse, Printer, Zap, Headphones, Mic, Speaker, Camera, Scan, Cpu } from 'lucide-react';

export type Component = {
  id: string;
  name: string;
  type: string;
  info: string;
  category: 'input' | 'output' | 'processing' | 'others';
  icon: React.ReactNode;
};

export type Category = 'unsorted' | 'input' | 'output' | 'processing' | 'others';

const ALL_COMPONENTS: Component[] = [
  { id: 'keyboard', name: 'Clavier', type: 'keyboard', info: 'Périphérique d\'entrée : Clavier', category: 'input', icon: <Keyboard className="h-6 w-6" /> },
  { id: 'mouse', name: 'Souris', type: 'mouse', info: 'Périphérique d\'entrée : Souris', category: 'input', icon: <Mouse className="h-6 w-6" /> },
  { id: 'mic', name: 'Microphone', type: 'mic', info: 'Périphérique d\'entrée : Microphone', category: 'input', icon: <Mic className="h-6 w-6" /> },
  { id: 'webcam', name: 'Webcam', type: 'webcam', info: 'Périphérique d\'entrée : Webcam', category: 'input', icon: <Camera className="h-6 w-6" /> },
  { id: 'scanner', name: 'Scanner', type: 'scanner', info: 'Périphérique d\'entrée : Scanner', category: 'input', icon: <Scan className="h-6 w-6" /> },
  { id: 'monitor', name: 'Moniteur', type: 'monitor', info: 'Périphérique de sortie : Moniteur', category: 'output', icon: <Monitor className="h-6 w-6" /> },
  { id: 'printer', name: 'Imprimante', type: 'printer', info: 'Périphérique de sortie : Imprimante', category: 'output', icon: <Printer className="h-6 w-6" /> },
  { id: 'headphones', name: 'Casque', type: 'headphones', info: 'Périphérique de sortie : Casque', category: 'output', icon: <Headphones className="h-6 w-6" /> },
  { id: 'speakers', name: 'Haut-parleurs', type: 'speakers', info: 'Périphérique de sortie : Haut-parleurs', category: 'output', icon: <Speaker className="h-6 w-6" /> },
  { id: 'central-unit', name: 'Unité centrale', type: 'central-unit', info: 'Unité centrale', category: 'processing', icon: <Cpu className="h-6 w-6" /> },
  { id: 'power-strip', name: 'Multiprise', type: 'power-strip', info: 'Multiprise', category: 'others', icon: <Zap className="h-6 w-6" /> },
];

type SortingContextType = {
  allComponents: Component[];
  placements: Record<string, Category>;
  setPlacements: React.Dispatch<React.SetStateAction<Record<string, Category>>>;
  results: Record<string, 'correct' | 'incorrect' | null>;
  setResults: React.Dispatch<React.SetStateAction<Record<string, 'correct' | 'incorrect' | null>>>;
  checkAnswers: () => void;
  resetTest: () => void;
};

const SortingContext = createContext<SortingContextType | undefined>(undefined);

export const SortingProvider = ({ children }: { children: ReactNode }) => {
  const [placements, setPlacements] = useState<Record<string, Category>>(
    ALL_COMPONENTS.reduce((acc, curr) => ({ ...acc, [curr.id]: 'unsorted' }), {})
  );
  const [results, setResults] = useState<Record<string, 'correct' | 'incorrect' | null>>({});

  const checkAnswers = () => {
    const newResults: Record<string, 'correct' | 'incorrect' | null> = {};
    ALL_COMPONENTS.forEach(component => {
      if (placements[component.id] !== 'unsorted') {
        newResults[component.id] = placements[component.id] === component.category ? 'correct' : 'incorrect';
      } else {
        newResults[component.id] = 'incorrect'; // Mark unsorted as incorrect
      }
    });
    setResults(newResults);
  };
  
  const resetTest = () => {
    setPlacements(ALL_COMPONENTS.reduce((acc, curr) => ({ ...acc, [curr.id]: 'unsorted' }), {}));
    setResults({});
  };

  const value = useMemo(() => ({
    allComponents: ALL_COMPONENTS,
    placements,
    setPlacements,
    results,
    setResults,
    checkAnswers,
    resetTest
  }), [placements, results]);

  return (
    <SortingContext.Provider value={value}>
      {children}
    </SortingContext.Provider>
  );
};

export const useSorting = () => {
  const context = useContext(SortingContext);
  if (context === undefined) {
    throw new Error('useSorting must be used within a SortingProvider');
  }
  return context;
};
