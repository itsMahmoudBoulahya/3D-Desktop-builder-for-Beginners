
'use client';
import React, { useState, useMemo } from 'react';
import { Monitor, Keyboard, Mouse, Printer, Zap, Headphones, Mic, Speaker, Camera, Scan, Cpu } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

type Component = {
  id: string;
  name: string;
  category: 'input' | 'output' | 'processing' | 'others';
  icon: React.ReactNode;
};

type Category = 'unsorted' | 'input' | 'output' | 'processing' | 'others';

const allComponents: Component[] = [
  { id: 'keyboard', name: 'Clavier', category: 'input', icon: <Keyboard className="h-5 w-5" /> },
  { id: 'mouse', name: 'Souris', category: 'input', icon: <Mouse className="h-5 w-5" /> },
  { id: 'mic', name: 'Microphone', category: 'input', icon: <Mic className="h-5 w-5" /> },
  { id: 'webcam', name: 'Webcam', category: 'input', icon: <Camera className="h-5 w-5" /> },
  { id: 'scanner', name: 'Scanner', category: 'input', icon: <Scan className="h-5 w-5" /> },
  { id: 'monitor', name: 'Moniteur', category: 'output', icon: <Monitor className="h-5 w-5" /> },
  { id: 'printer', name: 'Imprimante', category: 'output', icon: <Printer className="h-5 w-5" /> },
  { id: 'headphones', name: 'Casque', category: 'output', icon: <Headphones className="h-5 w-5" /> },
  { id: 'speakers', name: 'Haut-parleurs', category: 'output', icon: <Speaker className="h-5 w-5" /> },
  { id: 'central-unit', name: 'Unité centrale', category: 'processing', icon: <Cpu className="h-5 w-5" /> },
  { id: 'power-strip', name: 'Multiprise', category: 'others', icon: <Zap className="h-5 w-5" /> },
];

const DropZone = ({ category, children, onDrop, onDragOver }: { category: Category, children: React.ReactNode, onDrop: (e: React.DragEvent, category: Category) => void, onDragOver: (e: React.DragEvent) => void }) => {
  return (
    <div
      onDrop={(e) => onDrop(e, category)}
      onDragOver={onDragOver}
      className="min-h-24 p-2 border border-dashed rounded-lg bg-muted/50"
    >
      {children}
    </div>
  );
};

const DraggableComponent = ({ component, result, onDragStart }: { component: Component, result: 'correct' | 'incorrect' | null, onDragStart: (e: React.DragEvent, component: Component) => void }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, component)}
      className={cn(
        "flex items-center gap-2 p-2 border rounded-md cursor-grab bg-card",
        result === 'correct' && 'border-green-500 bg-green-500/10',
        result === 'incorrect' && 'border-red-500 bg-red-500/10'
      )}
    >
      {component.icon}
      <span className="text-sm">{component.name}</span>
    </div>
  );
};

export function SortingTest() {
  const [componentPlacements, setComponentPlacements] = useState<Record<string, Category>>(
    allComponents.reduce((acc, curr) => ({ ...acc, [curr.id]: 'unsorted' }), {})
  );
  const [results, setResults] = useState<Record<string, 'correct' | 'incorrect' | null>>({});

  const handleDragStart = (e: React.DragEvent, component: Component) => {
    e.dataTransfer.setData('componentId', component.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetCategory: Category) => {
    e.preventDefault();
    const componentId = e.dataTransfer.getData('componentId');
    setComponentPlacements(prev => ({ ...prev, [componentId]: targetCategory }));
  };

  const checkAnswers = () => {
    const newResults: Record<string, 'correct' | 'incorrect' | null> = {};
    allComponents.forEach(component => {
      if (componentPlacements[component.id] === 'unsorted') {
        newResults[component.id] = null;
      } else {
        newResults[component.id] = componentPlacements[component.id] === component.category ? 'correct' : 'incorrect';
      }
    });
    setResults(newResults);
  };
  
  const resetTest = () => {
    setComponentPlacements(allComponents.reduce((acc, curr) => ({ ...acc, [curr.id]: 'unsorted' }), {}));
    setResults({});
  };

  const { unsorted, input, output, processing, others } = useMemo(() => {
    return Object.entries(componentPlacements).reduce((acc, [id, category]) => {
      const component = allComponents.find(c => c.id === id);
      if (component) {
        acc[category].push(component);
      }
      return acc;
    }, { unsorted: [], input: [], output: [], processing: [], others: [] } as Record<Category, Component[]>);
  }, [componentPlacements]);
  
  const isTestComplete = useMemo(() => {
    return Object.values(results).length > 0 && Object.values(results).every(r => r === 'correct');
  }, [results]);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-2">
        <h2 className="text-lg font-semibold">Test de tri des composants</h2>
        <p className="text-sm text-muted-foreground">Faites glisser chaque composant de la zone "Non trié" vers sa catégorie correcte.</p>
        
        <div className="space-y-4">
          <h3 className="font-semibold text-primary">Non trié</h3>
          <DropZone category="unsorted" onDrop={handleDrop} onDragOver={handleDragOver}>
            <div className="flex flex-wrap gap-2">
              {unsorted.map(c => <DraggableComponent key={c.id} component={c} result={results[c.id] || null} onDragStart={handleDragStart} />)}
              {unsorted.length === 0 && <p className="text-xs text-muted-foreground p-4 text-center w-full">Tous les composants ont été triés !</p>}
            </div>
          </DropZone>

          <h3 className="font-semibold text-primary">Entrée</h3>
          <DropZone category="input" onDrop={handleDrop} onDragOver={handleDragOver}>
            <div className="flex flex-wrap gap-2">
              {input.map(c => <DraggableComponent key={c.id} component={c} result={results[c.id] || null} onDragStart={handleDragStart} />)}
            </div>
          </DropZone>
          
          <h3 className="font-semibold text-primary">Sortie</h3>
          <DropZone category="output" onDrop={handleDrop} onDragOver={handleDragOver}>
            <div className="flex flex-wrap gap-2">
              {output.map(c => <DraggableComponent key={c.id} component={c} result={results[c.id] || null} onDragStart={handleDragStart} />)}
            </div>
          </DropZone>

          <h3 className="font-semibold text-primary">Traitement</h3>
          <DropZone category="processing" onDrop={handleDrop} onDragOver={handleDragOver}>
            <div className="flex flex-wrap gap-2">
              {processing.map(c => <DraggableComponent key={c.id} component={c} result={results[c.id] || null} onDragStart={handleDragStart} />)}
            </div>
          </DropZone>
          
          <h3 className="font-semibold text-primary">Autres</h3>
          <DropZone category="others" onDrop={handleDrop} onDragOver={handleDragOver}>
            <div className="flex flex-wrap gap-2">
              {others.map(c => <DraggableComponent key={c.id} component={c} result={results[c.id] || null} onDragStart={handleDragStart} />)}
            </div>
          </DropZone>
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button onClick={checkAnswers}>Vérifier mes réponses</Button>
          <Button variant="outline" onClick={resetTest}>Réinitialiser</Button>
        </div>
        
        {isTestComplete && (
            <div className="p-3 mt-4 rounded-md bg-green-500/20 border border-green-600">
                <p className="font-semibold text-green-800">Félicitations ! Vous avez correctement trié tous les composants.</p>
            </div>
        )}
      </div>
    </ScrollArea>
  );
}
