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
    const deviceType = device.userData.type;
    let availablePorts: PortObject[] = [];

    // Rule 1: The Power Strip connects to the Wall Outlet
    if (deviceType === 'power') {
      return ports.filter(
        (p) => p.userData.type === 'wall-power' && p.userData.connectedTo === null
      );
    }

    // Rule 2: Devices that need power connect to the Power Strip
    const needsPower = ['monitor', 'printer', 'scanner', 'central-unit'].includes(deviceType);
    if (needsPower) {
      const powerPorts = ports.filter(
        (p) =>
          p.userData.type === 'power-strip-outlet' &&
          p.userData.connectedTo === null
      );
      availablePorts.push(...powerPorts);
    }

    // Rule 3: Devices that need a data connection connect to the PC Tower
    const needsData = [
      'monitor', 'keyboard', 'mouse', 'printer', 'mic',
      'webcam', 'scanner', 'speakers', 'headphones'
    ].includes(deviceType);
    if (needsData) {
      const dataPorts = ports.filter(
        (p) =>
          !p.userData.type.includes('power') && // Exclude all power-related ports
          p.userData.accepts.includes(deviceType) &&
          p.userData.connectedTo === null
      );
      availablePorts.push(...dataPorts);
    }
    
    // Filter out duplicate ports if any (shouldn't happen with this logic, but good practice)
    const uniquePortIds = new Set();
    return availablePorts.filter(port => {
      if (uniquePortIds.has(port.name)) {
        return false;
      }
      uniquePortIds.add(port.name);
      return true;
    });
  };

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
