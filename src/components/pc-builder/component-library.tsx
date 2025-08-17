
import React, { useMemo } from 'react';
import { Monitor, Keyboard, Mouse, Printer, Zap, Headphones, Mic, Speaker, Camera, Scan, Cpu, ArrowDownToLine, ArrowUpFromLine, Server, HelpCircle, RotateCcw, X, Usb } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { useSorting } from './sorting-context';
import type { Component, Category } from './sorting-context';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

type DraggableComponentProps = {
  component: Component;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, component: Component) => void;
  draggable: boolean;
  isUnsorted?: boolean;
};

const categoryLabels: Record<Exclude<Category, 'unsorted'>, string> = {
  input: "Périphériques d'entrée",
  output: "Périphériques de sortie",
  processing: "Traitement & Stockage",
  others: "Autres",
};


const DraggableComponent = ({ component, onDragStart, draggable: isDraggable, isUnsorted = false }: DraggableComponentProps) => {
  const { results, setPlacements } = useSorting();
  const result = results[component.id];

  const handleSelectCategory = (category: Exclude<Category, 'unsorted'>) => {
    setPlacements(prev => ({ ...prev, [component.id]: category }));
  }

  const handleRemove = () => {
    setPlacements(prev => ({ ...prev, [component.id]: 'unsorted' }));
  }

  const componentDiv = (
    <div className="relative group">
      <div
        draggable={isDraggable}
        onDragStart={(e) => onDragStart(e, component)}
        className={cn(
          "flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors h-full",
          isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-50",
          result === 'correct' && 'border-green-500 bg-green-500/10',
          result === 'incorrect' && 'border-red-500 bg-red-500/10'
        )}
      >
        {component.icon}
        <span className="mt-2 text-xs text-center">{component.name}</span>
      </div>
      {!isUnsorted && (
        <button
          onClick={handleRemove}
          className="absolute top-1 right-1 p-0.5 bg-background/50 rounded-full text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-opacity"
          aria-label={`Retirer ${component.name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );

  if (isUnsorted) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onContextMenu={(e) => { e.preventDefault(); if (!isDraggable) e.stopPropagation(); }}>
          {componentDiv}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {Object.entries(categoryLabels).map(([category, label]) => (
            <DropdownMenuItem key={category} onSelect={() => handleSelectCategory(category as Exclude<Category, 'unsorted'>)}>
              Placer dans : {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return componentDiv;
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
  console.log("ComponentLibrary rendered");
  const { allComponents, placements, setPlacements, results, resetTest } = useSorting();

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

  const { unsorted, input, output, processing, others } = useMemo(() => {
    return allComponents.reduce((acc, component) => {
      const category = placements[component.id] || 'unsorted';
      acc[category].push(component);
      return acc;
    }, { unsorted: [], input: [], output: [], processing: [], others: [] } as Record<Category | 'unsorted', Component[]>);
  }, [placements, allComponents]);

  console.log("Unsorted components:", unsorted);

  const isTestComplete = useMemo(() => {
    return Object.values(results).length > 0 && Object.values(results).every(r => r === 'correct');
  }, [results]);

  const categoryConfig: Record<Exclude<Category, 'unsorted'>, { label: string; icon: React.ReactNode; components: Component[] }> = {
    input: { label: "Périphériques d'entrée", icon: <ArrowDownToLine className="h-4 w-4" />, components: input },
    output: { label: 'Périphériques de sortie', icon: <ArrowUpFromLine className="h-4 w-4" />, components: output },
    processing: { label: 'Traitement & Stockage', icon: <Server className="h-4 w-4" />, components: processing },
    others: { label: 'Autres', icon: <Zap className="h-4 w-4" />, components: others },
  };
  
  return (
    <ScrollArea className="h-full px-2">
      <div className="space-y-4">
        <div className="p-2 border border-dashed rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground pl-1"><HelpCircle className="h-4 w-4" />Composants non triés</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetTest}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Réinitialiser le tri</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {unsorted.map(c => 
              <DraggableComponent 
                key={c.id} 
                component={c} 
                onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleComponentDragStart(e, c)} 
                draggable={!isTestComplete} 
                isUnsorted={true}
              />
            )}
          </div>
          {unsorted.length === 0 && <p className="text-xs text-muted-foreground p-4 text-center w-full">Tous les composants ont été triés ! Vous pouvez passer à l'onglet "Tests" pour vérifier vos réponses, ou glisser les composants sur la scène 3D.</p>}
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
                <DropZone onDrop={(e) => handleDrop(e, key as Category)} onDragOver={handleDragOver} isEmpty={config.components.length === 0}>
                  {config.components.map(c => 
                    <DraggableComponent 
                      key={c.id} 
                      component={c} 
                      onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleComponentDragStart(e, c)}
                      draggable={!isTestComplete && results[c.id] !== 'correct'}
                    />
                  )}
                </DropZone>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </ScrollArea>
  );
}
