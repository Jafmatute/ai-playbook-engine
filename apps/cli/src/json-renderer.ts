export function renderJsonSuccess(data: unknown): string {
  return JSON.stringify({ success: true, data }, null, 2);
}

export function renderJsonError(code: string, message: string, details: unknown): string {
  return JSON.stringify(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    null,
    2,
  );
}
