
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

    const deviceType = device.userData.type;
    const deviceNeeds = device.userData.needs;
    const existingConnections = connections.get(device.name) || [];

    const hasPowerConnection = existingConnections.some(c => c.connectionType === 'power');
    const hasDataConnection = existingConnections.some(c => c.connectionType === 'data');
    
    return ports.filter(port => {
      // Port is already occupied
      if (port.userData.connectedTo !== null) {
        return false;
      }
      
      // Check if the port accepts the device type
      const portAcceptsDevice = port.userData.accepts.includes(deviceType);
      if (!portAcceptsDevice) {
        return false;
      }

      // Logic for power connections
      if (deviceNeeds.power && !hasPowerConnection && port.userData.connectionType === 'power') {
        return true;
      }

      // Logic for data connections
      if (deviceNeeds.data && !hasDataConnection && port.userData.connectionType === 'data') {
        // If the device needs a specific data type (like hdmi, mic-in), check if the port type matches
        if(deviceNeeds.dataType && deviceNeeds.dataType === port.userData.type) {
            return true;
        }
        // If the device needs a generic usb, and the port is a usb port
        if(deviceNeeds.dataType === 'usb' && port.userData.type === 'usb'){
            return true;
        }
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
