import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: './schema.prisma',
  sqlite: {
    url: 'file:./dev.db',
  },
});
