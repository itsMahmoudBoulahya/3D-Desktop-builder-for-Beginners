'use server';

import { suggestDeviceConfiguration } from '@/ai/flows/suggest-configuration';
import { z } from 'zod';

const SuggestDeviceConfigurationInputSchema = z.object({
    activity: z.string(),
});

export async function getSuggestedConfig(input: { activity: string }) {
  const parsedInput = SuggestDeviceConfigurationInputSchema.safeParse(input);

  if (!parsedInput.success) {
    return { success: false, error: 'Invalid input.' };
  }

  try {
    const result = await suggestDeviceConfiguration(parsedInput.data);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'An error occurred while fetching suggestions.' };
  }
}
