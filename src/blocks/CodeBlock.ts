import type { Block } from 'payload';

export const CodeBlock: Block = {
  slug: 'code',
  labels: {
    singular: 'Code Block',
    plural: 'Code Blocks',
  },
  fields: [
    {
      name: 'language',
      type: 'select',
      defaultValue: 'javascript',
      options: [
        { label: 'JavaScript', value: 'javascript' },
        { label: 'TypeScript', value: 'typescript' },
        { label: 'Python', value: 'python' },
        { label: 'HTML', value: 'html' },
        { label: 'CSS', value: 'css' },
        { label: 'JSON', value: 'json' },
        { label: 'Bash', value: 'bash' },
        { label: 'SQL', value: 'sql' },
        { label: 'Plain Text', value: 'plaintext' },
      ],
    },
    {
      name: 'code',
      type: 'code',
      required: true,
      admin: {
        language: 'javascript',
      },
    },
  ],
};
