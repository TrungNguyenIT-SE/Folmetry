export type ArchivePathResult =
  | { readonly safe: true; readonly path: string }
  | {
      readonly safe: false;
      readonly reason:
        | "EMPTY"
        | "ABSOLUTE_PATH"
        | "WINDOWS_DRIVE_PATH"
        | "UNC_PATH"
        | "TRAVERSAL_COMPONENT"
        | "CONTROL_CHARACTER";
    };

const WINDOWS_DRIVE_PATTERN = /^[a-z]:($|\/)/i;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

export function normalizeArchivePath(name: string): ArchivePathResult {
  if (name.length === 0) {
    return { safe: false, reason: "EMPTY" };
  }

  if (CONTROL_CHARACTER_PATTERN.test(name)) {
    return { safe: false, reason: "CONTROL_CHARACTER" };
  }

  const withForwardSlashes = name.replaceAll("\\", "/");
  if (withForwardSlashes.startsWith("//")) {
    return { safe: false, reason: "UNC_PATH" };
  }
  if (withForwardSlashes.startsWith("/")) {
    return { safe: false, reason: "ABSOLUTE_PATH" };
  }
  if (WINDOWS_DRIVE_PATTERN.test(withForwardSlashes)) {
    return { safe: false, reason: "WINDOWS_DRIVE_PATH" };
  }

  const components = withForwardSlashes.split("/");
  if (components.some((component) => component === ".." || component === ".")) {
    return { safe: false, reason: "TRAVERSAL_COMPONENT" };
  }

  return {
    safe: true,
    path: components.filter((component) => component.length > 0).join("/"),
  };
}
