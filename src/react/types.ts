import type { SpaceMember } from '..';

export interface UseSpaceOptions {
  /**
   * Skip parameter makes the hook skip execution -
   * this is useful in order to conditionally register a subscription to
   * an EventListener (needed because it's not possible to conditionally call a hook in react)
   */
  skip?: boolean;
}

export type UseSpaceCallback = (params: { members: SpaceMember[] }) => void;
