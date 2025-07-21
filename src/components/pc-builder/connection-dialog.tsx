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

    // For the power strip itself, it connects to the wall
    if (deviceType === 'power') {
      return ports.filter(
        (p) => p.userData.type === 'wall-power' && p.userData.connectedTo === null
      );
    }

    // Determine what kind of connections the device needs
    const needsPower = ['monitor', 'printer', 'scanner', 'central-unit'].includes(deviceType);
    const needsData = [
      'monitor', 'keyboard', 'mouse', 'printer', 'mic',
      'webcam', 'scanner', 'speakers', 'headphones'
    ].includes(deviceType);

    let availablePorts: PortObject[] = [];

    // Find available power ports if needed
    if (needsPower) {
      const powerPorts = ports.filter(
        (p) =>
          p.userData.type === 'power-strip-outlet' &&
          p.userData.accepts.includes(deviceType) &&
          p.userData.connectedTo === null
      );
      availablePorts.push(...powerPorts);
    }

    // Find available data ports if needed
    if (needsData) {
      if (deviceType === 'monitor') {
        // Monitor connects to HDMI on the tower
        const hdmiPorts = ports.filter(
          (p) =>
            p.userData.type === 'hdmi' &&
            p.userData.accepts.includes(deviceType) &&
            p.userData.connectedTo === null
        );
        availablePorts.push(...hdmiPorts);
      } else {
        // Other peripherals connect to ports that accept their type
        const dataPorts = ports.filter(
          (p) =>
            p.userData.accepts.includes(deviceType) &&
            !p.userData.type.includes('power') && // Exclude power ports from this check
            p.userData.connectedTo === null
        );
        availablePorts.push(...dataPorts);
      }
    }

    return availablePorts;
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
