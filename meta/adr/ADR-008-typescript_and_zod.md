---
title: "ADR-008: TypeScript & Zod for Strict Typing and Agent-Ready Schemas"
status: "Proposed"
date: "2026-04-03"
tags:
  - "typing"
  - "tooling"
  - "agent-readiness"
  - "validation"
---

## Context

* **Problem:** Scryglass's `@scryglass/core` package must be consumable not only by the PWA frontend but also by future AI agents (via MCP, LangChain, or direct tool-calling). AI agents are terrible at guessing data structures but excellent at following JSON schemas. All inputs and outputs of the core library must have predictable, machine-readable schemas to enable agent integration. Additionally, strict typing catches bugs at compile time and serves as living documentation.
* **Constraints:** The typing solution must work for both `@scryglass/core` (pure logic, platform-agnostic) and `@scryglass/pwa` (browser-specific). It must not add excessive bundle size to the PWA. Schemas must be derivable at runtime (not just compile-time) so agents can introspect them.

## Decision

We will use **TypeScript** for all source code and **Zod** for runtime schema validation and type derivation.

1. **TypeScript everywhere:** Both `@scryglass/core` and `@scryglass/pwa` are written in TypeScript. The core package compiles to ESM JavaScript with `.d.ts` type declarations for consumers. The PWA package uses a bundler (e.g., Vite) that handles TypeScript natively.

2. **Zod schemas for all domain types:** Every data structure that crosses a package boundary or could be invoked by an agent is defined as a Zod schema:
    * `CardSchema` — the shape of a parsed card object
    * `GameStateSchema` — the full game state
    * `ActionSchema` — a discriminated union of all valid actions (see ADR-005)
    * `ActionResultSchema` — the return type of dispatching an action
    * `ParseResultSchema` — the return type of the CSV parser

3. **TypeScript types derived from Zod:** Use `z.infer<typeof Schema>` to derive TypeScript types from Zod schemas, ensuring the runtime validation and compile-time types are always in sync.

4. **Validation at boundaries:** Zod `.parse()` is called at the entry points of `@scryglass/core` (e.g., the `dispatch()` function validates the incoming action). Internal functions within core can trust their inputs and skip redundant validation for performance.

5. **Descriptive errors:** Zod's built-in error messages provide the detailed, string-based error descriptions that agents need to self-correct failed tool calls.

## Considered Options

1. **Option 1: TypeScript + Zod (Chosen)**
    * *Pros:* Runtime validation + compile-time types from a single source of truth. Zod schemas can be serialized to JSON Schema for agent consumption. Excellent error messages. Small bundle size (~13KB minified). Zero dependencies. Well-maintained and widely adopted.
    * *Cons:* Adds a build step (TypeScript compilation). Zod is a runtime dependency in `@scryglass/core`. Developers must learn Zod's API.

2. **Option 2: TypeScript Only (No Runtime Validation)**
    * *Pros:* Zero runtime overhead. No additional dependency.
    * *Cons:* Types are erased at compile time — no runtime validation. Agents sending malformed actions get cryptic runtime errors instead of structured validation failures. JSON Schema must be maintained separately from TypeScript interfaces, risking drift.

3. **Option 3: JSON Schema + Ajv (Manual Schemas)**
    * *Pros:* JSON Schema is the universal standard for agent tooling. Ajv is the fastest JSON Schema validator.
    * *Cons:* JSON Schema files must be written and maintained by hand, separately from TypeScript types. No type inference — TypeScript interfaces and JSON schemas can drift. More boilerplate than Zod.

4. **Option 4: io-ts or Arktype**
    * *Pros:* Similar concept to Zod (runtime validation + type inference).
    * *Cons:* Smaller ecosystems. io-ts has a steeper learning curve (fp-ts dependency). Arktype is newer and less battle-tested.

## Consequences

* **Positive:** Every function in `@scryglass/core` has a machine-readable contract. Agents can introspect schemas to generate valid tool calls. TypeScript catches bugs at compile time. Zod errors are descriptive enough for agent self-correction. Types and validation stay in sync automatically.
* **Negative:** Adds TypeScript and Zod as project dependencies. Requires a build step. Small learning curve for contributors unfamiliar with Zod.
* **Future Implications:** When building an MCP server around `@scryglass/core`, Zod schemas can be automatically converted to JSON Schema using `zod-to-json-schema`, which is exactly what MCP tool definitions require.
