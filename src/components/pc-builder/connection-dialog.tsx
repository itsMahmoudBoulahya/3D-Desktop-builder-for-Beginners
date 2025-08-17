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
import type { Line } from 'three';

interface ConnectionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  device: DraggableObject | null;
  ports: PortObject[];
  onConnect: (portId: string, connectionType: 'power' | 'data' | string) => void;
  connections: Map<string, { line: Line, toPortId: string, connectionType: string }[]>;
}

export function ConnectionDialog({
  isOpen,
  onOpenChange,
  device,
  ports,
  onConnect,
  connections,
}: ConnectionDialogProps) {
  if (!device) return null;

  const getAvailablePorts = () => {
    if (!device) return [];

    const deviceNeeds = device.userData.needs;
    const existingConnections = connections.get(device.name) || [];
    
    const hasPowerConnection = existingConnections.some(c => c.connectionType === 'power');
    const connectedDataTypes = existingConnections
      .filter(c => c.connectionType === 'data')
      .map(c => {
        const connectedPort = ports.find(p => p.name === c.toPortId);
        return connectedPort?.userData.type;
      })
      .filter(Boolean);

    return ports.filter(port => {
      // Port is already occupied
      if (port.userData.connectedTo && port.userData.connectedTo !== device.name) {
        return false;
      }
      
      const portAcceptsDevice = port.userData.accepts.includes(device.userData.type);
      if (!portAcceptsDevice) {
        return false;
      }
      
      // Power connection logic
      if (port.userData.connectionType === 'power') {
        return deviceNeeds.power && !hasPowerConnection;
      }

      // Data connection logic
      if (port.userData.connectionType === 'data') {
        if (!deviceNeeds.data) return false;

        const requiredDataTypes = Array.isArray(deviceNeeds.dataType) ? deviceNeeds.dataType : [deviceNeeds.dataType];
        const portType = port.userData.type;

        // Check if the port's data type is needed and not already connected
        return requiredDataTypes.includes(portType) && !connectedDataTypes.includes(portType);
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
    if (port.userData.type === 'wall-power') return "Mur";
    return "Inconnu";
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg leading-relaxed">Connecter {device.userData.info.split(': ')[1] || device.userData.info}</DialogTitle>
          <DialogDescription>
            Sélectionnez un port auquel vous connecter. Cet appareil peut nécessiter plusieurs connexions.
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
                    {port.name.replace(/-/g, ' ').toUpperCase()} ({getPortParentName(port)})
                </Button>
                ))
            ) : (
                <p className="col-span-2 text-sm text-muted-foreground text-center">Aucun port disponible pour cet appareil.</p>
            )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
