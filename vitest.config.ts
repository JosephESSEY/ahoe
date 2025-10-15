import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,     // autorise describe/it sans import
    environment: 'node', // environnement Node.js pour Express
    include: [
      "src/**/__tests__/**/*.{test,spec}.{ts,tsx}", // tests dans __tests__
      "src/**/*.{test,spec}.{ts,tsx}" // fichiers de test à la racine
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**"
    ],
    coverage: {
      enabled: false,
      provider: 'v8', // utilise le moteur V8 de Node
      reporter: ['text', 'html', 'lcov'], // formats de rapport
      reportsDirectory: './coverage',
      include: ["src/**/*.{ts,tsx}"], // analyse tout le code source
      exclude: [ // fichiers à exclure de la couverture
        "**/*.d.ts",
        "**/__tests__/**",
        "**/__mocks__/**",
        "src/**/index.ts",
        "src/**/*.interface.ts"
      ],
      thresholds: { // seuils minimums
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
})