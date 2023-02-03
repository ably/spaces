import { Types } from "ably";
import SpaceOptions from "./Options/SpaceOptions";
import Spaces from "./Spaces";

class Space {

  constructor(
    private name: string,
    private options: SpaceOptions,
    private ably: Types.RealtimePromise
  ){}
}


export default Space;
