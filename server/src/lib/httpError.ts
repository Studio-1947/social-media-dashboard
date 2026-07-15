/** A generic HTTP-status-carrying error, same shape as MetricoolError but for
 * anything that isn't specifically a Metricool upstream failure. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}
