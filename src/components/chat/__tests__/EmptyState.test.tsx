import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EmptyState } from "../EmptyState";

afterEach(() => {
  cleanup();
});

test("EmptyState renders heading", () => {
  render(<EmptyState />);
  expect(screen.getByText("Start a conversation to generate React components")).toBeDefined();
});

test("EmptyState renders subtitle", () => {
  render(<EmptyState />);
  expect(screen.getByText("I can help you create buttons, forms, cards, and more")).toBeDefined();
});

test("EmptyState renders bot icon", () => {
  const { container } = render(<EmptyState />);
  expect(container.querySelector("svg")).toBeDefined();
});
