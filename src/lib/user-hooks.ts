import type { Payload } from 'payload';

/**
 * Creates a default address list for a newly registered user.
 * This ensures every user has at least one address list to save places to.
 */
export async function createDefaultAddressList(
  payload: Payload,
  userId: number | string
): Promise<void> {
  try {
    await payload.create({
      collection: 'address-lists',
      data: {
        name: 'Saved Places',
        description: 'Your default list for saving places of interest',
        user: userId,
        isDefault: true,
      },
    });
  } catch (error) {
    // Log the error but don't fail user creation
    console.error('Failed to create default address list for user:', userId, error);
  }
}
