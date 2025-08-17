'use client';

import React, { createContext, useState, useContext, useMemo, ReactNode } from 'react';
import { connectivityAnalyzer, type ConnectivityAnalysis } from '@/lib/connectivity-analyzer';

export type SceneComponent = {
  name: string;
  userData: {
    id: string;
    type: string;
    info: string;
    inScene: boolean;
    needs: {
      power?: boolean;
      data?: boolean;
      dataType?: string | string[];
    };
  };
};

export type Connection = {
  line: any;
  toPortId: string;
  connectionType: string;
  toComponentName?: string;
  toComponentType?: string;
};

type SceneContextType = {
  sceneComponents: SceneComponent[];
  connections: Map<string, Connection[]>;
  connectivityAnalysis: ConnectivityAnalysis | null;
  isAnalyzing: boolean;
  setSceneComponents: React.Dispatch<React.SetStateAction<SceneComponent[]>>;
  setConnections: React.Dispatch<React.SetStateAction<Map<string, Connection[]>>>;
  analyzeConnectivity: () => Promise<void>;
  resetAnalysis: () => void;
};

const SceneContext = createContext<SceneContextType | undefined>(undefined);

export const SceneProvider = ({ children }: { children: ReactNode }) => {
  const [sceneComponents, setSceneComponents] = useState<SceneComponent[]>([]);
  const [connections, setConnections] = useState<Map<string, Connection[]>>(new Map());
  const [connectivityAnalysis, setConnectivityAnalysis] = useState<ConnectivityAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeConnectivity = async () => {
    if (sceneComponents.length === 0) {
      setConnectivityAnalysis({
        isValid: false,
        score: 0,
        feedback: "Aucun composant n'a été placé sur la scène 3D.",
        issues: ["Placez au moins quelques composants sur la scène avant d'analyser la connectivité"],
        suggestions: ["Glissez les composants depuis l'onglet 'Composants' vers la scène 3D"]
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await connectivityAnalyzer.analyzeConnectivity(connections, sceneComponents);
      setConnectivityAnalysis(analysis);
    } catch (error) {
      console.error('Error analyzing connectivity:', error);
      setConnectivityAnalysis({
        isValid: false,
        score: 0,
        feedback: "Erreur lors de l'analyse de connectivité.",
        issues: ["Une erreur technique s'est produite"],
        suggestions: ["Vérifiez que le service d'IA est disponible et réessayez"]
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setConnectivityAnalysis(null);
  };

  const value = useMemo(() => ({
    sceneComponents,
    connections,
    connectivityAnalysis,
    isAnalyzing,
    setSceneComponents,
    setConnections,
    analyzeConnectivity,
    resetAnalysis
  }), [sceneComponents, connections, connectivityAnalysis, isAnalyzing]);

  return (
    <SceneContext.Provider value={value}>
      {children}
    </SceneContext.Provider>
  );
};

export const useScene = () => {
  const context = useContext(SceneContext);
  if (context === undefined) {
    throw new Error('useScene must be used within a SceneProvider');
  }
  return context;
};
