const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db',
    },
  },
});

const bundlesData = [
  {
    category: "Essentials & Core",
    bundles: [
      {
        name: "🚀 The Essentials Starter Pack",
        skills: ["concise-planning", "lint-and-validate", "git-pushing", "kaizen", "systematic-debugging"]
      }
    ]
  },
  {
    category: "Security & Compliance",
    bundles: [
      {
        name: "🛡️ The Security Engineer Pack",
        skills: ["ethical-hacking-methodology", "burp-suite-testing", "top-web-vulnerabilities", "linux-privilege-escalation", "cloud-penetration-testing", "security-auditor", "vulnerability-scanner"]
      },
      {
        name: "🔐 The Security Developer Pack",
        skills: ["api-security-best-practices", "auth-implementation-patterns", "backend-security-coder", "frontend-security-coder", "cc-skill-security-review", "pci-compliance"]
      }
    ]
  },
  {
    category: "Web Development",
    bundles: [
      {
        name: "🌐 The Web Wizard Pack",
        skills: ["frontend-design", "react-best-practices", "react-patterns", "nextjs-best-practices", "tailwind-patterns", "form-cro", "seo-audit"]
      },
      {
        name: "🖌️ The Web Designer Pack",
        skills: ["ui-ux-pro-max", "frontend-design", "3d-web-experience", "canvas-design", "mobile-design", "scroll-experience"]
      },
      {
        name: "⚡ The Full-Stack Developer Pack",
        skills: ["senior-fullstack", "frontend-developer", "backend-dev-guidelines", "api-patterns", "database-design", "stripe-integration"]
      }
    ]
  }
];

async function main() {
  for (const cat of bundlesData) {
    const category = await prisma.skillCategory.upsert({
      where: { name: cat.category },
      update: {},
      create: { name: cat.category },
    });

    for (const b of cat.bundles) {
      const bundle = await prisma.skillBundle.upsert({
        where: { name: b.name },
        update: { categoryId: category.id },
        create: {
          name: b.name,
          categoryId: category.id,
        },
      });

      for (const s of b.skills) {
        await prisma.bundleSkill.upsert({
          where: {
            name_bundleId: {
              name: s,
              bundleId: bundle.id,
            },
          },
          update: {},
          create: {
            name: s,
            bundleId: bundle.id,
          },
        });
      }
    }
  }
  console.log("Data seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
