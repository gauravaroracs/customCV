import { CvEditProposal, ResumeData } from "@/types/resume";

function normalizeBullets(lines: string[]) {
  return lines.map((line) => line.trim()).filter(Boolean);
}

/** Merge selected JD proposals into a CV copy (working CV). Applies patches in array order. */
export function applyCvProposals(base: ResumeData, proposals: CvEditProposal[]): ResumeData {
  const next: ResumeData = {
    ...base,
    personal: { ...base.personal },
    skills: Object.fromEntries(
      Object.entries(base.skills).map(([group, values]) => [group, [...values]])
    ),
    languages: base.languages.map((language) => ({ ...language })),
    education: base.education.map((education) => ({
      ...education,
      details: [...education.details]
    })),
    awards: base.awards.map((award) => ({ ...award })),
    experience: base.experience.map((experience) => ({
      ...experience,
      bullets: [...experience.bullets]
    })),
    projects: base.projects.map((project) => ({
      ...project,
      bullets: [...project.bullets]
    }))
  };

  for (const proposal of proposals) {
    switch (proposal.patchType) {
      case "profile": {
        const text = proposal.profileText.trim();
        if (text) {
          next.profile = text;
        }
        break;
      }
      case "skills": {
        if (!proposal.skillGroups.length) {
          break;
        }
        const merged = { ...next.skills };
        for (const group of proposal.skillGroups) {
          const name = group.groupName.trim();
          const items = normalizeBullets(group.items);
          if (name && items.length > 0) {
            merged[name] = items;
          }
        }
        next.skills = merged;
        break;
      }
      case "experience_bullets": {
        const hint = proposal.experienceRoleHint.trim().toLowerCase();
        const bullets = normalizeBullets(proposal.experienceBullets);
        if (!hint || bullets.length === 0) {
          break;
        }
        const idx = next.experience.findIndex(
          (experience) =>
            experience.role.toLowerCase().includes(hint) ||
            experience.company.toLowerCase().includes(hint)
        );
        if (idx >= 0) {
          next.experience = next.experience.map((experience, index) =>
            index === idx ? { ...experience, bullets } : experience
          );
        }
        break;
      }
      case "projects_list": {
        if (!proposal.projectItems.length) {
          break;
        }
        next.projects = proposal.projectItems.map((project) => ({
          name: project.name.trim(),
          tech: project.tech.trim(),
          bullets: normalizeBullets(project.bullets)
        }));
        break;
      }
      case "languages": {
        if (!proposal.languageItems.length) {
          break;
        }
        next.languages = proposal.languageItems.map((language) => ({
          name: language.name.trim(),
          level: language.level.trim()
        }));
        break;
      }
      default:
        break;
    }
  }

  return next;
}
