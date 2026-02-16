# Imported Skills Index

This directory contains skills imported from [Awesome Claude Skills](https://github.com/BehiSecc/awesome-claude-skills).

## Imported Skills (Local)
| Skill Name | Description | Status |
| :--- | :--- | :--- |
| **[Web Artifacts Builder](web-artifacts-builder.md)** | Creates elaborate HTML artifacts using React, Tailwind, shadcn/ui. | ✅ Imported |
| **[Test Driven Development](test-driven-development.md)** | Guides TDD workflow (Red-Green-Refactor). | ✅ Imported |
| **[Using Git Worktrees](using-git-worktrees.md)** | Manages git worktrees safely. | ✅ Imported |

## External Skills (Reference)
| Skill Name | Source | Description |
| :--- | :--- | :--- |
| **Root Cause Tracing** | [obra/superpowers](https://github.com/obra/superpowers/tree/main/skills/debugging/root-cause-tracing) | Traces errors to their source. (Import pending) |
| **Brainstorming** | [obra/superpowers](https://github.com/obra/superpowers/tree/main/skills/brainstorming) | Structured design thinking. |

## How to Use
1.  **Enable**: The skills in this directory are available but `auto_activate` is set to `false` by default. To use them, you can manually view the `.md` file or move them to the root `skills/` directory if your agent only scans the root. A better approach is to use the `enable_skill` tool if supported, or explicitly reference them.
2.  **View**: Use `view_file` to read the skill instructions.
