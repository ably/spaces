interface CursorsOptions {
  outboundBatchInterval?: number;
  inboundBatchInterval?: number;
  paginationLimit?: number;
}

interface StrictCursorsOptions extends CursorsOptions {
  outboundBatchInterval: number;
  inboundBatchInterval: number;
  paginationLimit: number;
}

export type { StrictCursorsOptions, CursorsOptions };
