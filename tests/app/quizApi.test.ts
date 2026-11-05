import { describe, expect, it } from "vitest";
import { createQuizApi, type QuizFetcher } from "~/utils/quizApi";
import type { Quiz } from "~~/shared/quiz";

const current: Quiz = {
  id: "abc",
  title: "Old",
  description: "d",
  createdAt: 1,
  updatedAt: 1,
  questions: [
    { id: "q1", type: "single", text: "Q", choices: ["A", "B"], correctIndices: [0] },
  ],
};

type Call = { url: string; options?: { method?: string; body?: unknown } };

const makeApi = (handler: (url: string, options?: Call["options"]) => unknown) => {
  const calls: Call[] = [];
  const fetcher: QuizFetcher = async (url, options) => {
    calls.push({ url, options });
    return handler(url, options) as any;
  };
  return { api: createQuizApi(fetcher), calls };
};

describe("quizApi", () => {
  it("lists quizzes", async () => {
    const { api, calls } = makeApi(() => [current]);
    await expect(api.list()).resolves.toEqual([current]);
    expect(calls[0]!.url).toBe("/api/quizzes");
  });

  it("gets and encodes a quiz id", async () => {
    const { api, calls } = makeApi(() => current);
    await expect(api.get("a b")).resolves.toEqual(current);
    expect(calls[0]!.url).toBe("/api/quizzes/a%20b");
  });

  it("creates a quiz", async () => {
    const { api, calls } = makeApi(() => ({ id: "new" }));
    const input = { title: "T", description: "", questions: [] };

    await expect(api.create(input)).resolves.toEqual({ id: "new" });
    expect(calls[0]!.url).toBe("/api/quizzes");
    expect(calls[0]!.options).toMatchObject({ method: "POST", body: input });
  });

  it("merges a partial update before replacing", async () => {
    const { api, calls } = makeApi((_url, options) =>
      options?.method === "PUT" ? { id: "abc" } : current
    );

    await api.updatePartial("abc", { title: "New" });

    expect(calls[0]!.url).toBe("/api/quizzes/abc");
    expect(calls[0]!.options?.method).toBeUndefined();
    expect(calls[1]!.options?.method).toBe("PUT");

    const body = calls[1]!.options?.body as any;
    expect(body.title).toBe("New");
    expect(body.description).toBe("d");
    expect(body.questions).toEqual(current.questions);
  });

  it("removes a quiz", async () => {
    const { api, calls } = makeApi(() => undefined);
    await api.remove("abc");
    expect(calls[0]!.url).toBe("/api/quizzes/abc");
    expect(calls[0]!.options?.method).toBe("DELETE");
  });

  it("turns validation errors into one message", async () => {
    const fetcher: QuizFetcher = async () => {
      throw { data: { errors: ["Question 1: bad"] } };
    };
    const api = createQuizApi(fetcher);

    await expect(api.create({ title: "T", description: "", questions: [] })).rejects.toThrow(
      "Question 1: bad"
    );
  });
});
