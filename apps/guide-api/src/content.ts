import corpus from "../../../packages/content/approved-corpus.json";

export type GuideProject = {
  id: string;
  name: string;
  challenge: string;
  boundary: string;
  sources: string[];
};

export const approvedProjects: Record<string, GuideProject> = Object.fromEntries(
  corpus.projects.map((project) => [project.id, project]),
) as Record<string, GuideProject>;

export function resolveProject(projectId: string) {
  return approvedProjects[projectId] ?? approvedProjects["hoc-v2"];
}
