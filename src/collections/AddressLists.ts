import type { CollectionConfig, Where } from 'payload';

export const AddressLists: CollectionConfig = {
  slug: 'address-lists',
  admin: {
    useAsTitle: 'name',
    group: 'User Data',
    defaultColumns: ['name', 'user', 'isDefault', 'createdAt'],
    description: 'User-created lists for organizing saved addresses',
  },
  access: {
    // Users can only read their own address lists; admins can read all
    read: ({ req }): boolean | Where => {
      if (!req.user) return false;
      if (['admin', 'moderator'].includes(req.user.role as string)) return true;
      return {
        user: {
          equals: req.user.id,
        },
      };
    },
    // Only verified users can create address lists
    create: ({ req }) => {
      if (!req.user?._verified) return false;
      return true;
    },
    // Users can only update their own address lists; admins can update all
    update: ({ req }): boolean | Where => {
      if (!req.user?._verified) return false;
      if (req.user?.role === 'admin') return true;
      return {
        user: {
          equals: req.user.id,
        },
      };
    },
    // Users can only delete their own address lists; admins can delete all
    delete: ({ req }): boolean | Where => {
      if (!req.user?._verified) return false;
      if (req.user?.role === 'admin') return true;
      return {
        user: {
          equals: req.user.id,
        },
      };
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 100,
      admin: {
        description: 'Name of the address list (e.g., "Favorites", "Work Area", "Dream Homes")',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional description for this list',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Owner of this address list',
      },
      // Automatically set to current user on create
      hooks: {
        beforeChange: [
          ({ req, operation, value }) => {
            // On create, always set to current user (unless admin is creating for someone)
            if (operation === 'create' && req.user) {
              if (req.user.role !== 'admin' || !value) {
                return req.user.id;
              }
            }
            return value;
          },
        ],
      },
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Is this the default list for saving new addresses?',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Ensure user is set on create
        if (operation === 'create' && req.user && !data.user) {
          data.user = req.user.id;
        }

        // If this list is being set as default, unset other default lists for this user
        if (data.isDefault && req.payload) {
          const userId = data.user || req.user?.id;
          if (userId) {
            await req.payload.update({
              collection: 'address-lists',
              where: {
                and: [
                  { user: { equals: userId } },
                  { isDefault: { equals: true } },
                ],
              },
              data: {
                isDefault: false,
              },
            });
          }
        }

        return data;
      },
    ],
    beforeDelete: [
      async ({ req, id }) => {
        // Prevent deletion of default list if it has addresses
        if (req.payload) {
          const list = await req.payload.findByID({
            collection: 'address-lists',
            id,
          });

          if (list?.isDefault) {
            const addressCount = await req.payload.count({
              collection: 'addresses',
              where: {
                addressList: { equals: id },
              },
            });

            if (addressCount.totalDocs > 0) {
              throw new Error(
                'Cannot delete the default address list while it contains addresses. Please move or delete the addresses first, or set another list as default.'
              );
            }
          }
        }
      },
    ],
  },
};
