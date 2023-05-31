interface CursorsOptions {
  outboundBatchInterval?: number;
  paginationLimit?: number;
}

interface StrictCursorsOptions extends CursorsOptions {
  outboundBatchInterval: number;
  paginationLimit: number;
}

export type { StrictCursorsOptions, CursorsOptions };
