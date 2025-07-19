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
    message: 'Activity must be at least 3 characters.',
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
        title: 'Error',
        description: result.error || 'Failed to get suggestions.',
      });
    }
    setLoading(false);
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-2">
        <Wand2 className="h-4 w-4" />
        Configuration Suggester
      </SidebarGroupLabel>
      <div className="p-2">
        <p className="text-sm text-muted-foreground mb-4">
          Describe an activity to get AI-powered hardware suggestions.
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="activity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Competitive gaming" {...field} />
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
              Suggest
            </Button>
          </form>
        </Form>

        {suggestion && (
          <ScrollArea className="mt-6 h-72">
            <div className="space-y-4 pr-4">
              <Card>
                <CardHeader className='p-4'>
                  <CardTitle className="text-base">Monitor</CardTitle>
                </CardHeader>
                <CardContent className='p-4 pt-0'>
                  <p className="text-sm text-muted-foreground">{suggestion.monitor}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='p-4'>
                  <CardTitle className="text-base">Keyboard</CardTitle>
                </CardHeader>
                <CardContent className='p-4 pt-0'>
                  <p className="text-sm text-muted-foreground">{suggestion.keyboard}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='p-4'>
                  <CardTitle className="text-base">Mouse</CardTitle>
                </CardHeader>
                <CardContent className='p-4 pt-0'>
                  <p className="text-sm text-muted-foreground">{suggestion.mouse}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='p-4'>
                  <CardTitle className="text-base">Other</CardTitle>
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
