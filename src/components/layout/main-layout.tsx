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
import { Cpu, HardDrive } from 'lucide-react';
import { ConfigSuggester } from '@/components/pc-builder/config-suggester';
import { PCBuilder3D } from '@/components/pc-builder/pc-builder-3d';
import { ComponentLibrary } from '../pc-builder/component-library';

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
            <SidebarGroupLabel className='flex items-center gap-2'>
              <HardDrive className='h-4 w-4' />
              Component Library
            </SidebarGroupLabel>
            <ComponentLibrary />
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
