import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { PortObject, DraggableObject } from './pc-builder-3d';

interface ConnectionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  device: DraggableObject | null;
  ports: PortObject[];
  onConnect: (portId: string) => void;
}

export function ConnectionDialog({
  isOpen,
  onOpenChange,
  device,
  ports,
  onConnect,
}: ConnectionDialogProps) {
  if (!device) return null;

  const getAvailablePorts = () => {
    // For the power strip itself, it connects to the wall
    if (device.userData.type === 'power') { 
      return ports.filter(p => p.userData.type === 'wall-power' && p.userData.connectedTo === null);
    }
    
    // For devices that need power (monitor, printer, scanner, speakers, and now the central-unit)
    if (['monitor', 'printer', 'scanner', 'speakers', 'central-unit'].includes(device.userData.type)) {
       const powerPorts = ports.filter(p => p.userData.type === 'power-strip-outlet' && p.userData.connectedTo === null);
       if(powerPorts.length > 0) return powerPorts;
    }

    // For other devices connecting to the CPU
    return ports.filter(p => p.userData.accepts.includes(device.userData.type) && p.userData.connectedTo === null);
  }

  const availablePorts = getAvailablePorts();

  const getPortParentName = (port: PortObject) => {
    if (port.userData.type === 'wall-power') return "Wall";
    if (port.userData.type.includes('power-strip')) return "Power Strip";
    return "PC Tower";
  }


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {device.userData.info.split(': ')[1]}</DialogTitle>
          <DialogDescription>
            Select a port to connect to.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {availablePorts.length > 0 ? (
            availablePorts.map((port) => (
              <Button
                key={port.name}
                variant="outline"
                onClick={() => onConnect(port.name)}
              >
                {port.name.replace(/-/g, ' ').replace(/\d/g, m => ` ${m}`).toUpperCase()} ({getPortParentName(port)})
              </Button>
            ))
          ) : (
            <p className="col-span-2 text-sm text-muted-foreground text-center">No available ports.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
