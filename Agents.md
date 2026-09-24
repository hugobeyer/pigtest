# AGENTS.md

## Code Style

- Do not add comments to code unless legally required.
- Do not add section-banner comments, tutorial comments, explanatory comments, TODO filler, or obvious comments.
- Code should look intentionally written by an experienced human developer.
- Match the style, naming, formatting, and architecture already present in the project.
- Prefer compact code over vertically expanded generated-looking code.
- Keep simple expressions inline.
- Keep simple conditions and assignments on one line when readability remains good.
- Avoid excessive temporary variables.
- Avoid unnecessary wrappers, factories, managers, interfaces, abstractions, or helper functions.
- Do not introduce patterns merely because they are considered "clean architecture."
- Do not rewrite working code unless the requested change requires it.
- Do not rename unrelated symbols.
- Do not reformat unrelated files.

## Structure

- Keep code modular.
- Split genuinely separate responsibilities into small focused files.
- Prefer several clear modules over one massive file.
- Do not split tiny logic into pointless one-function files.
- Keep rendering, gameplay/state, input, assets, configuration, and utilities separated when they are substantial enough to justify it.
- Put shared constants/configuration in one obvious location when several systems depend on them.
- Keep implementation close to where it is used when it is not genuinely shared.
- Avoid circular dependencies and unnecessary dependency layers.

## Human-Looking Code

- Do not generate generic boilerplate unless it is actually needed.
- Do not add generic error handling around code that cannot reasonably fail.
- Do not add excessive guards for impossible internal states.
- Do not create placeholder systems for hypothetical future requirements.
- Do not add unused extensibility hooks.
- Do not add fake documentation.
- Do not add verbose console logging.
- Avoid artificial naming such as `Manager`, `Handler`, `Service`, `Processor`, or `Helper` unless the object genuinely represents that role.
- Prefer domain-specific names.
- Prefer direct code that solves the current problem.
- Preserve deliberate quirks of the existing codebase unless they cause the requested bug.

## Editing

- Read the relevant existing files before changing architecture.
- Trace existing call sites before creating duplicate systems.
- Modify the smallest reasonable surface area.
- Reuse existing utilities and conventions where appropriate.
- Keep existing parameters unless removing one is explicitly requested.
- Do not silently change defaults, behavior, units, coordinate systems, or serialized values.
- When replacing a system, remove obsolete code instead of leaving parallel implementations behind.
- Keep new files small and responsibility-focused.

## Formatting

- Prefer compact formatting.
- Avoid excessive blank lines.
- Avoid vertically expanding short expressions.
- Prefer:

  `const x = condition ? a : b;`

  over unnecessarily spreading it across several lines.

- Keep short object literals, function arguments, vector constructors, and math expressions inline when readable.
- Do not run broad auto-formatting that changes unrelated code.

## Build

- After meaningful code changes, build immediately.
- Fix compile/build errors before continuing.
- Do not leave the project knowingly broken.
- Use the project's existing package manager and scripts.
- Do not replace build tooling unless explicitly requested.
- Do not perform long or unrelated test suites unless needed for the change.

## Fast Browser Testing

For web work:

1. Make the requested change.
2. Run the development/build command.
3. Launch the project in Chrome or the available Chromium browser.
4. Check the exact changed behavior.
5. Check the browser console for runtime errors.
6. Check obvious layout/rendering regressions.
7. Fix issues immediately.
8. Recheck once.
9. Stop when the requested behavior works.

- Prefer a fast smoke test over exhaustive browser testing.
- Test the actual interaction that changed rather than randomly exploring the application.
- Do not repeatedly restart the browser when a reload is enough.
- Use DevTools/console only when it helps identify the issue.
- Do not create a large automated testing framework for a small visual or gameplay change.

## Three.js / Interactive Work

- Run the scene in Chrome after visual, camera, animation, input, shader, or gameplay changes.
- Verify the actual rendered result instead of assuming mathematically correct code looks correct.
- Check for console errors, blank frames, NaNs, missing assets, incorrect transforms, clipping, and obvious performance problems.
- Preserve coordinate-system conventions already used by the project unless explicitly migrating the entire scene.
- Keep gameplay constants centralized instead of scattering magic numbers through several files.

## Performance

- Do not prematurely optimize simple code.
- Avoid obvious per-frame allocations when working inside hot render/update loops.
- Reuse vectors/objects in frequently executed Three.js code where useful.
- Do not introduce complex pooling or caching without evidence it is needed.
- Keep the implementation understandable.

## Agent Behavior

- Implement the requested change instead of producing a long plan first.
- Do not add unrelated features.
- Do not invent requirements.
- Do not lock values or impose restrictions unless requested.
- Do not create policy-like internal frameworks around simple parameters.
- Prefer concrete implementation over speculative architecture.
- When something is ambiguous, inspect the existing code and infer from surrounding behavior before asking.
- Ask only when the missing information materially changes the implementation.
- Keep explanations short after completing the work.
- Report what changed, important files touched, and any unresolved issue.