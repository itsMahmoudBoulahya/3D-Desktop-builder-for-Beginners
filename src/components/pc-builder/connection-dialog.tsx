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
    
    // For devices that need power (monitor, printer, scanner, and now the central-unit)
    const needsPower = ['monitor', 'printer', 'scanner', 'central-unit'].includes(device.userData.type);
    const hasDataConnection = ['monitor', 'printer', 'scanner', 'keyboard', 'mouse', 'mic', 'webcam', 'speakers', 'headphones'].includes(device.userData.type);

    let availablePorts: PortObject[] = [];

    // Check for power ports if needed
    if (needsPower) {
       const powerPorts = ports.filter(p => p.userData.type === 'power-strip-outlet' && p.userData.accepts.includes(device.userData.type) && p.userData.connectedTo === null);
       availablePorts.push(...powerPorts);
    }
    
    // Check for data ports if needed
    if (hasDataConnection) {
        if (device.userData.type === 'monitor') {
            // Special case for monitor: it connects to an HDMI port on the tower
            const hdmiPorts = ports.filter(p => p.userData.type === 'hdmi' && p.userData.accepts.includes('monitor') && p.userData.connectedTo === null);
            availablePorts.push(...hdmiPorts);
        } else {
            // General case for other peripherals
            const dataPorts = ports.filter(p => p.userData.accepts.includes(device.userData.type) && p.userData.connectedTo === null && !p.userData.type.includes('power'));
            availablePorts.push(...dataPorts);
        }
    }
    
    return availablePorts;
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
          <DialogTitle>Connect {device.userData.info.split(': ')[1] || device.userData.info}</DialogTitle>
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
            <p className="col-span-2 text-sm text-muted-foreground text-center">No available ports for this device.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
