import { beforeEach, expect, it } from "vitest";
import { activeWorkspaceId, scopedUrl, workspaceRoute } from "@/lib/workspace-scope";
import { apiUrl, wsUrl } from "@/lib/api";
import { navDestination } from "@/components/sidebar/nav-entries";
import { courseHandoffHref } from "@/lib/course-handoff";

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, "", "/learning");
});

it("uses the default workspace and keeps explicitly scoped URLs immutable", () => {
  expect(activeWorkspaceId()).toBe("");
  expect(apiUrl("/api/reading/materials")).toBe("/api/reading/materials?dt_workspace=");
  const fixed = scopedUrl("/files/attachments/a/b/file.pdf", "ws_a");
  window.history.replaceState(null, "", "/learning?dt_workspace=ws_b");
  expect(scopedUrl(fixed)).toBe(fixed);
});

it("remembers a scope per tab across module navigation and pins sockets", () => {
  window.history.replaceState(null, "", "/learning?dt_workspace=ws_a");
  expect(activeWorkspaceId()).toBe("ws_a");
  const socket = wsUrl("/ws");
  window.history.replaceState(null, "", "/learning/books");
  expect(activeWorkspaceId()).toBe("");
  expect(socket).toBe("/ws?dt_workspace=ws_a");
  window.history.replaceState(null, "", "/learning?dt_workspace=");
  expect(activeWorkspaceId()).toBe("");
  expect(socket).toBe("/ws?dt_workspace=ws_a");
});

it("does not append workspace identity to external or signed URLs", () => {
  expect(scopedUrl("https://example.org/video?signature=abc", "ws_a")).toBe("https://example.org/video?signature=abc");
  expect(scopedUrl("//example.org/video", "ws_a")).toBe("//example.org/video");
});

it("pins same-origin absolute URLs and honors legacy workspace links", () => {
  expect(scopedUrl(`${window.location.origin}/api/books`, "ws_a"))
    .toBe(`${window.location.origin}/api/books?dt_workspace=ws_a`);
  expect(scopedUrl("/chat?workspace=ws_b", "ws_a"))
    .toBe("/chat?workspace=ws_b&dt_workspace=ws_b");
});

it("does not let an earlier tab preference select a new task workspace", () => {
  sessionStorage.setItem('deeptutor:workspace', 'ws_old');
  window.history.replaceState(null, '', '/chat');
  expect(activeWorkspaceId()).toBe('');
});

it("carries the active workspace into module entries that own workspace data", () => {
  window.history.replaceState(null, '', '/chat?dt_workspace=ws_a');
  // Co-Writer saves land in the workspace's notebook library, so opening it
  // from a workspace must not fall back to the default store.
  expect(navDestination('/co-writer')).toBe('/co-writer?dt_workspace=ws_a');
  expect(navDestination('/learning')).toBe('/learning?dt_workspace=ws_a');
  expect(navDestination('/space')).toBe('/space?dt_workspace=ws_a');
  // Account-level modules and Task Board keep their own, unscoped routes.
  expect(navDestination('/partners')).toBe('/partners');
  expect(navDestination('/agents')).toBe('/agents');
  expect(navDestination('/settings')).toBe('/settings');
  expect(navDestination('/kanban')).toBe('/kanban');
  // No workspace active: leave the shipped destination untouched.
  window.history.replaceState(null, '', '/chat');
  expect(navDestination('/co-writer')).toBe('/co-writer');
});

it("keeps a document inside the workspace it belongs to", () => {
  window.history.replaceState(null, '', '/co-writer?dt_workspace=ws_a');
  expect(workspaceRoute('/co-writer/doc_1')).toBe('/co-writer/doc_1?dt_workspace=ws_a');
});

it("keeps the course's workspace on every hand-off destination", () => {
  window.history.replaceState(null, '', '/courses?dt_workspace=ws_a');
  const base = { prompt: '', reason: '', ref_id: '', label: '', course_id: 'c1' };
  expect(courseHandoffHref({ ...base, target: 'question_bank' }))
    .toBe('/learning/practice?course=c1&dt_workspace=ws_a');
  expect(courseHandoffHref({ ...base, target: 'notebook' }))
    .toBe('/notebooks?course=c1&dt_workspace=ws_a');
  expect(courseHandoffHref({ ...base, target: 'chat' }))
    .toBe('/chat?course=c1&dt_workspace=ws_a');
});
