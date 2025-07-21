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
import { ScrollArea } from '../ui/scroll-area';

interface ConnectionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  device: DraggableObject | null;
  ports: PortObject[];
  onConnect: (portId: string, connectionType: 'power' | 'data') => void;
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
    const deviceType = device.userData.type;
    const deviceNeedsPower = ['central-unit', 'monitor', 'printer', 'scanner', 'power-strip'].includes(deviceType);
    const deviceNeedsData = !['power-strip'].includes(deviceType);
    
    return ports.filter(port => {
      // Port is already occupied
      if (port.userData.connectedTo !== null) {
        return false;
      }
      
      const portAcceptsDevice = port.userData.accepts.includes(deviceType);
      
      if (deviceNeedsPower && port.userData.connectionType === 'power' && portAcceptsDevice) {
        return true;
      }

      if (deviceNeedsData && port.userData.connectionType === 'data' && portAcceptsDevice) {
        return true;
      }

      return false;
    });
  };

  const availablePorts = getAvailablePorts();

  const getPortParentName = (port: PortObject) => {
    let parent = port.parent;
    while (parent && !parent.userData.id) {
        parent = parent.parent;
    }
    if (parent && parent.userData.info) {
        return parent.userData.info.split(': ')[1] || parent.userData.info;
    }
    if (port.userData.type === 'wall-power') return "Wall";
    return "Unknown";
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
        <ScrollArea className="max-h-60">
            <div className="grid grid-cols-2 gap-4 py-4 pr-4">
            {availablePorts.length > 0 ? (
                availablePorts.map((port) => (
                <Button
                    key={port.name}
                    variant="outline"
                    onClick={() => onConnect(port.name, port.userData.connectionType)}
                >
                    {port.name.replace(/-/g, ' ').replace(/\d/g, m => ` ${m}`).toUpperCase()} ({getPortParentName(port)})
                </Button>
                ))
            ) : (
                <p className="col-span-2 text-sm text-muted-foreground text-center">No available ports for this device.</p>
            )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
