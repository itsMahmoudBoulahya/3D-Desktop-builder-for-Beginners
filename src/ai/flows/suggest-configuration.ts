// use server'

/**
 * @fileOverview Provides suggestions for device configurations based on a given activity.
 *
 * - suggestDeviceConfiguration - A function that suggests device configurations.
 * - SuggestDeviceConfigurationInput - The input type for the suggestDeviceConfiguration function.
 * - SuggestDeviceConfigurationOutput - The return type for the suggestDeviceConfiguration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDeviceConfigurationInputSchema = z.object({
  activity: z
    .string()
    .describe('The activity for which a device configuration is needed (e.g., gaming, video editing, general use).'),
});
export type SuggestDeviceConfigurationInput = z.infer<typeof SuggestDeviceConfigurationInputSchema>;

const SuggestDeviceConfigurationOutputSchema = z.object({
  monitor: z.string().describe('Suggested monitor for the activity.'),
  keyboard: z.string().describe('Suggested keyboard for the activity.'),
  mouse: z.string().describe('Suggested mouse for the activity.'),
  other: z.string().describe('Other relevant devices for the activity.'),
});
export type SuggestDeviceConfigurationOutput = z.infer<typeof SuggestDeviceConfigurationOutputSchema>;

export async function suggestDeviceConfiguration(input: SuggestDeviceConfigurationInput): Promise<SuggestDeviceConfigurationOutput> {
  return suggestDeviceConfigurationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDeviceConfigurationPrompt',
  input: {schema: SuggestDeviceConfigurationInputSchema},
  output: {schema: SuggestDeviceConfigurationOutputSchema},
  prompt: `You are an expert in recommending computer device configurations based on user activities.

  Based on the activity specified, suggest a suitable configuration of devices (monitor, keyboard, mouse, and other relevant devices) to optimize the setup for that activity.

  Activity: {{{activity}}}
  `,
});

const suggestDeviceConfigurationFlow = ai.defineFlow(
  {
    name: 'suggestDeviceConfigurationFlow',
    inputSchema: SuggestDeviceConfigurationInputSchema,
    outputSchema: SuggestDeviceConfigurationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
