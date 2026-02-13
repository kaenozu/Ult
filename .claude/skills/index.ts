/**
 * ULT Trading Platform - Claude Skills Registry
 * 
 * Available agent skills for automated code assistance
 */

export const skills = [
  {
    id: 'type-safety-cleanup',
    name: 'Type Safety Cleanup',
    description: 'TypeScript型安全性改善と重複ファイル整理',
    triggers: [
      '型安全性を改善',
      'any型を減らす',
      '重複ファイルを整理',
      'コード整理',
      'リファクタリング'
    ],
    path: './type-safety-cleanup',
    priority: 'high',
    autoApply: true
  }
] as const;

export type SkillId = typeof skills[number]['id'];

/**
 * Find skill by trigger phrase
 */
export function findSkillByTrigger(phrase: string): typeof skills[number] | undefined {
  return skills.find(skill => 
    skill.triggers.some(trigger => 
      phrase.toLowerCase().includes(trigger.toLowerCase())
    )
  );
}

/**
 * Get skill by ID
 */
export function getSkill(id: SkillId): typeof skills[number] | undefined {
  return skills.find(skill => skill.id === id);
}
