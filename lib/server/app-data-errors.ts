export type AppDataErrorCode =
  | "missing_file"
  | "invalid_json"
  | "invalid_schema"
  | "invalid_arrow"
  | "invalid_reference"
  | "missing_object"
  | "capability_disabled"
  | "unknown";

interface AppDataContractErrorInit {
  code: AppDataErrorCode;
  title: string;
  message: string;
  status?: number;
  relativePath?: string;
  details?: string[];
  cause?: unknown;
}

export class AppDataContractError extends Error {
  code: AppDataErrorCode;
  title: string;
  status: number;
  relativePath?: string;
  details: string[];

  constructor({
    code,
    title,
    message,
    status = 409,
    relativePath,
    details = [],
    cause,
  }: AppDataContractErrorInit) {
    super(message, { cause });
    this.name = "AppDataContractError";
    this.code = code;
    this.title = title;
    this.status = status;
    this.relativePath = relativePath;
    this.details = details;
  }
}

export function isAppDataContractError(
  error: unknown,
): error is AppDataContractError {
  return error instanceof AppDataContractError;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown runtime error.";
}

export function normalizeAppDataError(error: unknown) {
  if (isAppDataContractError(error)) {
    return error;
  }

  return new AppDataContractError({
    code: "unknown",
    title: "Unexpected app-ready runtime error",
    message: "The application could not finish reading the app-ready cache.",
    status: 500,
    details: [getErrorMessage(error)],
    cause: error,
  });
}

interface AppDataErrorDescriptionOptions {
  fallbackTitle: string;
  fallbackDescription: string;
}

export function describeAppDataError(
  error: unknown,
  { fallbackTitle, fallbackDescription }: AppDataErrorDescriptionOptions,
) {
  const appError = normalizeAppDataError(error);

  return {
    title: appError.title || fallbackTitle,
    description: appError.message || fallbackDescription,
    details: [
      ...(appError.relativePath
        ? [`Affected path: ${appError.relativePath}`]
        : []),
      ...appError.details,
    ],
  };
}

export function toAppDataErrorPayload(error: unknown) {
  const appError = normalizeAppDataError(error);

  return {
    code: appError.code,
    title: appError.title,
    message: appError.message,
    relativePath: appError.relativePath ?? null,
    details: appError.details,
  };
}
