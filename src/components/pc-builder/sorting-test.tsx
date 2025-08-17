
'use client';

import React, { useMemo } from 'react';
import { Button } from '../ui/button';
import { useSorting } from './sorting-context';
import { useScene } from './scene-context';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Terminal, Cpu, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function SortingTest() {
  const { checkAnswers, results, allComponents } = useSorting();
  const { sceneComponents, connectivityAnalysis, isAnalyzing, analyzeConnectivity, resetAnalysis } = useScene();

  const isTestComplete = useMemo(() => {
    const totalComponents = allComponents.length;
    const correctCount = Object.values(results).filter(r => r === 'correct').length;
    return Object.keys(results).length > 0 && correctCount === totalComponents;
  }, [results, allComponents]);

  const hasBeenTested = Object.keys(results).length > 0;
  const hasSceneComponents = sceneComponents.length > 0;

  const normalizeItem = (item: unknown): string => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      return (
        (typeof obj.description === 'string' && obj.description) ||
        (typeof obj.message === 'string' && obj.message) ||
        (typeof obj.text === 'string' && obj.text) ||
        (typeof obj.id === 'string' && obj.id) ||
        JSON.stringify(obj)
      );
    }
    return String(item);
  };

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
        <div>
          <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Test 2: Analyse de connectivité (IA)
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Après avoir placé et connecté vos composants sur la scène 3D, l'IA analysera si votre installation est correcte.
          </p>
        </div>
        
        <div className="flex gap-2 mb-4">
          <Button 
            onClick={analyzeConnectivity} 
            disabled={!hasSceneComponents || isAnalyzing}
            size="sm"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              'Analyser la connectivité'
            )}
          </Button>
          {connectivityAnalysis && (
            <Button onClick={resetAnalysis} variant="outline" size="sm">
              Réinitialiser
            </Button>
          )}
        </div>

        {!hasSceneComponents && (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Aucun composant sur la scène</AlertTitle>
            <AlertDescription>
              Glissez d'abord quelques composants depuis l'onglet "Composants" vers la scène 3D, puis connectez-les entre eux.
            </AlertDescription>
          </Alert>
        )}

        {connectivityAnalysis && (
          <div className="space-y-4">
            <Alert variant={connectivityAnalysis.isValid ? "default" : "destructive"}>
              {connectivityAnalysis.isValid ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                Score: {connectivityAnalysis.score}/100
                {connectivityAnalysis.isValid ? " - Installation correcte !" : " - Installation à améliorer"}
              </AlertTitle>
              <AlertDescription>
                {connectivityAnalysis.feedback}
              </AlertDescription>
            </Alert>

            {connectivityAnalysis.issues.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Problèmes détectés</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {connectivityAnalysis.issues.map((issue, index) => (
                      <li key={index}>{normalizeItem(issue)}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {connectivityAnalysis.suggestions.length > 0 && (
              <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Suggestions d'amélioration</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {connectivityAnalysis.suggestions.map((suggestion, index) => (
                      <li key={index}>{normalizeItem(suggestion)}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
