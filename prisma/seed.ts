// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// async function main() {
//   // Create default themes
//   const defaultThemes = [
//     {
//       name: 'Light',
//       description: 'Default light theme',
//       isDefault: true,
//       colors: {
//         primary: '#000000',
//         primaryForeground: '#ffffff',
//         secondary: '#f5f5f5',
//         secondaryForeground: '#171717',
//         background: '#ffffff',
//         foreground: '#0a0a0a',
//         muted: '#f5f5f5',
//         mutedForeground: '#737373',
//         accent: '#404040',
//         accentForeground: '#ffffff',
//         destructive: '#dc2626',
//         destructiveForeground: '#ffffff',
//         border: '#e5e5e5',
//         input: '#e5e5e5',
//         ring: '#000000',
//         card: '#ffffff',
//         cardForeground: '#0a0a0a',
//         popover: '#ffffff',
//         popoverForeground: '#0a0a0a'
//       }
//     },
//     {
//       name: 'Dark',
//       description: 'Default dark theme',
//       isDefault: true,
//       colors: {
//         primary: '#ffffff',
//         primaryForeground: '#0a0a0a',
//         secondary: '#1a1a1a',
//         secondaryForeground: '#f5f5f5',
//         background: '#0a0a0a',
//         foreground: '#ffffff',
//         muted: '#1a1a1a',
//         mutedForeground: '#a3a3a3',
//         accent: '#f5f5f5',
//         accentForeground: '#0a0a0a',
//         destructive: '#ef4444',
//         destructiveForeground: '#ffffff',
//         border: '#262626',
//         input: '#262626',
//         ring: '#ffffff',
//         card: '#0a0a0a',
//         cardForeground: '#ffffff',
//         popover: '#0a0a0a',
//         popoverForeground: '#ffffff'
//       }
//     }
//   ];

//   for (const theme of defaultThemes) {
//     await prisma.theme.upsert({
//       where: { name: theme.name },
//       update: theme,
//       create: theme,
//     });
//   }

//   console.log('Seed data created successfully');
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });