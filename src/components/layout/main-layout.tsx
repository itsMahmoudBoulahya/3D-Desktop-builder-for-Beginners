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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { PCBuilder3D } from '@/components/pc-builder/pc-builder-3d';
import { ComponentLibrary } from '../pc-builder/component-library';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '../ui/scroll-area';

export function MainLayout() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circuit-board h-5 w-5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M11 9h4a2 2 0 0 0 2-2V3"/><path d="M11 15h4a2 2 0 0 1 2 2v4"/><path d="M14 9h2"/><path d="M14 15h2"/><path d="M9 9h2"/><path d="M9 15h2"/><circle cx="9" cy="9" r="1"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="15" cy="15" r="1"/></svg>
            </Button>
            <h1 className="text-lg font-semibold text-primary">Build-a-PC</h1>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-0">
          <Tabs defaultValue="composants" className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-3 mx-auto max-w-[calc(100%-2rem)] rounded-lg">
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
              <TabsTrigger value="composants">Composants</TabsTrigger>
              <TabsTrigger value="tests">Tests</TabsTrigger>
            </TabsList>
            <TabsContent value="instructions" className="flex-1 overflow-auto p-4">
              <h2 className="text-lg font-semibold mb-2">Instructions</h2>
              <p className="text-sm text-muted-foreground">
                Bienvenue dans le simulateur de montage de PC !
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                1. Allez dans l'onglet "Composants".
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                2. Faites glisser et déposez les composants sur le bureau.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                3. Cliquez sur un composant pour le sélectionner, puis cliquez sur "Connecter" pour voir les ports disponibles.
              </p>
            </TabsContent>
            <TabsContent value="composants" className="flex-1 overflow-auto">
              <ComponentLibrary />
            </TabsContent>
            <TabsContent value="tests" className="flex-1 overflow-auto p-4">
               <h2 className="text-lg font-semibold mb-2">Tests</h2>
               <p className="text-sm text-muted-foreground">
                Cette section est en cours de développement. Revenez bientôt pour tester votre configuration !
               </p>
            </TabsContent>
          </Tabs>
        </SidebarContent>
        <SidebarFooter>
            <p className="text-xs text-muted-foreground p-2 text-center">Un outil pédagogique pour les lycéens.</p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-card/80 backdrop-blur-sm px-6 sticky top-0 z-10">
          <SidebarTrigger />
          <h1 className="text-xl font-semibold">Simulateur de montage de PC 3D</h1>
        </header>
        <main className="flex-1 overflow-auto bg-background">
          <PCBuilder3D />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
