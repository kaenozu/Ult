const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const REPO_BASE_URL = 'https://raw.githubusercontent.com/sickn33/antigravity-awesome-skills/main';
const SKILLS_DIR = path.join(__dirname, 'imported');
const CATALOG_FILE = path.join(__dirname, 'AVAILABLE_SKILLS.md');

// Ensure stats directory exists
if (!fs.existsSync(SKILLS_DIR)) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
}

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                if (res.statusCode === 404) {
                    resolve(null); // Not found
                    return;
                }
                reject(new Error(`Request failed. Status Code: ${res.statusCode}`));
                return;
            }

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function listSkills() {
    console.log('Fetching skill catalog...');
    try {
        const catalogContent = await fetchUrl(`${REPO_BASE_URL}/CATALOG.md`);
        if (!catalogContent) {
            console.error('Failed to fetch CATALOG.md');
            return;
        }

        // Parse markdown table
        // Existing catalog format is | Name | Description | Tags | ...
        const lines = catalogContent.split('\n');
        const skills = [];
        let inTable = false;

        for (const line of lines) {
            if (line.includes('| --- |')) { // Table separator
                inTable = true;
                continue;
            }
            if (!inTable || !line.trim().startsWith('|')) continue;

            const parts = line.split('|').map(p => p.trim()).filter(p => p);
            if (parts.length >= 2) {
                // Extract name from markdown link if present [Name](link) -> Name
                let name = parts[0];
                const linkMatch = name.match(/\[(.*?)\]/);
                if (linkMatch) {
                    name = linkMatch[1];
                }
                skills.push({
                    name: name,
                    description: parts[1] || 'No description'
                });
            }
        }

        console.log(`\nFound ${skills.length} skills:\n`);
        skills.forEach(skill => {
            console.log(`- ${skill.name}: ${skill.description}`);
        });

        // Also save to LOCAL file for agent reference
        fs.writeFileSync(CATALOG_FILE, catalogContent);
        console.log(`\nSaved catalog to ${CATALOG_FILE}`);

    } catch (error) {
        console.error('Error listing skills:', error);
    }
}

async function installSkill(skillName) {
    if (!skillName) {
        console.error('Please provide a skill name.');
        return;
    }

    console.log(`Installing skill: ${skillName}...`);

    try {
        // 1. Try to fetch SKILL.md
        const skillUrl = `${REPO_BASE_URL}/skills/${skillName}/SKILL.md`;
        const skillContent = await fetchUrl(skillUrl);

        if (!skillContent) {
            console.error(`Skill '${skillName}' not found in remote repository.`);
            console.error(`Checked URL: ${skillUrl}`);
            return;
        }

        // 2. Save SKILL.md
        const localSkillPath = path.join(SKILLS_DIR, `${skillName}.md`);
        fs.writeFileSync(localSkillPath, skillContent);
        console.log(`Saved skill instructions to ${localSkillPath}`);

        // 3. Create Metadata JSON
        const metadataPath = path.join(SKILLS_DIR, `${skillName}.json`);
        const metadata = {
            name: skillName,
            description: `Imported from Antigravity Awesome Skills`,
            version: "1.0.0",
            auto_activate: false // Safe default
        };

        // Try to parse description from SKILL.md frontmatter if available
        const frontmatterMatch = skillContent.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
            const fm = frontmatterMatch[1];
            const descMatch = fm.match(/description:\s*(.*)/);
            if (descMatch) {
                metadata.description = descMatch[1].trim();
            }
        }

        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        console.log(`Created metadata at ${metadataPath}`);
        console.log(`\nSkill '${skillName}' installed successfully!`);

    } catch (error) {
        console.error(`Error installing skill '${skillName}':`, error);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'list':
            await listSkills();
            break;
        case 'install':
            await installSkill(args[1]);
            break;
        case 'update-catalog': // Alias for list but emphasizes the file creation
            await listSkills();
            break;
        default:
            console.log('Usage: node skills/skill-manager.js <command>');
            console.log('Commands:');
            console.log('  list                - List all available skills from remote and save to AVAILABLE_SKILLS.md');
            console.log('  install <skillName> - Download and install a skill');
    }
}

main();
