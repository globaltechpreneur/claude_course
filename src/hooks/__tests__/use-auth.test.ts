import { test, expect, vi, beforeEach, afterEach, describe } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAnonWorkData).mockReturnValue(null);
  vi.mocked(getProjects).mockResolvedValue([]);
  vi.mocked(createProject).mockResolvedValue({ id: "new-project-id" } as any);
});

afterEach(() => {
  cleanup();
});

// ─── signIn ─────────────────────────────────────────────────────────────────

describe("signIn", () => {
  test("returns result from server action", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "password123");
    });

    expect(signInAction).toHaveBeenCalledWith("user@example.com", "password123");
    expect(returnValue).toEqual({ success: true });
  });

  test("returns failure result without navigating when sign in fails", async () => {
    vi.mocked(signInAction).mockResolvedValue({
      success: false,
      error: "Invalid credentials",
    });

    const { result } = renderHook(() => useAuth());

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "wrongpass");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    expect(mockPush).not.toHaveBeenCalled();
    expect(getAnonWorkData).not.toHaveBeenCalled();
    expect(getProjects).not.toHaveBeenCalled();
  });

  test("navigates to existing project when no anon work exists", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([
      { id: "project-1", name: "My Design", createdAt: new Date(), updatedAt: new Date() },
      { id: "project-2", name: "Old Design", createdAt: new Date(), updatedAt: new Date() },
    ] as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/project-1");
    expect(createProject).not.toHaveBeenCalled();
  });

  test("creates new project and navigates when no anon work and no existing projects", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue({ id: "created-id" } as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/created-id");
  });

  test("saves anon work to a new project and navigates when anon messages exist", async () => {
    const anonMessages = [{ role: "user", content: "Make a button" }];
    const anonFsData = { "/App.jsx": "export default function App() {}" };

    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue({
      messages: anonMessages,
      fileSystemData: anonFsData,
    });
    vi.mocked(createProject).mockResolvedValue({ id: "anon-project-id" } as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: anonMessages,
        data: anonFsData,
      })
    );
    expect(clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
    expect(getProjects).not.toHaveBeenCalled();
  });

  test("ignores anon work when messages array is empty", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue({
      messages: [],
      fileSystemData: {},
    });
    vi.mocked(getProjects).mockResolvedValue([
      { id: "existing-id", name: "Existing", createdAt: new Date(), updatedAt: new Date() },
    ] as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    // Falls through to projects path since messages.length === 0
    expect(clearAnonWork).not.toHaveBeenCalled();
    expect(getProjects).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing-id");
  });
});

// ─── signUp ─────────────────────────────────────────────────────────────────

describe("signUp", () => {
  test("returns result from server action", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signUp("new@example.com", "password123");
    });

    expect(signUpAction).toHaveBeenCalledWith("new@example.com", "password123");
    expect(returnValue).toEqual({ success: true });
  });

  test("returns failure result without navigating when sign up fails", async () => {
    vi.mocked(signUpAction).mockResolvedValue({
      success: false,
      error: "Email already registered",
    });

    const { result } = renderHook(() => useAuth());

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signUp("taken@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: false, error: "Email already registered" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("navigates to most recent project after successful sign up", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([
      { id: "recent-project", name: "Recent", createdAt: new Date(), updatedAt: new Date() },
    ] as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/recent-project");
  });

  test("creates new project and navigates when no projects exist after sign up", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue({ id: "brand-new-id" } as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/brand-new-id");
  });

  test("saves anon work to a new project after successful sign up", async () => {
    const anonMessages = [{ role: "user", content: "Make a form" }];
    const anonFsData = { "/Form.jsx": "export default function Form() {}" };

    vi.mocked(signUpAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue({
      messages: anonMessages,
      fileSystemData: anonFsData,
    });
    vi.mocked(createProject).mockResolvedValue({ id: "saved-anon-id" } as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: anonMessages,
        data: anonFsData,
      })
    );
    expect(clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/saved-anon-id");
  });
});

// ─── isLoading ───────────────────────────────────────────────────────────────

describe("isLoading", () => {
  test("starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("is true while signIn is in-flight, false after it resolves", async () => {
    let resolveSignIn!: (value: any) => void;
    vi.mocked(signInAction).mockReturnValue(
      new Promise((res) => { resolveSignIn = res; })
    );

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.signIn("user@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: false, error: "Invalid" });
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("is true while signUp is in-flight, false after it resolves", async () => {
    let resolveSignUp!: (value: any) => void;
    vi.mocked(signUpAction).mockReturnValue(
      new Promise((res) => { resolveSignUp = res; })
    );

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.signUp("new@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignUp({ success: false, error: "Error" });
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("resets to false even when signIn action throws", async () => {
    vi.mocked(signInAction).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.signIn("user@example.com", "password123");
      } catch {
        // expected to throw
      }
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("resets to false even when signUp action throws", async () => {
    vi.mocked(signUpAction).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.signUp("new@example.com", "password123");
      } catch {
        // expected to throw
      }
    });

    expect(result.current.isLoading).toBe(false);
  });
});

// ─── post-sign-in routing priority ──────────────────────────────────────────

describe("post-sign-in routing priority", () => {
  test("anon work takes priority over existing projects", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue({
      messages: [{ role: "user", content: "Build something" }],
      fileSystemData: {},
    });
    vi.mocked(getProjects).mockResolvedValue([
      { id: "existing-project", name: "Old", createdAt: new Date(), updatedAt: new Date() },
    ] as any);
    vi.mocked(createProject).mockResolvedValue({ id: "anon-save-id" } as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/anon-save-id");
    expect(getProjects).not.toHaveBeenCalled();
  });

  test("existing projects take priority over creating a new one", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([
      { id: "proj-a", name: "A", createdAt: new Date(), updatedAt: new Date() },
      { id: "proj-b", name: "B", createdAt: new Date(), updatedAt: new Date() },
    ] as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    // Navigates to first (most recent) project; does NOT create a new one
    expect(mockPush).toHaveBeenCalledWith("/proj-a");
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(createProject).not.toHaveBeenCalled();
  });

  test("new project name includes a random suffix for uniqueness", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue({ id: "rand-id" } as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    const callArg = vi.mocked(createProject).mock.calls[0][0];
    expect(callArg.name).toMatch(/^New Design #\d+$/);
  });

  test("anon project name includes time of creation", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue({
      messages: [{ role: "user", content: "hi" }],
      fileSystemData: {},
    });
    vi.mocked(createProject).mockResolvedValue({ id: "timed-id" } as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    const callArg = vi.mocked(createProject).mock.calls[0][0];
    expect(callArg.name).toMatch(/^Design from /);
  });
});
