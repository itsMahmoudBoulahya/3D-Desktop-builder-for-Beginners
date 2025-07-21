
'use client';

import React, { useMemo } from 'react';
import { Button } from '../ui/button';
import { useSorting } from './sorting-context';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Terminal } from 'lucide-react';

export function SortingTest() {
  const { checkAnswers, resetTest, results } = useSorting();

  const isTestComplete = useMemo(() => {
    const totalComponents = 11; // Hardcoded for now, should come from context ideally
    const correctCount = Object.values(results).filter(r => r === 'correct').length;
    return Object.keys(results).length > 0 && correctCount === totalComponents;
  }, [results]);

  const hasBeenTested = Object.keys(results).length > 0;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-md font-semibold mb-2">Test 1: Tri des périphériques</h3>
        <p className="text-sm text-muted-foreground">
          Après avoir trié les composants dans l'onglet "Composants", cliquez sur "Vérifier" pour voir votre résultat.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={checkAnswers} size="sm">Vérifier</Button>
        <Button variant="outline" onClick={resetTest} size="sm">Réinitialiser</Button>
      </div>
      
      {hasBeenTested && (
        isTestComplete ? (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Félicitations !</AlertTitle>
            <AlertDescription>
              Vous avez correctement trié tous les composants. Vous pouvez maintenant les glisser sur la scène 3D depuis l'onglet "Composants".
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Résultat du test</AlertTitle>
            <AlertDescription>
              Certains composants ne sont pas dans la bonne catégorie. Retournez à l'onglet "Composants" pour corriger vos erreurs (en rouge).
            </AlertDescription>
          </Alert>
        )
      )}

      <div className="pt-8">
        <h3 className="text-md font-semibold mb-2 text-muted-foreground/50">Autres tests</h3>
        <p className="text-sm text-muted-foreground/50">
          D'autres tests seront bientôt disponibles...
        </p>
      </div>
    </div>
  );
}
