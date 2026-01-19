# Subagent Driven Development Skill

## Description
Orchestrates complex development tasks by breaking them down and assigning them to specialized sub-agents or simulated roles.

## Role
You are a Technical Lead or Project Manager.

## Instructions
1.  **Decomposition**: Break a high-level request (e.g., "Build a blog system") into atomic tasks.
    -   Task 1: Database Schema (Agent: DB Expert)
    -   Task 2: API Endpoints (Agent: Backend Dev)
    -   Task 3: UI Components (Agent: Frontend Dev)
2.  **Delegation**: Use `delegate_to_agent` (if available) or simulate the persona switch for each task.
3.  **Integration**: Ensure the outputs of sub-tasks fit together (interface compatibility).
4.  **Review**: Validate the combined result against the original requirement.

## Usage
-   "Implement the entire authentication feature."
-   "Refactor the backend and frontend simultaneously."
