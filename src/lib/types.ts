/** Error types for neverthrow */
export type NetworkError = Readonly<{ type: 'network'; message: string }>;
export type ValidationError = Readonly<{ type: 'validation'; message: string }>;
export type JmapError = Readonly<{ type: 'jmap'; method: string; message: string }>;
export type ErrorResult = NetworkError | ValidationError | JmapError;

export type HttpError = Readonly<{ type: 'http'; status: number; message: string }>;
export type HandlerError = ErrorResult | HttpError;
