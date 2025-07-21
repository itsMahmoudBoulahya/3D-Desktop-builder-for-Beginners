
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
            <TabsList className="grid w-full grid-cols-2 mx-auto max-w-[calc(100%-2rem)] rounded-lg">
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
              <TabsTrigger value="composants">Composants</TabsTrigger>
            </TabsList>
            <TabsContent value="instructions" className="flex-1 overflow-auto p-4">
              <h2 className="text-lg font-semibold mb-2">📝 Instructions de l’activité :</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Bienvenue dans cette simulation interactive ! Ton objectif est de reconstituer un poste informatique fonctionnel en triant, plaçant et connectant les composants correctement.
              </p>
              
              <h3 className="text-md font-semibold mt-4 mb-1">🔹 Étape 1 : Trier les composants</h3>
              <p className="text-sm text-muted-foreground">Fais glisser chaque composant dans sa catégorie correcte :</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground pl-2 mt-1 space-y-1">
                <li><span className="font-semibold">Entrée :</span> (exemples : clavier, souris, micro...)</li>
                <li><span className="font-semibold">Sortie :</span> (exemples : écran, imprimante, haut-parleurs...)</li>
                <li><span className="font-semibold">Traitement :</span> (exemple : unité centrale)</li>
                <li><span className="font-semibold">Autres :</span> (exemples : multiprise, câble HDMI, câble USB...)</li>
              </ul>

              <h3 className="text-md font-semibold mt-4 mb-1">🔹 Étape 2 : Placer les composants</h3>
              <p className="text-sm text-muted-foreground">
                Place les différents composants sur la table virtuelle. Organise-les comme dans un vrai poste de travail informatique.
              </p>

              <h3 className="text-md font-semibold mt-4 mb-1">🔹 Étape 3 : Connecter les composants</h3>
              <p className="text-sm text-muted-foreground">
                Connecte tous les appareils entre eux pour rendre le poste fonctionnel. Tu dois utiliser les bons câbles (HDMI, USB, alimentation, etc.).
              </p>

              <h3 className="text-md font-semibold mt-4 mb-1">🔹 Étape 4 : Vérification</h3>
              <p className="text-sm text-muted-foreground">
                Une fois tous les éléments connectés, clique sur "Lancer le test" pour vérifier si :
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground pl-2 mt-1 space-y-1">
                <li>L’ordinateur s’allume.</li>
                <li>L’écran affiche une image.</li>
                <li>Le clavier et la souris fonctionnent.</li>
                <li>Le son sort des haut-parleurs.</li>
                <li>Le micro capte le son.</li>
                <li>L’imprimante est prête à imprimer.</li>
              </ul>
              
              <h3 className="text-md font-semibold mt-4 mb-1">🧠 Conseil :</h3>
              <p className="text-sm text-muted-foreground">
                Pense à l’utilité de chaque composant et au type de câble ou de port utilisé pour le brancher !
              </p>

              <p className="text-sm text-muted-foreground font-semibold mt-4">Bonne chance !</p>
            </TabsContent>
            <TabsContent value="composants" className="flex-1 overflow-auto">
              <ComponentLibrary />
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
