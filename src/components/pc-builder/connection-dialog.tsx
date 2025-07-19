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

  const availablePorts = ports.filter(p => p.userData.connectedTo === null);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {device.userData.info.split(': ')[1]}</DialogTitle>
          <DialogDescription>
            Select a port on the CPU Tower to connect to.
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
                {port.name.toUpperCase()} ({port.userData.type})
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
