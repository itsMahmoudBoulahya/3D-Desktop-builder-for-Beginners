'use client';

import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Cpu } from 'lucide-react';
import { ConfigSuggester } from '@/components/pc-builder/config-suggester';
import { PCBuilder3D } from '@/components/pc-builder/pc-builder-3d';

export function MainLayout() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
              <Cpu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-primary">Build-a-PC</h1>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-0">
          <SidebarGroup>
            <SidebarGroupLabel>Instructions</SidebarGroupLabel>
            <div className="px-2 text-sm text-muted-foreground flex flex-col gap-1">
              <p>Drag components around the scene.</p>
              <p>Connect peripherals to the PC tower by dragging components near a port.</p>
              <p>Hover on components to see info.</p>
              <div className='mt-2 space-y-1'>
                <div className="flex items-center gap-2"><span className="h-3 w-3 inline-block rounded-full bg-green-500"></span>Correct Connection</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 inline-block rounded-full bg-red-500"></span>Incorrect Connection</div>
              </div>
            </div>
          </SidebarGroup>
          <SidebarSeparator />
          <ConfigSuggester />
        </SidebarContent>
        <SidebarFooter>
            <p className="text-xs text-muted-foreground p-2 text-center">An educational tool for high school students.</p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-card/80 backdrop-blur-sm px-6 sticky top-0 z-10">
          <SidebarTrigger />
          <h1 className="text-xl font-semibold">3D PC Builder Simulator</h1>
        </header>
        <main className="flex-1 overflow-auto bg-background">
          <PCBuilder3D />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
