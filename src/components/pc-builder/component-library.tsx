
import React, { useState, useMemo } from 'react';
import { Monitor, Keyboard, Mouse, Printer, Zap, Headphones, Mic, Speaker, Camera, Scan, Cpu, ArrowDownToLine, ArrowUpFromLine, Server, HelpCircle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

type Component = {
  id: string;
  name: string;
  type: string;
  info: string;
  category: 'input' | 'output' | 'processing' | 'others';
  icon: React.ReactNode;
};

type Category = 'unsorted' | 'input' | 'output' | 'processing' | 'others';

const allComponents: Component[] = [
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

const categoryConfig = {
  input: { label: "Périphériques d'entrée", icon: <ArrowDownToLine className="h-4 w-4" /> },
  output: { label: 'Périphériques de sortie', icon: <ArrowUpFromLine className="h-4 w-4" /> },
  processing: { label: 'Traitement & Stockage', icon: <Server className="h-4 w-4" /> },
  others: { label: 'Autres', icon: <Zap className="h-4 w-4" /> },
};


const DraggableComponent = ({ component, result, onDragStart, draggable: isDraggable }: { component: Component; result?: 'correct' | 'incorrect' | null; onDragStart: (e: React.DragEvent, component: Component) => void; draggable: boolean }) => {
  return (
    <div
      draggable={isDraggable}
      onDragStart={(e) => onDragStart(e, component)}
      className={cn(
        "flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors",
        isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-50",
        result === 'correct' && 'border-green-500 bg-green-500/10',
        result === 'incorrect' && 'border-red-500 bg-red-500/10'
      )}
    >
      {component.icon}
      <span className="mt-2 text-xs text-center">{component.name}</span>
    </div>
  );
};

const DropZone = ({ children, onDrop, onDragOver, isEmpty }: { children: React.ReactNode; onDrop: (e: React.DragEvent) => void; onDragOver: (e: React.DragEvent) => void; isEmpty: boolean }) => (
  <div
    onDrop={onDrop}
    onDragOver={onDragOver}
    className="min-h-24 p-2 border border-dashed rounded-lg bg-muted/50"
  >
    {isEmpty ? <div className="h-24" /> : <div className="grid grid-cols-2 gap-2">{children}</div>}
  </div>
);

export function ComponentLibrary() {
  const [placements, setPlacements] = useState<Record<string, Category>>(
    allComponents.reduce((acc, curr) => ({ ...acc, [curr.id]: 'unsorted' }), {})
  );
  const [results, setResults] = useState<Record<string, 'correct' | 'incorrect' | null>>({});

  const handleComponentDragStart = (e: React.DragEvent<HTMLDivElement>, component: Component) => {
    e.dataTransfer.setData('componentId', component.id);
    const { icon, ...serializableComponent } = component;
    e.dataTransfer.setData('application/json', JSON.stringify(serializableComponent));
  };
  
  const handleDrop = (e: React.DragEvent, targetCategory: Category) => {
    e.preventDefault();
    const componentId = e.dataTransfer.getData('componentId');
    if(componentId) {
      setPlacements(prev => ({ ...prev, [componentId]: targetCategory }));
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const checkAnswers = () => {
    const newResults: Record<string, 'correct' | 'incorrect' | null> = {};
    let allSorted = true;
    allComponents.forEach(component => {
      if (placements[component.id] === 'unsorted') {
        newResults[component.id] = null;
        allSorted = false;
      } else {
        newResults[component.id] = placements[component.id] === component.category ? 'correct' : 'incorrect';
      }
    });
    setResults(newResults);
    if (!allSorted) {
      // Maybe show a toast message that not all components are sorted
    }
  };
  
  const resetTest = () => {
    setPlacements(allComponents.reduce((acc, curr) => ({ ...acc, [curr.id]: 'unsorted' }), {}));
    setResults({});
  };

  const { unsorted, input, output, processing, others } = useMemo(() => {
    return allComponents.reduce((acc, component) => {
      const category = placements[component.id];
      if (category) {
        acc[category].push(component);
      }
      return acc;
    }, { unsorted: [], input: [], output: [], processing: [], others: [] } as Record<Category, Component[]>);
  }, [placements]);

  const isTestComplete = useMemo(() => {
    return Object.values(results).length > 0 && Object.values(results).every(r => r === 'correct');
  }, [results]);

  return (
    <ScrollArea className="h-full px-2">
      <div className="space-y-4">
        <div className="p-2 border border-dashed rounded-lg bg-muted/50">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2 pl-1"><HelpCircle className="h-4 w-4" />Composants non triés</h3>
          <div className="grid grid-cols-3 gap-2">
            {unsorted.map(c => 
              <DraggableComponent key={c.id} component={c} onDragStart={(e) => handleComponentDragStart(e, c)} draggable={true} result={results[c.id]}/>
            )}
          </div>
          {unsorted.length === 0 && <p className="text-xs text-muted-foreground p-4 text-center w-full">Tous les composants ont été triés !</p>}
        </div>

        <Accordion type="multiple" className="w-full" defaultValue={Object.keys(categoryConfig)}>
          {Object.entries(categoryConfig).map(([key, config]) => (
            <AccordionItem value={key} key={key} className="border-none">
              <AccordionTrigger className="text-sm font-medium text-muted-foreground hover:no-underline py-2">
                <div className="flex items-center gap-2">
                  {config.icon}
                  <span>{config.label}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <DropZone onDrop={(e) => handleDrop(e, key as Category)} onDragOver={handleDragOver} isEmpty={placements[key] === 0}>
                  {(Object.values(placements) as Category[]).filter(p => p === key).length > 0 && 
                    {
                      input: input.map(c => <DraggableComponent key={c.id} component={c} onDragStart={(e) => handleComponentDragStart(e, c)} draggable={isTestComplete || results[c.id] === 'correct'} result={results[c.id]}/>),
                      output: output.map(c => <DraggableComponent key={c.id} component={c} onDragStart={(e) => handleComponentDragStart(e, c)} draggable={isTestComplete || results[c.id] === 'correct'} result={results[c.id]}/>),
                      processing: processing.map(c => <DraggableComponent key={c.id} component={c} onDragStart={(e) => handleComponentDragStart(e, c)} draggable={isTestComplete || results[c.id] === 'correct'} result={results[c.id]}/>),
                      others: others.map(c => <DraggableComponent key={c.id} component={c} onDragStart={(e) => handleComponentDragStart(e, c)} draggable={isTestComplete || results[c.id] === 'correct'} result={results[c.id]}/>),
                      unsorted: [],
                    }[key]
                  }
                </DropZone>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        
        <div className="flex gap-2 p-2">
          <Button onClick={checkAnswers} size="sm">Vérifier</Button>
          <Button variant="outline" onClick={resetTest} size="sm">Réinitialiser</Button>
        </div>
        
        {isTestComplete && (
            <div className="p-3 mx-2 rounded-md bg-green-500/20 border border-green-600">
                <p className="font-semibold text-green-800 text-sm">Félicitations ! Vous pouvez maintenant glisser les composants sur la scène 3D.</p>
            </div>
        )}
      </div>
    </ScrollArea>
  );
}
