'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Wand2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarGroup, SidebarGroupLabel } from '../ui/sidebar';
import type { SuggestDeviceConfigurationOutput } from '@/ai/flows/suggest-configuration';
import { getSuggestedConfig } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';

const FormSchema = z.object({
  activity: z.string().min(3, {
    message: 'L\'activité doit comporter au moins 3 caractères.',
  }),
});

export function ConfigSuggester() {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestDeviceConfigurationOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      activity: '',
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setLoading(true);
    setSuggestion(null);
    const result = await getSuggestedConfig(data);
    if (result.success && result.data) {
      setSuggestion(result.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: result.error || 'Impossible d\'obtenir des suggestions.',
      });
    }
    setLoading(false);
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-2">
        <Wand2 className="h-4 w-4" />
        Suggesteur de Configuration
      </SidebarGroupLabel>
      <div className="p-2">
        <p className="text-sm text-muted-foreground mb-4">
          Décrivez une activité pour obtenir des suggestions de matériel par IA.
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="activity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activité</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Jeu compétitif" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Suggérer
            </Button>
          </form>
        </Form>

        {suggestion && (
          <ScrollArea className="mt-6 h-72">
            <div className="space-y-4 pr-4">
              <Card>
                <CardHeader className='p-4'>
                  <CardTitle className="text-base">Moniteur</CardTitle>
                </CardHeader>
                <CardContent className='p-4 pt-0'>
                  <p className="text-sm text-muted-foreground">{suggestion.monitor}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='p-4'>
                  <CardTitle className="text-base">Clavier</CardTitle>
                </CardHeader>
                <CardContent className='p-4 pt-0'>
                  <p className="text-sm text-muted-foreground">{suggestion.keyboard}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='p-4'>
                  <CardTitle className="text-base">Souris</CardTitle>
                </CardHeader>
                <CardContent className='p-4 pt-0'>
                  <p className="text-sm text-muted-foreground">{suggestion.mouse}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='p-4'>
                  <CardTitle className="text-base">Autre</CardTitle>
                </CardHeader>
                <CardContent className='p-4 pt-0'>
                  <p className="text-sm text-muted-foreground">{suggestion.other}</p>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        )}
      </div>
    </SidebarGroup>
  );
}
