import React from 'react';
import { Monitor, Keyboard, Mouse, Printer, Zap, Headphones, Mic, Speaker, Camera, Scan, Cpu } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

const components = [
  { name: 'central-unit', type: 'central-unit', info: 'Central Unit', icon: <Cpu className="h-6 w-6" /> },
  { name: 'monitor', type: 'monitor', info: 'Output Device: Monitor', icon: <Monitor className="h-6 w-6" /> },
  { name: 'keyboard', type: 'keyboard', info: 'Input Device: Keyboard', icon: <Keyboard className="h-6 w-6" /> },
  { name: 'mouse', type: 'mouse', info: 'Input Device: Mouse', icon: <Mouse className="h-6 w-6" /> },
  { name: 'printer', type: 'printer', info: 'Output Device: Printer', icon: <Printer className="h-6 w-6" /> },
  { name: 'power-strip', type: 'power-strip', info: 'Power Strip', icon: <Zap className="h-6 w-6" /> },
  { name: 'headphones', type: 'headphones', info: 'Output Device: Headphones', icon: <Headphones className="h-6 w-6" /> },
  { name: 'mic', type: 'mic', info: 'Input Device: Microphone', icon: <Mic className="h-6 w-6" /> },
  { name: 'speakers', type: 'speakers', info: 'Output Device: Speakers', icon: <Speaker className="h-6 w-6" /> },
  { name: 'webcam', type: 'webcam', info: 'Input Device: Webcam', icon: <Camera className="h-6 w-6" /> },
  { name: 'scanner', type: 'scanner', info: 'Input Device: Scanner', icon: <Scan className="h-6 w-6" /> },
];

export function ComponentLibrary() {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, component: any) => {
    const { icon, ...serializableComponent } = component;
    e.dataTransfer.setData('application/json', JSON.stringify(serializableComponent));
  };

  return (
    <ScrollArea className="h-72">
      <div className="p-2 grid grid-cols-2 gap-2">
        {components.map((component) => (
          <div
            key={component.name}
            draggable
            onDragStart={(e) => handleDragStart(e, component)}
            className="flex flex-col items-center justify-center p-4 border rounded-lg cursor-grab active:cursor-grabbing hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {component.icon}
            <span className="mt-2 text-xs text-center">{component.info.split(': ')[1] || component.info}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
